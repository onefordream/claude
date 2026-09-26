import { api } from '../api.js';
import { html, mount, $, $$, onAction, toast, progressBar, fmtNum, fmtRelDate, jstToday, addDays, celebrate, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';
import { paceLabel } from './goals.js';

const ICONS = ['🎯', '📚', '💪', '🏃', '🧘', '✍️', '🎸', '🎹', '🗣️', '💻', '🧠', '📝', '💼', '💰', '🥗', '💧', '😴', '🎨', '📷', '🌱'];

const PRESETS = [
  { icon: '📚', title: '本を読む', target: 5, unit: '冊', days: 60 },
  { icon: '💪', title: 'トレーニングする', target: 20, unit: '回', days: 30 },
  { icon: '📝', title: '資格の勉強をする', target: 30, unit: '時間', days: 60 },
  { icon: '✍️', title: '発信・アウトプットする', target: 10, unit: '本', days: 30 },
  { icon: '🎸', title: '楽器を練習する', target: 20, unit: '日', days: 30 },
  { icon: '🥗', title: '体重を落とす', target: 3, unit: 'kg', days: 90 },
];

function goalForm(root, { goal, navigate }) {
  const today = jstToday();
  const g = goal || { icon: '🎯', title: '', targetValue: '', unit: '回', dueDate: addDays(today, 30) };
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="${goal ? `#/goals/${goal.id}` : '#/goals'}" aria-label="戻る">${icon('chevronLeft', { size: 22 })}</a>
      <div><h1 class="page-title small">${goal ? '目標を編集' : '新しい目標'}</h1></div>
      <span></span>
    </header>

    ${goal ? '' : html`
      <section class="card">
        <h2 class="card-title small">例からえらぶ</h2>
        <div class="presets">${PRESETS.map((p, i) => html`<button class="chip" data-action="preset" data-i="${i}">${p.icon} ${p.title}</button>`)}</div>
      </section>`}

    <form class="card goal-form" novalidate>
      <div class="field">
        <span class="field-label">アイコン</span>
        <div class="icon-pick">${ICONS.map((ic) => html`<button type="button" class="icon-opt ${ic === g.icon ? 'on' : ''}" data-action="icon" data-icon="${ic}">${ic}</button>`)}</div>
        <input type="hidden" name="icon" value="${g.icon}">
      </div>
      <label class="field">
        <span class="field-label">目標</span>
        <input class="input" name="title" maxlength="60" required placeholder="例: 英単語を覚える" value="${g.title}">
      </label>
      <div class="field-row">
        <label class="field">
          <span class="field-label">目標の量</span>
          <input class="input" name="targetValue" type="number" inputmode="decimal" min="0.01" step="any" required placeholder="例: 300" value="${g.targetValue}">
        </label>
        <label class="field field-unit">
          <span class="field-label">単位</span>
          <input class="input" name="unit" maxlength="10" placeholder="回" value="${g.unit}" list="unit-list">
          <datalist id="unit-list">${['回', '日', '時間', '分', '冊', 'ページ', '本', '個', 'km', 'kg'].map((u) => html`<option value="${u}">`)}</datalist>
        </label>
      </div>
      <label class="field">
        <span class="field-label">達成期限</span>
        <input class="input" name="dueDate" type="date" required min="${goal ? '' : today}" value="${g.dueDate}">
      </label>
      <div class="due-quick">
        ${[['2週間', 14], ['1か月', 30], ['3か月', 90], ['半年', 182]].map(([l, d]) => html`<button type="button" class="chip" data-action="due" data-d="${d}">${l}</button>`)}
      </div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-primary btn-block btn-lg" type="submit">${goal ? '保存する' : '目標をつくる'}</button>
    </form>
  `);

  const form = $('form', root);
  const err = $('.form-error', root);
  const setIcon = (ic) => {
    form.icon.value = ic;
    $$('.icon-opt', root).forEach((b) => b.classList.toggle('on', b.dataset.icon === ic));
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const body = {
      icon: form.icon.value,
      title: form.title.value,
      targetValue: Number(form.targetValue.value),
      unit: form.unit.value,
      dueDate: form.dueDate.value,
    };
    const btn = $('button[type=submit]', form);
    btn.classList.add('loading');
    try {
      const res = goal
        ? await api(`/goals/${goal.id}`, { method: 'PATCH', body })
        : await api('/goals', { method: 'POST', body });
      toast(goal ? '保存しました' : '目標をつくりました。一歩ずつ進めましょう！');
      navigate(`/goals/${res.goal.id}`, { replace: true });
    } catch (e2) {
      err.textContent = e2.code === 'plan_limit' ? `${e2.message}。達成・アーカイブすると新しい目標を追加できます` : e2.message;
      err.hidden = false;
    } finally {
      btn.classList.remove('loading');
    }
  });

  return onAction(root, {
    icon: (el) => setIcon(el.dataset.icon),
    preset: (el) => {
      const p = PRESETS[Number(el.dataset.i)];
      setIcon(p.icon);
      form.title.value = p.title;
      form.targetValue.value = p.target;
      form.unit.value = p.unit;
      form.dueDate.value = addDays(today, p.days);
      form.title.focus();
    },
    due: (el) => {
      form.dueDate.value = addDays(today, Number(el.dataset.d));
    },
  });
}

export async function render(root, { id, query }, { navigate }) {
  if (!id) return goalForm(root, { navigate });
  let { goal, logs } = await api(`/goals/${id}`);
  if (query.get('edit') === '1') return goalForm(root, { goal, navigate });

  const draw = () => {
    mount(root, html`
      <header class="page-head with-back">
        <a class="icon-btn" href="#/goals" aria-label="目標一覧へ">${icon('chevronLeft', { size: 22 })}</a>
        <div><h1 class="page-title small">目標</h1></div>
        <a class="icon-btn" href="#/goals/${goal.id}?edit=1" aria-label="編集">${icon('edit', { size: 20 })}</a>
      </header>

      <section class="card goal-hero ${goal.status}">
        <div class="goal-hero-icon">${goal.icon}</div>
        <h2 class="goal-hero-title">${goal.title}</h2>
        <div class="ring" style="--p:${Math.round(goal.progress * 100)}">
          <div class="ring-inner">
            <strong>${Math.round(goal.progress * 100)}<small>%</small></strong>
            <span>${fmtNum(goal.currentValue)} / ${fmtNum(goal.targetValue)} ${goal.unit}</span>
          </div>
        </div>
        <div class="goal-hero-meta">
          ${paceLabel(goal)}
          <span>${goal.status === 'done' ? '達成済み' : goal.daysLeft < 0 ? `期限から${-goal.daysLeft}日経過` : goal.daysLeft === 0 ? '今日が期限' : `期限まであと${goal.daysLeft}日`}</span>
        </div>
      </section>

      ${goal.status === 'active' ? html`
        <section class="card">
          <h2 class="card-title small">進捗を記録</h2>
          <div class="progress-add">
            ${[1, 5, 10].map((n) => html`<button class="btn btn-soft" data-action="add" data-n="${n}">+${n}${goal.unit}</button>`)}
          </div>
          <form class="progress-custom">
            <input class="input input-num" name="delta" type="number" inputmode="decimal" step="any" placeholder="数値">
            <span>${goal.unit}</span>
            <button class="btn btn-primary btn-sm" type="submit">加える</button>
          </form>
          <a class="link block" href="#/write?goal=${goal.id}">${icon('edit', { size: 16 })}記録を書いて進捗をつける</a>
        </section>` : ''}

      <section class="card">
        <h2 class="card-title small">これまでの歩み</h2>
        ${logs.length ? html`<ul class="log-list">${logs.map((l) => html`
          <li><span class="log-date">${fmtRelDate(l.local_date)}</span>
            <span class="log-delta ${l.delta < 0 ? 'neg' : ''}">${l.delta > 0 ? '+' : ''}${fmtNum(l.delta)}${goal.unit}</span>
            ${l.entry_id ? html`<a class="link" href="#/entries/${l.entry_id}">記録を見る</a>` : ''}</li>`)}</ul>`
          : html`<p class="muted">まだ進捗がありません。小さな一歩から始めましょう。</p>`}
      </section>

      <div class="danger-zone">
        ${goal.status !== 'archived'
          ? html`<button class="btn btn-ghost btn-sm" data-action="archive">アーカイブ</button>`
          : html`<button class="btn btn-ghost btn-sm" data-action="unarchive">取り組み中に戻す</button>`}
        <button class="btn btn-ghost btn-sm danger" data-action="delete">削除</button>
      </div>
    `);
    $('.progress-custom', root)?.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = Number(e.target.delta.value);
      if (!v) return toast('数値を入力してください');
      addProgress(v);
    });
  };

  async function addProgress(delta) {
    try {
      const res = await api(`/goals/${goal.id}/progress`, { method: 'POST', body: { delta } });
      ({ goal, logs } = await api(`/goals/${id}`));
      draw();
      if (res.justCompleted) {
        celebrate();
        toast('目標達成、おめでとうございます！🎉', { ms: 4000 });
      } else toast(`+${delta}${goal.unit} 記録しました`);
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  draw();

  return onAction(root, {
    add: (el) => addProgress(Number(el.dataset.n)),
    archive: async () => {
      const ok = await confirmSheet({ title: 'アーカイブしますか？', message: '一覧から外れますが、記録や進捗は残ります。', ok: 'アーカイブ' });
      if (!ok) return;
      await api(`/goals/${goal.id}`, { method: 'PATCH', body: { status: 'archived' } });
      navigate('/goals', { replace: true });
    },
    unarchive: async () => {
      try {
        ({ goal } = await api(`/goals/${goal.id}`, { method: 'PATCH', body: { status: 'active' } }));
        draw();
      } catch (err) {
        toast(err.message, { type: 'error' });
      }
    },
    delete: async () => {
      const ok = await confirmSheet({ title: 'この目標を削除しますか？', message: '進捗の履歴も削除されます（記録そのものは残ります）。', ok: '削除する', danger: true });
      if (!ok) return;
      await api(`/goals/${goal.id}`, { method: 'DELETE' });
      toast('削除しました');
      navigate('/goals', { replace: true });
    },
  });
}
