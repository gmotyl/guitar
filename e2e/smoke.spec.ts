import { expect, test, type Browser, type BrowserContextOptions } from '@playwright/test';

const LANG_KEY = 'guitar.lang';

/** Fresh context with a browser locale and, optionally, a stored language choice. */
async function open(browser: Browser, opts: BrowserContextOptions & { stored?: string } = {}) {
  const { stored, ...contextOptions } = opts;
  const context = await browser.newContext(contextOptions);
  if (stored) {
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [LANG_KEY, stored] as const);
  }
  return { context, page: await context.newPage() };
}

test('stub redirects by browser language and stored choice', async ({ browser }) => {
  const pl = await open(browser, { locale: 'pl-PL' });
  await pl.page.goto('/caged');
  await expect(pl.page).toHaveURL(/\/pl\/caged\/?$/);
  await pl.context.close();

  const en = await open(browser, { locale: 'pl-PL', stored: 'en' });
  await en.page.goto('/caged');
  await expect(en.page).toHaveURL(/\/en\/caged\/?$/);
  await en.context.close();
});

test('language switch keeps the page and stores the choice', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL' });
  await page.goto('/pl/caged');
  await page.getByRole('button', { name: 'Otwórz menu' }).click();
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/caged\/?$/);
  expect(await page.evaluate((key) => localStorage.getItem(key), LANG_KEY)).toBe('en');
  await context.close();
});

test('hamburger exposes pages and language on desktop', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'en-US', viewport: { width: 1280, height: 800 } });
  await page.goto('/en/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const panel = page.locator('#site-menu');
  await expect(panel.getByRole('link', { name: 'The CAGED system' })).toBeVisible();
  const langs = panel.getByRole('group', { name: 'Language' });
  await expect(langs.getByText('Polski')).toBeVisible();
  await expect(langs.getByText('English')).toBeVisible();
  await context.close();
});

test('filters hide and dim', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'en-US' });
  await page.goto('/en/caged');
  await page.getByRole('group', { name: 'Key' }).getByRole('button', { name: 'G', exact: true }).click();
  await page.getByRole('group', { name: 'Shape' }).getByRole('button', { name: 'E', exact: true }).click();

  const cards = page.locator('section.card:visible');
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAttribute('data-key', 'G');

  const tiles = cards.locator('.shape-card');
  await expect(tiles).not.toHaveCount(0);
  for (const tile of await tiles.all()) {
    // Retrying assertion: the dim fades in over a short CSS transition.
    const shape = await tile.getAttribute('data-shape');
    await expect(tile).toHaveCSS('opacity', shape === 'E' ? '1' : '0.12');
  }
  const board = cards.locator('.board:visible [data-role="dot"]');
  await expect(board.first()).toBeVisible();
  for (const dot of await board.all()) {
    const group = await dot.getAttribute('data-group');
    expect(Number(await dot.getAttribute('opacity'))).toBe(group === 'E' ? 1 : 0.12);
  }
  await context.close();
});

test('portrait shows the vertical board without horizontal scroll', async ({ browser }) => {
  const portrait = await open(browser, { locale: 'en-US', viewport: { width: 390, height: 844 } });
  await portrait.page.goto('/en/caged');
  await expect(portrait.page.locator('.board--v').first()).toBeVisible();
  await expect(portrait.page.locator('.board--h').first()).toBeHidden();
  expect(await portrait.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await portrait.context.close();

  const landscape = await open(browser, { locale: 'en-US', viewport: { width: 844, height: 390 } });
  await landscape.page.goto('/en/caged');
  await expect(landscape.page.locator('.board--h').first()).toBeVisible();
  await expect(landscape.page.locator('.board--v').first()).toBeHidden();
  await landscape.context.close();
});

test('pentatonic: portrait board without horizontal scroll', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 390, height: 844 } });
  await page.goto('/pl/pentatonic');
  await expect(page.locator('.board--v').first()).toBeVisible();
  await expect(page.locator('.board--h').first()).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await context.close();
});

test('pentatonic: chord tones stay visible under box filter', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/pentatonic');
  await page.getByRole('group', { name: 'Pudełko' }).getByRole('button', { name: '1', exact: true }).click();
  const em = page.getByRole('group', { name: 'Akordy tonacji' }).getByRole('button', { name: /· Em$/ });
  await em.click();
  await expect(em).toHaveAttribute('aria-pressed', 'true');

  const dots = page.locator('.board--h [data-role="dot"]');
  // Em (E G B) in A minor: every chord-tone dot is drawn in a key-chord colour.
  const chordDots = dots.filter({ has: page.locator('circle[stroke^="var(--k"], path[data-role="slice"]') });
  await expect(chordDots.first()).toBeVisible();
  const frets = new Set<number>();
  for (const dot of await chordDots.all()) {
    frets.add(Number(await dot.getAttribute('data-fret')));
    expect(Number(await dot.getAttribute('opacity'))).toBe(1);
  }
  // Box 1 of A minor spans frets 5–8; chord tones elsewhere on the neck must stay lit too.
  expect([...frets].some((f) => f < 5 || f > 8)).toBe(true);
  // ...while plain scale dots outside the box are dimmed.
  const plain = dots.filter({ has: page.locator('circle[stroke="var(--muted)"]') });
  const dimmed = [];
  for (const dot of await plain.all()) if (Number(await dot.getAttribute('opacity')) < 1) dimmed.push(dot);
  expect(dimmed.length).toBeGreaterThan(0);
  await context.close();
});

test('caged: minor switch', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL' });
  await page.goto('/pl/caged');
  const minor = page.getByRole('group', { name: 'Tryb akordu' }).getByRole('button', { name: 'moll', exact: true });
  await minor.click();
  await expect(minor).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('section.card h2').first()).toContainText('C-moll');
  await context.close();
});

test('menu: screen-on preference persists', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL' });
  // Headless Chromium may lack the API; a stub makes the switch render either way.
  await context.addInitScript(() => {
    const sentinel = { released: false, release: () => Promise.resolve(), addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: () => Promise.resolve(sentinel) },
    });
  });
  await page.goto('/pl/pentatonic');
  await page.getByRole('button', { name: 'Otwórz menu' }).click();
  const toggle = page.locator('.menu-switch');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('guitar.wakeLock'))).toBe('off');
  await page.getByRole('button', { name: 'Otwórz menu' }).click();
  await expect(page.locator('.menu-switch')).toHaveAttribute('aria-pressed', 'false');
  await context.close();
});

test('pentatonic: works without JS', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'en-US', javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  await page.goto('/en/pentatonic');
  const board = page.locator('.board--h').first();
  await expect(board).toBeVisible();
  await expect(board.locator('[data-role="dot"]').first()).toBeVisible();
  await context.close();
});
