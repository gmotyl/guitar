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
