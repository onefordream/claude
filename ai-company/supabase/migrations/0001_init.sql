-- =====================================================================
-- AI COMPANY 初期スキーマ
-- 方針:
--  * 全テーブルで RLS を有効化し、本人（会社オーナー）の行だけ参照可能にする
--  * XP・レベル・ミッション・利用量・サブスクリプション等の「ゲーム/課金状態」は
--    クライアントから直接書き換えられないよう、更新はサーバー（service_role）経由の
--    関数のみで行う
-- =====================================================================

create extension if not exists pgcrypto;

-- updated_at 自動更新
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  plan text not null default 'free' check (plan in ('free','pro')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- 新規ユーザー登録時にプロフィールを自動作成
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- companies（MVP は 1ユーザー1社。複数プロジェクトは projects で拡張）
-- ---------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  president_name text not null default '' check (char_length(president_name) <= 40),
  tagline text not null default '' check (char_length(tagline) <= 120),
  concept text not null default '' check (char_length(concept) <= 1000),
  philosophy text not null default '' check (char_length(philosophy) <= 500),
  vision text not null default '' check (char_length(vision) <= 500),
  main_business text not null default '' check (char_length(main_business) <= 500),
  business_mode text not null default 'new' check (business_mode in ('new','existing')),
  action_plan jsonb not null default '[]'::jsonb,
  logo jsonb not null default '{}'::jsonb,
  level int not null default 1 check (level >= 1),
  xp int not null default 0 check (xp >= 0),
  streak_days int not null default 0,
  last_checkin_date date,
  memory_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger companies_updated before update on public.companies
  for each row execute function public.set_updated_at();

-- 会社オーナー判定（RLS から使う）
create or replace function public.is_company_owner(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies c where c.id = cid and c.owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- onboarding_sessions
-- ---------------------------------------------------------------------
create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'interview' check (status in ('interview','ideas','plan','completed')),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index onboarding_sessions_user_idx on public.onboarding_sessions(user_id, created_at desc);
create trigger onboarding_updated before update on public.onboarding_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- AI社員テンプレート（全ユーザー閲覧可・書込は管理側のみ）
-- ---------------------------------------------------------------------
create table public.ai_employee_templates (
  id text primary key,
  role text not null,
  default_name text not null,
  title text not null,
  is_pro boolean not null default false,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.ai_employee_templates (id, role, default_name, title, is_pro, is_available, sort_order) values
  ('secretary','secretary','ミオ','社長秘書',false,true,1),
  ('planner','planner','カイト','企画担当',false,true,2),
  ('marketer','marketer','リナ','マーケティング担当',false,true,3),
  ('sales','sales','ソウタ','営業担当',true,false,10),
  ('designer','designer','ユイ','デザイナー',true,false,11),
  ('developer','developer','レン','Web開発者',true,false,12),
  ('accountant','accountant','マコト','経理担当',true,false,13),
  ('hr','hr','サクラ','人事担当',true,false,14),
  ('support','support','ハル','カスタマーサポート',true,false,15),
  ('legal','legal','シオン','法務支援',true,false,16),
  ('video','video','ジン','動画クリエイター',true,false,17);

-- ---------------------------------------------------------------------
-- company_employees
-- ---------------------------------------------------------------------
create table public.company_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id text not null references public.ai_employee_templates(id),
  name text not null check (char_length(name) between 1 and 30),
  status text not null default 'active' check (status in ('active','inactive')),
  hired_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, template_id)
);
create index company_employees_company_idx on public.company_employees(company_id);
create trigger company_employees_updated before update on public.company_employees
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- conversations / messages
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.company_employees(id) on delete cascade,
  kind text not null default 'chat' check (kind in ('chat','meeting')),
  title text not null default '',
  summary text not null default '',
  summarized_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_company_idx on public.conversations(company_id, updated_at desc);
create index conversations_employee_idx on public.conversations(employee_id);
create trigger conversations_updated before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  employee_id uuid references public.company_employees(id) on delete set null,
  content text not null check (char_length(content) <= 20000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index messages_company_idx on public.messages(company_id);

-- ---------------------------------------------------------------------
-- goals / projects
-- ---------------------------------------------------------------------
create table public.company_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  horizon text not null default '',
  status text not null default 'active' check (status in ('active','achieved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index company_goals_company_idx on public.company_goals(company_id);
create trigger company_goals_updated before update on public.company_goals
  for each row execute function public.set_updated_at();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  status text not null default 'active' check (status in ('active','paused','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_company_idx on public.projects(company_id);
create trigger projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- generated_artifacts（AI社員の成果物）
-- ---------------------------------------------------------------------
create table public.generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.company_employees(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  type text not null,
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) <= 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generated_artifacts_company_idx on public.generated_artifacts(company_id, created_at desc);
create trigger generated_artifacts_updated before update on public.generated_artifacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- missions / mission_completions
-- ---------------------------------------------------------------------
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  mission_date date not null,
  kind text not null check (kind in ('first_day','daily')),
  title text not null,
  description text not null default '',
  employee_role text not null references public.ai_employee_templates(id),
  xp_reward int not null check (xp_reward between 0 and 200),
  deliverable_hint text not null default '',
  status text not null default 'open' check (status in ('open','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index missions_company_date_idx on public.missions(company_id, mission_date desc);
create trigger missions_updated before update on public.missions
  for each row execute function public.set_updated_at();

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references public.missions(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deliverable text not null default '',
  artifact_id uuid references public.generated_artifacts(id) on delete set null,
  xp_awarded int not null,
  created_at timestamptz not null default now()
);
create index mission_completions_company_idx on public.mission_completions(company_id);

-- ---------------------------------------------------------------------
-- company_activity_logs（成長記録・重要な決定事項）
-- ---------------------------------------------------------------------
create table public.company_activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  title text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_company_idx on public.company_activity_logs(company_id, created_at desc);

-- ---------------------------------------------------------------------
-- ai_usage_logs（利用量・推定原価）
-- ---------------------------------------------------------------------
create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  feature text not null,
  status text not null default 'reserved' check (status in ('reserved','ok','error','denied')),
  model text not null default '',
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  est_cost_usd numeric(12,6) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage_logs(user_id, created_at desc);
create index ai_usage_time_idx on public.ai_usage_logs(created_at desc);
create trigger ai_usage_updated before update on public.ai_usage_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- subscriptions（Stripe Webhook のみが書き込む）
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  plan text not null default 'free' check (plan in ('free','pro')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- app_settings（料金・上限など。管理画面から変更。service_role のみ書込）
-- ---------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger app_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.ai_employee_templates enable row level security;
alter table public.company_employees enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.company_goals enable row level security;
alter table public.projects enable row level security;
alter table public.generated_artifacts enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.company_activity_logs enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.app_settings enable row level security;

-- 既定の権限を絞る（anon は何もできない）
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- profiles: 本人のみ参照、表示名のみ更新可（plan / is_admin は不可）
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- companies: 本人のみ。プロフィール項目だけ更新可（level / xp / streak は不可）
create policy companies_select on public.companies for select to authenticated using (owner_id = auth.uid());
create policy companies_update on public.companies for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select on public.companies to authenticated;
grant update (name, president_name, tagline, concept, philosophy, vision, main_business, action_plan, logo) on public.companies to authenticated;

-- onboarding_sessions: 本人のみ参照
create policy onboarding_select on public.onboarding_sessions for select to authenticated using (user_id = auth.uid());
grant select on public.onboarding_sessions to authenticated;

-- templates: ログインユーザーは閲覧可
create policy templates_select on public.ai_employee_templates for select to authenticated using (true);
grant select on public.ai_employee_templates to authenticated;

-- 会社に属するデータ: オーナーのみ参照
create policy company_employees_select on public.company_employees for select to authenticated using (public.is_company_owner(company_id));
create policy conversations_select on public.conversations for select to authenticated using (public.is_company_owner(company_id));
create policy conversations_delete on public.conversations for delete to authenticated using (public.is_company_owner(company_id));
create policy messages_select on public.messages for select to authenticated using (public.is_company_owner(company_id));
create policy messages_delete on public.messages for delete to authenticated using (public.is_company_owner(company_id));
create policy goals_select on public.company_goals for select to authenticated using (public.is_company_owner(company_id));
create policy goals_modify on public.company_goals for all to authenticated using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
create policy projects_select on public.projects for select to authenticated using (public.is_company_owner(company_id));
create policy projects_modify on public.projects for all to authenticated using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
create policy artifacts_select on public.generated_artifacts for select to authenticated using (public.is_company_owner(company_id));
create policy artifacts_delete on public.generated_artifacts for delete to authenticated using (public.is_company_owner(company_id));
create policy missions_select on public.missions for select to authenticated using (public.is_company_owner(company_id));
create policy completions_select on public.mission_completions for select to authenticated using (public.is_company_owner(company_id));
create policy activity_select on public.company_activity_logs for select to authenticated using (public.is_company_owner(company_id));
create policy usage_select on public.ai_usage_logs for select to authenticated using (user_id = auth.uid());
create policy subscriptions_select on public.subscriptions for select to authenticated using (user_id = auth.uid());

grant select on public.company_employees, public.conversations, public.messages, public.company_goals,
  public.projects, public.generated_artifacts, public.missions, public.mission_completions,
  public.company_activity_logs, public.ai_usage_logs, public.subscriptions to authenticated;
grant delete on public.conversations, public.messages, public.generated_artifacts to authenticated;
grant insert, update, delete on public.company_goals, public.projects to authenticated;
-- app_settings: クライアントからは一切アクセス不可（サーバーが service_role で読む）

-- service_role（サーバー専用）は全操作可能
grant all on all tables in schema public to service_role;

-- =====================================================================
-- サーバー専用関数（service_role のみ実行可）
-- =====================================================================

-- XP → レベル（lib/game/levels.ts と同じ閾値）
create or replace function public.level_for_xp(p_xp int) returns int
language sql immutable as $$
  select case
    when p_xp >= 3200 then 10 when p_xp >= 2500 then 9 when p_xp >= 1900 then 8
    when p_xp >= 1400 then 7 when p_xp >= 1000 then 6 when p_xp >= 680 then 5
    when p_xp >= 420 then 4 when p_xp >= 220 then 3 when p_xp >= 80 then 2 else 1 end;
$$;

-- ミッション完了（所有者確認・二重完了防止・XP付与・ログをひとつのトランザクションで）
create or replace function public.complete_mission(
  p_user_id uuid, p_mission_id uuid, p_deliverable text, p_artifact_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m public.missions%rowtype;
  c public.companies%rowtype;
  new_xp int;
  new_level int;
begin
  select * into m from public.missions where id = p_mission_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into c from public.companies where id = m.company_id for update;
  if c.owner_id <> p_user_id then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if m.status = 'completed' then return jsonb_build_object('ok', false, 'error', 'already_completed'); end if;
  if p_artifact_id is not null and not exists (
    select 1 from public.generated_artifacts a where a.id = p_artifact_id and a.company_id = c.id
  ) then return jsonb_build_object('ok', false, 'error', 'invalid_artifact'); end if;

  update public.missions set status = 'completed', completed_at = now() where id = m.id;
  insert into public.mission_completions (mission_id, company_id, user_id, deliverable, artifact_id, xp_awarded)
    values (m.id, c.id, p_user_id, coalesce(p_deliverable, ''), p_artifact_id, m.xp_reward);

  new_xp := c.xp + m.xp_reward;
  new_level := public.level_for_xp(new_xp);
  update public.companies set xp = new_xp, level = new_level where id = c.id;

  insert into public.company_activity_logs (company_id, type, title, detail)
    values (c.id, 'mission_completed', m.title, jsonb_build_object('xp', m.xp_reward, 'mission_id', m.id));
  if new_level > c.level then
    insert into public.company_activity_logs (company_id, type, title, detail)
      values (c.id, 'level_up', 'Lv.' || new_level || ' に到達', jsonb_build_object('level', new_level));
  end if;

  return jsonb_build_object('ok', true, 'xp', new_xp, 'level', new_level,
    'leveled_up', new_level > c.level, 'xp_awarded', m.xp_reward);
end $$;

-- AI利用枠の予約（ユーザー単位でロックし、分・日・月の上限をサーバー側で判定）
create or replace function public.reserve_ai_usage(
  p_user_id uuid, p_feature text, p_count_features text[],
  p_day_start timestamptz, p_month_start timestamptz,
  p_daily_limit int, p_monthly_limit int, p_per_minute int, p_global_daily_budget numeric
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  used_minute int; used_day int; used_month int; spent_today numeric;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || p_user_id::text));

  select coalesce(sum(est_cost_usd), 0) into spent_today
    from public.ai_usage_logs where created_at >= p_day_start and status = 'ok';
  if spent_today >= p_global_daily_budget then
    return jsonb_build_object('ok', false, 'reason', 'global_budget');
  end if;

  select count(*) into used_minute from public.ai_usage_logs
    where user_id = p_user_id and created_at >= now() - interval '1 minute' and status in ('reserved','ok');
  if used_minute >= p_per_minute then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  select count(*) into used_day from public.ai_usage_logs
    where user_id = p_user_id and feature = any(p_count_features)
      and created_at >= p_day_start and status in ('reserved','ok');
  if used_day >= p_daily_limit then
    insert into public.ai_usage_logs (user_id, feature, status) values (p_user_id, p_feature, 'denied');
    return jsonb_build_object('ok', false, 'reason', 'daily_limit');
  end if;

  select count(*) into used_month from public.ai_usage_logs
    where user_id = p_user_id and feature = any(p_count_features)
      and created_at >= p_month_start and status in ('reserved','ok');
  if used_month >= p_monthly_limit then
    insert into public.ai_usage_logs (user_id, feature, status) values (p_user_id, p_feature, 'denied');
    return jsonb_build_object('ok', false, 'reason', 'monthly_limit');
  end if;

  insert into public.ai_usage_logs (user_id, feature, status) values (p_user_id, p_feature, 'reserved')
    returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

-- 出社（連続出社日数の更新）
create or replace function public.company_checkin(p_user_id uuid, p_today date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c public.companies%rowtype;
  new_streak int;
begin
  select * into c from public.companies where owner_id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false); end if;
  if c.last_checkin_date = p_today then
    return jsonb_build_object('ok', true, 'streak', c.streak_days, 'new_day', false);
  end if;
  if c.last_checkin_date = p_today - 1 then new_streak := c.streak_days + 1; else new_streak := 1; end if;
  update public.companies set streak_days = new_streak, last_checkin_date = p_today where id = c.id;
  return jsonb_build_object('ok', true, 'streak', new_streak, 'new_day', true);
end $$;

revoke all on function public.complete_mission(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.reserve_ai_usage(uuid, text, text[], timestamptz, timestamptz, int, int, int, numeric) from public, anon, authenticated;
revoke all on function public.company_checkin(uuid, date) from public, anon, authenticated;
grant execute on function public.complete_mission(uuid, uuid, text, uuid) to service_role;
grant execute on function public.reserve_ai_usage(uuid, text, text[], timestamptz, timestamptz, int, int, int, numeric) to service_role;
grant execute on function public.company_checkin(uuid, date) to service_role;
