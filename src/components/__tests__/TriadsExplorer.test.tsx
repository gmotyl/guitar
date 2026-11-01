import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TriadsExplorer } from '../TriadsExplorer';
import { t } from '../../i18n';
import { STRING_SETS, triads } from '../../lib/music/triads';
import { SAVED_KEY } from '../../lib/savedProgressions';

const renderExplorer = (lang: 'pl' | 'en' = 'pl') => render(<TriadsExplorer lang={lang} t={t(lang).triads} />);
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const group = (name: string) => screen.getByRole('group', { name });
const buttons = (name: string) => within(group(name)).getAllByRole('button');
const click = (groupName: string, label: string) => {
  const b = buttons(groupName).find((x) => text(x) === label);
  if (!b) throw new Error(`No "${label}" in ${groupName}`);
  fireEvent.click(b);
};
const pressed = (name: string) =>
  buttons(name)
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => text(b));
const css = readFileSync(join(process.cwd(), 'src/components/triads.css'), 'utf8');

// Bar helpers.
const nowName = (c: Element) => text(c.querySelector('.stepper .now b'));
const nowDetail = (c: Element) => text(c.querySelector('.stepper .now span'));
const count = (c: Element) => text(c.querySelector('.stepper .count'));
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
const prev = () => fireEvent.click(screen.getByRole('button', { name: '← Poprzedni' }));
/** Frets of the current Triad as '3-3-2', read from the detail line. */
const nowFrets = (c: Element) => nowDetail(c).match(/(\d+)–(\d+)–(\d+)/)!.slice(1).join('-');
const nowSet = (c: Element) => nowDetail(c).match(/struny (\S+),/)![1];

// Board helpers (horizontal board; both orientations carry the same data).
const hBoard = (c: Element) => c.querySelector<SVGSVGElement>('.board--h svg')!;
const dots = (c: Element) => Array.from(hBoard(c).querySelectorAll('[data-role="dot"]'));
const fillOf = (dot: Element) => dot.querySelector('circle')!.getAttribute('fill');
const label = (dot: Element) => text(dot.querySelector('text'));
const filledDots = (c: Element) => dots(c).filter((d) => fillOf(d) !== 'var(--card)');
const outlineDots = (c: Element) => dots(c).filter((d) => fillOf(d) === 'var(--card)');
const cell = (d: Element) => `${d.getAttribute('data-string')}:${d.getAttribute('data-fret')}`;

const GRID = 'Wszystkie triady akordu';

// The explorer writes its state into the URL; every test starts on a bare path.
afterEach(() => history.replaceState(null, '', '/'));

