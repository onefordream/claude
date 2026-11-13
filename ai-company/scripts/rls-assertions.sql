-- RLS 検証（scripts/test-rls.sh から実行）
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

-- 2ユーザーを作成（profiles はトリガーで自動作成されること）
insert into auth.users (id, email) values (:'A', 'a@example.com'), (:'B', 'b@example.com');
do $$ begin assert (select count(*) from public.profiles) = 2, 'profiles auto-created'; end $$;

-- サーバー（service_role 相当）で会社・データを作成
insert into public.companies (id, owner_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', :'A', 'A社'),
  ('bbbbbbbb-0000-0000-0000-000000000001', :'B', 'B社');
insert into public.company_employees (id, company_id, template_id, name) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000001', 'secretary', 'ミオ'),
  ('bbbbbbbb-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-000000000001', 'secretary', 'ミオ');
insert into public.conversations (id, company_id, employee_id) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000e1'),
  ('bbbbbbbb-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000e1');
insert into public.messages (conversation_id, company_id, role, content) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000001', 'user', 'Aの秘密'),
  ('bbbbbbbb-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-000000000001', 'user', 'Bの秘密');
insert into public.missions (id, company_id, mission_date, kind, title, employee_role, xp_reward) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', current_date, 'daily', 'Aのミッション', 'planner', 50),
  ('bbbbbbbb-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-000000000001', current_date, 'daily', 'Bのミッション', 'planner', 50);
insert into public.ai_usage_logs (user_id, feature, status) values (:'A', 'chat', 'ok'), (:'B', 'chat', 'ok');
insert into public.app_settings (key, value) values ('settings', '{}');

-- ===== ユーザーAとして =====
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'A', true);
do $$ begin
  assert (select count(*) from public.companies) = 1, 'A sees only own company';
  assert (select name from public.companies) = 'A社', 'A sees A社';
  assert (select count(*) from public.profiles) = 1, 'A sees only own profile';
  assert (select count(*) from public.messages) = 1, 'A sees only own messages';
  assert (select content from public.messages) = 'Aの秘密', 'A message content';
  assert (select count(*) from public.conversations) = 1, 'A conversations';
  assert (select count(*) from public.company_employees) = 1, 'A employees';
  assert (select count(*) from public.missions) = 1, 'A missions';
  assert (select count(*) from public.ai_usage_logs) = 1, 'A usage';
  assert (select count(*) from public.ai_employee_templates) = 11, 'templates visible';
end $$;
-- 他社のメッセージを削除しようとしても 0 件
delete from public.messages where company_id = 'bbbbbbbb-0000-0000-0000-000000000001';
-- 他社の会社名は更新できない（0件）
update public.companies set name = '乗っ取り' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
-- 自社の名前は更新できる
update public.companies set name = 'A社改' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
commit;

