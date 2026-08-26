// ============================================================================
// render.mjs — テンプレート共通ユーティリティ
// ============================================================================

/** HTML特殊文字をエスケープする（XSS対策の基本） */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** class 名を条件付きで結合する */
export function cx(...args) {
  return args.filter(Boolean).join(" ");
}

/** 配列を渡してテンプレート関数を map → 結合する簡易ヘルパー */
export function each(list, fn) {
  return list.map(fn).join("\n");
}

export function attr(name, value) {
  if (value === null || value === undefined || value === false) return "";
  if (value === true) return ` ${name}`;
  return ` ${name}="${esc(value)}"`;
}
