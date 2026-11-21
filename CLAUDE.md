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

## Current state (2026-11-21)

- **Live.** verum.cam is this repo's Vercel project, and a push to `master` deploys it. On 2026-11-21:
  - `https://verum.cam/` answered `Server: Vercel` with this CSP; the deploy was from 2026-11-18.
  - `www.verum.cam` answered 307 to the apex, path and query kept. That is Vercel's domain redirect, which comes before vercel.json's `permanent` one (308); choosing 308 in the project's Domains would make it permanent.
  - `/r2/ota/manifest.json` answered 200 `application/json` from the bucket, so the installed apps' OTA path works.
  - `chat.verum.cam` serves the messenger.
- **Git:** `master` = `origin/master` on https://github.com/qadamboy-dev/verum-hub (`master` is the default branch).
- **2026-11-13, ecosystem stage 2:** the Verum Notes card is live ("Open Verum Notes", `btn-primary`, the zero-knowledge line as its note), the home page's JSON-LD has a second `SoftwareApplication` (Verum Notes, `ProductivityApplication`, Web), and the Privacy Policy has a Verum Notes section (below). The `soon` label and its style are gone: no product is "coming" any more.
- **2026-11-21, the audit of stages 1–3.** Two fixes; nothing else in vercel.json, `hub.js` (the `#chat=` hand-off) or `sw.js` needed one:
  - Everything under `/r2/` (the bucket, user uploads included) now gets its own CSP, `default-src 'none'; sandbox; frame-ancestors 'none'`, plus nosniff (vercel.json below).
  - A notification click in `sw.js` opens only `https://chat.verum.cam/…`. It used to follow any `url` kept in a notification's data.
- **2026-11-21, no APK on the site.** Scanners flagged verum.cam as linking an APK ("contains-apk"): the button pointed at `/r2/apk/verum.apk` with `type="application/vnd.android.package-archive"`. It now opens the GitHub releases page in a new tab, `https://github.com/qadamboy-dev/verum-hub/releases/latest` (`ANDROID_RELEASES_URL` in `content/site.js`, `target="_blank" rel="noopener"`, `data-product="android"`). The label is still "Download Android APK": the word, never the `.apk` extension. `checkDist.js` fails the build if any page or other text file names a `.apk` file or the APK media type. The build reads no environment variables any more: `VITE_ANDROID_APK_URL` and `.env.example` are gone, and a value left in Vercel's settings changes nothing. `security.txt` was brought to the owner's list the same day (below).
- `yarn test`: 248 tests in 10 files, the real build included. `yarn build` passes its own dist/ checks. `yarn audit`: 0 vulnerabilities (118 packages, at 2026-11-13; no dependency changed since).
- Looked at in Chromium under the real headers (a local server that sends vercel.json's CSP), on 2026-11-13 and again on 2026-11-21 after the releases link:
  - no CSP or Trusted Types violation, `hub.js` running, fonts and styles loaded;
  - EN, RU and UZ;
  - /privacy#delete-account landing in the shown document;
  - 375 px without horizontal scroll;
  - 404;
  - no `.apk` in any page;
  - security.txt served as `text/plain`.

**The owner's steps still open** (the domains moved: verum.cam and www here, chat.verum.cam on the messenger's project):
1. **The Android button needs a public release.** `https://github.com/qadamboy-dev/verum-hub` and its `/releases/latest` answered 404 to a visitor who isn't signed in on 2026-11-21: the repo is private, or not visible to the public. Until the repo is public and has a release with the APK attached, the button leads to GitHub's 404. The other way out is a separate public repo for releases: change `ANDROID_RELEASES_URL`. The APK itself comes from the messenger's native shell, which lives outside every repo here (`../e2ee-chat-frontend/CLAUDE.md`). On 2026-11-21 it wasn't on this machine either, and neither was a JDK, the Android SDK or the release keystore.
2. On the backend, `yarn r2:init-cors` against the real bucket, unless it ran already: without it, uploads from chat.verum.cam are refused.
3. Read the legal documents (below): they were widened for the ecosystem and are not yet approved.
4. Cloudflare: verum.cam answers from Vercel directly (DNS only). If it is ever proxied, keep features that rewrite HTML off for it (Web Analytics injection, Rocket Loader). The CSP blocks what they inject; the e-mail addresses are already wrapped in `<!--email_off-->`.

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

