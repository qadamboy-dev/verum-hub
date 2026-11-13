/**
 * pages.js — the four pages of verum.cam as HTML: the hub (index.html), the
 * two legal documents (privacy.html, terms.html) and 404.html.
 *
 * vite.config.js puts renderHead() and renderBody() into each template's
 * <!--hub:head--> and <!--hub:body--> at build time (and on the dev
 * server); the tests call them directly. Every page has the same nav and
 * footer, in the design of e2ee-chat-frontend's Welcome page.
 *
 * Text comes from content/site.js and content/legalContent.js in all three
 * languages at once (t() in html.js); public/hub.js picks one before the
 * body paints. Links are plain <a href>: nothing here needs a script.
 */
import {
  COPY, LANGS, DEFAULT_LANG, LANG_LABEL, SITE_URL, CHAT_URL, NOTES_URL, SUPPORT_EMAIL,
  DEFAULT_APK_PATH,
} from '../content/site.js';
import { DOC_LANG } from '../content/langs.js';
import { LEGAL_COPY, LEGAL_EMAIL, LEGAL_UPDATED } from '../content/legalContent.js';
import { esc, attrs, t, icon, brandLogo, mailto } from './html.js';

export const PAGES = {
  home:     { file: 'index.html',   path: '/' },
  privacy:  { file: 'privacy.html', path: '/privacy' },
  terms:    { file: 'terms.html',   path: '/terms' },
  notFound: { file: '404.html',     path: null },
};

export const LEGAL_DOC_LANGS = ['en', 'ru']; // EN first: the version shown without JS
export const OG_IMAGE = `${SITE_URL}/og-cover.png`;

const PRIVACY_HREF  = '/privacy.html';
const TERMS_HREF    = '/terms.html';
const SECURITY_HREF = '/.well-known/security.txt';

/**
 * The APK link: VITE_ANDROID_APK_URL when it is an https URL (one on
 * files.verum.cam goes through this site's /r2 rewrite, which some
 * networks need), otherwise the bucket path through /r2.
 */
export function resolveApkUrl(configured) {
  const url = String(configured || '').trim();
  if (!/^https:\/\/\S+$/i.test(url)) return DEFAULT_APK_PATH;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'files.verum.cam') return `/r2${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_APK_PATH;
  }
  return url;
}

// ── <head> ───────────────────────────────────────────────────────────────

function titles(page) {
  return Object.fromEntries(LANGS.map((lang) => {
    const c = COPY[lang];
    if (page === 'home') return [lang, c.meta.title];
    if (page === 'notFound') return [lang, `${c.notFound.title} — Verum`];
    // A document's title in the language it is shown in (Uzbek reads RU)
    const name = lang === 'uz' ? c.footer[page] : LEGAL_COPY[DOC_LANG[lang]][page].title;
    return [lang, `${name} — Verum`];
  }));
}

function description(page) {
  if (page === 'home') return COPY.en.meta.description;
  if (page === 'notFound') return COPY.en.notFound.text;
  return LEGAL_COPY.en[page].description;
}

const jsonLd = (data) => JSON.stringify(data, null, 2).replace(/</g, '\\u003c');

function structuredData(page) {
  const org  = { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Verum', url: `${SITE_URL}/`, logo: `${SITE_URL}/icon-512.png`, email: SUPPORT_EMAIL };
  const site = {
    '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'Verum', url: `${SITE_URL}/`,
    inLanguage: [...LANGS], publisher: { '@id': `${SITE_URL}/#organization` },
  };
  if (page === 'home') {
    const chat = {
      '@type': 'SoftwareApplication', '@id': `${CHAT_URL}#app`, name: 'Verum Chat', url: CHAT_URL,
      applicationCategory: 'CommunicationApplication', operatingSystem: 'Web, Android, Android TV',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: COPY.en.products.chat.text,
      publisher: { '@id': `${SITE_URL}/#organization` },
    };
    return { '@context': 'https://schema.org', '@graph': [org, site, chat] };
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [org, site, {
      '@type': 'WebPage', '@id': `${SITE_URL}${PAGES[page].path}#webpage`,
      url: `${SITE_URL}${PAGES[page].path}`, name: titles(page).en, description: description(page),
      inLanguage: [...LEGAL_DOC_LANGS], dateModified: LEGAL_UPDATED,
      isPartOf: { '@id': `${SITE_URL}/#website` }, publisher: { '@id': `${SITE_URL}/#organization` },
    }],
  };
}

