/**
 * checkDist.js — what the built site must hold before it ships, read from
 * the files on disk. The `verum-hub-checks` plugin (vite.config.js) fails
 * `yarn build` on any problem, and src/build.test.js runs a real build
 * through it.
 *
 * The CSP in vercel.json is strict (script-src 'self', style-src 'self',
 * font-src 'self', img-src 'self'; nothing inline, no data: URLs), so a
 * page breaks quietly under it if the build ever emits:
 *   - an inline <script> (JSON-LD data blocks are fine: never run), an
 *     event-handler attribute, a style attribute or a <style> element;
 *   - a script or stylesheet from another origin;
 *   - a data: or remote url() in CSS (fonts and images must be files).
 * It also checks that every local link and asset exists (or is one of
 * vercel.json's rewrites), and that no link is plain http.
 *
 * And that the site names no .apk file and no APK media type, in a page or
 * any other text it serves: scanners flag a site that links an APK
 * ("contains-apk"). The Android app is offered on its GitHub releases page
 * (content/site.js ANDROID_RELEASES_URL).
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

// Paths vercel.json answers without a file in dist/
const REWRITTEN = [/^\/$/, /^\/privacy$/, /^\/terms$/, /^\/r2\/.+/];

const APK_FILE = /\.apk/i;
const APK_TYPE = /application\/vnd\.android\.package-archive/i;
// What the site serves as text, besides the pages
const TEXT_FILE = /\.(js|css|txt|xml|json|webmanifest|svg)$/i;

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function localTarget(url) {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return null;
  return decodeURIComponent(url.split(/[?#]/)[0]);
}

export function checkDist(distDir) {
  const problems = [];
  if (!fs.existsSync(distDir)) return [`no ${distDir}`];
  const files = new Set(listFiles(distDir));
  const exists = (p) => files.has(p.replace(/^\//, '')) || REWRITTEN.some(re => re.test(p));

  const pages = [...files].filter(f => f.endsWith('.html'));
  for (const page of ['index.html', 'privacy.html', 'terms.html', '404.html']) {
    if (!files.has(page)) problems.push(`${page} was not built`);
  }

  for (const page of pages) {
    const html = fs.readFileSync(path.join(distDir, page), 'utf8');
    const { document } = new JSDOM(html).window;
    const where = (what) => `${page}: ${what}`;

    if (APK_FILE.test(html)) problems.push(where('names a .apk file (link the GitHub releases page instead)'));
    if (APK_TYPE.test(html)) problems.push(where('the APK media type (application/vnd.android.package-archive)'));

    for (const script of document.querySelectorAll('script')) {
      const src = script.getAttribute('src');
      if (!src) {
        if (script.getAttribute('type') !== 'application/ld+json') problems.push(where('an inline <script> (the CSP blocks it)'));
        else {
          try { JSON.parse(script.textContent); } catch { problems.push(where('JSON-LD that does not parse')); }
        }
      } else if (!localTarget(src)) {
        problems.push(where(`a script from another origin: ${src}`));
      }
    }
    if (document.querySelector('style')) problems.push(where('a <style> element (style-src \'self\')'));
    for (const el of document.querySelectorAll('*')) {
      for (const { name } of el.attributes) {
        if (name === 'style') problems.push(where(`a style attribute on <${el.localName}>`));
        if (/^on[a-z]+$/.test(name)) problems.push(where(`an ${name} handler on <${el.localName}>`));
      }
    }
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      if (!localTarget(link.getAttribute('href'))) problems.push(where(`a stylesheet from another origin: ${link.getAttribute('href')}`));
    }
    for (const el of document.querySelectorAll('[href], [src]')) {
      const url = el.getAttribute('href') ?? el.getAttribute('src');
      if (/^http:/i.test(url)) problems.push(where(`a plain-http link: ${url}`));
      if (/^javascript:/i.test(url)) problems.push(where(`a javascript: link: ${url}`));
      const target = localTarget(url);
      if (target && !exists(target)) problems.push(where(`a link to a missing file: ${url}`));
      if (el.getAttribute('target') === '_blank' && !/noopener/.test(el.getAttribute('rel') || '')) {
        problems.push(where(`target=_blank without rel=noopener: ${url}`));
      }
    }
  }

  for (const css of [...files].filter(f => f.endsWith('.css'))) {
    const text = fs.readFileSync(path.join(distDir, css), 'utf8');
    for (const [, raw] of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g).map(m => [m[0], m[2]])) {
      if (/^data:/i.test(raw)) problems.push(`${css}: a data: URL (font-src/img-src 'self' block it)`);
      else if (/^(https?:)?\/\//i.test(raw)) problems.push(`${css}: a remote url(): ${raw}`);
      else {
        const target = raw.startsWith('/') ? raw : `/${path.posix.join(path.posix.dirname(css), raw)}`;
        if (!exists(target.split(/[?#]/)[0])) problems.push(`${css}: url() of a missing file: ${raw}`);
      }
    }
    if (/@import/.test(text)) problems.push(`${css}: an @import left in the bundle`);
  }

  for (const name of [...files].filter(f => TEXT_FILE.test(f))) {
    const text = fs.readFileSync(path.join(distDir, name), 'utf8');
    if (APK_FILE.test(text) || APK_TYPE.test(text)) problems.push(`${name}: names a .apk file or the APK media type`);
  }

  return problems;
}
