/**
 * A real production build (vite.config.js, into a temporary folder): the
 * pages come out rendered, pass scripts/checkDist.js (the plugin would have
 * failed the build otherwise), ship no JavaScript bundle, and keep public/
 * as it is. VITE_ANDROID_APK_URL reaches the APK button.
 */
import { describe, test, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { ROOT } from './test/helpers.js';
import { checkDist } from '../scripts/checkDist.js';

const dirs = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

async function buildInto(env = {}) {
  const outDir = mkdtempSync(path.join(tmpdir(), 'verum-hub-dist-'));
  dirs.push(outDir);
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    await build({ root: ROOT, configFile: path.join(ROOT, 'vite.config.js'), logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  } finally {
    for (const key of Object.keys(env)) {
      if (key in saved) process.env[key] = saved[key];
      else delete process.env[key];
    }
  }
  const read = (rel) => readFileSync(path.join(outDir, rel), 'utf8');
  return { outDir, read, dom: (rel) => new JSDOM(read(rel)).window.document };
}

describe('yarn build', () => {
  let out;
  test('builds, and the dist/ checks find nothing', async () => {
    out = await buildInto();
    expect(checkDist(out.outDir)).toEqual([]);
  }, 180_000);

  test('every page is rendered: no template marks or source paths left', () => {
    for (const page of ['index.html', 'privacy.html', 'terms.html', '404.html']) {
      const html = out.read(page);
      expect(html).not.toContain('<!--hub:');
      expect(html).not.toContain('/src/');
      expect(html).toMatch(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+\.css">|<link rel="stylesheet" href="\/assets\/[^"]+\.css"/);
      expect(html).toContain('<script src="/hub.js"></script>');
    }
  });

  test('one stylesheet with self-hosted fonts, and no JavaScript bundle at all', () => {
    const assets = readdirSync(path.join(out.outDir, 'assets'));
    expect(assets.filter(f => f.endsWith('.css'))).toHaveLength(1);
    expect(assets.filter(f => f.endsWith('.js'))).toEqual([]);
    expect(assets.some(f => /^dm-sans-latin-400-normal-.+\.woff2$/.test(f))).toBe(true);
    expect(assets.some(f => /^marcellus-latin-400-normal-.+\.woff2$/.test(f))).toBe(true);
    const css = out.read(`assets/${assets.find(f => f.endsWith('.css'))}`);
    // Safari 14 needs the prefixed blur next to the plain one
    expect(css).toContain('-webkit-backdrop-filter');
    expect(css).toContain('backdrop-filter');
    expect(css).not.toContain('data:');
  });

  test('public/ ships as it is: hub.js, sw.js, security.txt, robots, sitemap, icons, cover', () => {
    for (const rel of ['hub.js', 'sw.js', '.well-known/security.txt', 'robots.txt', 'sitemap.xml',
      'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-512.png', 'og-cover.png']) {
      expect(existsSync(path.join(out.outDir, rel)), rel).toBe(true);
    }
    expect(out.read('hub.js')).toBe(readFileSync(path.join(ROOT, 'public/hub.js'), 'utf8'));
  });

  test('the built hub links the messenger, Notes, the APK and the documents', () => {
    const d = out.dom('index.html');
    expect(d.querySelector('[data-product="chat"]').getAttribute('href')).toBe('https://chat.verum.cam/');
    expect(d.querySelector('[data-product="notes"]').getAttribute('href')).toBe('https://notes.verum.cam/');
    expect(d.querySelector('[data-product="apk"]').getAttribute('href')).toBe('/r2/apk/verum.apk');
    const footer = [...d.querySelectorAll('.hub-footer a')].map(a => a.getAttribute('href'));
    expect(footer).toEqual(expect.arrayContaining(['/privacy.html', '/terms.html', '/.well-known/security.txt', 'mailto:support@verum.cam']));
  });

  test('VITE_ANDROID_APK_URL on files.verum.cam goes through /r2', async () => {
    const custom = await buildInto({ VITE_ANDROID_APK_URL: 'https://files.verum.cam/apk/verum-1.0.6.apk' });
    expect(custom.dom('index.html').querySelector('[data-product="apk"]').getAttribute('href')).toBe('/r2/apk/verum-1.0.6.apk');
  }, 180_000);
});
