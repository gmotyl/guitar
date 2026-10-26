# guitar

Source of [guitar.motyl.dev](https://guitar.motyl.dev): guitar learning pages in Polish and English.
The first page is a CAGED system explorer.

Astro (static output) with Preact islands, served by Cloudflare Workers static assets.

## Development

Use pnpm via corepack:

```sh
corepack pnpm install
corepack pnpm dev       # dev server at http://localhost:4321/pl/
corepack pnpm build     # astro check + static build into dist/
corepack pnpm preview   # serve dist/
corepack pnpm test      # unit tests (Vitest)
corepack pnpm e2e       # end-to-end tests (Playwright)
```

E2E: set `PW_CHROMIUM_PATH` to a local Chromium binary if `playwright install` is unavailable.

## Deploy

Hosting is Cloudflare Workers static assets (`wrangler.jsonc` serves `dist/`, unknown paths get `404.html`).
These are one-time dashboard steps; after them every push to `main` deploys and every PR gets a preview URL.

1. **Connect the repo (Workers Builds).** Cloudflare dashboard → Workers & Pages → Create → Import a repository → `gmotyl/guitar`. Settings:
   - Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm build`
   - Deploy command: `npx wrangler deploy`
   - Production branch: `main`
   - Non-production branch builds: on
2. **Custom domain.** Worker `guitar` → Settings → Domains & Routes → Add → Custom Domain → `guitar.motyl.dev`.
3. **Short link DNS.** DNS of `motyl.dev` → Add record: type `AAAA`, name `caged`, content `100::`, proxied (orange cloud).
4. **Short link redirect.** `motyl.dev` → Rules → Redirect Rules → Create:
   - When incoming requests match: Hostname equals `caged.motyl.dev`
   - Then: Static, URL `https://guitar.motyl.dev/caged`, status `301`, preserve query string off

### Verify

Wait 2–3 minutes after the deploy finishes (rollout is async), then:

```sh
curl -sI "https://guitar.motyl.dev/pl/caged?cb=$(date +%s)"    # 200
curl -sI https://caged.motyl.dev                               # 301, location: https://guitar.motyl.dev/caged
curl -s "https://guitar.motyl.dev/does-not-exist?cb=$(date +%s)" # the 404 page
```