export function renderHead(page) {
  if (!PAGES[page]) throw new Error(`renderHead: no page ${page}`);
  const title = titles(page);
  const desc  = description(page);
  const url   = PAGES[page].path ? `${SITE_URL}${PAGES[page].path}` : null;
  const hreflangs = page === 'home' ? [...LANGS, 'x-default'] : [...LEGAL_DOC_LANGS, 'x-default'];
  const lines = [
    `<title>${esc(title[DEFAULT_LANG])}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta name="robots" content="${url ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex'}" />`,
    `<meta name="color-scheme" content="dark" />`,
    `<meta name="theme-color" content="#1f1f23" />`,
    `<meta name="application-name" content="Verum" />`,
  ];
  if (url) {
    lines.push(`<link rel="canonical" href="${url}" />`);
    for (const lang of hreflangs) lines.push(`<link rel="alternate" hreflang="${lang}" href="${url}" />`);
  }
  lines.push(
    '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />',
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />',
    '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />',
    '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
  );
  if (url) {
    lines.push(
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="Verum" />',
      `<meta property="og:title" content="${esc(title.en)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:url" content="${url}" />`,
      '<meta property="og:locale" content="en_US" />',
      '<meta property="og:locale:alternate" content="ru_RU" />',
      '<meta property="og:locale:alternate" content="uz_UZ" />',
      `<meta property="og:image" content="${OG_IMAGE}" />`,
      '<meta property="og:image:type" content="image/png" />',
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      '<meta property="og:image:alt" content="Verum — one account, end-to-end encrypted products" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${esc(title.en)}" />`,
      `<meta name="twitter:description" content="${esc(desc)}" />`,
      `<meta name="twitter:image" content="${OG_IMAGE}" />`,
      `<script type="application/ld+json">\n${jsonLd(structuredData(page))}\n</script>`,
    );
  }
  // public/hub.js sets document.title from these for the chosen language
  for (const lang of LANGS) lines.push(`<meta name="verum:title-${lang}" content="${esc(title[lang])}" />`);
  return lines.join('\n    ');
}

// ── Shared chrome ───────────────────────────────────────────────────────

function langSwitch() {
  const buttons = LANGS.map(lang => `<button${attrs({
    type: 'button', class: 'hub-seg-btn', lang, 'data-set-lang': lang, 'aria-pressed': String(lang === DEFAULT_LANG),
  })}>${LANG_LABEL[lang]}</button>`).join('');
  return `<div class="hub-seg" role="group" aria-labelledby="lang-label"><span id="lang-label" class="sr-only">${t(c => c.nav.lang)}</span>${buttons}</div>`;
}

function nav() {
  return `<a class="skip-link" href="#main">${t(c => c.skip)}</a>
<header class="hub-nav">
  <div class="hub-nav-inner">
    <a class="hub-nav-brand" href="/">${brandLogo({ size: 'nav' })}<span class="hub-pill">${t(c => c.nav.badge)}</span></a>
    <div class="hub-nav-actions">
      ${langSwitch()}
      <a class="btn-primary btn-sm hub-nav-open" href="${CHAT_URL}">${t(c => c.nav.open, { cls: 'label-long' })}${t(c => c.nav.openShort, { cls: 'label-short' })}${icon('ArrowUpRight', { size: 14 })}</a>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="hub-footer">
  <div class="hub-container hub-footer-inner">
    <div class="hub-footer-brand">
      ${brandLogo({ variant: 'full', size: 'footer' })}
      <p class="hub-footer-tagline">${t(c => c.footer.tagline)}</p>
    </div>
    <nav class="hub-footer-col" aria-labelledby="footer-products">
      <p id="footer-products" class="hub-footer-title">${t(c => c.footer.products)}</p>
      <a href="${CHAT_URL}">Verum Chat</a>
      <a href="${NOTES_URL}">Verum Notes</a>
    </nav>
    <nav class="hub-footer-col" aria-labelledby="footer-legal">
      <p id="footer-legal" class="hub-footer-title">${t(c => c.footer.legal)}</p>
      <a href="${PRIVACY_HREF}">${t(c => c.footer.privacy)}</a>
      <a href="${TERMS_HREF}">${t(c => c.footer.terms)}</a>
      <a href="${SECURITY_HREF}">security.txt</a>
    </nav>
    <div class="hub-footer-col">
      <p class="hub-footer-title">${t(c => c.footer.contact)}</p>
      ${mailto(SUPPORT_EMAIL)}
    </div>
  </div>
</footer>`;
}