describe('TriadsExplorer — Inversions mode', () => {
  afterEach(cleanup);

  it('shows the mode switch with Inversions selected', () => {
    renderExplorer();
    expect(buttons('Tryb').map(text)).toEqual(['Przewroty', 'Zmiany akordów']);
    expect(pressed('Tryb')).toEqual(['Przewroty']);
    cleanup();
    renderExplorer('en');
    expect(buttons('Mode').map(text)).toEqual(['Inversions', 'Chord changes']);
    expect(pressed('Mode')).toEqual(['Inversions']);
    expect(css).toMatch(/\.modes button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--fg\)/);
  });

  it('lists the Inversions controls in mockup order', () => {
    const { container } = renderExplorer();
    const root = container.firstElementChild!;
    // Page order: mode switch, controls, bar, grid, boards, legend.
    expect(Array.from(root.children).map((el) => el.classList[0])).toEqual([
      'modes', 'controls', 'stepper', 'grid', 'board', 'board', 'legend',
    ]);
    const groups = Array.from(container.querySelectorAll('.controls [role="group"]'));
    expect(groups.map((g) => text(g.querySelector('.lbl')))).toEqual(['Akord', 'Jakość', 'Struny', 'Gryf']);
    // Chip spelling follows the mockup: flat keys (D♭ E♭ F G♭ A♭ B♭) spell flat.
    expect(buttons('Akord').map(text)).toEqual(['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']);
    expect(pressed('Akord')).toEqual(['C']);
    expect(buttons('Jakość').map(text)).toEqual(['dur', 'moll']);
    expect(pressed('Jakość')).toEqual(['dur']);
    expect(buttons('Struny').map(text)).toEqual(['wszystkie grupy', 'E-A-D', 'A-D-G', 'D-G-B', 'G-B-e']);
    expect(pressed('Struny')).toEqual(['wszystkie grupy']);
    expect(buttons('Gryf').map(text)).toEqual(['pokaż pozostałe dźwięki akordu']);
    expect(pressed('Gryf')).toEqual(['pokaż pozostałe dźwięki akordu']);
    // Chip rows look like the mockup: pill chips, pressed chip filled.
    expect(css).toMatch(/\.chips button\s*\{[^}]*border-radius:\s*999px/);
    expect(css).toMatch(/\.chips button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--accent\)/);
  });

  it('opens on C/G second inversion on E-A-D, 1 of 16', () => {
    const { container } = renderExplorer();
    const bar = container.querySelector('.stepper')!;
    expect(Array.from(bar.querySelectorAll('button')).map(text)).toEqual(['← Poprzedni', 'Next →']);
    expect(bar.querySelector('button.next')).not.toBeNull();
    expect(nowName(container)).toBe('C/G · 2. przewrót');
    expect(nowDetail(container)).toBe('struny E-A-D, progi 3–3–2 — bas: 5');
    expect(count(container)).toBe('1 / 16');
    // The Next button is the filled one, as in the mockup.
    expect(css).toMatch(/\.stepper \.nav\.next\s*\{[^}]*background:\s*var\(--fg\)/);
    cleanup();
    const en = renderExplorer('en');
    expect(nowName(en.container)).toBe('C/G · 2nd inversion');
    expect(nowDetail(en.container)).toBe('strings E-A-D, frets 3–3–2 — bass: 5');
    expect(screen.getByRole('button', { name: '← Previous' })).not.toBeNull();
  });

  it('draws the current Triad as three filled dots joined by a path', () => {
    const { container } = renderExplorer();
    const filled = filledDots(container);
    // E-A-D 3-3-2: low E fret 3 (G = 5), A fret 3 (C = R), D fret 2 (E = 3).
    expect(filled.map((d) => `${cell(d)} ${label(d)}`)).toEqual(['5:3 5', '4:3 R', '3:2 3']);
    expect(filled.map((d) => fillOf(d))).toEqual(['var(--k0)', 'var(--k0)', 'var(--k0)']);
    // R ringed, the others not.
    expect(filled.map((d) => d.querySelector('[data-role="ring"]') !== null)).toEqual([false, true, false]);
    const paths = Array.from(hBoard(container).querySelectorAll('[data-role="triad-path"]'));
    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute('stroke')).toBe('var(--k0)');
    // Never a full grip: exactly three filled dots on every step.
    for (let i = 0; i < 16; i++) {
      expect(filledDots(container)).toHaveLength(3);
      next();
    }
    // Minor Triads label the minor third.
    click('Jakość', 'moll');
    expect(filledDots(container).map(label).sort()).toEqual(['5', 'R', 'b3'].sort());
  });

  it('shows or hides the other chord tones', () => {
    const { container } = renderExplorer();
    const others = outlineDots(container);
    // C major on frets 0–15: the 26 cells of C, E, G on six strings minus the three Triad cells.
    expect(others).toHaveLength(23);
    expect(others.every((d) => Number(d.getAttribute('opacity')) < 1)).toBe(true);
    expect(new Set(others.map(label))).toEqual(new Set(['R', '3', '5']));
    const triadCells = filledDots(container).map(cell);
    expect(others.some((d) => triadCells.includes(cell(d)))).toBe(false);
    expect(others.every((d) => Number(d.getAttribute('data-fret')) <= 15)).toBe(true);
    click('Gryf', 'pokaż pozostałe dźwięki akordu');
    expect(pressed('Gryf')).toEqual([]);
    expect(outlineDots(container)).toHaveLength(0);
    expect(filledDots(container)).toHaveLength(3);
  });

  it('Next walks String sets before moving up the neck and wraps', () => {
    const { container } = renderExplorer();
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      next();
      seen.push(`${nowSet(container)} ${nowFrets(container)}`);
    }
    expect(seen).toEqual(['A-D-G 3-2-0', 'D-G-B 2-0-1', 'G-B-e 0-1-0', 'E-A-D 8-7-5']);
    expect(count(container)).toBe('5 / 16');
    prev();
    expect(count(container)).toBe('4 / 16');
    for (let i = 0; i < 4; i++) prev();
    // Previous on the first wraps to the last.
    expect(count(container)).toBe('16 / 16');
    next();
    expect(count(container)).toBe('1 / 16');
    expect(nowName(container)).toBe('C/G · 2. przewrót');
  });

  it('arrow keys step outside chip rows only', () => {
    const { container } = renderExplorer();
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(count(container)).toBe('2 / 16');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Next →' }), { key: 'ArrowRight' });
    expect(count(container)).toBe('3 / 16');
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(count(container)).toBe('2 / 16');
    // Inside a chip row: no step — checked after every press so opposite keys cannot cancel out.
    fireEvent.keyDown(buttons('Akord')[0], { key: 'ArrowRight' });
    expect(count(container)).toBe('2 / 16');
    fireEvent.keyDown(buttons('Akord')[0], { key: 'ArrowRight' });
    expect(count(container)).toBe('2 / 16');
    fireEvent.keyDown(buttons('Struny')[1], { key: 'ArrowLeft' });
    expect(count(container)).toBe('2 / 16');
    // Other keys do nothing.
    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    expect(count(container)).toBe('2 / 16');
  });

  it('the Rung grid jumps to a Triad', () => {
    const { container } = renderExplorer();
    const grid = group(GRID);
    expect(Array.from(grid.querySelectorAll('.h')).map(text)).toEqual(['E-A-D', 'A-D-G', 'D-G-B', 'G-B-e']);
    expect(Array.from(grid.querySelectorAll('.r')).map(text)).toEqual(['1.', '2.', '3.', '4.']);
    const cells = within(grid).getAllByRole('button');
    expect(cells).toHaveLength(16);
    // Row-major: Rung 1 is C/G 3–3–2, C 3–2–0, C/E 2–0–1, C/G 0–1–0.
    expect(cells.slice(0, 4).map(text)).toEqual(['C/G 3–3–2', 'C 3–2–0', 'C/E 2–0–1', 'C/G 0–1–0']);
    expect(cells[0].querySelector('small')).not.toBeNull();
    expect(cells.filter((b) => b.getAttribute('aria-pressed') === 'true')).toEqual([cells[0]]);
    // Rung 3 × G-B-e.
    fireEvent.click(cells[2 * 4 + 3]);
    expect(nowName(container)).toBe('C/E · 1. przewrót');
    expect(nowSet(container)).toBe('G-B-e');
    expect(nowFrets(container)).toBe('9-8-8');
    expect(count(container)).toBe('12 / 16');
    expect(within(group(GRID)).getAllByRole('button')[11].getAttribute('aria-pressed')).toBe('true');
    // Columns follow the chosen sets; cells keep on a phone.
    expect(grid.getAttribute('style')).toContain('repeat(4');
    expect(css).toMatch(/\.grid button\s*\{[^}]*text-overflow:\s*ellipsis/);
  });

  it('a single String set limits the grid and Next', () => {
    const { container } = renderExplorer();
    next();
    next();
    click('Struny', 'D-G-B');
    expect(pressed('Struny')).toEqual(['D-G-B']);
    const grid = group(GRID);
    expect(Array.from(grid.querySelectorAll('.h')).map(text)).toEqual(['D-G-B']);
    expect(within(grid).getAllByRole('button')).toHaveLength(4);
    expect(grid.getAttribute('style')).toContain('repeat(1');
    // Choosing a set restarts at its first Triad.
    expect(count(container)).toBe('1 / 4');
    expect(nowFrets(container)).toBe('2-0-1');
    next();
    expect(nowSet(container)).toBe('D-G-B');
    expect(nowFrets(container)).toBe('5-5-5');
    next();
    next();
    next();
    expect(nowFrets(container)).toBe('2-0-1');
  });

  it('minor Triads are spelled from the relative major', () => {
    const { container } = renderExplorer();
    click('Jakość', 'moll');
    click('Akord', 'G');
    expect(pressed('Akord')).toEqual(['G']);
    expect(pressed('Jakość')).toEqual(['moll']);
    const names = within(group(GRID)).getAllByRole('button').map(text);
    expect(names.some((n) => n.startsWith('Gm/B♭ '))).toBe(true);
    expect(names.some((n) => n.includes('A#'))).toBe(false);
    // Root chips are spelled from the relative major, as in the mockup: B♭ and E♭ minor flat, C# F# G# minor sharp.
    expect(buttons('Akord').map(text)).toEqual(['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B']);
    expect(nowName(container)).toMatch(/^Gm/);
  });

  it('uses the vertical board in portrait', () => {
    const { container } = renderExplorer();
    expect(container.querySelectorAll('.board.scroll')).toHaveLength(2);
    expect(container.querySelector('.board--h svg[data-orientation="horizontal"]')).not.toBeNull();
    const v = container.querySelector('.board--v svg[data-orientation="vertical"]')!;
    expect(v).not.toBeNull();
    // Both boards carry the same Triad.
    const vFilled = Array.from(v.querySelectorAll('[data-role="dot"]')).filter((d) => fillOf(d) !== 'var(--card)');
    expect(vFilled.map(cell)).toEqual(filledDots(container).map(cell));
    expect(v.querySelectorAll('[data-role="triad-path"]')).toHaveLength(1);
    // 1280 px landscape: horizontal board only; 390 px portrait: vertical board only.
    expect(css).toMatch(/\.board--v\s*\{\s*display:\s*none;?\s*\}/);
    const portrait = css.match(/@media \(orientation: portrait\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(portrait).toMatch(/\.board--h\s*\{\s*display:\s*none;?\s*\}/);
    expect(portrait).toMatch(/\.board--v\s*\{\s*display:\s*block;?\s*\}/);
    // No horizontal page scroll at 390 px: chips wrap, grid columns shrink, the bar wraps.
    expect(css).toMatch(/\.chips\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.stepper\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/minmax\(0,\s*1fr\)/);
  });
});

