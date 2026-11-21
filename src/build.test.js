/**
 * A real production build (vite.config.js, into a temporary folder): the
 * pages come out rendered, pass scripts/checkDist.js (the plugin would have
 * failed the build otherwise), ship no JavaScript bundle, and keep public/
 * as it is. Nothing the site serves names a .apk file, even with an old
 * VITE_ANDROID_APK_URL still set (the build no longer reads it).
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

  test('the built hub links the messenger, Notes, the Android releases page and the documents', () => {
    const d = out.dom('index.html');
    expect(d.querySelector('[data-product="chat"]').getAttribute('href')).toBe('https://chat.verum.cam/');
    expect(d.querySelector('[data-product="notes"]').getAttribute('href')).toBe('https://notes.verum.cam/');
    const android = d.querySelector('[data-product="android"]');
    expect(android.getAttribute('href')).toBe('https://github.com/qadamboy-dev/verum-hub/releases/latest');
    expect(android.getAttribute('target')).toBe('_blank');
    expect(android.getAttribute('rel')).toBe('noopener');
    const footer = [...d.querySelectorAll('.hub-footer a')].map(a => a.getAttribute('href'));
    expect(footer).toEqual(expect.arrayContaining(['/privacy.html', '/terms.html', '/.well-known/security.txt', 'mailto:support@verum.cam']));
  });

  // Scanners flag a site that links an APK ("contains-apk"). An old
  // VITE_ANDROID_APK_URL left in Vercel's settings must not bring one back.
  test('nothing the site serves names a .apk file or the APK media type, even with VITE_ANDROID_APK_URL set', async () => {
    const withOldSetting = await buildInto({ VITE_ANDROID_APK_URL: 'https://files.verum.cam/apk/verum.apk' });
    for (const build of [out, withOldSetting]) {
      const texts = listTextFiles(build.outDir);
      expect(texts).toEqual(expect.arrayContaining(['index.html', 'privacy.html', 'terms.html', '404.html', 'hub.js', 'sitemap.xml']));
      for (const rel of texts) {
        const text = build.read(rel);
        expect(text, rel).not.toMatch(/\.apk/i);
        expect(text, rel).not.toMatch(/application\/vnd\.android\.package-archive/i);
      }
      expect(checkDist(build.outDir)).toEqual([]);
    }
    expect(withOldSetting.dom('index.html').querySelector('[data-product="android"]').getAttribute('href'))
      .toBe('https://github.com/qadamboy-dev/verum-hub/releases/latest');
  }, 180_000);
});

/** The text files of a dist/: pages, scripts, styles, sitemap, robots, security.txt, SVG. */
function listTextFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTextFiles(full, base);
    const rel = path.relative(base, full).split(path.sep).join('/');
    return /\.(html|js|css|txt|xml|json|webmanifest|svg)$/i.test(rel) ? [rel] : [];
  });
}