// ── The hub (index.html) ────────────────────────────────────────────────

const PILLAR_ICONS  = ['UserRound', 'LockKeyhole', 'EyeOff', 'Ban'];
const CHAT_FEATURES = ['Phone', 'Video', 'MapPin', 'Timer', 'QrCode'];
const NOTES_FEATURES = ['FolderTree', 'Link2', 'Waypoints', 'Tags', 'SquareCheckBig'];
const STEP_ICONS    = ['KeyRound', 'LockKeyhole', 'Server', 'Radio'];

function features(key, icons) {
  return `<ul class="hub-features">${icons.map((name, i) => `<li>${icon(name, { size: 15 })}${t(c => c.products[key].features[i])}</li>`).join('')}</ul>`;
}

function hero() {
  const pillars = PILLAR_ICONS.map((name, i) => `<li class="hub-pillar">
        <span class="hub-pillar-icon">${icon(name, { size: 18 })}</span>
        <p class="hub-pillar-title">${t(c => c.hero.pillars[i].title)}</p>
        <p class="hub-pillar-text">${t(c => c.hero.pillars[i].text)}</p>
      </li>`).join('\n      ');
  return `<section class="hub-hero hub-container" aria-labelledby="hero-title">
    <p class="hub-badge">${t(c => c.hero.badge)}</p>
    <h1 id="hero-title" class="hub-title">${t(c => c.hero.title)}</h1>
    <p class="hub-lead">${t(c => c.hero.lead)}</p>
    <div class="hub-cta">
      <a class="btn-primary hub-cta-btn" href="${CHAT_URL}">${t(c => c.hero.open)}${icon('ArrowRight')}</a>
      <a class="btn-secondary hub-cta-btn" href="#products">${t(c => c.hero.products)}</a>
    </div>
    <ul class="hub-pillars">
      ${pillars}
    </ul>
  </section>`;
}

function products(apkUrl) {
  return `<section id="products" class="hub-section hub-container" aria-labelledby="products-title">
    <h2 id="products-title" class="hub-section-title">${t(c => c.products.title)}</h2>
    <p class="hub-section-lead">${t(c => c.products.lead)}</p>
    <div class="hub-products">
      <article class="hub-card hub-product" aria-labelledby="chat-title">
        <div class="hub-product-head">
          <span class="hub-card-icon">${icon('MessagesSquare', { size: 20 })}</span>
          <div class="hub-product-name">
            <h3 id="chat-title" class="hub-card-title">Verum Chat</h3>
            <p class="hub-product-host">chat.verum.cam</p>
          </div>
          <span class="hub-status hub-status--live"><span class="hub-status-dot" aria-hidden="true"></span>${t(c => c.products.live)}</span>
        </div>
        <p class="hub-card-text">${t(c => c.products.chat.text)}</p>
        ${features('chat', CHAT_FEATURES)}
        <p class="hub-platforms"><span class="hub-platform-icons">${icon('Globe', { size: 14 })}${icon('Smartphone', { size: 14 })}${icon('Tv', { size: 14 })}</span>${t(c => c.products.chat.platforms)}</p>
        <div class="hub-product-actions">
          <a class="btn-primary hub-product-btn" href="${CHAT_URL}" data-product="chat">${t(c => c.products.chat.open)}${icon('ArrowUpRight', { size: 15 })}</a>
          <a class="btn-secondary hub-product-btn" href="${esc(apkUrl)}" data-product="apk" type="application/vnd.android.package-archive">${icon('Download', { size: 15 })}${t(c => c.products.chat.apk)}</a>
        </div>
      </article>
      <article class="hub-card hub-product hub-product--soon" aria-labelledby="notes-title">
        <div class="hub-product-head">
          <span class="hub-card-icon">${icon('NotebookPen', { size: 20 })}</span>
          <div class="hub-product-name">
            <h3 id="notes-title" class="hub-card-title">Verum Notes</h3>
            <p class="hub-product-host">notes.verum.cam</p>
          </div>
          <span class="hub-status hub-status--soon">${t(c => c.products.soon)}</span>
        </div>
        <p class="hub-card-text">${t(c => c.products.notes.text)}</p>
        ${features('notes', NOTES_FEATURES)}
        <p class="hub-product-note">${t(c => c.products.notes.status)}</p>
        <div class="hub-product-actions">
          <a class="btn-secondary hub-product-btn" href="${NOTES_URL}" data-product="notes">${t(c => c.products.notes.open)}${icon('ArrowUpRight', { size: 15 })}</a>
        </div>
      </article>
    </div>
  </section>`;
}