// Chord changes helpers.
const FIELD = 'Progresja — Numbery albo nazwy akordów';
const openChanges = (lang: 'pl' | 'en' = 'pl') => {
  const r = renderExplorer(lang);
  click(lang === 'pl' ? 'Tryb' : 'Mode', lang === 'pl' ? 'Zmiany akordów' : 'Chord changes');
  return r;
};
const field = () => screen.getByLabelText<HTMLInputElement>(FIELD);
const typeProg = (value: string) => fireEvent.input(field(), { target: { value } });
const line = (c: Element) => c.querySelector('.entry .tr')!;
const tiles = () => buttons('Progresja');
const tileText = (b: Element) =>
  ['.ord', '.num', '.name'].map((s) => text(b.querySelector(s))).join(' ');
const currentTile = () => tiles().findIndex((b) => b.getAttribute('aria-pressed') === 'true');
const tileNames = () => tiles().map((b) => text(b.querySelector('.name'))).join(' ');
const songSelect = () => screen.getByLabelText<HTMLSelectElement>('Utwory');
const otherStart = () => fireEvent.click(screen.getByRole('button', { name: '↻ Inny przewrót' }));
const isDashed = (d: Element) => d.querySelector('[stroke-dasharray]') !== null;
const dashedDots = (c: Element) => dots(c).filter(isDashed);
const solidFilled = (c: Element) => filledDots(c).filter((d) => !isDashed(d));
const arcColors = (d: Element) =>
  Array.from(d.querySelectorAll('[data-role="arc"]')).map((a) => a.getAttribute('stroke'));
const dotAt = (c: Element, at: string) => dots(c).find((d) => cell(d) === at)!;
const triadPaths = (c: Element) => Array.from(hBoard(c).querySelectorAll('[data-role="triad-path"]'));

