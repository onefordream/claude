// ============================================================================
// icons.mjs — サイト内で使い回すインラインSVGアイコン
// ============================================================================

export const ARROW_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const PIN_ICON = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 18s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="8" r="2.2" stroke="currentColor" stroke-width="1.4"/></svg>`;

export const INSTAGRAM_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>`;

export const LOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.6"/></svg>`;

function laurelBranch() {
  return [4, 9, 14, 19, 24]
    .map((y, i) => `<ellipse cx="${9 - i * 0.6}" cy="${y}" rx="3.2" ry="1.5" transform="rotate(${-40 + i * 8} ${9 - i * 0.6} ${y})" fill="currentColor"/>`)
    .join("");
}

export function laurelIcon(cls = "") {
  return `<svg class="${cls}" viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g transform="translate(4,0)"><path d="M2 30C10 24 12 12 10 2" stroke="currentColor" stroke-width="1.3" fill="none"/>${laurelBranch()}</g>
  <g transform="translate(60,0) scale(-1,1)"><path d="M2 30C10 24 12 12 10 2" stroke="currentColor" stroke-width="1.3" fill="none"/>${laurelBranch()}</g>
</svg>`;
}
