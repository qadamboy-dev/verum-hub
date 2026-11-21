/**
 * helpers.js — shared by the tests: the repo root, file reads, and a page
 * rendered into its template and parsed (JSDOM, no scripts run).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { PAGES, renderInto } from '../render/pages.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const file = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
export const json = (rel) => JSON.parse(file(rel));

export function renderPage(page) {
  return renderInto(file(PAGES[page].file), page);
}

/** The rendered page as a document. `lang` sets <html data-lang>, as public/hub.js would. */
export function pageDom(page, { lang = 'en' } = {}) {
  const dom = new JSDOM(renderPage(page), { url: 'https://verum.cam/' });
  dom.window.document.documentElement.setAttribute('data-lang', lang);
  return dom;
}