do $$ begin
  assert (select count(*) from public.messages where company_id = 'bbbbbbbb-0000-0000-0000-000000000001') = 1, 'B message survived';
  assert (select name from public.companies where id = 'bbbbbbbb-0000-0000-0000-000000000001') = 'B社', 'B name unchanged';
  assert (select name from public.companies where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'A社改', 'A rename ok';
end $$;

-- XP は直接書き換え不可（列権限）
do $$ declare failed boolean := false; begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
    update public.companies set xp = 99999;
  exception when insufficient_privilege then failed := true; end;
  reset role;
  assert failed, 'xp update must be denied';
end $$;

-- plan / is_admin の自己昇格は不可
do $$ declare failed boolean := false; begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
    update public.profiles set plan = 'pro', is_admin = true;
  exception when insufficient_privilege then failed := true; end;
  reset role;
  assert failed, 'plan escalation must be denied';
end $$;

-- ミッション・利用ログを自分で作成することは不可
do $$ declare failed boolean := false; begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
    insert into public.missions (company_id, mission_date, kind, title, employee_role, xp_reward)
      values ('aaaaaaaa-0000-0000-0000-000000000001', current_date, 'daily', 'ズル', 'planner', 200);
  exception when insufficient_privilege then failed := true; end;
  reset role;
  assert failed, 'mission insert must be denied';
end $$;

-- サーバー専用関数は authenticated から実行不可
do $$ declare failed boolean := false; begin
  begin
    set local role authenticated;
    perform public.complete_mission('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'x', null);
  exception when insufficient_privilege then failed := true; end;
  reset role;
  assert failed, 'complete_mission must be service-only';
end $$;

-- app_settings はクライアントから読めない
do $$ declare failed boolean := false; begin
  begin
    set local role authenticated;
    perform * from public.app_settings;
  exception when insufficient_privilege then failed := true; end;
  reset role;
  assert failed, 'app_settings must be hidden';
end $$;

-- anon は何も読めない
do $$ declare failed boolean := false; begin
  begin
    set local role anon;
    perform * from public.companies;
  exception when insufficient_privilege then failed := true; end;
  reset role;
  assert failed, 'anon must be denied';
end $$;

-- ===== サーバー関数の動作 =====
-- 他人のミッションは完了できない
do $$ declare r jsonb; begin
  r := public.complete_mission('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-0000000000a1', '成果', null);
  assert (r->>'ok')::boolean = false, 'cannot complete others mission';
  r := public.complete_mission('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-0000000000a1', '競合3社を調査', null);
  assert (r->>'ok')::boolean, 'complete own mission';
  assert (r->>'xp')::int = 50, 'xp awarded';
  r := public.complete_mission('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'again', null);
  assert r->>'error' = 'already_completed', 'no double completion';
  assert (select xp from public.companies where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 50, 'xp persisted once';
end $$;

-- 利用上限（日次2回・機能別・毎分）
do $$ declare r jsonb; begin
  delete from public.ai_usage_logs where user_id = '22222222-2222-2222-2222-222222222222';
  r := public.reserve_ai_usage('22222222-2222-2222-2222-222222222222', 'chat', array['chat'], now() - interval '1 hour', now() - interval '1 day', 2, 100, 10, 100);
  assert (r->>'ok')::boolean, 'first allowed';
  r := public.reserve_ai_usage('22222222-2222-2222-2222-222222222222', 'chat', array['chat'], now() - interval '1 hour', now() - interval '1 day', 2, 100, 10, 100);
  assert (r->>'ok')::boolean, 'second allowed';
  r := public.reserve_ai_usage('22222222-2222-2222-2222-222222222222', 'chat', array['chat'], now() - interval '1 hour', now() - interval '1 day', 2, 100, 10, 100);
  assert r->>'reason' = 'daily_limit', 'third denied';
  r := public.reserve_ai_usage('22222222-2222-2222-2222-222222222222', 'meeting', array['meeting'], now() - interval '1 hour', now() - interval '1 day', 1, 100, 10, 100);
  assert (r->>'ok')::boolean, 'other feature has own bucket';
  r := public.reserve_ai_usage('22222222-2222-2222-2222-222222222222', 'meeting', array['meeting'], now() - interval '1 hour', now() - interval '1 day', 5, 100, 3, 100);
  assert r->>'reason' = 'rate_limited', 'per-minute limit';
end $$;

-- 連続出社
do $$ declare r jsonb; begin
  r := public.company_checkin('11111111-1111-1111-1111-111111111111', current_date - 1);
  assert (r->>'streak')::int = 1, 'first checkin';
  r := public.company_checkin('11111111-1111-1111-1111-111111111111', current_date);
  assert (r->>'streak')::int = 2, 'consecutive';
  r := public.company_checkin('11111111-1111-1111-1111-111111111111', current_date);
  assert (r->>'new_day')::boolean = false, 'same day idempotent';
end $$;

-- ユーザー削除で関連データがカスケード削除される
delete from auth.users where id = :'A';
do $$ begin
  assert (select count(*) from public.companies where owner_id = '11111111-1111-1111-1111-111111111111') = 0, 'company deleted';
  assert (select count(*) from public.messages where company_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0, 'messages deleted';
end $$;
