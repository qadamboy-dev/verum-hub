import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { PAGES, pageForFile, renderInto } from './src/render/pages.js';
import { checkDist } from './scripts/checkDist.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * The pages are written in src/render/pages.js and put into the four
 * templates here, at build time and on the dev server: what ships is plain
 * HTML and one stylesheet, plus public/hub.js. Nothing runs in the browser
 * that the CSP has to make an exception for.
 */
function hubPages() {
  return {
    name: 'verum-hub-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = pageForFile(path.basename(ctx.filename));
        if (!page) throw new Error(`verum-hub-pages: no page renders ${ctx.filename}`);
        return renderInto(html, page);
      },
    },
  };
}

/** Fails the build when dist/ would break under the CSP (scripts/checkDist.js). */
function hubChecks() {
  let outDir = null;
  return {
    name: 'verum-hub-checks',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const problems = checkDist(outDir);
      if (problems.length) throw new Error(`verum-hub-checks found ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    },
  };
}

// The build reads no environment variables: every URL is in
// src/content/site.js (the Android button goes to the GitHub releases page,
// so an old VITE_ANDROID_APK_URL in Vercel's settings changes nothing).
export default defineConfig(() => {
  return {
    appType: 'mpa', // unknown paths 404, as on Vercel (404.html)
    plugins: [hubPages(), hubChecks()],
    build: {
      // The messenger's floors (Chrome 79 is the Android TV WebView). There
      // is no app code to transpile; this is for the CSS.
      target: ['chrome79', 'edge79', 'firefox78', 'safari14'],
      // Never inline an asset as a data: URL: font-src and img-src are 'self'
      assetsInlineLimit: 0,
      modulePreload: { polyfill: false },
      rolldownOptions: {
        input: Object.fromEntries(Object.entries(PAGES).map(([key, page]) => [key, path.resolve(ROOT, page.file)])),
      },
    },
    server:  { port: 5180, strictPort: true },
    preview: { port: 4180, strictPort: true },
  };
});