- **Rewrites, in this order:** `/r2/ota/:path*` → `https://files.verum.cam/ota/:path*` (installed Android apps, 1.0.4 to 1.0.6, read `https://verum.cam/r2/ota/manifest.json` first and fetch bundles there: never drop it), `/r2/:path*` → `https://files.verum.cam/:path*` (their media downloads; no page links the bucket's `apk/` any more), `/privacy` and `/terms` → the HTML files. No SPA fallback: an unknown path is `404.html` with a 404.
- **CSP:** `default-src 'none'`, and `'self'` only for scripts, styles, images, fonts, connections and the manifest; `base-uri`, `form-action`, `frame-ancestors`, `object-src` are `'none'`; `upgrade-insecure-requests`; Trusted Types required with no policy allowed (`hub.js` touches no DOM sink: keep it that way). No `unsafe-*`, no hashes, no `data:`. `'self'` includes `/r2/`, which proxies user uploads. That is safe because the backend signs `application/octet-stream` into every upload and `nosniff` is on. Since 2026-11-21 there is a second lock: a rule `/r2/(.*)` after `/(.*)` (Vercel merges header rules, and the later one wins for the same key) gives everything there `default-src 'none'; sandbox; frame-ancestors 'none'`. So an object that got another type some other way still can't run a script, or be verum.cam's origin with its storage and its service worker. The CSP touches documents only, so the apps' `fetch` of the OTA manifest, bundles and media is unchanged. There is no Cross-Origin-Resource-Policy there: the installed apps load these files from their own origin.
- HSTS with preload (as on the messenger's domain), `nosniff`, `DENY`, COOP, a Permissions-Policy that asks for nothing, `text/plain` for security.txt, immutable `/assets/`.
- `www.verum.cam` redirects to `https://verum.cam/:path`.

## public/

- `.well-known/security.txt` (RFC 9116), as the owner set it on 2026-11-21:
  - `Contact: mailto:support@verum.cam`
  - `Expires: 2027-11-21T00:00:00.000Z`
  - `Preferred-Languages: ru, en, uz`
  - `Canonical`: this host only, `https://verum.cam/.well-known/security.txt`
  - `Policy`: the Terms' `#security`, then the Privacy Policy

  `Expires` must stay in the future and under a year ahead (`public.test.js` fails once it passes): renew it here, and keep the messenger's copy in step. That copy (`../e2ee-chat-frontend/public/.well-known/security.txt`) serves chat.verum.cam and lists both hosts as `Canonical`. On 2026-11-21 it still said `en, ru, uz`, with `Expires` 2027-11-01: valid, but no longer the same file.
- `sw.js`: the worker that replaces the messenger's on verum.cam. Nothing registers it; browsers that had the messenger's worker fetch `/sw.js` to update it and get this one. On activation it ends the old push subscription (the server drops it at the push service's 410) and, if there was one, shows once that the messenger moved; a push that still arrives is shown, and every click opens chat.verum.cam (`#chat=<id>` kept). A `url` kept in a notification's data is followed only when it starts with `https://chat.verum.cam/`; anything else opens the messenger's home. No fetch handler. `sw.test.js` runs it in a fake scope.
- `og-cover.png` is the render of `scripts/og-cover.html` (the command is in that file). Icons are the messenger's (`yarn icons` there).
- `robots.txt`, `sitemap.xml` (the hub and the two documents).

## Build checks

`scripts/checkDist.js` reads `dist/` after every build and fails it (`verum-hub-checks` plugin) on: an inline script other than JSON-LD, an event-handler or style attribute, a `<style>` element, a script or stylesheet from another origin, a `data:` or remote `url()` in CSS, a local link or asset that doesn't exist (vercel.json's rewrites count), a plain-http or `javascript:` link, `target=_blank` without `noopener`, and a `.apk` file or the APK media type named in a page or in any other text file of the site (`.js`, `.css`, `.txt`, `.xml`, `.json`, `.webmanifest`, `.svg`). `build.assetsInlineLimit` is 0 so Vite never inlines a font as `data:`.

## Tests

Vitest in Node (`vitest.config.js`); `src/test/helpers.js` renders a page into its template and parses it with JSDOM. `build.test.js` runs two real builds into temporary folders. The second has an old `VITE_ANDROID_APK_URL` set, to prove the build ignores it: neither build may name a `.apk` anywhere.
