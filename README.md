# verum-hub

The source of [verum.cam](https://verum.cam): the hub of the Verum ecosystem, one account for private, end-to-end encrypted products.

- **Verum Chat** — [chat.verum.cam](https://chat.verum.cam): the messenger (repo `e2ee-chat-frontend`).
- **Verum Notes** — [notes.verum.cam](https://notes.verum.cam): an end-to-end encrypted Markdown knowledge base with [[links]], a graph and tasks (repo `verum-notes`).

A static site: Vite renders the pages at build time from `src/content/` (EN, RU, UZ), ships HTML, one stylesheet and one small script, under a strict Content-Security-Policy (`vercel.json`).

```bash
yarn install --frozen-lockfile
yarn dev     # http://localhost:5180
yarn test
yarn build   # dist/
```

Security reports: see [/.well-known/security.txt](public/.well-known/security.txt). Contact: support@verum.cam.