describe('TriadsExplorer — Chord changes mode', () => {
  afterEach(cleanup);

  it('opens Chord changes on Creep with its translation line', () => {
    const { container } = openChanges();
    expect(pressed('Tryb')).toEqual(['Zmiany akordów']);
    expect(field().value).toBe('G B C Cm');
    expect(text(line(container))).toBe('Numbery: 1 3 4 4- · tonacja rozpoznana: G-dur');
    expect(Array.from(line(container).querySelectorAll('b')).map(text)).toEqual(['1 3 4 4-', 'G']);
    expect(line(container).classList.contains('err')).toBe(false);
    expect(pressed('Tonacja')).toEqual(['G']);
    cleanup();
    const en = openChanges('en');
    expect(screen.getByLabelText<HTMLInputElement>('Progression — Numbers or chord names').value).toBe('G B C Cm');
    expect(text(line(en.container))).toBe('Numbers: 1 3 4 4- · detected key: G major');
  });

  it('lists the Chord changes controls in mockup order', () => {
    const { container } = openChanges();
    const root = container.firstElementChild!;
    expect(Array.from(root.children).map((el) => el.classList[0])).toEqual([
      'modes', 'entry', 'controls', 'prog', 'stepper', 'board', 'board', 'legend',
    ]);
    const rows = Array.from(container.querySelectorAll('.controls > *'));
    expect(rows.map((r) => text(r.querySelector('.lbl')))).toEqual(['Utwory', 'Tonacja', 'Struny', 'Gryf']);
    // Utwory: a select with the 13 songs in a group "Utwory", Creep picked.
    const select = songSelect();
    expect(rows[0].contains(select)).toBe(true);
    const songs = select.querySelector('optgroup[label="Utwory"]')!;
    expect(Array.from(songs.querySelectorAll('option')).map(text)).toEqual([
      'Creep', 'Wish You Were Here', "Blowin' in the Wind", 'Time', 'Hit the Road Jack',
      'House of the Rising Sun', 'Hey Jude', "Knockin' on Heaven's Door", 'A Horse with No Name',
      'Wonderful Tonight', 'Jolene', 'Wehikuł czasu', 'No Woman, No Cry',
    ]);
    expect(select.value).toBe('creep');
    expect(buttons('Tonacja').map(text)).toEqual(['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']);
    click('Tonacja', 'G♭');
    expect(pressed('Tonacja')).toEqual(['G♭']);
    expect(buttons('Struny').map(text)).toEqual(['E-A-D', 'A-D-G', 'D-G-B', 'G-B-e']);
    expect(pressed('Struny')).toEqual(['G-B-e']);
    // The field looks like the mockup.
    expect(css).toMatch(/\.entry input\s*\{[^}]*border-radius:\s*8px/);
  });

  it('renders progression tiles in order colours with the current one filled', () => {
    openChanges();
    expect(tiles().map(tileText)).toEqual(['1. 1 G', '2. 3 B', '3. 4 C', '4. 4- Cm']);
    expect(tiles().map((b) => b.getAttribute('style'))).toEqual([0, 1, 2, 3].map((k) => `--sc: var(--k${k});`));
    expect(currentTile()).toBe(0);
    expect(tiles().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    next();
    expect(currentTile()).toBe(1);
    expect(tiles().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    // Colours cycle after --k6.
    typeProg('F C C F B♭ F C F');
    expect(tiles().map((b) => b.getAttribute('style')?.match(/--k(\d)/)?.[1])).toEqual(
      ['0', '1', '2', '3', '4', '5', '6', '0'],
    );
    expect(tileNames()).toBe('F C C F B♭ F C F');
    // Dashed border in the order colour, the current tile filled; --k0…--k6 defined for the page.
    expect(css).toMatch(/\.prog button\s*\{[^}]*border:\s*2px dashed var\(--sc\)/);
    expect(css).toMatch(/\.prog button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--sc\)/);
    expect(css).toMatch(/\.triads\s*\{[^}]*--k6:/);
  });

  it('shows Previous, Next and the other-start button without a left arrow', () => {
    const { container } = openChanges();
    const bar = container.querySelector('.stepper')!;
    const navs = Array.from(bar.querySelectorAll('button'));
    expect(navs.map(text)).toEqual(['← Poprzedni', 'Next →', '↻ Inny przewrót']);
    expect(navs[2].classList.contains('alt')).toBe(true);
    expect(text(navs[2])).not.toContain('←');
    expect(css).toMatch(/\.stepper \.nav\.alt\s*\{[^}]*border-style:\s*dashed/);
    expect(nowName(container)).toBe('1. 1 · G/B');
    expect(nowDetail(container)).toBe('teraz 1. przewrót, progi 4–3–3 → dalej B (progi 4–4–2)');
    // Shared notes with the next Triad: G/B→B shares B; B→C none; C→Cm shares C and G; Cm→G/B shares G.
    expect(count(container)).toBe('wspólne dźwięki z następnym: 1');
    next();
    expect(nowName(container)).toBe('2. 3 · B');
    expect(count(container)).toBe('wspólne dźwięki z następnym: 0');
    next();
    expect(count(container)).toBe('wspólne dźwięki z następnym: 2');
    next();
    expect(nowDetail(container)).toBe('teraz pozycja zasadnicza, progi 5–4–3 → dalej G/B (progi 4–3–3)');
    expect(count(container)).toBe('wspólne dźwięki z następnym: 1');
  });

  it('draws the whole Triad path dashed and the current Triad filled', () => {
    const { container } = openChanges();
    // Current G/B 4-3-3 on G-B-e: filled, R ringed, under it a filled path.
    const cur = solidFilled(container);
    expect(cur.map((d) => `${cell(d)} ${label(d)} ${fillOf(d)}`)).toEqual([
      '2:4 3 var(--k0)', '1:3 5 var(--k0)', '0:3 R var(--k0)',
    ]);
    expect(cur.map((d) => d.querySelector('[data-role="ring"]') !== null)).toEqual([false, false, true]);
    // B 4-4-2, C 5-5-3, Cm 5-4-3 dashed (cells under the current Triad stay filled).
    expect(dashedDots(container).map(cell).sort()).toEqual(['0:2', '1:4', '1:5', '2:5']);
    expect(dots(container)).toHaveLength(7);
    const paths = triadPaths(container);
    expect(paths.map((p) => p.getAttribute('stroke'))).toEqual(['var(--k1)', 'var(--k2)', 'var(--k3)', 'var(--k0)']);
    const op = paths.map((p) => Number(p.getAttribute('opacity')));
    expect(op.slice(0, 3).every((o) => o < op[3])).toBe(true);
    // Next: B 4-4-2 is the filled one.
    next();
    expect(nowName(container)).toBe('2. 3 · B');
    expect(solidFilled(container).map((d) => `${cell(d)} ${fillOf(d)}`)).toEqual([
      '2:4 var(--k1)', '1:4 var(--k1)', '0:2 var(--k1)',
    ]);
    expect(triadPaths(container).at(-1)!.getAttribute('stroke')).toBe('var(--k1)');
  });

  it('splits a shared dashed cell into both colours', () => {
    const { container } = openChanges();
    // D# of B (2.) and E♭ of Cm (4.) on the B string, fret 4; C and Cm share G string fret 5.
    expect(arcColors(dotAt(container, '1:4'))).toEqual(['var(--k1)', 'var(--k3)']);
    expect(arcColors(dotAt(container, '2:5'))).toEqual(['var(--k2)', 'var(--k3)']);
    // A cell of one Triad only keeps one dashed colour.
    expect(arcColors(dotAt(container, '0:2'))).toEqual([]);
    expect(dotAt(container, '0:2').querySelector('circle')!.getAttribute('stroke')).toBe('var(--k1)');
  });

  it('Next, Previous and arrows move along the path and wrap', () => {
    openChanges();
    next();
    expect(currentTile()).toBe(1);
    next();
    next();
    expect(currentTile()).toBe(3);
    next();
    expect(currentTile()).toBe(0);
    prev();
    expect(currentTile()).toBe(3);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(currentTile()).toBe(0);
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(currentTile()).toBe(3);
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(currentTile()).toBe(2);
    // The field and the chip rows keep their arrows.
    fireEvent.keyDown(field(), { key: 'ArrowRight' });
    expect(currentTile()).toBe(2);
    fireEvent.keyDown(buttons('Struny')[0], { key: 'ArrowRight' });
    expect(currentTile()).toBe(2);
  });

  it('other start moves the path one Triad up', () => {
    const { container } = openChanges();
    next();
    otherStart();
    expect(currentTile()).toBe(0);
    expect(nowName(container)).toBe('1. 1 · G/D');
    expect(nowDetail(container)).toBe('teraz 2. przewrót, progi 7–8–7 → dalej B/D# (progi 8–7–7)');
    // Pressing it once per G Triad on G-B-e comes back to the first start.
    const n = triads(7, 'major', STRING_SETS[3]).length;
    for (let i = 1; i < n; i++) otherStart();
    expect(nowName(container)).toBe('1. 1 · G/B');
    expect(nowDetail(container)).toContain('progi 4–3–3');
  });

  it('clicking a tile selects that chord', () => {
    const { container } = openChanges();
    fireEvent.click(tiles()[2]);
    expect(currentTile()).toBe(2);
    expect(nowName(container)).toBe('3. 4 · C');
    expect(solidFilled(container).map((d) => `${cell(d)} ${fillOf(d)}`)).toEqual([
      '2:5 var(--k2)', '1:5 var(--k2)', '0:3 var(--k2)',
    ]);
  });

  it('changing the String set recomputes the path', () => {
    const { container } = openChanges();
    otherStart();
    next();
    expect(nowDetail(container)).toContain('progi 8–7–7');
    click('Struny', 'D-G-B');
    expect(pressed('Struny')).toEqual(['D-G-B']);
    // From start 0 on D-G-B: G/D 0-0-0 → B/F# 4-4-4.
    expect(nowName(container)).toBe('2. 3 · B/F#');
    expect(nowDetail(container)).toContain('progi 4–4–4');
    expect(solidFilled(container).map(cell)).toEqual(['3:4', '2:4', '1:4']);
    click('Struny', 'G-B-e');
    expect(nowDetail(container)).toContain('progi 4–4–2');
  });

  it('typed names and Numbers translate live', () => {
    const { container } = openChanges();
    next();
    typeProg('G C D G');
    expect(text(line(container))).toBe('Numbery: 1 4 5 1 · tonacja rozpoznana: G-dur');
    expect(pressed('Tonacja')).toEqual(['G']);
    expect(currentTile()).toBe(0);
    typeProg('C G Am F');
    expect(text(line(container))).toBe('Numbery: 1 5 6- 4 · tonacja rozpoznana: C-dur');
    expect(pressed('Tonacja')).toEqual(['C']);
    expect(tileNames()).toBe('C G Am F');
    // Typing leaves the song select.
    expect(songSelect().value).toBe('');
    click('Tonacja', 'A');
    typeProg('1 5 6- 4');
    expect(text(line(container))).toBe('Akordy w A-dur: A E F#m D');
    expect(pressed('Tonacja')).toEqual(['A']);
    expect(tileNames()).toBe('A E F#m D');
    expect(tiles().map((b) => text(b.querySelector('.num')))).toEqual(['1', '5', '6-', '4']);
    // A key chip moves the Numbers' chords.
    click('Tonacja', 'D');
    expect(field().value).toBe('1 5 6- 4');
    expect(text(line(container))).toBe('Akordy w D-dur: D A Bm G');
  });

  it('a key change transposes typed names', () => {
    const { container } = openChanges();
    typeProg('G C D G');
    click('Tonacja', 'D');
    expect(field().value).toBe('D G A D');
    expect(pressed('Tonacja')).toEqual(['D']);
    expect(text(line(container))).toBe('Numbery: 1 4 5 1 · tonacja rozpoznana: D-dur');
    expect(tileNames()).toBe('D G A D');
    // Flat keys spell with flats, sevenths are kept.
    typeProg('F#m7 Amaj7');
    click('Tonacja', 'F');
    expect(field().value).toBe('Dm7 Fmaj7');
    click('Tonacja', 'B♭');
    expect(field().value).toBe('Gm7 B♭maj7');
    expect(pressed('Tonacja')).toEqual(['B♭']);
  });

  it('successive key picks keep moving from the picked key', () => {
    openChanges();
    typeProg('Db C F');
    expect(pressed('Tonacja')).toEqual(['C']);
    click('Tonacja', 'G');
    expect(field().value).toBe('A♭ G C');
    expect(pressed('Tonacja')).toEqual(['G']);
    // `A♭ G C` alone would detect as C; the move starts from the picked G.
    click('Tonacja', 'D');
    expect(field().value).toBe('E♭ D G');
    expect(pressed('Tonacja')).toEqual(['D']);
    expect(tileNames()).toBe('E♭ D G');
  });

  it('chips, names and the key line share one spelling', () => {
    // The mockup rule: flats in the major keys D♭ E♭ F G♭ A♭ B♭ (no C♭ — G♭ major's 4 is B).
    const { container } = openChanges();
    click('Tonacja', 'G♭');
    expect(pressed('Tonacja')).toEqual(['G♭']);
    expect(field().value).toBe('G♭ B♭ B Bm');
    expect(tileNames()).toBe('G♭ B♭ B Bm');
    expect(text(line(container))).toBe('Numbery: 1 3 4 4- · tonacja rozpoznana: G♭-dur');
    expect(buttons('Gryf').map(text)).toEqual(['pentatonika akordu (G♭ durowa)', 'skala: G♭ jońska']);
    expect(nowName(container)).toMatch(/· G♭(\/[A-G]♭)?$/);
    cleanup();
    history.replaceState(null, '', '/');
    // Inversions: G♭ major and E♭ minor spell with flats in the bar and the grid.
    const inv = renderExplorer();
    click('Akord', 'G♭');
    expect(nowName(inv.container)).toMatch(/^G♭(\/[A-G]♭)? · /);
    const gridNames = () => within(group(GRID)).getAllByRole('button').map(text);
    expect(gridNames().every((n) => /^G♭(\/[A-G]♭)? /.test(n))).toBe(true);
    click('Jakość', 'moll');
    click('Akord', 'E♭');
    expect(pressed('Akord')).toEqual(['E♭']);
    expect(nowName(inv.container)).toMatch(/^E♭m(\/[A-G]♭)? · /);
    expect(gridNames().every((n) => /^E♭m(\/[A-G]♭)? /.test(n))).toBe(true);
    expect(gridNames().some((n) => n.startsWith('E♭m/G♭ '))).toBe(true);
  });

  it('invalid input shows a message and keeps the last path', () => {
    const { container } = openChanges();
    const before = solidFilled(container).map(cell);
    typeProg('G X');
    expect(field().value).toBe('G X');
    expect(line(container).classList.contains('err')).toBe(true);
    expect(text(line(container))).toBe(
      'Nie rozpoznaję: X. Wpisz Numbery (1 4 5 6-) albo nazwy akordów (G C D Em).',
    );
    // The board, tiles and bar keep the last valid progression.
    expect(tileNames()).toBe('G B C Cm');
    expect(solidFilled(container).map(cell)).toEqual(before);
    expect(triadPaths(container)).toHaveLength(4);
    next();
    expect(currentTile()).toBe(1);
    typeProg('Bdim 7°');
    expect(text(line(container))).toBe('Tylko akordy dur i moll: Bdim, 7°.');
    typeProg('  ');
    expect(text(line(container))).toBe('Wpisz progresję.');
    expect(tileNames()).toBe('G B C Cm');
    expect(css).toMatch(/\.entry \.tr\.err\s*\{[^}]*color:\s*var\(--err\)/);
    expect(css).toMatch(/\.triads\s*\{[^}]*--err:/);
    typeProg('G C D G');
    expect(line(container).classList.contains('err')).toBe(false);
    expect(tileNames()).toBe('G C D G');
  });

  it('invalid or unchanged text keeps the current chord and start', () => {
    const { container } = openChanges();
    otherStart();
    next();
    const name = nowName(container);
    const detail = nowDetail(container);
    expect(currentTile()).toBe(1);
    typeProg('G X');
    expect(currentTile()).toBe(1);
    expect(nowName(container)).toBe(name);
    expect(nowDetail(container)).toBe(detail);
    // Back to the same chords: still where we were.
    typeProg('G B C Cm ');
    expect(currentTile()).toBe(1);
    expect(nowDetail(container)).toBe(detail);
    // Other chords start over.
    typeProg('G C D G');
    expect(currentTile()).toBe(0);
    expect(nowDetail(container)).toContain('progi 4–3–3');
  });

  it('picking a song fills the field and key', () => {
    const { container } = openChanges();
    next();
    fireEvent.change(songSelect(), { target: { value: 'time' } });
    expect(field().value).toBe('F#m7 Amaj7');
    expect(songSelect().value).toBe('time');
    expect(pressed('Tonacja')).toEqual(['A']);
    expect(text(line(container))).toBe('Numbery: 6- 1 · tonacja rozpoznana: A-dur');
    expect(tileNames()).toBe('F#m A');
    expect(currentTile()).toBe(0);
    fireEvent.change(songSelect(), { target: { value: 'heyJude' } });
    expect(field().value).toBe('F C C F B♭ F C F');
    expect(pressed('Tonacja')).toEqual(['F']);
    expect(tiles()).toHaveLength(8);
  });
});

// Overlay helpers.
const OPEN_PC = [4, 11, 7, 2, 9, 4]; // high e … low E
const LABELS = ['R', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
const overlayDots = (c: Element) => dots(c).filter((d) => d.getAttribute('data-group') === 'overlay');
const triadDots = (c: Element) => dots(c).filter((d) => d.getAttribute('data-group') !== 'overlay');
const radius = (d: Element) => Number(d.querySelector('circle')!.getAttribute('r'));
const opacity = (d: Element) => Number(d.getAttribute('opacity') ?? '1');
const switches = () => buttons('Gryf');
const pentaSwitch = () => switches()[0];
const scaleSwitch = () => switches()[1];
const isOn = (b: Element) => b.getAttribute('aria-pressed') === 'true';
/** Every neck cell (frets 0–15) whose note is in `root` + `intervals`, as cell → label, minus `skip` cells. */
const expectedOverlay = (root: number, intervals: number[], skip: Set<string>) => {
  const out = new Map<string, string>();
  OPEN_PC.forEach((pc, s) => {
    for (let f = 0; f <= 15; f++) {
      const iv = (((pc + f - root) % 12) + 12) % 12;
      if (intervals.includes(iv) && !skip.has(`${s}:${f}`)) out.set(`${s}:${f}`, LABELS[iv]);
    }
  });
  return out;
};
const overlayMap = (c: Element) => new Map(overlayDots(c).map((d) => [cell(d), label(d)]));
const pickTile = (i: number, name = 'Progresja') => fireEvent.click(buttons(name)[i]);

describe('TriadsExplorer — soloing overlays', () => {
  afterEach(cleanup);

  it('both overlay switches start off', () => {
    const { container } = openChanges();
    const rows = Array.from(container.querySelectorAll('.controls > *'));
    expect(rows.map((r) => text(r.querySelector('.lbl')))).toEqual(['Utwory', 'Tonacja', 'Struny', 'Gryf']);
    expect(switches().map(text)).toEqual(['pentatonika akordu (G durowa)', 'skala: G jońska']);
    expect(switches().map(isOn)).toEqual([false, false]);
    expect(overlayDots(container)).toHaveLength(0);
    cleanup();
    openChanges('en');
    expect(buttons('Neck').map(text)).toEqual(['chord pentatonic (G major)', 'scale: G Ionian']);
    expect(buttons('Neck').map(isOn)).toEqual([false, false]);
  });

  it('the Chord pentatonic is faint with a stronger root', () => {
    const { container } = openChanges();
    next(); // Creep: current B
    expect(text(pentaSwitch())).toBe('pentatonika akordu (B durowa)');
    fireEvent.click(pentaSwitch());
    expect(isOn(pentaSwitch())).toBe(true);
    const triadCells = new Set(triadDots(container).map(cell));
    expect(triadCells.size).toBeGreaterThan(3);
    const want = expectedOverlay(11, [0, 2, 4, 7, 9], triadCells);
    expect(overlayMap(container)).toEqual(want);
    // Labels relative to B: R 2 3 5 6.
    expect(new Set(want.values())).toEqual(new Set(['R', '2', '3', '5', '6']));
    const roots = overlayDots(container).filter((d) => label(d) === 'R');
    const rest = overlayDots(container).filter((d) => label(d) !== 'R');
    expect(roots.length).toBeGreaterThan(0);
    // R: filled in the current order colour (tile 2 → --k1), a bit stronger and bigger than the rest.
    for (const d of roots) {
      expect(fillOf(d)).toBe('var(--k1)');
      expect(opacity(d)).toBeCloseTo(0.35);
      expect(radius(d)).toBe(9);
    }
    for (const d of rest) {
      expect(fillOf(d)).toBe('var(--card)');
      expect(opacity(d)).toBeCloseTo(0.22);
      expect(radius(d)).toBe(7.5);
    }
    // Triad dots stay full strength, full size and are drawn after (on top of) the overlay.
    const all = dots(container);
    const lastOverlay = Math.max(...overlayDots(container).map((d) => all.indexOf(d)));
    for (const d of triadDots(container)) {
      expect(all.indexOf(d)).toBeGreaterThan(lastOverlay);
      expect(opacity(d)).toBe(1);
      expect(radius(d)).toBeGreaterThan(9);
    }
    expect(solidFilled(container).filter((d) => d.getAttribute('data-group') !== 'overlay')).toHaveLength(3);
  });

  it('the chord scale names its mode', () => {
    const { container } = openChanges();
    fireEvent.change(songSelect(), { target: { value: 'wishYouWereHere' } }); // C D Am G in G
    expect(pressed('Tonacja')).toEqual(['G']);
    pickTile(2);
    expect(text(scaleSwitch())).toBe('skala: A dorycka');
    fireEvent.click(scaleSwitch());
    expect(isOn(scaleSwitch())).toBe(true);
    const triadCells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(9, [0, 2, 3, 5, 7, 9, 10], triadCells));
    const roots = overlayDots(container).filter((d) => label(d) === 'R');
    expect(roots.length).toBeGreaterThan(0);
    for (const d of roots) {
      expect(fillOf(d)).toBe('var(--k2)');
      expect(opacity(d)).toBeGreaterThan(opacity(overlayDots(container).find((x) => label(x) !== 'R')!));
    }
    cleanup();
    openChanges('en');
    fireEvent.change(screen.getByLabelText<HTMLSelectElement>('Songs'), { target: { value: 'wishYouWereHere' } });
    pickTile(2, 'Progression');
    expect(text(buttons('Neck')[1])).toBe('scale: A Dorian');
  });

  it('chords outside the key get Mixolydian or Dorian', () => {
    const { container } = openChanges(); // Creep in G
    fireEvent.click(scaleSwitch());
    pickTile(1); // B
    expect(text(scaleSwitch())).toBe('skala: B miksolidyjska');
    let cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(11, [0, 2, 4, 5, 7, 9, 10], cells));
    pickTile(3); // Cm
    expect(text(scaleSwitch())).toBe('skala: C dorycka');
    cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(0, [0, 2, 3, 5, 7, 9, 10], cells));
    cleanup();
    openChanges('en');
    pickTile(1, 'Progression');
    expect(text(buttons('Neck')[1])).toBe('scale: B Mixolydian');
  });

  it('overlays are exclusive', () => {
    const { container } = openChanges();
    next(); // B
    fireEvent.click(pentaSwitch());
    expect(switches().map(isOn)).toEqual([true, false]);
    fireEvent.click(scaleSwitch());
    expect(switches().map(isOn)).toEqual([false, true]);
    // Only the scale is drawn: B Mixolydian has the 4 and b7, the pentatonic has neither.
    let cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(11, [0, 2, 4, 5, 7, 9, 10], cells));
    fireEvent.click(pentaSwitch());
    expect(switches().map(isOn)).toEqual([true, false]);
    cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(11, [0, 2, 4, 7, 9], cells));
    // Pressing the switch that is on turns it off.
    fireEvent.click(pentaSwitch());
    expect(switches().map(isOn)).toEqual([false, false]);
    expect(overlayDots(container)).toHaveLength(0);
  });

  it('overlays follow the current chord', () => {
    const { container } = openChanges(); // Creep: G B C Cm in G
    fireEvent.click(pentaSwitch());
    let cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(7, [0, 2, 4, 7, 9], cells));
    next();
    next(); // C
    expect(text(pentaSwitch())).toBe('pentatonika akordu (C durowa)');
    cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(0, [0, 2, 4, 7, 9], cells));
    next(); // Cm
    expect(text(pentaSwitch())).toBe('pentatonika akordu (Cm molowa)');
    cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(0, [0, 3, 5, 7, 10], cells));
    for (const d of overlayDots(container).filter((x) => label(x) === 'R')) expect(fillOf(d)).toBe('var(--k3)');
    fireEvent.click(scaleSwitch());
    prev(); // C in G → Lydian
    expect(text(scaleSwitch())).toBe('skala: C lidyjska');
    cells = new Set(triadDots(container).map(cell));
    expect(overlayMap(container)).toEqual(expectedOverlay(0, [0, 2, 4, 6, 7, 9, 11], cells));
  });
});

