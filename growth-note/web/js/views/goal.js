import { api } from '../api.js';
import { html, mount, $, onAction, toast, progressBar, fmtNum, fmtRelDate, jstToday, addDays, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';
import { paceLabel } from './goals.js';

const PRESETS = [
  { title: '本を読む', target: 5, unit: '冊', days: 60 },
  { title: 'トレーニングする', target: 20, unit: '回', days: 30 },
  { title: '資格の勉強をする', target: 30, unit: '時間', days: 60 },
  { title: '発信・アウトプットする', target: 10, unit: '本', days: 30 },
  { title: '楽器を練習する', target: 20, unit: '日', days: 30 },
  { title: '体重を落とす', target: 3, unit: 'kg', days: 90 },
];

function goalForm(root, { goal, navigate }) {
  const today = jstToday();
  const g = goal || { title: '', targetValue: '', unit: '回', dueDate: addDays(today, 30) };
  mount(root, html`
    <header class="page-head with-back">
      <a class="icon-btn" href="${goal ? `#/goals/${goal.id}` : '#/goals'}" aria-label="戻る">${icon('caretLeft', { size: 20 })}</a>
      <div class="page-head-main"><h1 class="page-title page-title-sm">${goal ? '目標を編集' : '目標を作成'}</h1></div>
    </header>

    ${goal ? '' : html`
      <section class="section">
        <h2 class="section-title">例から選ぶ</h2>
        <div class="chips">${PRESETS.map((p, i) => html`<button class="chip" data-action="preset" data-i="${i}">${p.title}</button>`)}</div>
      </section>`}

    <form class="form" novalidate>
      <label class="field">
        <span class="field-label">目標</span>
        <input class="input" name="title" maxlength="60" required placeholder="例: 英単語を覚える" value="${g.title}">
      </label>
      <div class="field-row">
        <label class="field">
          <span class="field-label">目標の量</span>
          <input class="input" name="targetValue" type="number" inputmode="decimal" min="0.01" step="any" required placeholder="300" value="${g.targetValue}">
        </label>
        <label class="field field-unit">
          <span class="field-label">単位</span>
          <input class="input" name="unit" maxlength="10" placeholder="回" value="${g.unit}" list="unit-list">
          <datalist id="unit-list">${['回', '日', '時間', '分', '冊', 'ページ', '本', '個', 'km', 'kg'].map((u) => html`<option value="${u}">`)}</datalist>
        </label>
      </div>
      <div class="field">
        <label class="field-label" for="goal-due">期限</label>
        <input class="input" id="goal-due" name="dueDate" type="date" required min="${goal ? '' : today}" value="${g.dueDate}">
        <div class="chips">
          ${[['2週間', 14], ['1か月', 30], ['3か月', 90], ['半年', 182]].map(([l, d]) => html`<button type="button" class="chip" data-action="due" data-d="${d}">${l}</button>`)}
        </div>
      </div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${goal ? '保存' : '目標を作成'}</button>
    </form>
  `);

  const form = $('form', root);
  const err = $('.form-error', root);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const body = {
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
      toast(goal ? '保存しました' : '目標を作成しました');
      navigate(`/goals/${res.goal.id}`, { replace: true });
    } catch (e2) {
      err.textContent = e2.code === 'plan_limit' ? `${e2.message}。達成・アーカイブすると新しい目標を追加できます` : e2.message;
      err.hidden = false;
    } finally {
      btn.classList.remove('loading');
    }
  });

  return onAction(root, {
    preset: (el) => {
      const p = PRESETS[Number(el.dataset.i)];
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
    const pct = Math.round(goal.progress * 100);
    mount(root, html`
      <header class="page-head with-back">
        <a class="icon-btn" href="#/goals" aria-label="目標一覧へ戻る">${icon('caretLeft', { size: 20 })}</a>
        <div class="page-head-main"><p class="eyebrow">目標</p><h1 class="page-title page-title-sm">${goal.title}</h1></div>
        <a class="icon-btn" href="#/goals/${goal.id}?edit=1" aria-label="編集">${icon('pencil', { size: 20 })}</a>
      </header>

      <section class="section">
        <div class="metric metric-xl"><span class="metric-value">${pct}</span><span class="metric-unit">%</span></div>
        ${progressBar(goal.progress, { cls: goal.status !== 'done' && (goal.pace === 'behind' || goal.pace === 'overdue') ? 'progress-warn' : '' })}
        <dl class="stat-row">
          <div><dt>現在</dt><dd>${fmtNum(goal.currentValue)}<small>${goal.unit}</small></dd></div>
          <div><dt>目標</dt><dd>${fmtNum(goal.targetValue)}<small>${goal.unit}</small></dd></div>
          <div><dt>${goal.status === 'done' ? '状態' : '期限まで'}</dt><dd>${goal.status === 'done' ? '達成' : goal.daysLeft < 0 ? html`<span class="text-error">超過</span>` : html`${goal.daysLeft}<small>日</small>`}</dd></div>
        </dl>
        <p class="page-sub">${paceLabel(goal)}</p>
      </section>

      ${goal.status === 'active' ? html`
        <section class="section">
          <h2 class="section-title">進捗を記録</h2>
          <div class="btn-row">
            ${[1, 5, 10].map((n) => html`<button class="btn btn-secondary" data-action="add" data-n="${n}">+${n} ${goal.unit}</button>`)}
          </div>
          <form class="inline-fields progress-custom">
            <input class="input input-num" name="delta" type="number" inputmode="decimal" step="any" placeholder="数値" aria-label="加える量">
            <span>${goal.unit}</span>
            <button class="btn btn-primary" type="submit">加える</button>
          </form>
          <a class="text-btn" href="#/write?goal=${goal.id}">記録を書いて進捗をつける</a>
        </section>` : ''}

      <section class="section">
        <h2 class="section-title">履歴</h2>
        ${logs.length ? html`<ul class="list log-list">${logs.map((l) => html`
          <li class="row"><span class="row-main"><span class="row-title">${fmtRelDate(l.local_date)}</span></span>
            <span class="row-value ${l.delta < 0 ? 'text-error' : ''}">${l.delta > 0 ? '+' : ''}${fmtNum(l.delta)}<small>${goal.unit}</small></span>
            ${l.entry_id ? html`<a class="text-btn" href="#/entries/${l.entry_id}">記録</a>` : ''}</li>`)}</ul>`
          : html`<p class="muted">まだ進捗はありません。</p>`}
      </section>

      <div class="quiet-actions">
        ${goal.status !== 'archived'
          ? html`<button class="text-btn" data-action="archive">アーカイブ</button>`
          : html`<button class="text-btn" data-action="unarchive">取り組み中に戻す</button>`}
        <button class="text-btn text-btn-danger" data-action="delete">削除</button>
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
      toast(res.justCompleted ? '目標を達成しました' : `+${fmtNum(delta)}${goal.unit} 記録しました`, { ms: res.justCompleted ? 4000 : 2600 });
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
