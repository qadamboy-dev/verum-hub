/**
 * The pages as rendered (src/render/pages.js into the templates): what is
 * on them, where every link goes, that each text exists in EN, RU and UZ,
 * and that nothing in the markup needs a CSP exception.
 */
import { describe, test, expect } from 'vitest';
import { PAGES, renderHead, renderBody, resolveApkUrl, pageForFile } from './pages.js';
import { esc, t, icon } from './html.js';
import { COPY, LANGS, CHAT_URL, NOTES_URL } from '../content/site.js';
import { LEGAL_COPY, LEGAL_UPDATED } from '../content/legalContent.js';
import { pageDom, renderPage } from '../test/helpers.js';

const visibleText = (doc, el) => {
  // what a reader sees in `el` for the document's data-lang: drop the other languages
  const lang = doc.documentElement.getAttribute('data-lang');
  const clone = el.cloneNode(true);
  for (const other of clone.querySelectorAll('.l')) if (other.getAttribute('lang') !== lang) other.remove();
  return clone.textContent.replace(/\s+/g, ' ').trim();
};

describe('helpers', () => {
  test('esc() escapes everything markup-significant', () => {
    expect(esc(`<a href="x" onclick='y'>&`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;');
  });

  test('t() writes one element per language, each with its lang', () => {
    const html = t(c => c.nav.badge);
    expect(html).toBe('<span class="l" lang="en">Ecosystem</span><span class="l" lang="ru">Экосистема</span><span class="l" lang="uz">Ekotizim</span>');
  });

  test('icon() draws Lucide paths, hidden from assistive tech', () => {
    const svg = icon('ArrowRight', { size: 14 });
    expect(svg).toMatch(/^<svg class="icon"/);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('<path d="M5 12h14"/>');
    expect(() => icon('NoSuchIcon')).toThrow();
  });

  test('every template maps to one page', () => {
    for (const [key, page] of Object.entries(PAGES)) expect(pageForFile(page.file)).toBe(key);
    expect(pageForFile('other.html')).toBeNull();
  });
});

describe('the hub (index.html)', () => {
  const { document } = pageDom('home').window;
  const q  = (sel) => document.querySelector(sel);
  const qa = (sel) => [...document.querySelectorAll(sel)];

  test('hero: the ecosystem, the four promises, the way into the messenger', () => {
    expect(visibleText(document, q('h1'))).toBe(COPY.en.hero.title);
    expect(qa('.hub-pillar')).toHaveLength(4);
    const ctas = qa('.hub-cta a').map(a => a.getAttribute('href'));
    expect(ctas).toEqual([CHAT_URL, '#products']);
    expect(q('#products')).not.toBeNull();
  });

  test('Verum Chat: live, opens chat.verum.cam, offers the APK', () => {
    const card = q('[aria-labelledby="chat-title"]');
    expect(card.querySelector('h3').textContent).toBe('Verum Chat');
    expect(card.querySelector('.hub-product-host').textContent).toBe('chat.verum.cam');
    expect(visibleText(document, card.querySelector('.hub-status'))).toBe('Live');
    expect(card.querySelector('[data-product="chat"]').getAttribute('href')).toBe('https://chat.verum.cam/');
    expect(card.querySelector('[data-product="apk"]').getAttribute('href')).toBe('/r2/apk/verum.apk');
    expect(visibleText(document, card.querySelector('[data-product="apk"]'))).toBe('Download Android APK');
    for (const feature of ['calls', 'Video notes', 'Live Locator']) expect(card.textContent).toContain(feature);
  });

  test('Verum Notes: live, "Open Verum Notes" leads to notes.verum.cam, notes encrypted on the device', () => {
    const card = q('[aria-labelledby="notes-title"]');
    expect(card.querySelector('h3').textContent).toBe('Verum Notes');
    expect(card.querySelector('.hub-product-host').textContent).toBe('notes.verum.cam');
    expect(visibleText(document, card.querySelector('.hub-status'))).toBe('Live');
    expect(card.querySelector('.hub-status--live')).not.toBeNull();
    const open = card.querySelector('[data-product="notes"]');
    expect(open.getAttribute('href')).toBe(NOTES_URL);
    expect(open.classList.contains('btn-primary')).toBe(true);
    expect(visibleText(document, open)).toBe('Open Verum Notes');
    const text = visibleText(document, card);
    for (const feature of ['Folder tree', '[[links]]', 'graph', 'Tags', 'checkboxes', 'Obsidian']) expect(text).toContain(feature);
    expect(text).toMatch(/encrypted on your device/);
    expect(text).not.toMatch(/In development|Soon/);
  });

  test('security: four steps, the real algorithms, the bot exception', () => {
    expect(qa('.hub-step')).toHaveLength(4);
    const specs = qa('.hub-spec code').map(c => c.textContent);
    expect(specs).toEqual(['ECDH P-256 + HKDF-SHA256', 'AES-256-GCM (unique IV)', 'PBKDF2 (600,000 iterations)', 'WebRTC DTLS-SRTP']);
    expect(visibleText(document, q('#security .hub-footnote'))).toContain('Verum Audio');
  });

  test('footer: the products, privacy.html, terms.html, security.txt and the contact', () => {
    const links = qa('.hub-footer a').map(a => a.getAttribute('href'));
    expect(links).toEqual([
      CHAT_URL, NOTES_URL, '/privacy.html', '/terms.html', '/.well-known/security.txt', 'mailto:support@verum.cam',
    ]);
    // Cloudflare's Email Obfuscation must leave the address alone
    expect(renderPage('home')).toMatch(/<!--email_off--><a href="mailto:support@verum.cam">support@verum.cam<\/a><!--\/email_off-->/);
  });

  test('the nav: the hub link, RU / EN / UZ, Open Verum Chat', () => {
    expect(q('.hub-nav-brand').getAttribute('href')).toBe('/');
    expect(qa('[data-set-lang]').map(b => [b.getAttribute('data-set-lang'), b.textContent, b.getAttribute('aria-pressed')]))
      .toEqual([['en', 'EN', 'true'], ['ru', 'RU', 'false'], ['uz', 'UZ', 'false']]);
    expect(q('.hub-nav-open').getAttribute('href')).toBe(CHAT_URL);
    expect(q('.skip-link').getAttribute('href')).toBe('#main');
    expect(q('main#main')).not.toBeNull();
  });

  test('a configured APK URL wins; files.verum.cam goes through /r2', () => {
    expect(resolveApkUrl('https://files.verum.cam/apk/verum-1.0.6.apk')).toBe('/r2/apk/verum-1.0.6.apk');
    expect(resolveApkUrl('https://downloads.example/verum.apk')).toBe('https://downloads.example/verum.apk');
    for (const bad of ['', '   ', 'http://files.verum.cam/x.apk', 'javascript:alert(1)', undefined]) {
      expect(resolveApkUrl(bad)).toBe('/r2/apk/verum.apk');
    }
    const { document: d } = pageDom('home', { apkUrl: '/r2/apk/verum-1.0.6.apk' }).window;
    expect(d.querySelector('[data-product="apk"]').getAttribute('href')).toBe('/r2/apk/verum-1.0.6.apk');
  });
});

describe.each(LANGS)('every text in %s', (lang) => {
  test.each(Object.keys(PAGES))('%s: each localized text has all three languages, and this one reads', (page) => {
    const { document } = pageDom(page, { lang }).window;
    // t() groups: consecutive .l siblings come in threes, in LANGS order
    const groups = new Map();
    for (const el of document.querySelectorAll('.l')) {
      if (el.classList.contains('legal-only-in')) continue; // the one Uzbek-only note
      const key = el.parentNode;
      groups.set(key, [...(groups.get(key) || []), el.getAttribute('lang')]);
    }
    for (const langs of groups.values()) {
      expect(langs.length % 3).toBe(0);
      for (let i = 0; i < langs.length; i += 3) expect(langs.slice(i, i + 3)).toEqual(LANGS);
    }
    for (const el of document.querySelectorAll(`.l[lang="${lang}"]`)) {
      if (!el.classList.contains('legal-only-in')) expect(el.textContent.trim()).not.toBe('');
    }
  });
});

describe('the legal pages', () => {
  test.each(['privacy', 'terms'])('%s.html carries the EN and RU documents, ids on the one shown without JS', (doc) => {
    const { document } = pageDom(doc).window;
    const articles = [...document.querySelectorAll('article.l-doc')];
    expect(articles.map(a => a.getAttribute('lang'))).toEqual(['en', 'ru']);
    const [en, ru] = articles;
    const ids = LEGAL_COPY.en[doc].sections.map(s => s.id);
    expect([...en.querySelectorAll('.legal-section')].map(s => s.id)).toEqual(ids);
    expect([...ru.querySelectorAll('.legal-section')].map(s => s.getAttribute('data-section-id'))).toEqual(ids);
    expect([...ru.querySelectorAll('[id].legal-section')]).toHaveLength(0); // public/hub.js moves them
    expect(en.querySelector('h1').textContent).toBe(LEGAL_COPY.en[doc].title);
    expect(ru.querySelector('h1').textContent).toBe(LEGAL_COPY.ru[doc].title);
    expect(en.querySelector('time').getAttribute('datetime')).toBe(LEGAL_UPDATED);
    // the table of contents links every section
    expect([...en.querySelectorAll('.legal-toc a')].map(a => a.getAttribute('href'))).toEqual(ids.map(id => `#${id}`));
  });

  test('the link targets other places depend on exist', () => {
    expect(pageDom('privacy').window.document.getElementById('delete-account')).not.toBeNull(); // Google Play
    expect(pageDom('terms').window.document.getElementById('security')).not.toBeNull();        // security.txt Policy
  });

  test('{email} becomes a protected mailto link, never raw text', () => {
    const html = renderPage('privacy');
    expect(html).not.toContain('{email}');
    expect(html).toContain('<!--email_off--><a href="mailto:support@verum.cam">support@verum.cam</a><!--/email_off-->');
  });

  test('each document links the other and leads back to all products; Uzbek gets a note', () => {
    const { document } = pageDom('privacy', { lang: 'uz' }).window;
    expect(document.querySelector('.legal-back').getAttribute('href')).toBe('/');
    expect(visibleText(document, document.querySelector('.legal-back'))).toBe('Barcha Verum mahsulotlari');
    expect(document.querySelector('.legal-only-in').getAttribute('lang')).toBe('uz');
    expect([...document.querySelectorAll('.legal-foot a')].map(a => a.getAttribute('href'))).toContain('/terms.html');
    expect([...pageDom('terms').window.document.querySelectorAll('.legal-foot a')].map(a => a.getAttribute('href'))).toContain('/privacy.html');
  });
});

describe('<head>', () => {
  const head = (page) => new (pageDom(page).window.DOMParser)().parseFromString(`<head>${renderHead(page)}</head>`, 'text/html');

  test.each([['home', 'https://verum.cam/'], ['privacy', 'https://verum.cam/privacy'], ['terms', 'https://verum.cam/terms']])(
    '%s: canonical, hreflang, Open Graph, structured data', (page, url) => {
      const d = head(page);
      expect(d.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(url);
      expect(d.querySelector('meta[property="og:url"]').getAttribute('content')).toBe(url);
      expect(d.querySelector('meta[property="og:image"]').getAttribute('content')).toBe('https://verum.cam/og-cover.png');
      const alternates = [...d.querySelectorAll('link[rel="alternate"]')].map(l => [l.getAttribute('hreflang'), l.getAttribute('href')]);
      expect(alternates.every(([, href]) => href === url)).toBe(true);
      expect(alternates.map(([lang]) => lang)).toContain('x-default');
      const ld = JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);
      expect(ld['@graph'].map(n => n['@type'])).toEqual(page === 'home'
        ? ['Organization', 'WebSite', 'SoftwareApplication', 'SoftwareApplication']
        : ['Organization', 'WebSite', 'WebPage']);
      expect(d.querySelector('meta[name="robots"]').getAttribute('content')).toMatch(/^index, follow/);
    });

  test('the apps in the structured data: Verum Chat on chat.verum.cam, Verum Notes on notes.verum.cam', () => {
    const ld = JSON.parse(head('home').querySelector('script[type="application/ld+json"]').textContent);
    expect(ld['@graph'][2]).toMatchObject({ name: 'Verum Chat', url: CHAT_URL, applicationCategory: 'CommunicationApplication' });
    expect(ld['@graph'][3]).toMatchObject({ '@id': `${NOTES_URL}#app`, name: 'Verum Notes', url: NOTES_URL, applicationCategory: 'ProductivityApplication', operatingSystem: 'Web' });
  });

  test('a title per language for public/hub.js; the 404 is not indexed', () => {
    const d = head('home');
    for (const lang of LANGS) {
      expect(d.querySelector(`meta[name="verum:title-${lang}"]`).getAttribute('content')).toBe(COPY[lang].meta.title);
    }
    expect(head('notFound').querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex');
    expect(head('notFound').querySelector('link[rel="canonical"]')).toBeNull();
  });
});

describe.each(Object.keys(PAGES))('%s: markup the CSP allows as it is', (page) => {
  const html = renderPage(page);
  const { document } = pageDom(page).window;

  test('no inline script but the JSON-LD data block, no handlers, no style attributes or elements', () => {
    for (const script of document.querySelectorAll('script:not([src])')) expect(script.getAttribute('type')).toBe('application/ld+json');
    expect([...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))).toEqual(['/hub.js']);
    expect(document.querySelector('style, [style]')).toBeNull();
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  test('every id is unique, every link is https, relative or mailto', () => {
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of document.querySelectorAll('a[href]')) {
      expect(a.getAttribute('href')).toMatch(/^(https:\/\/|\/|#|mailto:)/);
    }
  });

  test('every in-page link has a target', () => {
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      expect(document.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href')).not.toBeNull();
    }
  });

  test('renderBody refuses an unknown page', () => {
    expect(() => renderBody('nope')).toThrow();
  });
});
