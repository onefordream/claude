const api = {
  async request(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      if (typeof body === 'string') {
        opts.headers['Content-Type'] = 'text/csv';
        opts.body = body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch(url, opts);
    if (res.status === 204) return null;
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new Error((data && data.error) || `リクエストに失敗しました (${res.status})`);
    }
    return data;
  },
  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  del(url) { return this.request('DELETE', url); },
};

function toast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'toast' + (isError ? ' error' : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.classList.add('hidden'); }, 3500);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(iso) {
  if (!iso) return '-';
  return iso.replace('T', ' ').slice(0, 16);
}

const STAGE_LABELS = {
  research: 'リサーチ中',
  listed: 'リスト化済',
  contacted: 'アプローチ中',
  replied: '返信あり',
  negotiating: '商談中',
  won: '成約',
  lost: '失注',
  ng: 'NG',
};

const CHANNEL_LABELS = {
  email: 'メール',
  dm: 'DM',
  instagram_dm: 'Instagram DM',
  phone: '電話',
  visit: '訪問',
  other: 'その他',
};

const STATUS_LABELS = {
  sent: '送信済み',
  opened: '開封',
  replied: '返信あり',
  no_response: '反応なし',
  booked: '商談化',
  declined: 'お断り',
  failed: '失敗',
};
