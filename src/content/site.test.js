/**
 * site.js — the three languages have the same shape, and the copy claims
 * nothing the products don't do (the traps in site.js's header).
 */
import { describe, test, expect } from 'vitest';
import {
  COPY, LANGS, DEFAULT_LANG, LANG_STORAGE_KEY, SITE_URL, CHAT_URL, NOTES_URL, SUPPORT_EMAIL, DEFAULT_APK_PATH,
} from './site.js';
import { pickLang, DOC_LANG } from './langs.js';

// The shape of a value: keys, array lengths and leaf types, never the text
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, shape(value[k])]));
  }
  return typeof value;
}
const flat = (v) => JSON.stringify(v);

describe('site.js — languages', () => {
  test('EN, RU and UZ, English first and the default', () => {
    expect(LANGS).toEqual(['en', 'ru', 'uz']);
    expect(DEFAULT_LANG).toBe('en');
    expect(Object.keys(COPY)).toEqual(LANGS);
  });

  test('every language has the same keys, lists and lengths', () => {
    expect(shape(COPY.ru)).toEqual(shape(COPY.en));
    expect(shape(COPY.uz)).toEqual(shape(COPY.en));
  });

  test('no text is empty, except the Uzbek-only note in the other languages', () => {
    for (const lang of LANGS) {
      const walk = (v, where) => {
        if (typeof v === 'string') {
          if (where === 'legal.onlyIn' && lang !== 'uz') expect(v).toBe('');
          else expect(v.trim(), `${lang}.${where}`).not.toBe('');
        } else if (v && typeof v === 'object') {
          for (const [k, child] of Object.entries(v)) walk(child, where ? `${where}.${k}` : k);
        }
      };
      walk(COPY[lang], '');
    }
  });

  test('the language a visitor chose on verum.cam before (the messenger\'s key) carries over', () => {
    expect(LANG_STORAGE_KEY).toBe('verum_lang');
    expect(pickLang('ru', ['en-US'])).toBe('ru');
    expect(pickLang('en', ['ru-RU'])).toBe('en');
    expect(pickLang('uz', [])).toBe('uz');
  });

  test('without a choice the browser decides: ru, uz (either script), else en', () => {
    expect(pickLang(null, ['ru-RU', 'en'])).toBe('ru');
    expect(pickLang(null, ['uz-Latn-UZ'])).toBe('uz');
    expect(pickLang(null, ['uz-Cyrl'])).toBe('uz');
    expect(pickLang(null, ['en-GB', 'ru'])).toBe('en'); // the first language only, as the messenger
    expect(pickLang('de', ['de-DE'])).toBe('en');
    expect(pickLang(undefined, undefined)).toBe('en');
  });

  test('Uzbek reads the legal documents in Russian (they are not translated)', () => {
    expect(DOC_LANG).toEqual({ en: 'en', ru: 'ru', uz: 'ru' });
    expect(COPY.uz.legal.onlyIn).toMatch(/rus va ingliz/);
  });
});

describe('site.js — URLs', () => {
  test('the ecosystem\'s hosts', () => {
    expect(SITE_URL).toBe('https://verum.cam');
    expect(CHAT_URL).toBe('https://chat.verum.cam/');
    expect(NOTES_URL).toBe('https://notes.verum.cam/');
    expect(SUPPORT_EMAIL).toBe('support@verum.cam');
  });

  test('the APK defaults to the bucket through this site\'s /r2 rewrite', () => {
    expect(DEFAULT_APK_PATH).toBe('/r2/apk/verum.apk');
  });
});

describe.each(LANGS)('site.js — what the copy claims (%s)', (lang) => {
  const c = COPY[lang];
  const all = flat(c);

  test('the hero names the four promises: one account, client-side E2EE, no server access, no trackers', () => {
    expect(c.hero.pillars).toHaveLength(4);
    const [account, e2ee, zero, trackers] = c.hero.pillars.map(flat);
    expect(account).toMatch(/Verum/);
    expect(e2ee).toMatch(/device|устройств|qurilma/i);
    expect(zero).toMatch(/key|ключ|kalit/i);
    expect(trackers).toMatch(/tracker|трекер|treker/i);
  });

  test('both products are there, Chat live and Notes not yet open', () => {
    expect(c.products.live).toBe('Live');
    expect(c.products.soon).toMatch(/Beta|Бета/);
    expect(c.products.chat.text).toMatch(/video|видео/i);
    expect(c.products.notes.text).toContain('Obsidian');
    expect(c.products.notes.text).toContain('Markdown');
    expect(c.products.notes.text).toContain('[[');
    expect(c.products.notes.status).toContain('notes.verum.cam');
  });

  test('the Verum Audio exception is stated, and the metadata the server sees', () => {
    expect(c.security.exception).toContain('Verum Audio');
    const relay = flat(c.security.steps[2]);
    expect(relay).toMatch(/email|почт|pochta/i);
    expect(relay).toMatch(/IP/);
  });

  test('overclaims stay out', () => {
    // the password reaches the server at sign-in; Vercel statistics exist
    // ("без пароля её не открыть", the backup's lock, is fine: it is about the key)
    expect(all).not.toMatch(/passwordless|вход без пароля|parolsiz kirish|never sees your password|no analytics|без аналитики/i);
    // storage is per origin: one account, but each app signs in on its own
    expect(all).not.toMatch(/sign in once|войдите один раз|single sign-on/i);
    expect(all).not.toMatch(/mathematically|математически/i);
    // the messenger's calls use DTLS-SRTP, not AES-GCM for media
    expect(flat(c.security.steps[3])).toContain('DTLS-SRTP');
  });
});
