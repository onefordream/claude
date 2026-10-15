import { api, uploadFile } from '../api.js';
import { html, mount, $, $$, onAction, toast, fmtDate, jstToday, addDays, MOODS, fmtBytes, confirmSheet } from '../ui.js';
import { icon } from '../icons.js';

const DRAFT_KEY = 'gn:draft';
const MB = 1024 * 1024;

const STARTERS = [
  { label: 'やったこと', text: '今日やったこと：' },
  { label: 'うまくいった', text: 'うまくいったこと：' },
  { label: '気づき', text: '気づいたこと：' },
  { label: 'つまずき', text: 'つまずいたこと：' },
  { label: '次やること', text: '次に試したいこと：' },
];

// 保存直後のお祝い表示に使う（記録詳細画面へ受け渡す）
let pendingCelebration = null;
export function takeCelebration() {
  const c = pendingCelebration;
  pendingCelebration = null;
  return c;
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || {};
  } catch {
    return {};
  }
}
function saveDraft(d) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* noop */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
}

const EXT_TYPES = { heic: 'image/heic', heif: 'image/heif', mov: 'video/quicktime', m4a: 'audio/mp4', mp3: 'audio/mpeg', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', webm: 'video/webm' };
function guessType(file) {
  if (file.type) return file.type;
  return EXT_TYPES[(file.name.split('.').pop() || '').toLowerCase()] || '';
}
const kindOf = (type) => (type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : null);

/** 写真はブラウザ側で長辺1600pxに縮小してから送る（通信量と保存容量の節約） */
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * MB) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function render(root, { query }, { state, navigate }) {
  const today = jstToday();
  const draft = loadDraft();
  const limits = state.me.plan.limits;
  const [goalsRes, linksRes] = await Promise.all([
    api('/goals?status=active').catch(() => ({ goals: [] })),
    api('/links').catch(() => ({ links: [] })),
  ]);
  const goals = goalsRes.goals;
  const activeLinks = linksRes.links.filter((l) => l.status === 'active');

  const form = {
    body: draft.body || '',
    mood: draft.mood || null,
    date: draft.date && draft.date >= addDays(today, -6) && draft.date <= today ? draft.date : today,
    goalId: query.get('goal') || draft.goalId || '',
    goalDelta: draft.goalDelta ?? 1,
    // 共有先: 「すべて共有」にしている店舗は最初から選択しておく
    storeIds: new Set(activeLinks.filter((l) => l.shareMode === 'all').map((l) => l.store.id)),
  };
  if (form.goalId && !goals.some((g) => g.id === form.goalId)) form.goalId = '';
  /** @type {{key:string, file?:File, kind:string, previewUrl?:string, progress:number, id?:string, error?:string, size:number}[]} */
  const attachments = [];
  let saving = false;
  let recorder = null;
  let recognition = null;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canRecord = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, -i));

  mount(root, html`
    <header class="focus-head">
      <button class="icon-btn" data-action="close" aria-label="閉じる">${icon('x', { size: 20 })}</button>
      <div class="focus-head-title">
        <span>記録を追加</span>
        <span class="select select-inline"><select class="date-select" name="date" aria-label="記録する日">
          ${dates.map((d, i) => html`<option value="${d}" ${d === form.date ? 'selected' : ''}>${i === 0 ? '今日 ' : i === 1 ? '昨日 ' : ''}${fmtDate(d)}</option>`)}
        </select></span>
      </div>
      <button class="text-btn" data-action="save">保存</button>
    </header>

    ${query.get('welcome') ? html`
      <section class="notice">
        <p class="notice-title">最初の記録です</p>
        <p class="notice-text">今日のことを短い一文で残してください。あとから写真や声も添えられます。</p>
      </section>` : ''}

    <section class="section">
      <div class="starters" role="group" aria-label="書き出し">${STARTERS.map((s, i) => html`<button class="chip" data-action="starter" data-i="${i}">${s.label}</button>`)}</div>
      <textarea class="write-text" name="body" rows="6" maxlength="5000" placeholder="今日やったこと、気づいたこと" aria-label="本文">${form.body}</textarea>
      <div class="write-tools">
        ${SR ? html`<button class="text-btn" data-action="dictate" aria-pressed="false">${icon('mic', { size: 16 })}<span>音声で入力</span></button>` : html`<span></span>`}
        <span class="char-count"><span data-count>${form.body.length}</span> / 5000</span>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">添付</h2>
      <div class="attach-row">
        <label class="attach-btn">${icon('camera', { size: 20 })}<span>写真</span>
          <input type="file" accept="image/*" multiple hidden data-input="image"></label>
        <label class="attach-btn">${icon('video', { size: 20 })}<span>動画</span>
          <input type="file" accept="video/*" hidden data-input="video"></label>
        ${canRecord
          ? html`<button class="attach-btn" data-action="record">${icon('mic', { size: 20 })}<span>音声メモ</span></button>`
          : html`<label class="attach-btn">${icon('mic', { size: 20 })}<span>音声メモ</span>
              <input type="file" accept="audio/*" hidden data-input="audio"></label>`}
      </div>
      <div class="recorder" hidden>
        <span class="rec-dot" aria-hidden="true"></span><span class="rec-time">0:00</span><span class="rec-label">録音中</span>
        <button class="btn btn-secondary btn-sm" data-action="stop-record">${icon('stop', { size: 16 })}停止</button>
      </div>
      <div class="attach-list"></div>
      <p class="hint">写真 ${limits.maxImageMB}MB・動画 ${limits.maxVideoMB}MB・音声 ${limits.maxAudioMB}MB まで</p>
    </section>

    <section class="section">
      <h2 class="section-title">気分</h2>
      <div class="scale" role="group" aria-label="気分">
        ${MOODS.map((m) => html`<button class="scale-opt mood ${form.mood === m.v ? 'on' : ''}" data-action="mood" data-v="${m.v}" aria-pressed="${form.mood === m.v}">${m.label}</button>`)}
      </div>
    </section>

    ${activeLinks.length ? html`
      <section class="section">
        <h2 class="section-title">教室・お店に共有</h2>
        <div class="chips">
          ${activeLinks.map((l) => html`<button class="chip ${form.storeIds.has(l.store.id) ? 'on' : ''}" data-action="share" data-id="${l.store.id}" aria-pressed="${form.storeIds.has(l.store.id)}">${l.store.name}</button>`)}
        </div>
        <p class="hint">選んだ店舗の先生がこの記録を見て、コメントできるようになります。</p>
      </section>` : ''}

    ${goals.length ? html`
      <section class="section">
        <h2 class="section-title">目標に反映</h2>
        <div class="chips goal-pick">
          <button class="chip ${!form.goalId ? 'on' : ''}" data-action="goal" data-id="">なし</button>
          ${goals.map((g) => html`<button class="chip ${form.goalId === g.id ? 'on' : ''}" data-action="goal" data-id="${g.id}">${g.title}</button>`)}
        </div>
        <div class="inline-fields goal-delta" ${form.goalId ? '' : 'hidden'}>
          <span>進捗に</span>
          <input class="input input-num" type="number" inputmode="decimal" min="0" step="any" name="goalDelta" value="${form.goalDelta}" aria-label="加える量">
          <span data-unit>${goals.find((g) => g.id === form.goalId)?.unit || ''}</span>
          <span>を加える</span>
        </div>
      </section>` : ''}

    <div class="form-foot">
      <button class="btn btn-primary btn-lg btn-block" data-action="save">記録する</button>
      <a class="row row-plain" href="#/golf/new">
        <span class="row-main"><span class="row-title">ゴルフのラウンドを記録</span><span class="row-sub">スコア・パット・FWキープなど</span></span>${icon('caretRight', { size: 16 })}</a>
    </div>
  `);

  const textarea = $('textarea', root);
  const persist = () => saveDraft({ body: form.body, mood: form.mood, date: form.date, goalId: form.goalId, goalDelta: form.goalDelta });
  const autosize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(150, textarea.scrollHeight) + 'px';
  };
  textarea.addEventListener('input', () => {
    form.body = textarea.value;
    $('[data-count]', root).textContent = form.body.length;
    autosize();
    persist();
  });
  autosize();
  if (!form.body) setTimeout(() => textarea.focus({ preventScroll: true }), 150);

  $('.date-select', root).addEventListener('change', (e) => {
    form.date = e.target.value;
    persist();
  });
  const deltaInput = $('input[name=goalDelta]', root);
  deltaInput?.addEventListener('input', () => {
    form.goalDelta = deltaInput.value;
    persist();
  });

  // ---- 添付 ----
  const list = $('.attach-list', root);
  function renderAttachments() {
    mount(list, attachments.map((a) => html`
      <div class="attach-item ${a.error ? 'error' : ''} ${a.id ? 'ready' : ''}">
        <div class="attach-thumb">
          ${a.kind === 'image' && a.previewUrl ? html`<img src="${a.previewUrl}" alt="">`
            : a.kind === 'video' ? icon('video', { size: 20 }) : icon('mic', { size: 20 })}
        </div>
        <div class="attach-info">
          <span class="attach-name">${a.kind === 'image' ? '写真' : a.kind === 'video' ? '動画' : '音声メモ'} ・ ${fmtBytes(a.size)}</span>
          ${a.error ? html`<span class="attach-err">${a.error}</span>`
            : a.id ? html`<span class="attach-ok">アップロード済み</span>`
            : html`<div class="progress"><div class="progress-bar" style="--p:${Math.round(a.progress * 100)}%"></div></div>`}
        </div>
        <button class="icon-btn" data-action="remove-attach" data-key="${a.key}" aria-label="取り消す">${icon('x', { size: 16 })}</button>
      </div>`));
  }

  async function addFile(file, forcedKind) {
    const type = guessType(file);
    const kind = kindOf(type) || forcedKind;
    if (!kind) return toast('この形式のファイルは添付できません', { type: 'error' });
    const a = { key: Math.random().toString(36).slice(2), kind, progress: 0, size: file.size };
    attachments.push(a);
    if (kind === 'image') {
      file = await shrinkImage(file);
      a.size = file.size;
      a.previewUrl = URL.createObjectURL(file);
    }
    const limitMB = { image: limits.maxImageMB, video: limits.maxVideoMB, audio: limits.maxAudioMB }[kind];
    if (file.size > limitMB * MB) {
      a.error = `${limitMB}MBを超えています`;
      return renderAttachments();
    }
    renderAttachments();
    try {
      const res = await uploadFile(file, {
        contentType: type || file.type,
        onProgress: (p) => {
          a.progress = p;
          const bar = list.querySelector(`[data-key="${a.key}"]`)?.closest('.attach-item')?.querySelector('.progress-bar');
          if (bar) bar.style.setProperty('--p', `${Math.round(p * 100)}%`);
        },
      });
      if (!attachments.includes(a)) {
        api(`/media/${res.id}`, { method: 'DELETE' }).catch(() => {});
        return;
      }
      a.id = res.id;
    } catch (err) {
      a.error = err.message;
    }
    renderAttachments();
  }

  $$('input[type=file]', root).forEach((input) => {
    input.addEventListener('change', () => {
      [...input.files].slice(0, 10 - attachments.length).forEach((f) => addFile(f, input.dataset.input));
      input.value = '';
    });
  });

  // ---- 音声メモの録音 ----
  async function startRecording() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return toast('マイクを使えませんでした。ブラウザの設定をご確認ください', { type: 'error' });
    }
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
    const chunks = [];
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const started = Date.now();
    const box = $('.recorder', root);
    const timeEl = $('.rec-time', root);
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - started) / 1000);
      timeEl.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      if (sec >= 300) stopRecording(); // 5分で自動停止
    }, 250);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      box.hidden = true;
      const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
      if (chunks.length) addFile(new File(chunks, `voice.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type }), 'audio');
    };
    rec.start(1000);
    box.hidden = false;
    recorder = rec;
  }
  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder = null;
  }

  // ---- 音声入力（文字起こし） ----
  function toggleDictation(btn) {
    if (recognition) {
      recognition.stop();
      return;
    }
    const r = new SR();
    r.lang = 'ja-JP';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (!text) return;
      textarea.value = (textarea.value ? textarea.value.replace(/\s*$/, '') + (/[。！？\n]$/.test(textarea.value.trim()) ? '' : '。') : '') + text;
      textarea.dispatchEvent(new Event('input'));
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed') toast('マイクの使用が許可されていません', { type: 'error' });
    };
    r.onend = () => {
      recognition = null;
      btn.classList.remove('on');
      btn.setAttribute('aria-pressed', 'false');
      $('span', btn).textContent = '音声で入力';
    };
    r.start();
    recognition = r;
    btn.classList.add('on');
    btn.setAttribute('aria-pressed', 'true');
    $('span', btn).textContent = '聞き取り中（タップで終了）';
  }

  async function save() {
    if (saving) return;
    if (attachments.some((a) => !a.id && !a.error)) return toast('アップロードが終わるまでお待ちください');
    const mediaIds = attachments.filter((a) => a.id).map((a) => a.id);
    if (!form.body.trim() && !mediaIds.length) {
      textarea.focus();
      return toast('本文か添付を入力してください');
    }
    if (attachments.some((a) => a.error)) {
      const ok = await confirmSheet({ title: '一部の添付がアップロードできていません', message: 'アップロードできたものだけで記録しますか？', ok: '記録する' });
      if (!ok) return;
    }
    saving = true;
    $$('[data-action=save]', root).forEach((b) => b.classList.add('loading'));
    try {
      const res = await api('/entries', {
        method: 'POST',
        body: {
          body: form.body,
          mood: form.mood,
          date: form.date,
          mediaIds,
          goalId: form.goalId || null,
          storeIds: [...form.storeIds],
          goalDelta: form.goalId ? Number(form.goalDelta) || 0 : 0,
        },
      });
      clearDraft();
      pendingCelebration = res.celebration;
      navigate(`/entries/${res.entry.id}?new=1`, { replace: true });
    } catch (err) {
      toast(err.message, { type: 'error' });
    } finally {
      saving = false;
      $$('[data-action=save]', root).forEach((b) => b.classList.remove('loading'));
    }
  }

  const off = onAction(root, {
    close: () => navigate('/'),
    save,
    starter: (el) => {
      const s = STARTERS[Number(el.dataset.i)];
      const v = textarea.value;
      textarea.value = v + (v && !v.endsWith('\n') ? '\n' : '') + s.text;
      textarea.dispatchEvent(new Event('input'));
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    },
    mood: (el) => {
      const v = Number(el.dataset.v);
      form.mood = form.mood === v ? null : v;
      $$('.mood', root).forEach((b) => {
        const on = Number(b.dataset.v) === form.mood;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      persist();
    },
    share: (el) => {
      const sid = el.dataset.id;
      if (form.storeIds.has(sid)) form.storeIds.delete(sid);
      else form.storeIds.add(sid);
      el.classList.toggle('on', form.storeIds.has(sid));
      el.setAttribute('aria-pressed', String(form.storeIds.has(sid)));
    },
    goal: (el) => {
      form.goalId = el.dataset.id;
      $$('.goal-pick .chip', root).forEach((b) => {
        b.classList.toggle('on', b.dataset.id === form.goalId);
        b.setAttribute('aria-pressed', String(b.dataset.id === form.goalId));
      });
      const box = $('.goal-delta', root);
      box.hidden = !form.goalId;
      $('[data-unit]', box).textContent = goals.find((g) => g.id === form.goalId)?.unit || '';
      persist();
    },
    dictate: toggleDictation,
    record: () => (recorder ? stopRecording() : startRecording()),
    'stop-record': stopRecording,
    'remove-attach': (el) => {
      const i = attachments.findIndex((a) => a.key === el.dataset.key);
      if (i < 0) return;
      const [a] = attachments.splice(i, 1);
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      if (a.id) api(`/media/${a.id}`, { method: 'DELETE' }).catch(() => {});
      renderAttachments();
    },
  });

  return () => {
    off();
    stopRecording();
    recognition?.stop();
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
  };
}
