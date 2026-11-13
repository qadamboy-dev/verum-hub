import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { PAGES, pageForFile, renderInto, resolveApkUrl } from './src/render/pages.js';
import { checkDist } from './scripts/checkDist.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * The pages are written in src/render/pages.js and put into the four
 * templates here, at build time and on the dev server: what ships is plain
 * HTML and one stylesheet, plus public/hub.js. Nothing runs in the browser
 * that the CSP has to make an exception for.
 */
function hubPages(options) {
  return {
    name: 'verum-hub-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = pageForFile(path.basename(ctx.filename));
        if (!page) throw new Error(`verum-hub-pages: no page renders ${ctx.filename}`);
        return renderInto(html, page, options);
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

export default defineConfig(({ mode }) => {
  // VITE_ANDROID_APK_URL: where the "Download Android APK" button points
  // (see .env.example); unset, it is /r2/apk/verum.apk
  const env = loadEnv(mode, ROOT, 'VITE_');
  return {
    appType: 'mpa', // unknown paths 404, as on Vercel (404.html)
    plugins: [hubPages({ apkUrl: resolveApkUrl(env.VITE_ANDROID_APK_URL) }), hubChecks()],
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
