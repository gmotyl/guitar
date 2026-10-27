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
