// ============================================================================
// admin-shared.mjs — 管理者ページ共通のスタイル・ナビ
// ============================================================================

export const ADMIN_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; background: #f6f5f2; color: #1a1a1a; padding: 1.5rem; }
  h1 { font-size: 1.3rem; margin: 0 0 1rem; }
  h2 { font-size: 1rem; margin: 0 0 0.8rem; }
  .admin-nav { display: flex; gap: 1.2rem; margin-bottom: 1.2rem; }
  .admin-nav a { color: #666; font-size: 0.85rem; text-decoration: none; padding-bottom: 0.3rem; border-bottom: 2px solid transparent; }
  .admin-nav a.active { color: #b93862; border-color: #b93862; font-weight: 700; }
  .summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .summary__card { background: #fff; border-radius: 10px; padding: 0.9rem 1.2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); min-width: 160px; }
  .summary__card dt { font-size: 0.72rem; color: #888; }
  .summary__card dd { margin: 0.2rem 0 0; font-size: 1.3rem; font-weight: 700; }
  .toolbar { margin-bottom: 1rem; display: flex; gap: 0.8rem; align-items: center; }
  .toolbar a { color: #b93862; font-size: 0.85rem; text-decoration: underline; }
  .table-wrap { overflow-x: auto; background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; white-space: nowrap; }
  th, td { padding: 0.55rem 0.8rem; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #faf9f7; font-size: 0.72rem; color: #888; position: sticky; top: 0; }
  .badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .badge--pro { background: #f0e6d2; color: #8a6d1f; }
  .badge--amateur { background: #e6eef0; color: #2f5d66; }
  .badge--confirmed { background: #e3f0e1; color: #2e6b2e; }
  .badge--waitlist { background: #f6e0e0; color: #a13a3a; }
  .empty { padding: 2rem; text-align: center; color: #999; }
  .flash { padding: 0.8rem 1.1rem; border-radius: 8px; margin-bottom: 1.2rem; font-size: 0.85rem; }
  .flash--ok { background: #e3f0e1; color: #2e6b2e; }
  .flash--warn { background: #f6ecd8; color: #8a6d1f; }
  .broadcast { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 1.2rem; margin-top: 1.5rem; max-width: 560px; }
  .broadcast p { font-size: 0.78rem; color: #888; margin: 0 0 0.9rem; }
  .broadcast input[type="text"], .broadcast textarea {
    width: 100%; padding: 0.6rem 0.7rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85rem;
    font-family: inherit; margin-bottom: 0.8rem;
  }
  .broadcast textarea { min-height: 140px; resize: vertical; }
  .broadcast button {
    background: #b93862; color: #fff; border: none; border-radius: 6px; padding: 0.6rem 1.4rem;
    font-size: 0.85rem; font-weight: 700; cursor: pointer;
  }
  .broadcast button:hover { background: #a12e54; }
  .checkbox-col { width: 2rem; }
`;

export function renderAdminNav(active) {
  const links = [
    { href: "/admin/entries", label: "エントリー", key: "entries" },
    { href: "/admin/contacts", label: "お問い合わせ", key: "contacts" },
  ];
  return `<nav class="admin-nav">${links
    .map((l) => `<a href="${l.href}"${l.key === active ? ' class="active"' : ""}>${l.label}</a>`)
    .join("")}</nav>`;
}
