/**
 * langs.js — the site's languages and how one is chosen. The only content
 * module the browser loads (src/main.js): keep it free of copy.
 *
 * public/boot.js repeats pickLang() in ES5, because it runs in <head> as a
 * classic script before anything is bundled; boot.test.js runs both on the
 * same cases.
 */

export const LANGS = ['en', 'ru', 'uz'];
export const DEFAULT_LANG = 'en';
export const LANG_LABEL = { en: 'EN', ru: 'RU', uz: 'UZ' };

// The key the messenger used on verum.cam: a returning visitor keeps the
// language they chose there (it offered RU and EN).
export const LANG_STORAGE_KEY = 'verum_lang';

// The legal documents exist in RU and EN only: Uzbek reads the Russian one.
export const DOC_LANG = { en: 'en', ru: 'ru', uz: 'ru' };

/**
 * A saved choice first; otherwise the browser's first language: Russian →
 * ru, Uzbek (Latin or Cyrillic) → uz, anything else → en.
 */
export function pickLang(saved, browserLangs) {
  if (LANGS.includes(saved)) return saved;
  const first = String((browserLangs && browserLangs[0]) || '').toLowerCase();
  if (first.startsWith('ru')) return 'ru';
  if (first.startsWith('uz')) return 'uz';
  return DEFAULT_LANG;
}
