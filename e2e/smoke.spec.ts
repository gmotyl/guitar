import { expect, test, type Browser, type BrowserContextOptions, type Locator, type Page } from '@playwright/test';

const LANG_KEY = 'guitar.lang';

/** Fresh context with a browser locale and, optionally, a stored language choice. */
async function open(browser: Browser, opts: BrowserContextOptions & { stored?: string } = {}) {
  const { stored, ...contextOptions } = opts;
  const context = await browser.newContext(contextOptions);
  if (stored) {
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [LANG_KEY, stored] as const);
  }
  const page = await context.newPage();
  // Islands render as static HTML first (`client:load`); a click before hydration is lost.
  // Astro drops the `ssr` attribute once an island has hydrated, so every goto waits for that
  // (except without JS, where islands never hydrate).
  if (contextOptions.javaScriptEnabled === false) return { context, page };
  const goto = page.goto.bind(page);
  page.goto = async (...args) => {
    const response = await goto(...args);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    return response;
  };
  return { context, page };
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
  // The Menu island (client:load) must hydrate again before it reacts to the click.
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
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

/** Real mouse click at the centre of `dot` — dots let the pointer through to their fret column. */
async function clickCentre(page: Page, dot: Locator) {
  await dot.scrollIntoViewIfNeeded();
  const box = await dot.boundingBox();
  if (!box) throw new Error('dot has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('caged overlap click selects both shapes', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/caged');
  const card = page.locator('section.card[data-key="C"]');
  // Fret 3 of the C card sits where the C and A shape bands overlap.
  await clickCentre(page, card.locator('.board--h [data-role="dot"][data-fret="3"]').first());

  const shapes = page.getByRole('group', { name: 'Kształt' });
  for (const s of ['C', 'A']) await expect(shapes.getByRole('button', { name: s, exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const s of ['G', 'E', 'D']) await expect(shapes.getByRole('button', { name: s, exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(shapes.getByRole('button', { name: 'wszystkie', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await context.close();
});

test('pentatonic overlap click toggles two boxes', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/pentatonic');
  // A minor: Box 1 (frets 5–8) and Box 2 (7–10) overlap at fret 7. Clicking a dot inside
  // their outlines exercises pass-through of both the outline and the dot.
  const dot = page.locator('.board--h [data-role="dot"][data-fret="7"]').first();
  const boxes = page.getByRole('group', { name: 'Pudełko' });
  const chip = (name: string) => boxes.getByRole('button', { name, exact: true });

  // Precondition: an outline covers the dot's centre (it would capture the click without pass-through).
  await dot.scrollIntoViewIfNeeded();
  const b = (await dot.boundingBox())!;
  const covered = await page.evaluate(([x, y]) => {
    const outlines = [...document.querySelectorAll<SVGElement>('.board--h [data-role="outline"]')];
    const saved = outlines.map((o) => o.getAttribute('pointer-events'));
    outlines.forEach((o) => o.setAttribute('pointer-events', 'auto'));
    const hit = document.elementFromPoint(x, y);
    // Restore exactly what was there, so a missing pass-through is not masked.
    outlines.forEach((o, i) => {
      const v = saved[i];
      if (v === null) o.removeAttribute('pointer-events');
      else o.setAttribute('pointer-events', v);
    });
    return hit?.getAttribute('data-role') ?? null;
  }, [b.x + b.width / 2, b.y + b.height / 2] as const);
  expect(covered).toBe('outline');

  await clickCentre(page, dot);
  for (const n of ['1', '2']) await expect(chip(n)).toHaveAttribute('aria-pressed', 'true');
  for (const n of ['3', '4', '5']) await expect(chip(n)).toHaveAttribute('aria-pressed', 'false');
  await expect(chip('wszystkie')).toHaveAttribute('aria-pressed', 'false');

  await clickCentre(page, dot);
  await expect(chip('wszystkie')).toHaveAttribute('aria-pressed', 'true');
  for (const n of ['1', '2']) await expect(chip(n)).toHaveAttribute('aria-pressed', 'false');
  await context.close();
});

test('vertical board tap selects on a phone', async ({ browser }) => {
  const { context, page } = await open(browser, {
    locale: 'pl-PL',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await page.goto('/pl/pentatonic');
  const board = page.locator('.board--v').first();
  await expect(board).toBeVisible();
  const dot = board.locator('[data-role="dot"][data-fret="7"]').first();
  await dot.scrollIntoViewIfNeeded();
  const box = await dot.boundingBox();
  if (!box) throw new Error('dot has no bounding box');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

  const boxes = page.getByRole('group', { name: 'Pudełko' });
  await expect(boxes.getByRole('button', { name: 'wszystkie', exact: true })).toHaveAttribute('aria-pressed', 'false');
  // Fret 7 in A minor is covered by Box 1 (5–8) and Box 2 (7–10).
  for (const n of ['1', '2']) await expect(boxes.getByRole('button', { name: n, exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const n of ['3', '4', '5']) await expect(boxes.getByRole('button', { name: n, exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  await context.close();
});

/** Bar `n` (1-based, numbered through the whole chart) of the Nashville chart. */
const nashvilleBar = (page: Page, n: number) => page.locator('.chart .bar').nth(n - 1).locator('button.ch').first();

test('nashville initial state', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/nashville');
  const keys = page.getByRole('group', { name: 'Tonacja', exact: true });
  await expect(keys.getByRole('button', { name: 'A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const presets = page.getByRole('group', { name: 'Progresja', exact: true });
  await expect(presets.getByRole('button', { name: 'Blues 12 taktów', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(nashvilleBar(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(nashvilleBar(page, 2)).toHaveAttribute('aria-pressed', 'false');
  await context.close();
});

test('nashville bar click shows the chord', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/nashville');
  const bar9 = nashvilleBar(page, 9);
  await bar9.click();
  await expect(bar9).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.chordline')).toContainText('E7');
  await context.close();
});

test('nashville key change keeps numbers', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/nashville');
  await expect(nashvilleBar(page, 5).locator('.name')).toHaveText('D');
  await page.getByRole('group', { name: 'Tonacja', exact: true }).getByRole('button', { name: 'F', exact: true }).click();
  const bar5 = nashvilleBar(page, 5);
  await expect(bar5.locator('.name')).toHaveText(/^B(♭|b)$/);
  await expect(bar5.locator('.num')).toHaveText('4');
  await context.close();
});

test('nashville position window', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/nashville');
  // Desktop landscape: only the horizontal board is shown.
  await expect(page.locator('.board--h')).toBeVisible();
  const dashed = page.locator('.board--h [data-role="outline"][stroke-dasharray]');
  await expect(dashed).toHaveCount(0);

  const toggle = page.locator('.position button.switch');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(dashed).toHaveCount(5);

  await page.getByRole('group', { name: 'Kształt akordu 1' }).getByRole('button', { name: 'E', exact: true }).click();
  await expect(dashed).toHaveCount(1);
  await context.close();
});

test('nashville has no horizontal scroll on a phone', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 390, height: 844 } });
  await page.goto('/pl/nashville');
  await expect(page.locator('.board--v')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await context.close();
});

/** Chord-name text of every tile in the Chord changes progression strip. */
const triadTiles = (page: Page) => page.getByRole('group', { name: 'Progresja', exact: true }).locator('button .name');

test('triads redirect stub', async ({ browser }) => {
  const pl = await open(browser, { locale: 'pl-PL' });
  await pl.page.goto('/triads');
  await expect(pl.page).toHaveURL(/\/pl\/triads\/?$/);
  await pl.context.close();

  const en = await open(browser, { locale: 'en-US' });
  await en.page.goto('/triads');
  await expect(en.page).toHaveURL(/\/en\/triads\/?$/);
  await en.context.close();
});

test('Inversions Next steps across String sets', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/triads');
  const stepper = page.locator('.stepper');
  await expect(stepper.locator('.count')).toHaveText('1 / 16');
  await expect(stepper.locator('.now')).toContainText('struny E-A-D');
  await stepper.getByRole('button', { name: 'Next →' }).click();
  await expect(stepper.locator('.count')).toHaveText('2 / 16');
  await expect(stepper.locator('.now')).toContainText('struny A-D-G, progi 3–2–0');
  await context.close();
});

test('Chord changes Next moves along Creep', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/triads');
  await page.getByRole('group', { name: 'Tryb', exact: true }).getByRole('button', { name: 'Zmiany akordów' }).click();
  await expect(triadTiles(page)).toHaveText(['G', 'B', 'C', 'Cm']);
  const tiles = page.getByRole('group', { name: 'Progresja', exact: true }).getByRole('button');
  await expect(tiles.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.stepper').getByRole('button', { name: 'Next →' }).click();
  await expect(tiles.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(tiles.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await context.close();
});

test('a shared link opens its progression', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 800 } });
  await page.goto('/pl/triads?mode=changes&prog=C+G+Am+F');
  await expect(triadTiles(page)).toHaveText(['C', 'G', 'Am', 'F']);
  await context.close();
});

test('triads page on a phone in portrait', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 390, height: 844 } });
  await page.goto('/pl/triads');
  await expect(page.locator('.board--v').first()).toBeVisible();
  await expect(page.locator('.board--h').first()).toBeHidden();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await context.close();
});

/** The clickable dot at string `s` (0 = high e) and fret `f` on the given triads board. */
const triadDot = (page: Page, board: '.board--h' | '.board--v', s: number, f: number) =>
  page.locator(`${board} [data-role="dot"][data-string="${s}"][data-fret="${f}"]`).first();

test('triads: clicking a note cycles its Triads', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 900 } });
  await page.goto('/pl/triads');
  const count = page.locator('.stepper .count');
  await expect(count).toHaveText('1 / 16');
  // String G (index 2) fret 5: each click moves to the next Triad that holds that note.
  for (const expected of ['6 / 16', '7 / 16', '8 / 16']) {
    await clickCentre(page, triadDot(page, '.board--h', 2, 5));
    await expect(count).toHaveText(expected);
  }
  await context.close();
});

test('triads: clicking a faint tone anchors the path', async ({ browser }) => {
  const { context, page } = await open(browser, { locale: 'pl-PL', viewport: { width: 1280, height: 900 } });
  await page.goto('/pl/triads');
  await page.getByRole('group', { name: 'Tryb', exact: true }).getByRole('button', { name: 'Zmiany akordów' }).click();
  await expect(triadTiles(page)).toHaveText(['G', 'B', 'C', 'Cm']);
  const tiles = page.getByRole('group', { name: 'Progresja', exact: true }).getByRole('button');
  await tiles.nth(2).click();
  await expect(tiles.nth(2)).toHaveAttribute('aria-pressed', 'true');
  // The faint C on string B (index 1) fret 13 anchors the Triad path there.
  await clickCentre(page, triadDot(page, '.board--h', 1, 13));
  await expect(page).toHaveURL(/[?&]at=2(&|$)/);
  await expect(page).toHaveURL(/[?&]start=3(&|$)/);
  await context.close();
});

test('triads: tapping a note on a phone', async ({ browser }) => {
  const { context, page } = await open(browser, {
    locale: 'pl-PL',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await page.goto('/pl/triads');
  const count = page.locator('.stepper .count');
  await expect(count).toHaveText('1 / 16');
  const dot = triadDot(page, '.board--v', 2, 5);
  await dot.scrollIntoViewIfNeeded();
  const box = await dot.boundingBox();
  if (!box) throw new Error('dot has no bounding box');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(count).toHaveText('6 / 16');
  await context.close();
});
