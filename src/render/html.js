/**
 * html.js — the helpers the pages are written with.
 *
 * They build HTML strings at build time (vite.config.js runs them from
 * transformIndexHtml) and in tests, never in the browser: nothing here is
 * shipped, so the CSP needs no inline script or style for any of it.
 *
 *  - esc / attrs: every value that reaches the HTML goes through esc().
 *  - t(): a text in every language, one element each with its `lang`;
 *    styles/base.css shows only the language on <html data-lang>, which
 *    public/boot.js sets before the body paints. No string tables reach the
 *    browser and nothing flashes.
 *  - icon(): a Lucide icon (ISC licence) as inline SVG, drawn at build time.
 *  - brandLogo(): the Verum V-Key mark and the VERUM wordmark, as in
 *    e2ee-chat-frontend's components/BrandLogo.jsx (sizes are classes here,
 *    not an inline style, for `style-src 'self'`).
 */
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Download, MessagesSquare, NotebookPen,
  KeyRound, LockKeyhole, ShieldCheck, Server, EyeOff, UserRound, Phone, Video,
  MapPin, Timer, QrCode, FolderTree, Link2, Waypoints, Tags, SquareCheckBig,
  Globe, Smartphone, Tv, Mail, FileText, Fingerprint, Ban, Radio,
} from 'lucide';
import { LANGS, COPY } from '../content/site.js';

const ICONS = {
  ArrowLeft, ArrowRight, ArrowUpRight, Download, MessagesSquare, NotebookPen,
  KeyRound, LockKeyhole, ShieldCheck, Server, EyeOff, UserRound, Phone, Video,
  MapPin, Timer, QrCode, FolderTree, Link2, Waypoints, Tags, SquareCheckBig,
  Globe, Smartphone, Tv, Mail, FileText, Fingerprint, Ban, Radio,
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ESCAPES[ch]);
}

/** ' a="1" b' from { a: 1, b: true, c: false, d: null }. */
export function attrs(map = {}) {
  return Object.entries(map)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}

/**
 * The same text in every language. `pick(copy, lang)` returns the plain
 * string for one language (escaped here). One element per language, each
 * with class "l" and its own lang attribute.
 */
export function t(pick, { tag = 'span', cls = '' } = {}) {
  return LANGS.map((lang) => {
    const value = pick(COPY[lang], lang);
    if (typeof value !== 'string') throw new Error(`t(): no ${lang} text`);
    return `<${tag}${attrs({ class: cls ? `l ${cls}` : 'l', lang })}>${esc(value)}</${tag}>`;
  }).join('');
}

export function icon(name, { size = 16, cls = '' } = {}) {
  const node = ICONS[name];
  if (!node) throw new Error(`icon(): no icon named ${name}`);
  const inner = node.map(([tag, a]) => `<${tag}${attrs(a)}/>`).join('');
  return `<svg${attrs({
    class: cls ? `icon ${cls}` : 'icon',
    xmlns: 'http://www.w3.org/2000/svg',
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false',
  })}>${inner}</svg>`;
}

// The V-Key mark: one path, filled with currentColor (viewBox of the
// source artwork, 221×180). The same path as public/favicon.svg.
export const VKEY_PATH = 'M395 1458 c18 -42 170 -338 341 -663 34 -66 92 -176 128 -245 79 -153 119 -202 183 -224 56 -19 92 -20 145 -4 64 19 111 72 176 198 61 117 85 163 267 510 56 107 132 255 169 328 l66 132 -177 0 c-98 0 -195 -5 -215 -10 -54 -15 -91 -51 -129 -125 -19 -36 -36 -65 -39 -65 -3 1 -14 15 -25 32 -65 102 -241 102 -324 1 l-28 -34 -36 63 c-71 127 -97 138 -336 138 l-180 0 14 -32z m379 -77 c28 -26 40 -47 177 -303 46 -87 86 -158 90 -158 3 0 14 18 24 40 l18 39 -42 86 c-46 95 -50 125 -21 173 53 86 175 77 211 -16 18 -47 9 -87 -44 -188 -106 -205 -242 -454 -248 -454 -3 0 -39 64 -80 142 -41 78 -100 192 -132 253 -96 182 -207 402 -207 410 0 4 51 5 114 3 105 -3 117 -5 140 -27z m956 23 c0 -6 -154 -306 -230 -449 -20 -38 -68 -128 -105 -200 -37 -71 -72 -136 -78 -143 -7 -9 -20 6 -49 60 -58 106 -58 106 -81 54 l-19 -45 36 -72 c51 -102 46 -161 -16 -199 -42 -25 -84 -25 -126 0 -65 40 -68 104 -9 215 43 80 180 335 256 475 23 41 65 120 94 174 68 129 78 136 220 136 59 0 107 -3 107 -6z';

export function brandMark() {
  return '<svg class="brand-logo__mark" viewBox="0 0 221 180" preserveAspectRatio="xMidYMid meet"'
    + ' fill="currentColor" aria-hidden="true" focusable="false">'
    + `<g transform="translate(0,180) scale(0.1,-0.1)" stroke="none"><path d="${VKEY_PATH}"/></g></svg>`;
}

/** variant "full" (mark + VERUM) or "icon"; size is a class: nav | footer | hero. */
export function brandLogo({ variant = 'full', size = 'nav' } = {}) {
  const word = variant === 'full' ? '<span class="brand-logo__word">VERUM</span>' : '';
  return `<span class="brand-logo brand-logo--${variant} brand-logo--${size}" role="img" aria-label="Verum">${brandMark()}${word}</span>`;
}

/**
 * An e-mail address as a mailto link. Cloudflare proxies verum.cam, and its
 * Email Obfuscation would rewrite a plain address into a script-decoded
 * link the CSP may stop: the email_off markers keep it out.
 */
export function mailto(address, { cls = '' } = {}) {
  return `<!--email_off--><a${attrs({ class: cls || null, href: `mailto:${address}` })}>${esc(address)}</a><!--/email_off-->`;
}
