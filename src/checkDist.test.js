/**
 * scripts/checkDist.js on small hand-made dist/ folders: a clean one
 * passes, and each thing the CSP would break is caught.
 */
import { describe, test, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkDist } from '../scripts/checkDist.js';

const dirs = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

const page = (body = '', head = '') => `<!doctype html><html><head>${head}<script src="/hub.js"></script><link rel="stylesheet" href="/assets/s.css"></head><body>${body}</body></html>`;

function dist(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'verum-hub-check-'));
  dirs.push(dir);
  const all = {
    'index.html': page('<a href="/privacy">p</a> <a href="/r2/ota/manifest.json">ota</a> <a href="https://chat.verum.cam/">c</a> <a href="https://github.com/qadamboy-dev/verum-hub/releases/latest" target="_blank" rel="noopener">android</a>'),
    'privacy.html': page(), 'terms.html': page(), '404.html': page(),
    'hub.js': '', 'assets/s.css': 'body{background:url(/assets/a.png)}', 'assets/a.png': '',
    ...files,
  };
  for (const [name, content] of Object.entries(all)) {
    if (content === null) continue;
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe('checkDist', () => {
  test('a clean build passes (rewritten paths count as present)', () => {
    expect(checkDist(dist({}))).toEqual([]);
  });

  test('a JSON-LD block is data and passes; broken JSON does not', () => {
    expect(checkDist(dist({ 'index.html': page('', '<script type="application/ld+json">{"a":1}</script>') }))).toEqual([]);
    expect(checkDist(dist({ 'index.html': page('', '<script type="application/ld+json">{a:</script>') })))
      .toEqual(['index.html: JSON-LD that does not parse']);
  });

  test.each([
    ['an inline script', page('<script>alert(1)</script>'), /inline <script>/],
    ['a remote script', page('<script src="https://cdn.example/x.js"></script>'), /another origin/],
    ['a style attribute', page('<p style="color:red">x</p>'), /style attribute/],
    ['a <style> element', page('<style>p{}</style>'), /<style> element/],
    ['an event handler', page('<img src="/assets/a.png" onerror="x()">'), /onerror handler/],
    ['a plain-http link', page('<a href="http://verum.cam/">x</a>'), /plain-http/],
    ['a javascript: link', page('<a href="javascript:void(0)">x</a>'), /javascript:/],
    ['a missing file', page('<img src="/assets/gone.png">'), /missing file/],
    ['a remote stylesheet', page('', '<link rel="stylesheet" href="https://fonts.example/a.css">'), /stylesheet from another origin/],
    ['an unsafe new tab', page('<a href="https://x.example/" target="_blank">x</a>'), /noopener/],
    ['a link to a .apk file', page('<a href="/r2/apk/verum.apk">x</a>'), /names a \.apk file/],
    ['a remote .APK file', page('<a href="https://files.verum.cam/apk/Verum-1.0.7.APK">x</a>'), /names a \.apk file/],
    ['a .apk named in text', page('<p>Download verum.apk</p>'), /names a \.apk file/],
    ['the APK media type', page('<a href="https://github.com/x/y/releases/latest" type="application/vnd.android.package-archive">x</a>'), /APK media type/],
  ])('%s is caught', (_, html, problem) => {
    const problems = checkDist(dist({ 'index.html': html }));
    expect(problems.some(p => problem.test(p)), problems.join('\n')).toBe(true);
  });

  test.each([
    ['sitemap.xml', '<urlset><url><loc>https://verum.cam/r2/apk/verum.apk</loc></url></urlset>'],
    ['hub.js', 'location.href = "/r2/apk/verum.apk";'],
    ['.well-known/security.txt', 'Contact: mailto:support@verum.cam\n# the app: https://files.verum.cam/apk/verum.apk\n'],
  ])('a .apk named in %s, besides the pages, is caught too', (name, content) => {
    expect(checkDist(dist({ [name]: content }))).toEqual([`${name}: names a .apk file or the APK media type`]);
  });

  test.each([
    ['a data: URL', 'a{background:url(data:image/png;base64,AAAA)}', /data: URL/],
    ['a remote url()', '@font-face{src:url(https://fonts.example/f.woff2)}', /remote url/],
    ['a missing font', '@font-face{src:url(/assets/gone.woff2)}', /missing file/],
    ['a left-over @import', '@import "x.css";', /@import/],
  ])('CSS with %s is caught', (_, css, problem) => {
    const problems = checkDist(dist({ 'assets/s.css': css }));
    expect(problems.some(p => problem.test(p)), problems.join('\n')).toBe(true);
  });

  test('a page that was not built is reported', () => {
    expect(checkDist(dist({ '404.html': null }))).toContain('404.html was not built');
  });
});
