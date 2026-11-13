/**
 * The stylesheets: the messenger's dark tokens, value for value; a
 * monochrome palette (no green, nothing neon); and the habits the
 * messenger's CSS keeps for old engines.
 */
import { describe, test, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { file, ROOT } from './test/helpers.js';

const SHEETS = readdirSync(path.join(ROOT, 'src/styles')).filter(f => f.endsWith('.css'));
const css = Object.fromEntries(SHEETS.map(f => [f, file(`src/styles/${f}`)]));
const all = Object.values(css).join('\n');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function colours(text) {
  const out = [];
  for (const [hex] of text.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) {
    const h = hex.length === 4 ? hex.slice(1).split('').map(c => c + c).join('') : hex.slice(1);
    out.push([hex, parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  }
  for (const [m, r, g, b] of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) out.push([m, +r, +g, +b]);
  return out;
}

describe('styles — the messenger\'s dark theme', () => {
  test.each([
    ['--bg-0', '#18181b'], ['--bg-1', '#1f1f23'], ['--bg-2', '#27272a'], ['--bg-3', '#3f3f46'],
    ['--border', '#3f3f46'], ['--border-bright', '#52525b'],
    ['--text-0', '#fafafa'], ['--text-1', '#acacb4'], ['--text-2', '#8f8f96'],
    ['--accent', '#e4e4e7'], ['--on-accent', '#18181b'],
  ])('%s is %s', (token, value) => {
    expect(css['tokens.css']).toMatch(new RegExp(`${token}:\\s*${value};`));
  });

  test('the same fonts: DM Sans, DM Mono, Marcellus for the wordmark', () => {
    expect(css['tokens.css']).toContain("--font-sans:  'DM Sans'");
    expect(css['tokens.css']).toContain("--font-mono:  'DM Mono'");
    expect(css['tokens.css']).toContain("--font-serif: 'Marcellus'");
    for (const face of ['dm-sans/400', 'dm-sans/500', 'dm-sans/600', 'dm-mono/400', 'marcellus/400']) {
      expect(css['index.css']).toContain(`@import '@fontsource/${face}.css';`);
    }
  });

  test('dark only: one colour scheme, no theme switch', () => {
    expect(css['tokens.css']).toContain('color-scheme: dark;');
    expect(stripComments(all)).not.toMatch(/data-theme|prefers-color-scheme:\s*light/);
  });
});

describe('styles — monochrome', () => {
  test('no colour leans green, and none is saturated', () => {
    for (const [what, r, g, b] of colours(stripComments(all))) {
      expect(g > r + 16 && g > b + 16, `${what} is green`).toBe(false);
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      expect(spread, `${what} is not a grey`).toBeLessThanOrEqual(16);
    }
  });

  test('no status colours from the messenger (its success is green)', () => {
    expect(all).not.toMatch(/--(success|online|warning|info|danger)\b/);
  });
});

describe('styles — habits for old engines (as in the messenger)', () => {
  test('every backdrop-filter has its -webkit- twin (Safari 14)', () => {
    const plain  = (stripComments(all).match(/(?<!-webkit-)backdrop-filter:/g) || []).length;
    const webkit = (stripComments(all).match(/-webkit-backdrop-filter:/g) || []).length;
    expect(webkit).toBe(plain);
  });

  test('no inset shorthand, color-mix() or transition: all', () => {
    const code = stripComments(all);
    expect(code).not.toMatch(/\binset\s*:/);
    expect(code).not.toMatch(/color-mix\(/);
    expect(code).not.toMatch(/transition:\s*all/);
  });

  test('hover only where there is a pointer that hovers', () => {
    const code = stripComments(all);
    const blocks = code.split(/@media\s*\(hover:\s*hover\)\s*\{/);
    // outside those blocks no rule targets :hover
    const outside = blocks[0] + blocks.slice(1).map(b => b.slice(b.indexOf('}\n}') + 3)).join('');
    expect(outside).not.toMatch(/:hover/);
  });
});
