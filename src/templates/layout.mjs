// ============================================================================
// layout.mjs — 共通レイアウト（<head> / ヘッダー / フッター / モバイルCTA）
// ============================================================================

import { site } from "../data/site.mjs";
import { esc } from "../lib/render.mjs";

const NAV_LINKS = [
  { href: "/#about", en: "ABOUT", ja: "大会について" },
  { href: "/#players", en: "PLAYERS", ja: "出場プロ" },
  { href: "/#info", en: "TOURNAMENT", ja: "大会概要" },
  { href: "/#entry", en: "ENTRY", ja: "エントリー" },
  { href: "/#sponsors", en: "SPONSORS", ja: "スポンサー" },
  { href: "/#first", en: "1st TOURNAMENT", ja: "第1回大会" },
  { href: "/news/", en: "NEWS", ja: "お知らせ" },
];

const FOOTER_LINKS = [
  ...NAV_LINKS,
  { href: "/#prize", en: "PRIZE", ja: "賞金・賞品" },
  { href: "/#schedule", en: "SCHEDULE", ja: "スケジュール" },
  { href: "/#gallery", en: "GALLERY", ja: "ギャラリー" },
  { href: "/#faq", en: "FAQ", ja: "よくある質問" },
  { href: "/#access", en: "ACCESS", ja: "アクセス" },
];

const GOLFER_ICON = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="19.5" cy="7" r="2.6" fill="currentColor"/>
  <path d="M17 11.5 12 15l1.6 2 3.9-2.7 2 3.2-3.5 6.4M17 11.5l4.5 1.4-1 4.6M12 15l-4.5 2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M21.5 12.9 27 6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M4 25.5h24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const ARROW_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderHead({ title, description, path = "/", ogImage } = {}) {
  const fullTitle = title || site.seo.title;
  const desc = description || site.seo.description;
  const url = `${site.seo.siteUrl}${path}`;
  const image = `${site.seo.siteUrl}${ogImage || site.seo.ogImage}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: site.nameJa,
    alternateName: site.nameEn,
    startDate: `${site.eventDate}T06:30:00+09:00`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: site.venue.name,
      ...(site.venue.address ? { address: site.venue.address } : {}),
    },
    organizer: {
      "@type": "Organization",
      name: site.organizer.name,
    },
    description: desc,
    image: [image],
  };

  return `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${esc(url)}" />
<meta name="theme-color" content="#1C1A22" />
<meta name="robots" content="index, follow" />

<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />

<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(fullTitle)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="${esc(site.seo.locale)}" />
<meta property="og:site_name" content="${esc(site.shortName)}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(fullTitle)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(image)}" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet" />

<link rel="stylesheet" href="/css/main.css" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
`;
}

export function renderHeader() {
  return `
<header class="site-header" id="site-header" data-header>
  <div class="site-header__inner container">
    <a href="/" class="brand" aria-label="${esc(site.shortName)} トップへ">
      <span class="brand__mark">${GOLFER_ICON}</span>
      <span class="brand__text">
        <span class="brand__name">SHADOW LADIES</span>
        <span class="brand__edition">PRO-AM TOURNAMENT</span>
      </span>
    </a>

    <nav class="nav-desktop" aria-label="メインナビゲーション">
      <ul>
        ${NAV_LINKS.map((l) => `<li><a href="${esc(l.href)}"><span class="nav-desktop__en">${esc(l.en)}</span><span class="nav-desktop__ja">${esc(l.ja)}</span></a></li>`).join("")}
      </ul>
    </nav>

    <div class="site-header__actions">
      <a href="/#entry" class="btn btn--primary btn--sm btn--arrow">エントリーはこちら<span class="btn__arrow">${ARROW_ICON}</span></a>
      <button type="button" class="nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="nav-mobile" aria-label="メニューを開く">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>

  <div class="nav-mobile" id="nav-mobile" data-nav-mobile hidden>
    <nav aria-label="モバイルナビゲーション">
      <ul>
        ${NAV_LINKS.map((l) => `<li><a href="${esc(l.href)}" data-nav-link>${esc(l.en)}<span class="nav-mobile__ja">${esc(l.ja)}</span></a></li>`).join("")}
        <li><a href="/rules/" data-nav-link>RULES<span class="nav-mobile__ja">競技規則</span></a></li>
        <li><a href="/#contact" data-nav-link>CONTACT<span class="nav-mobile__ja">お問い合わせ</span></a></li>
      </ul>
    </nav>
  </div>
</header>`;
}

export function renderFooter() {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__brand">
      <p class="site-footer__title">${esc(site.nameEn)}</p>
      <p class="site-footer__tagline">${esc(site.tagline)}</p>
      <p class="site-footer__organizer">主催：${esc(site.organizer.name)}</p>
    </div>

    <nav class="site-footer__nav" aria-label="フッターナビゲーション">
      <ul>
        ${FOOTER_LINKS.map((l) => `<li><a href="${esc(l.href)}">${esc(l.ja)}</a></li>`).join("")}
        <li><a href="/rules/">競技規則</a></li>
        <li><a href="/#contact">お問い合わせ</a></li>
      </ul>
    </nav>

    <div class="site-footer__contact">
      <p>お問い合わせ</p>
      <a href="${esc(site.contact.phoneHref)}" class="site-footer__phone">${esc(site.contact.phone)}</a>
    </div>
  </div>
  <div class="site-footer__bottom container">
    <p>&copy; ${year} ${esc(site.organizer.name)}</p>
  </div>
</footer>`;
}

export function renderStickyCta() {
  return `
<div class="sticky-cta" data-sticky-cta>
  <a href="/#entry" class="btn btn--primary btn--block">エントリーはこちら</a>
</div>`;
}

export function renderDocument({ title, description, path, ogImage, bodyClass = "", content }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
${renderHead({ title, description, path, ogImage })}
</head>
<body class="${esc(bodyClass)}">
<a href="#main" class="skip-link">本文へスキップ</a>
${renderHeader()}
<main id="main">
${content}
</main>
${renderFooter()}
${renderStickyCta()}
<script type="module" src="/js/main.js"></script>
</body>
</html>`;
}
