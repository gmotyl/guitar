# guitar

Source of [guitar.motyl.dev](https://guitar.motyl.dev): guitar learning pages in Polish and English.
Pages: a CAGED system explorer (major and minor, `/caged`), the pentatonic scale with the key
chords overlaid (`/pentatonic`), the Nashville Number System with a key's chords as Numbers
(`/nashville`), and major and minor Triads with their Inversions on the four String sets (`/triads`).
The screen stays on while a page is open (switch in the menu).

The triads page has two modes. **Inversions** shows one chord's Triads in Rung order (Next walks the
String sets of one Rung, low to high, then moves up the neck), on all String sets or one; clicking a
note jumps to the first Triad after the current one in Rung order that contains it. **Chord
changes** plays a progression as a Triad path: from an Anchor (one Triad of one chord), the nearest
Triad of each chord before and after it on the same String set. Clicking a chord tone on the neck
anchors the path there; repeated clicks on the current Triad cycle its String sets, and clicking a
dashed path dot makes that chord current. A "show other chord tones" switch hides the clickable tones.
The progression field takes Numbers or chord names
and shows the other form live; typed names pick their key by detection, and the key chips move them
(for Numbers, the key chips set the key). Pick one of 13 song presets, or save your own progressions
by name (kept in localStorage). In Chord changes mode only, overlay the Chord pentatonic or the Chord
scale of the current chord on the whole neck for soloing. The page state lives in the URL: a shared
link restores the mode with its chord, String set and Inversion index (Inversions), or its progression,
key, String set, Anchor (`at` chord index, `start` Triad index), overlay and `tones=off` (Chord
changes), and opens on the first chord.

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
   - Non-production branch builds: on, deploy command `npx wrangler preview` (needs the `previews` block in `wrangler.jsonc`)
2. **Custom domains.** Worker `guitar` → Settings → Domains & Routes → Add → Custom Domain → `guitar.motyl.dev`, then the same for `gitara.motyl.dev` (defaults to Polish).
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
