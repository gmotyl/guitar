// Reads the static output in dist/: run `corepack pnpm build` before this file,
// otherwise every test here fails on the missing files (on purpose: no silent skip).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAGES } from '../pages';

const DIST = join(process.cwd(), 'dist');
const SITE = 'https://guitar.motyl.dev';
const read = (file: string) => readFileSync(join(DIST, file), 'utf8');
const doc = (file: string) => new DOMParser().parseFromString(read(file), 'text/html');

describe('build output', () => {
  it('build emits both language homes, stubs and 404', () => {
    for (const file of ['pl/index.html', 'en/index.html', 'index.html', 'caged/index.html', '404.html']) {
      expect(existsSync(join(DIST, file)), `dist/${file}`).toBe(true);
    }
  });

  it('prefixed pages carry lang and hreflang alternates', () => {
    for (const lang of ['pl', 'en']) {
      const d = doc(`${lang}/index.html`);
      expect(d.documentElement.getAttribute('lang')).toBe(lang);
      const alt = (h: string) => d.querySelector(`link[rel="alternate"][hreflang="${h}"]`)?.getAttribute('href');
      expect(alt('pl')).toBe(`${SITE}/pl/`);
      expect(alt('en')).toBe(`${SITE}/en/`);
      expect(alt('x-default')).toBe(`${SITE}/`);
    }
  });

  it('stubs carry a redirect script and noscript links', () => {
    for (const [file, slug] of [
      ['index.html', ''],
      ['caged/index.html', 'caged'],
    ]) {
      const html = read(file);
      expect(html).toContain('guitar.lang');
      expect(html).toContain('location.replace');
      const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? '';
      expect(noscript).toContain(`href="/pl/${slug}"`);
      expect(noscript).toContain(`href="/en/${slug}"`);
    }
  });

  it('home lists one tile per registry page', () => {
    for (const lang of ['pl', 'en'] as const) {
      const d = doc(`${lang}/index.html`);
      expect(d.querySelector('main h1')?.textContent?.trim()).toBe(lang === 'pl' ? 'Gitara' : 'Guitar');
      const tiles = Array.from(d.querySelectorAll('main .tiles a'));
      expect(tiles.map((a) => a.getAttribute('href'))).toEqual(PAGES.map((p) => `/${lang}/${p.slug}`));
      tiles.forEach((a, i) => expect(a.textContent).toContain(PAGES[i].title[lang]));
    }
    expect(doc('pl/index.html').querySelector('main .tiles a[href="/pl/caged"]')).not.toBeNull();
  });

  it('footer links to motyl.dev with the current year', () => {
    const year = new Date().getFullYear();
    for (const file of ['pl/index.html', 'en/index.html', '404.html']) {
      const footer = doc(file).querySelector('footer');
      expect(footer?.textContent?.replace(/\s+/g, ' ').trim()).toBe(`© ${year} Grzegorz Motyl · motyl.dev`);
      expect(footer?.querySelector('a')?.getAttribute('href')).toBe('https://motyl.dev');
    }
  });
});

describe('caged page build output', () => {
  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const cssOf = (file: string) => {
    const html = read(file);
    const inline = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)).map((m) => m[1]);
    const linked = Array.from(html.matchAll(/<link[^>]+href="\/([^"]+\.css)"/g)).map((m) => read(m[1]));
    return [...inline, ...linked].join('\n').replace(/\s+/g, '');
  };

  it('renders the site header with the hamburger', () => {
    for (const lang of ['pl', 'en']) {
      const d = doc(`${lang}/caged/index.html`);
      const header = d.querySelector('header.site-header');
      expect(header, lang).not.toBeNull();
      const button = header!.querySelector('button.menu-button');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(button?.getAttribute('aria-label')).toBe(lang === 'pl' ? 'Otwórz menu' : 'Open menu');
      expect(header!.querySelector('#site-menu a[href="/' + lang + '/caged"]')).not.toBeNull();
    }
  });

  it('subtitle names the tuning E A D G B E', () => {
    for (const lang of ['pl', 'en']) {
      const d = doc(`${lang}/caged/index.html`);
      expect(text(d.querySelector('main h1'))).toContain('CAGED');
      expect(text(d.querySelector('main .sub'))).toContain('E A D G B E');
    }
    const plMain = text(doc('pl/caged/index.html').querySelector('main'));
    expect(plMain).not.toMatch(/(^|[^\p{L}])H([^\p{L}]|$)/u);
  });

  it('renders three fact cards in order', () => {
    const titles = (lang: string) =>
      Array.from(doc(`${lang}/caged/index.html`).querySelectorAll('main .facts > li > b')).map(text);
    expect(titles('pl')).toEqual(['Jak czytać', 'Zasada przesuwania', 'Dur → moll']);
    expect(titles('en')).toEqual(['How to read it', 'Moving a shape', 'Major → minor']);
  });

  it('each card holds a horizontal and a vertical board toggled by orientation CSS', () => {
    const d = doc('pl/caged/index.html');
    const cards = Array.from(d.querySelectorAll('main section.card'));
    expect(cards).toHaveLength(5);
    for (const c of cards) {
      expect(c.querySelector('.board--h svg[data-orientation="horizontal"]')).not.toBeNull();
      expect(c.querySelector('.board--v svg[data-orientation="vertical"]')).not.toBeNull();
    }
    const css = cssOf('pl/caged/index.html');
    expect(css).toContain('.board--v{display:none');
    expect(css).toMatch(/@media\(orientation:portrait\)\{[^}]*\.board--h\{display:none/);
    expect(css).toMatch(/@media\(orientation:portrait\)\{.*\.board--v\{display:block/);
  });

  it('english page has no polish strings', () => {
    const body = text(doc('en/caged/index.html').body);
    for (const pl of ['kształt', 'Akord', 'progi', 'pryma', 'dźwięki', 'siodełka', 'chwyt', 'wszystkie', 'Tonacja']) {
      expect(body, pl).not.toContain(pl);
    }
    expect(body).toContain('shape E');
    expect(body).toContain('C major');
  });

  it('built HTML contains all cards without JS', () => {
    for (const lang of ['pl', 'en']) {
      const d = doc(`${lang}/caged/index.html`);
      d.querySelectorAll('script').forEach((s) => s.remove());
      const cards = Array.from(d.querySelectorAll('main section.card'));
      expect(cards.map((c) => c.getAttribute('data-key'))).toEqual(['C', 'A', 'G', 'E', 'D']);
      for (const c of cards) {
        expect(c.hasAttribute('hidden')).toBe(false);
        expect(c.querySelectorAll('svg')).toHaveLength(2);
        expect(c.querySelectorAll('.shape-card')).toHaveLength(5);
        expect(c.querySelectorAll('.board--h [data-role="dot"]').length).toBeGreaterThan(20);
      }
      expect(d.querySelectorAll('.controls button')).toHaveLength(12);
    }
    expect(readdirSync(join(DIST, 'pl', 'caged'))).toContain('index.html');
  });
});
