/**
 * vercel.json — the strict CSP and security headers, the R2 rewrites the
 * installed Android apps depend on, the legal paths, and the www redirect.
 */
import { describe, test, expect } from 'vitest';
import { json } from './test/helpers.js';

const vercel = json('vercel.json');
const headersFor = (source) => Object.fromEntries(
  (vercel.headers.find(h => h.source === source)?.headers || []).map(h => [h.key.toLowerCase(), h.value]),
);
const page = headersFor('/(.*)');
const csp = Object.fromEntries(page['content-security-policy'].split(';').map(s => s.trim()).filter(Boolean)
  .map((d) => { const [name, ...values] = d.split(/\s+/); return [name, values]; }));

describe('vercel.json — Android OTA and media through verum.cam/r2', () => {
  // Installed apps (1.0.5, 1.0.6) read https://verum.cam/r2/ota/manifest.json
  // first and fetch bundles and media through verum.cam/r2: losing this
  // rewrite would stop their updates.
  test('/r2/ota/:path* goes to the bucket\'s ota/ folder', () => {
    expect(vercel.rewrites).toContainEqual({ source: '/r2/ota/:path*', destination: 'https://files.verum.cam/ota/:path*' });
  });

  test('every other /r2 path (media, the APK) goes to the bucket too', () => {
    expect(vercel.rewrites).toContainEqual({ source: '/r2/:path*', destination: 'https://files.verum.cam/:path*' });
  });

  test('the OTA rule comes first, and nothing before them catches /r2', () => {
    const sources = vercel.rewrites.map(r => r.source);
    expect(sources.indexOf('/r2/ota/:path*')).toBe(0);
    expect(sources.indexOf('/r2/:path*')).toBe(1);
  });

  // The bucket also holds what people upload. The backend signs every upload
  // as application/octet-stream, so none of it runs or renders; this is the
  // second lock, for an object that got another type some other way: a
  // document served from /r2 is sandboxed (no script, and never verum.cam's
  // origin, its storage or its service worker).
  test('whatever /r2 serves is sandboxed and never sniffed', () => {
    const r2 = headersFor('/r2/(.*)');
    const directives = r2['content-security-policy'].split(';').map(s => s.trim());
    expect(directives).toContain('sandbox'); // bare: no allow-scripts, no allow-same-origin
    expect(directives).toContain("default-src 'none'");
    expect(directives).toContain("frame-ancestors 'none'");
    expect(r2['content-security-policy']).not.toMatch(/allow-/);
    expect(r2['x-content-type-options']).toBe('nosniff');
    // No Cross-Origin-Resource-Policy here: the installed apps load these files from their own origin
    expect(r2).not.toHaveProperty('cross-origin-resource-policy');
  });

  test('the /r2 headers come after the page headers, so they are the ones that hold there', () => {
    const sources = vercel.headers.map(h => h.source);
    expect(sources.indexOf('/r2/(.*)')).toBeGreaterThan(sources.indexOf('/(.*)'));
  });

  test('a manifest path resolves the way Vercel will rewrite it', () => {
    const rule = vercel.rewrites[0];
    const re = new RegExp(`^${rule.source.replace(':path*', '(.*)')}$`);
    const [, rest] = '/r2/ota/manifest.json'.match(re);
    expect(rule.destination.replace(':path*', rest)).toBe('https://files.verum.cam/ota/manifest.json');
  });
});

describe('vercel.json — pages', () => {
  test('/privacy and /terms (Google Play, security.txt and old links) serve the documents', () => {
    expect(vercel.rewrites).toContainEqual({ source: '/privacy', destination: '/privacy.html' });
    expect(vercel.rewrites).toContainEqual({ source: '/terms', destination: '/terms.html' });
  });

  test('no SPA fallback: an unknown path is a 404 (404.html), not the hub', () => {
    expect(vercel.rewrites.filter(r => /\(\.\*\)|:path\*$/.test(r.source) && !r.source.startsWith('/r2'))).toEqual([]);
    expect(vercel.rewrites.some(r => r.destination === '/index.html' || r.destination === '/')).toBe(false);
  });

  test('www.verum.cam redirects to the apex, path kept', () => {
    expect(vercel.redirects).toContainEqual({
      source: '/:path(.*)', has: [{ type: 'host', value: 'www.verum.cam' }],
      destination: 'https://verum.cam/:path', permanent: true,
    });
  });

  test('the build runs on a frozen lockfile into dist/', () => {
    expect(vercel).toMatchObject({ installCommand: 'yarn install --frozen-lockfile', buildCommand: 'yarn build', outputDirectory: 'dist' });
  });
});

describe('vercel.json — Content-Security-Policy', () => {
  test('everything is off unless named, and only this origin is named', () => {
    expect(csp['default-src']).toEqual(["'none'"]);
    for (const directive of ['script-src', 'style-src', 'img-src', 'font-src', 'connect-src', 'manifest-src']) {
      expect(csp[directive], directive).toEqual(["'self'"]);
    }
  });

  test('no inline code, no eval, no data: or blob: anywhere', () => {
    const values = Object.values(csp).flat();
    for (const loose of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "'wasm-unsafe-eval'", 'data:', 'blob:', '*', 'https:', 'http:']) {
      expect(values, loose).not.toContain(loose);
    }
  });

  test('no framing, no plugins, no <base>, no forms, https only', () => {
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'none'"]);
    expect(csp['form-action']).toEqual(["'none'"]);
    expect(csp).toHaveProperty('upgrade-insecure-requests');
  });

  test('Trusted Types: no DOM sink takes a string (public/hub.js uses none)', () => {
    expect(csp['require-trusted-types-for']).toEqual(["'script'"]);
    expect(csp['trusted-types']).toEqual(["'none'"]);
  });
});

describe('vercel.json — other headers', () => {
  test('HSTS, nosniff, no framing, referrer, COOP', () => {
    expect(page['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(page['x-content-type-options']).toBe('nosniff');
    expect(page['x-frame-options']).toBe('DENY');
    expect(page['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(page['cross-origin-opener-policy']).toBe('same-origin');
    expect(page['x-xss-protection']).toBe('0');
  });

  test('the hub asks for no device feature', () => {
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()', 'display-capture=()', 'payment=()', 'usb=()']) {
      expect(page['permissions-policy']).toContain(feature);
    }
    // Chrome logs interest-cohort as unknown: a console error Lighthouse counts
    expect(page['permissions-policy']).not.toContain('interest-cohort');
  });

  test('security.txt as UTF-8 plain text; hub.js and sw.js always revalidated; assets immutable', () => {
    expect(headersFor('/.well-known/security.txt')['content-type']).toBe('text/plain; charset=utf-8');
    expect(headersFor('/hub.js')['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(headersFor('/sw.js')['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(headersFor('/assets/(.*)')['cache-control']).toBe('public, max-age=31536000, immutable');
  });
});
