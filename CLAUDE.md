# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`verum.cam`, the hub of the Verum ecosystem: a static site (Vite, no framework, no app JavaScript) that says what Verum is, lists the products, explains the security model and publishes the legal documents. Verum is an ecosystem of private products on one Verum account, each in its own repo next to this one:

| host | repo | what |
|---|---|---|
| `verum.cam` | `verum-hub` (this one) | the hub |
| `chat.verum.cam` | `../e2ee-chat-frontend` | Verum Chat, the messenger (until the domains are switched it still answers on verum.cam) |
| `notes.verum.cam` | `../verum-notes` | Verum Notes, the E2EE Markdown vault (notes, [[links]], graph, tasks); its sync is the API's `/api/notes` |
| `api.verum.cam` | `../e2ee-chat-backend` | the API; its CORS list pins all of the above (`src/config/origins.js`) |
| `admin.verum.cam` | `../verum-admin-web` | the staff console |

## Current state (2026-11-13)

- **Git:** `master` = `origin/master` on https://github.com/qadamboy-dev/verum-hub (pushed on 2026-11-13; `master` is the default branch). No Vercel project yet: nothing here is live, and verum.cam still serves the messenger.
- **2026-11-13, ecosystem stage 2:** the Verum Notes card is live ("Open Verum Notes", `btn-primary`, the zero-knowledge line as its note), the home page's JSON-LD has a second `SoftwareApplication` (Verum Notes, `ProductivityApplication`, Web), and the Privacy Policy has a Verum Notes section (below). The `soon` label and its style are gone: no product is "coming" any more.
- `yarn test`: 233 tests in 10 files, the real build included. `yarn build` passes its own dist/ checks. `yarn audit`: 0 vulnerabilities (118 packages).
- Looked at in Chromium under the real headers (a local server that sends vercel.json's CSP): no CSP or Trusted Types violation; EN, RU and UZ; /privacy#delete-account landing in the shown document; 375 px without horizontal scroll; 404.

**Before verum.cam points here** (the owner's steps, in this order):
1. A Vercel project imported from the GitHub repo (vercel.json carries the install, build and output settings). Domains: `verum.cam`, plus `www.verum.cam` (vercel.json redirects it to the apex; today www answers Cloudflare 526).
2. The messenger's Vercel project gets `chat.verum.cam` (DNS at Cloudflare), and keeps verum.cam until step 4.
3. On the backend, `yarn r2:init-cors` against the real bucket, or uploads from chat.verum.cam are refused.
4. Move verum.cam (and www) from the messenger's project to this one.
5. Upload the APK to the bucket at `apk/verum.apk` (the button's default), or set `VITE_ANDROID_APK_URL`. Nothing is there today: the button 404s until then.
6. Read the legal documents (below): they were widened for the ecosystem and are not yet approved.
7. Cloudflare: keep features that rewrite HTML off for verum.cam (Web Analytics injection, Rocket Loader). The CSP blocks what they inject; the e-mail addresses are already wrapped in `<!--email_off-->`.

**What moves with the origin, and what does not:** browsers keep a session, keys, the key ring, App Lock and push per origin. A person who used the messenger on verum.cam signs in again on chat.verum.cam, allows notifications again, and keeps retired keys only on verum.cam's storage (see the messenger's `CLAUDE.md`). Nothing carries that data across yet.

## Commands

Yarn 1 only (`yarn install --frozen-lockfile`, as Vercel runs it).

```bash
yarn dev        # Vite on :5180 (pages re-render on reload; content changes restart the config)
yarn build      # dist/: four HTML pages, one CSS file, public/ as it is; fails on dist/ problems
yarn preview    # dist/ on :4180 (Vite's server: no vercel.json headers or rewrites)
yarn test       # vitest: content, pages, vercel.json, public/, hub.js, sw.js, checks, a real build
```

## How a page is made

- **Content is data.** `src/content/site.js` holds every string in EN, RU and UZ with one shape (`site.test.js` checks it), plus the URLs. `src/content/legalContent.js` holds the two legal documents in RU and EN. `src/content/langs.js` holds the languages and `pickLang()`.
- **Rendering happens at build time.** `src/render/pages.js` writes each page's `<head>` and `<body>` as HTML strings (`src/render/html.js`: `esc`, `t`, `icon`, `brandLogo`, `mailto`), and the `verum-hub-pages` plugin in `vite.config.js` puts them into the templates (`index.html`, `privacy.html`, `terms.html`, `404.html`: `<!--hub:head-->`, `<!--hub:body-->`). Icons are Lucide (ISC), drawn into the HTML as SVG; `lucide` is a dev dependency only.
- **Every language is in the HTML.** `t()` writes one element per language (`class="l" lang="xx"`); `styles/base.css` shows only the one on `<html data-lang>`. So nothing flashes, the page reads without JS (in English: the static HTML says `data-lang="en"`), and no string table reaches the browser. Attributes can't be localized this way: names come from visible text or `aria-labelledby` to a localized element, and titles from `<meta name="verum:title-xx">`.
- **`public/hub.js` is all the JavaScript**, a classic ES5 script loaded from `<head>` (not bundled, so its URL is fixed; vercel.json makes browsers revalidate it). It runs before the body is parsed:
  1. on `/`, a `#chat=<id>` hash (an old notification of the messenger on verum.cam) is sent on to `https://chat.verum.cam/#chat=<id>`;
  2. the language: `verum_lang` in localStorage (the key the messenger used on verum.cam, so a returning visitor keeps their choice), else the browser's first language (ru, uz, else en); keep `pick()` in step with `pickLang()` (`hub.test.js` runs both);
  3. the RU / EN / UZ buttons (`data-set-lang`, `aria-pressed`);
  4. on the legal pages, section ids move to the document shown.
- **Styles** are one stylesheet (`src/styles/index.css`, linked from each template): the messenger's dark-theme tokens value for value (`tokens.css`, tested), its button primitives (`ui.css`), and `hub.css` / `legal.css`, written after the messenger's `welcome.css`. Dark only and monochrome: no status colours, no green (the messenger's success colour), no neon; `styles.test.js` fails on a colour that is not a grey. The messenger's old-engine habits hold: Chrome 79 floor (no flex gap where items would touch, no `inset` shorthand, no `color-mix()`), `-webkit-backdrop-filter` with every `backdrop-filter`, hover only inside `@media (hover: hover)`.

## The legal documents (privacy.html, terms.html)

- `legalContent.js` is the messenger's text (e2ee-chat-frontend `src/pages/legalContent.js` at e1135de, approved by the owner on 2026-11-12) widened on 2026-11-13 for the ecosystem: the intros and descriptions name verum.cam, chat.verum.cam and the Android app, the Terms define the Service as the ecosystem, and the Vercel / Cloudflare lines name the new hosts. Stage 2 (the same day) added Verum Notes: a Privacy section of its own (`verum-notes`: the sign-in, AES-256-GCM under an HKDF key from the account's private key, exactly the fields the server keeps per item, the metadata it sees, the browser's copy, deletion, the 2,000 limit, what a password reset means), lines in Retention and Deleting your account, notes.verum.cam in the Vercel line, and Verum Notes in the Terms' Service and keys sections. **The owner has read neither the widened text nor the Notes section yet.** Everything else is word for word, and `legalContent.test.js` is the messenger's test plus the ecosystem's checks.
- Two copies exist, and since 2026-11-14 they are the same documents: the messenger's `src/pages/legalContent.js` (e2ee-chat-frontend `9a9c580`, ecosystem stage 3) is this file word for word from `LEGAL_EMAIL` on, the Notes section included. Only the `nav` blocks (each page's own navigation strings) differ. Change this copy first, then the messenger's, and in each repo keep `LEGAL_UPDATED` and the sitemap's `lastmod` equal (tested). The messenger's `legalContent.test.js` fails on any other difference whenever this repo is checked out next to it; this repo's tests don't read the messenger's copy. Linking the messenger's legal pages here instead would leave one copy. The Notes section must match `../verum-notes` (its CLAUDE.md) and the backend's `NoteItem`: change it with them.
- Both languages are in each page (`article.l-doc`); Uzbek reads the Russian one, with a note. Section ids are link targets and must never change: `/privacy#delete-account` is the account-deletion URL in Google Play, `/terms#security` the Policy of security.txt. Only the shown document carries them (`hub.js`); without JS, the English one.
- Canonical URLs are `https://verum.cam/privacy` and `/terms` (the messenger's, kept); the footer links `/privacy.html` and `/terms.html`, and vercel.json rewrites the short paths to them.

## vercel.json

- **Rewrites, in this order:** `/r2/ota/:path*` → `https://files.verum.cam/ota/:path*` (installed Android apps, 1.0.4 to 1.0.6, read `https://verum.cam/r2/ota/manifest.json` first and fetch bundles there: never drop it), `/r2/:path*` → `https://files.verum.cam/:path*` (their media downloads and the APK), `/privacy` and `/terms` → the HTML files. No SPA fallback: an unknown path is `404.html` with a 404.
- **CSP:** `default-src 'none'`, and `'self'` only for scripts, styles, images, fonts, connections and the manifest; `base-uri`, `form-action`, `frame-ancestors`, `object-src` are `'none'`; `upgrade-insecure-requests`; Trusted Types required with no policy allowed (`hub.js` touches no DOM sink: keep it that way). No `unsafe-*`, no hashes, no `data:`. `'self'` includes `/r2/`, which proxies user uploads: that is safe only because the backend signs `application/octet-stream` into every upload and `nosniff` is on.
- HSTS with preload (as on the messenger's domain), `nosniff`, `DENY`, COOP, a Permissions-Policy that asks for nothing, `text/plain` for security.txt, immutable `/assets/`.
- `www.verum.cam` redirects to `https://verum.cam/:path`.

## public/

- `.well-known/security.txt`: the same file as the messenger's (both hosts as `Canonical`, the Terms' `#security` as `Policy`). `Expires` must stay under a year ahead: renew it here and there (`public.test.js` fails once it passes).
- `sw.js`: the worker that replaces the messenger's on verum.cam. Nothing registers it; browsers that had the messenger's worker fetch `/sw.js` to update it and get this one. On activation it ends the old push subscription (the server drops it at the push service's 410) and, if there was one, shows once that the messenger moved; a push that still arrives is shown, and every click opens chat.verum.cam (`#chat=<id>` kept). No fetch handler. `sw.test.js` runs it in a fake scope.
- `og-cover.png` is the render of `scripts/og-cover.html` (the command is in that file). Icons are the messenger's (`yarn icons` there).
- `robots.txt`, `sitemap.xml` (the hub and the two documents).

## Build checks

`scripts/checkDist.js` reads `dist/` after every build and fails it (`verum-hub-checks` plugin) on: an inline script other than JSON-LD, an event-handler or style attribute, a `<style>` element, a script or stylesheet from another origin, a `data:` or remote `url()` in CSS, a local link or asset that doesn't exist (vercel.json's rewrites count), a plain-http or `javascript:` link, `target=_blank` without `noopener`. `build.assetsInlineLimit` is 0 so Vite never inlines a font as `data:`.

## Tests

Vitest in Node (`vitest.config.js`); `src/test/helpers.js` renders a page into its template and parses it with JSDOM. `build.test.js` runs two real builds into temporary folders (the second with `VITE_ANDROID_APK_URL`).
