/**
 * public/ — security.txt (RFC 9116), robots.txt and sitemap.xml, and the
 * icons the pages point at.
 */
import { describe, test, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { file, ROOT } from './test/helpers.js';
import { LEGAL_UPDATED } from './content/legalContent.js';

describe('security.txt (RFC 9116)', () => {
  const raw = file('public/.well-known/security.txt');
  const fields = raw.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map((l) => {
    const m = l.match(/^([A-Za-z-]+): (\S.*)$/);
    expect(m, `not a "Field: value" line: ${l}`).toBeTruthy();
    return [m[1].toLowerCase(), m[2].trim()];
  });
  const all = (name) => fields.filter(([k]) => k === name).map(([, v]) => v);

  test('plain ASCII with only the fields the RFC defines', () => {
    expect(raw).not.toMatch(/[^\x09\x0a\x0d\x20-\x7e]/);
    const known = ['acknowledgments', 'canonical', 'contact', 'encryption', 'expires', 'hiring', 'policy', 'preferred-languages'];
    for (const [k] of fields) expect(known).toContain(k);
  });

  test('a Contact at the ecosystem\'s mailbox', () => {
    expect(all('contact')).toEqual(['mailto:support@verum.cam']);
  });

  test('exactly one Expires, in the future and less than a year and a day away', () => {
    const expires = all('expires');
    expect(expires).toHaveLength(1);
    expect(expires[0]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/);
    const left = Date.parse(expires[0]) - Date.now();
    // Failing here means the file has expired: set a new date (at most a
    // year ahead) here and in e2ee-chat-frontend's copy, and redeploy both
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(366 * 24 * 3600 * 1000);
  });

  test('the same file as the messenger\'s: both hosts are Canonical, the Terms\' disclosure rules are the Policy', () => {
    expect(all('canonical')).toEqual([
      'https://verum.cam/.well-known/security.txt',
      'https://chat.verum.cam/.well-known/security.txt',
    ]);
    expect(all('policy')).toEqual(['https://verum.cam/terms#security', 'https://verum.cam/privacy.html']);
    expect(all('preferred-languages')).toEqual(['en, ru, uz']);
  });
});

describe('robots.txt and sitemap.xml', () => {
  test('crawlers may read everything, and find the sitemap', () => {
    // (a Windows checkout may turn the line ends into CRLF)
    expect(file('public/robots.txt').replace(/\r\n/g, '\n')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://verum.cam/sitemap.xml\n');
  });

  test('the sitemap lists the hub and the two documents, dated', () => {
    const sitemap = file('public/sitemap.xml');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]);
    expect(locs.map(([loc]) => loc)).toEqual(['https://verum.cam/', 'https://verum.cam/privacy', 'https://verum.cam/terms']);
    for (const [, lastmod] of locs) expect(lastmod).toMatch(/^\d{4}-\d\d-\d\d$/);
    expect(locs[1][1]).toBe(LEGAL_UPDATED);
    expect(locs[2][1]).toBe(LEGAL_UPDATED);
  });
});

describe('icons and the cover', () => {
  test.each([
    'favicon.ico', 'favicon.svg', 'favicon-48x48.png', 'favicon-96x96.png', 'apple-touch-icon.png',
    'icon-192.png', 'icon-512.png', 'og-cover.png',
  ])('public/%s exists', (name) => {
    expect(existsSync(path.join(ROOT, 'public', name))).toBe(true);
  });
});