// Own progressions helpers.
const nameField = () => screen.queryByLabelText<HTMLInputElement>('Nazwa progresji');
const button = (name: string) => screen.queryByRole('button', { name });
const ownGroup = () => songSelect().querySelector('optgroup[label="Moje progresje"]');
const ownNames = () => Array.from(ownGroup()?.querySelectorAll('option') ?? []).map(text);
const stored = () => JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null');
const saveAs = (name: string) => {
  fireEvent.click(button('Zapisz jako…')!);
  fireEvent.input(nameField()!, { target: { value: name } });
  fireEvent.click(button('Zapisz')!);
};

describe('TriadsExplorer — own progressions', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('Zapisz jako opens an inline name field', () => {
    const prompt = vi.fn(() => 'Z promptu');
    vi.stubGlobal('prompt', prompt);
    expect(window.prompt).toBe(prompt);
    openChanges();
    expect(nameField()).toBeNull();
    expect(button('Zapisz')).toBeNull();
    fireEvent.click(button('Zapisz jako…')!);
    // An inline field with save / cancel next to the select, no browser prompt.
    expect(prompt).not.toHaveBeenCalled();
    const input = nameField()!;
    expect(input).not.toBeNull();
    expect(input.closest('.controls .row')!.contains(songSelect())).toBe(true);
    expect(button('Zapisz')).not.toBeNull();
    expect(button('Anuluj')).not.toBeNull();
    // Save is off until a name is typed.
    expect(button('Zapisz')!.hasAttribute('disabled')).toBe(true);
    fireEvent.input(input, { target: { value: 'Moja' } });
    expect(button('Zapisz')!.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button('Anuluj')!);
    expect(nameField()).toBeNull();
    expect(stored()).toBeNull();
    cleanup();
    openChanges('en');
    fireEvent.click(screen.getByRole('button', { name: 'Save as…' }));
    expect(screen.getByLabelText('Progression name')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeNull();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('Escape closes the name field', () => {
    openChanges();
    fireEvent.click(button('Zapisz jako…')!);
    fireEvent.input(nameField()!, { target: { value: 'Moja' } });
    fireEvent.keyDown(nameField()!, { key: 'Escape' });
    expect(nameField()).toBeNull();
    expect(button('Zapisz jako…')).not.toBeNull();
    expect(stored()).toBeNull();
  });

  it('save is disabled while the field text is invalid', () => {
    openChanges();
    fireEvent.click(button('Zapisz jako…')!);
    fireEvent.input(nameField()!, { target: { value: 'Moja' } });
    expect(button('Zapisz')!.hasAttribute('disabled')).toBe(false);
    typeProg('G X');
    expect(button('Zapisz')!.hasAttribute('disabled')).toBe(true);
    fireEvent.submit(nameField()!.closest('form')!);
    expect(stored()).toBeNull();
    typeProg('G C D');
    expect(button('Zapisz')!.hasAttribute('disabled')).toBe(false);
  });

  it('a saved progression is listed under Moje progresje and can be picked', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    openChanges();
    expect(ownGroup()).toBeNull();
    typeProg('Em C G D');
    expect(pressed('Tonacja')).toEqual(['G']);
    saveAs('Moja');
    expect(setItem).toHaveBeenCalledWith(SAVED_KEY, expect.any(String));
    expect(stored()).toEqual([{ name: 'Moja', src: 'Em C G D', key: 7 }]);
    expect(nameField()).toBeNull();
    expect(ownNames()).toEqual(['Moja']);
    expect(songSelect().value).toBe('own:Moja');
    // Same name: replaced, not duplicated.
    typeProg('Em C G');
    saveAs('Moja');
    expect(stored()).toEqual([{ name: 'Moja', src: 'Em C G', key: 7 }]);
    expect(ownNames()).toEqual(['Moja']);
    // Picking it after a song fills the field and key.
    fireEvent.change(songSelect(), { target: { value: 'time' } });
    expect(pressed('Tonacja')).toEqual(['A']);
    fireEvent.change(songSelect(), { target: { value: 'own:Moja' } });
    expect(field().value).toBe('Em C G');
    expect(pressed('Tonacja')).toEqual(['G']);
    expect(tileNames()).toBe('Em C G');
    expect(songSelect().value).toBe('own:Moja');
    // A reload lists the saved entries.
    cleanup();
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    openChanges();
    expect(getItem).toHaveBeenCalledWith(SAVED_KEY);
    expect(ownNames()).toEqual(['Moja']);
  });

  it('a throwing or corrupt storage leaves the list empty and the page working', () => {
    const getItem = vi.fn(() => {
      throw new Error('denied');
    });
    const setItem = vi.fn(() => {
      throw new Error('denied');
    });
    vi.stubGlobal('localStorage', { getItem, setItem, removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 });
    const { container } = openChanges();
    expect(getItem).toHaveBeenCalled();
    expect(ownGroup()).toBeNull();
    next();
    expect(currentTile()).toBe(1);
    saveAs('Moja');
    expect(setItem).toHaveBeenCalled();
    expect(text(line(container))).toBe('Numbery: 1 3 4 4- · tonacja rozpoznana: G-dur');
    vi.unstubAllGlobals();
    cleanup();
    localStorage.setItem(SAVED_KEY, '{not json');
    openChanges();
    expect(ownGroup()).toBeNull();
    expect(tiles()).toHaveLength(4);
  });

  it('Usuń removes the selected own progression', () => {
    localStorage.setItem(
      SAVED_KEY,
      JSON.stringify([
        { name: 'Moja', src: 'Em C G D', key: 7 },
        { name: 'Druga', src: 'C G Am F', key: 0 },
      ]),
    );
    openChanges();
    expect(ownNames()).toEqual(['Moja', 'Druga']);
    // A song is selected: no Usuń.
    expect(button('Usuń')).toBeNull();
    fireEvent.change(songSelect(), { target: { value: 'own:Moja' } });
    expect(field().value).toBe('Em C G D');
    const del = button('Usuń')!;
    expect(del).not.toBeNull();
    expect(del.closest('.controls .row')!.contains(songSelect())).toBe(true);
    fireEvent.click(del);
    expect(ownNames()).toEqual(['Druga']);
    expect(stored()).toEqual([{ name: 'Druga', src: 'C G Am F', key: 0 }]);
    expect(button('Usuń')).toBeNull();
    expect(songSelect().value).toBe('');
    // The field keeps the text; the board still works.
    expect(field().value).toBe('Em C G D');
    expect(tileNames()).toBe('Em C G D');
    cleanup();
    openChanges('en');
    fireEvent.change(screen.getByLabelText<HTMLSelectElement>('Songs'), { target: { value: 'own:Druga' } });
    expect(screen.getByLabelText<HTMLSelectElement>('Songs').querySelector('optgroup[label="My progressions"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(stored()).toEqual([]);
  });
});

describe('TriadsExplorer — state in the URL', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  const visit = (search: string) => history.replaceState(null, '', `/triads${search}`);

  it('a shared Chord changes link restores the progression', () => {
    visit('?mode=changes&prog=C+G+Am+F&set=DGB');
    const { container } = renderExplorer();
    expect(pressed('Tryb')).toEqual(['Zmiany akordów']);
    expect(field().value).toBe('C G Am F');
    // The key of typed names is detected, not the default G.
    expect(pressed('Tonacja')).toEqual(['C']);
    expect(text(line(container))).toBe('Numbery: 1 5 6- 4 · tonacja rozpoznana: C-dur');
    expect(pressed('Struny')).toEqual(['D-G-B']);
    expect(tileNames()).toBe('C G Am F');
    // A song's progression selects that song.
    expect(songSelect().value).toBe('noWomanNoCry');
    cleanup();
    // Numbers take the key parameter; start wraps to the first chord's Triads.
    visit('?mode=changes&prog=1+4+5&key=2&start=7&overlay=penta');
    const r = renderExplorer();
    expect(field().value).toBe('1 4 5');
    expect(pressed('Tonacja')).toEqual(['D']);
    expect(tileNames()).toBe('D G A');
    expect(isOn(pentaSwitch())).toBe(true);
    expect(text(line(r.container))).toContain('D-dur');
    expect(nowName(r.container)).toMatch(/^1\./);
    expect(songSelect().value).toBe('');
  });

  it('an Inversions link restores chord, set and index', () => {
    visit('?root=9&q=min&set=GBe&i=2');
    const { container } = renderExplorer();
    expect(pressed('Tryb')).toEqual(['Przewroty']);
    expect(pressed('Akord')).toEqual(['A']);
    expect(pressed('Jakość')).toEqual(['moll']);
    expect(pressed('Struny')).toEqual(['G-B-e']);
    expect(count(container)).toBe('3 / 4');
    expect(nowName(container)).toMatch(/^Am/);
    cleanup();
    // An index past the end is clamped; invalid values fall back to their defaults without an error.
    visit('?root=99&set=XYZ&i=40');
    const r = renderExplorer();
    expect(pressed('Akord')).toEqual(['C']);
    expect(pressed('Struny')).toEqual(['wszystkie grupy']);
    expect(count(r.container)).toBe('16 / 16');
    next();
    expect(count(r.container)).toBe('1 / 16');
  });

  it('an overflowing start or index in a link falls back to the default', () => {
    const huge = '9'.repeat(400);
    visit(`?mode=changes&prog=C+G+Am+F&start=${huge}&i=${huge}`);
    const { container } = renderExplorer();
    expect(tileNames()).toBe('C G Am F');
    expect(currentTile()).toBe(0);
    expect(nowName(container)).toMatch(/^1\. 1 · C/);
    next();
    expect(currentTile()).toBe(1);
    cleanup();
    visit(`?root=9&i=${huge}`);
    const r = renderExplorer();
    expect(pressed('Akord')).toEqual(['A']);
    expect(count(r.container)).toMatch(/^1 \/ /);
  });

  it('an explicit default key survives the URL rewrite and a reload', () => {
    visit('?mode=changes&prog=C&key=7');
    renderExplorer();
    expect(pressed('Tonacja')).toEqual(['G']);
    expect(location.search).toBe('?mode=changes&prog=C&key=7');
    cleanup();
    // Names moved to G by a key pick detect as C on their own; the reload keeps G.
    visit('');
    openChanges();
    typeProg('Db C F');
    click('Tonacja', 'G');
    expect(field().value).toBe('A♭ G C');
    cleanup();
    renderExplorer();
    expect(field().value).toBe('A♭ G C');
    expect(pressed('Tonacja')).toEqual(['G']);
    expect(tileNames()).toBe('A♭ G C');
  });

  it('state changes replace the URL query', () => {
    visit('');
    const replace = vi.spyOn(history, 'replaceState');
    const push = vi.spyOn(history, 'pushState');
    const { container } = renderExplorer();
    // Nothing changed yet: still no query.
    expect(location.search).toBe('');
    click('Akord', 'A');
    click('Jakość', 'moll');
    click('Struny', 'G-B-e');
    next();
    expect(replace).toHaveBeenCalled();
    expect(location.search).toBe('?root=9&q=min&set=GBe&i=1');
    expect(location.pathname).toBe('/triads');
    expect(count(container)).toBe('2 / 4');
    click('Tryb', 'Zmiany akordów');
    typeProg('C G Am F');
    expect(location.search).toBe('?mode=changes&root=9&q=min&i=1&prog=C+G+Am+F&key=0');
    // Back to every default: no query at all.
    typeProg('G B C Cm');
    click('Tryb', 'Przewroty');
    click('Akord', 'C');
    click('Jakość', 'dur');
    click('Struny', 'wszystkie grupy');
    expect(location.search).toBe('');
    expect(push).not.toHaveBeenCalled();
  });
});
