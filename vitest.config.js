import { defineConfig } from 'vitest/config';

// Kept apart from vite.config.js: the pages and checks are tested directly,
// and src/build.test.js runs the real build through vite.config.js.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    testTimeout: 60_000,
  },
});