function security() {
  const steps = STEP_ICONS.map((name, i) => `<li class="hub-step">
          <span class="hub-step-num" aria-hidden="true">0${i + 1}</span>
          <div class="hub-step-body">
            <h3 class="hub-step-title">${icon(name, { size: 16 })}${t(c => c.security.steps[i].title)}</h3>
            <p class="hub-card-text">${t(c => c.security.steps[i].text)}</p>
          </div>
        </li>`).join('\n        ');
  const rows = COPY.en.security.specs.rows.map((row, i) => `<div class="hub-spec-row">
            <dt>${t(c => c.security.specs.rows[i].label)}</dt>
            <dd><code>${esc(row.value)}</code></dd>
          </div>`).join('\n          ');
  return `<section id="security" class="hub-section hub-container" aria-labelledby="security-title">
    <h2 id="security-title" class="hub-section-title">${t(c => c.security.title)}</h2>
    <p class="hub-section-lead">${t(c => c.security.lead)}</p>
    <div class="hub-bento">
      <div class="hub-card hub-steps-card">
        <ol class="hub-steps">
        ${steps}
        </ol>
      </div>
      <aside class="hub-card hub-spec-card" aria-labelledby="specs-title">
        <div class="hub-card-head">
          <span class="hub-card-icon">${icon('ShieldCheck', { size: 20 })}</span>
          <h3 id="specs-title" class="hub-card-title">${t(c => c.security.specs.title)}</h3>
          <span class="hub-chip">${t(c => c.security.specs.chip)}</span>
        </div>
        <dl class="hub-spec">
          ${rows}
        </dl>
        <p class="hub-card-note">${icon('Fingerprint', { size: 15 })}${t(c => c.security.verify)}</p>
        <p class="hub-card-note">${icon('UserRound', { size: 15 })}${t(c => c.security.account)}</p>
      </aside>
    </div>
    <p class="hub-footnote">${t(c => c.security.exception)}</p>
  </section>`;
}

function homeBody({ apkUrl }) {
  return `${nav()}
<main id="main" class="hub-main">
  <div class="hub-backdrop" aria-hidden="true"><span class="hub-glow"></span></div>
  ${hero()}
  ${products(apkUrl)}
  ${security()}
</main>
${footer()}`;
}

// ── The legal documents (privacy.html, terms.html) ─────────────────────

// "{email}" in the copy becomes a mailto link, as in the messenger's LegalPage
function rich(text) {
  return text.split('{email}').map(esc).join(mailto(LEGAL_EMAIL));
}

function block(b) {
  if (typeof b === 'string') return `<p class="legal-p">${rich(b)}</p>`;
  return `<ul class="legal-list">${b.list.map(item => `<li>${rich(item)}</li>`).join('')}</ul>`;
}

