/**
 * public/hub.js, run in a parsed page: the language it picks (the same as
 * src/content/langs.js pickLang), the RU / EN / UZ buttons, the legal
 * sections' ids following the document shown, and the hop from an old
 * verum.cam/#chat=<id> link to chat.verum.cam.
 */
import { describe, test, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { file, renderPage } from './test/helpers.js';
import { pickLang, LANGS } from './content/langs.js';
import { COPY } from './content/site.js';

const SOURCE = file('public/hub.js');

/**
 * A page with hub.js run in it. `languages` is the browser's list; `saved`
 * the stored choice; `location` replaces window.location (for the redirect).
 */
function run(page = 'home', { saved = null, languages = ['en-US'], location = null } = {}) {
  const dom = new JSDOM(renderPage(page), { url: `https://verum.cam${page === 'home' ? '/' : `/${page}.html`}` });
  const { window } = dom;
  if (saved !== null) window.localStorage.setItem('verum_lang', saved);
  window.Element.prototype.scrollIntoView = vi.fn();
  const fakeWindow = {
    localStorage: window.localStorage,
    navigator: { languages, language: languages[0] },
    location: location || window.location,
  };
  new window.Function('window', 'document', SOURCE)(fakeWindow, window.document);
  const html = window.document.documentElement;
  const click = (lang) => window.document.querySelector(`[data-set-lang="${lang}"]`)
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { window, document: window.document, html, click };
}

describe('hub.js — choosing the language', () => {
  test.each([
    [null, ['ru-RU', 'en']],
    [null, ['uz-Latn-UZ']],
    [null, ['uz-Cyrl']],
    [null, ['en-GB', 'ru']],
    [null, ['de-DE']],
    [null, []],
    ['ru', ['en-US']],
    ['en', ['ru-RU']],
    ['uz', ['de']],
    ['de', ['ru']],
    ['', ['uz']],
  ])('saved %j, browser %j: the same answer as pickLang()', (saved, languages) => {
    const { html } = run('home', { saved, languages });
    expect(html.getAttribute('data-lang')).toBe(pickLang(saved, languages));
    expect(html.getAttribute('lang')).toBe(pickLang(saved, languages));
  });

  test('the title follows the language', () => {
    const { document } = run('home', { languages: ['ru-RU'] });
    expect(document.title).toBe(COPY.ru.meta.title);
  });

  test('the buttons show which language is on', () => {
    const { document } = run('home', { languages: ['uz'] });
    const pressed = [...document.querySelectorAll('[data-set-lang]')].map(b => b.getAttribute('aria-pressed'));
    expect(pressed).toEqual(['false', 'false', 'true']);
  });
});

describe('hub.js — the RU / EN / UZ buttons', () => {
  test('a click switches the page and remembers the choice under the messenger\'s key', () => {
    const { html, document, window, click } = run('home');
    expect(html.getAttribute('data-lang')).toBe('en');
    click('ru');
    expect(html.getAttribute('data-lang')).toBe('ru');
    expect(window.localStorage.getItem('verum_lang')).toBe('ru');
    expect(document.title).toBe(COPY.ru.meta.title);
    expect(document.querySelector('[data-set-lang="ru"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-set-lang="en"]').getAttribute('aria-pressed')).toBe('false');
    click('uz');
    expect(html.getAttribute('data-lang')).toBe('uz');
    expect(window.localStorage.getItem('verum_lang')).toBe('uz');
  });

  test('a click on the label inside the button counts too', () => {
    const { html, document, window } = run('home');
    const button = document.querySelector('[data-set-lang="uz"]');
    button.firstChild.parentNode.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(html.getAttribute('data-lang')).toBe('uz');
  });

  test('a click anywhere else changes nothing', () => {
    const { html, document, window } = run('home', { languages: ['ru'] });
    document.querySelector('h1').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(html.getAttribute('data-lang')).toBe('ru');
    expect(window.localStorage.getItem('verum_lang')).toBeNull();
  });
});

describe('hub.js — the legal pages', () => {
  const idsIn = (document, lang) => [...document.querySelectorAll(`.l-doc[lang="${lang}"] .legal-section[id]`)].map(s => s.id);

  test.each([['ru', 'ru'], ['uz', 'ru'], ['en', 'en']])('in %s the %s document holds the section ids', (lang, docLang) => {
    const { document } = run('privacy', { languages: [lang] });
    const other = docLang === 'en' ? 'ru' : 'en';
    expect(idsIn(document, docLang)).toContain('delete-account');
    expect(idsIn(document, other)).toEqual([]);
    expect(document.querySelectorAll('#delete-account')).toHaveLength(1);
  });

  test('switching the language moves the ids and lands on the hash again', () => {
    const { document, window, click } = run('terms', { languages: ['en'] });
    window.Element.prototype.scrollIntoView.mockClear();
    window.history.replaceState(null, '', '#security');
    click('ru');
    expect(document.getElementById('security').closest('.l-doc').getAttribute('lang')).toBe('ru');
    expect(window.Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe('hub.js — links into the messenger that still land on verum.cam', () => {
  const stub = (pathname, hash) => ({ pathname, hash, replace: vi.fn() });

  test('/#chat=<id> (an old notification) goes on to chat.verum.cam with its hash', () => {
    const location = stub('/', '#chat=64f0c0ffee');
    const { html } = run('home', { location, languages: ['ru'] });
    expect(location.replace).toHaveBeenCalledWith('https://chat.verum.cam/#chat=64f0c0ffee');
    expect(html.getAttribute('data-lang')).toBe('en'); // stopped before anything else
  });

  test('any other hash, or another page, stays', () => {
    for (const [pathname, hash] of [['/', '#products'], ['/', ''], ['/privacy.html', '#chat=1']]) {
      const location = stub(pathname, hash);
      run('home', { location });
      expect(location.replace).not.toHaveBeenCalled();
    }
  });
});

describe('hub.js — written for old engines', () => {
  test('ES5 only: no let/const, arrows, template strings, classes or spread', () => {
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(let|const|class)\s/);
    expect(code).not.toMatch(/=>/);
    expect(code).not.toMatch(/`/);
    expect(code).not.toMatch(/\.\.\./);
    expect(() => new Function(SOURCE)).not.toThrow(); // it parses
  });

  test('its language list is the site\'s', () => {
    expect(SOURCE).toContain(`var LANGS = ${JSON.stringify(LANGS).replace(/"/g, "'").replace(/,/g, ', ')};`);
  });
});