// The month in the language of the document ("ноябрь 2026" is in the copy)
function legalArticle(doc, lang, primary) {
  const c = LEGAL_COPY[lang];
  const d = c[doc];
  const other = doc === 'privacy' ? 'terms' : 'privacy';
  const sections = d.sections.map((s) => `<section${attrs({
    class: 'legal-section', id: primary ? s.id : null, 'data-section-id': s.id,
  })}>
        <h2 class="legal-h2">${esc(s.title)}</h2>
        ${s.blocks.map(block).join('\n        ')}
      </section>`).join('\n      ');
  return `<article class="legal-doc l-doc" lang="${lang}" aria-labelledby="doc-title-${lang}">
      <header class="legal-head">
        <p class="legal-kicker">Verum · verum.cam</p>
        <h1 id="doc-title-${lang}" class="legal-title">${esc(d.title)}</h1>
        <p class="legal-updated"><time datetime="${LEGAL_UPDATED}">${esc(c.updated)}</time></p>
      </header>
      <section class="hub-card legal-summary" aria-labelledby="summary-${lang}">
        <h2 id="summary-${lang}" class="legal-summary-title">${esc(c.summary)}</h2>
        <ul class="legal-list">${d.summary.map(s => `<li>${rich(s)}</li>`).join('')}</ul>
      </section>
      <div class="legal-intro">${d.intro.map(p => `<p class="legal-p">${rich(p)}</p>`).join('')}</div>
      <nav class="legal-toc" aria-labelledby="toc-${lang}">
        <h2 id="toc-${lang}" class="legal-toc-title">${esc(c.contents)}</h2>
        <ol>${d.sections.map(s => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ol>
      </nav>
      ${sections}
      <footer class="legal-foot">
        <p>${esc(c.contact)}: ${mailto(LEGAL_EMAIL)}</p>
        <p>${esc(c.seeAlso)}: <a href="${other === 'terms' ? TERMS_HREF : PRIVACY_HREF}">${esc(c[other].title)}</a></p>
      </footer>
    </article>`;
}

function legalBody(doc) {
  const onlyIn = COPY.uz.legal.onlyIn;
  return `${nav()}
<main id="main" class="legal-main">
  <div class="hub-container legal-container">
    <a class="legal-back" href="/">${icon('ArrowLeft', { size: 14 })}${t(c => c.nav.hub)}</a>
    <p class="legal-only-in l" lang="uz">${esc(onlyIn)}</p>
    ${LEGAL_DOC_LANGS.map((lang, i) => legalArticle(doc, lang, i === 0)).join('\n    ')}
  </div>
</main>
${footer()}`;
}

// ── 404.html ─────────────────────────────────────────────────────────────

function notFoundBody() {
  return `${nav()}
<main id="main" class="hub-main hub-404">
  <section class="hub-container hub-404-inner" aria-labelledby="nf-title">
    <p class="hub-badge">404</p>
    <h1 id="nf-title" class="hub-title hub-title--small">${t(c => c.notFound.title)}</h1>
    <p class="hub-lead">${t(c => c.notFound.text)}</p>
    <div class="hub-cta">
      <a class="btn-primary hub-cta-btn" href="${CHAT_URL}">${t(c => c.notFound.open)}${icon('ArrowRight')}</a>
      <a class="btn-secondary hub-cta-btn" href="/">${t(c => c.notFound.home)}</a>
    </div>
  </section>
</main>
${footer()}`;
}

export function renderBody(page, { apkUrl = DEFAULT_APK_PATH } = {}) {
  if (page === 'home') return homeBody({ apkUrl });
  if (page === 'privacy' || page === 'terms') return legalBody(page);
  if (page === 'notFound') return notFoundBody();
  throw new Error(`renderBody: no page ${page}`);
}

/** A template with its <!--hub:head--> and <!--hub:body--> filled in. */
export function renderInto(template, page, options = {}) {
  for (const mark of ['<!--hub:head-->', '<!--hub:body-->']) {
    if (template.split(mark).length !== 2) throw new Error(`renderInto(${page}): expected one ${mark}`);
  }
  return template
    .replace('<!--hub:head-->', () => renderHead(page))
    .replace('<!--hub:body-->', () => renderBody(page, options));
}

export const pageForFile = (file) => Object.keys(PAGES).find(key => PAGES[key].file === file) || null;
