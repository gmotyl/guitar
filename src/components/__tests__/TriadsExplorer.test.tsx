import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TriadsExplorer } from '../TriadsExplorer';
import { t } from '../../i18n';

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
    expect(buttons('Akord').map(text)).toEqual(['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'A♭', 'A', 'B♭', 'B']);
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
    // Inside a chip row: no step.
    fireEvent.keyDown(buttons('Akord')[0], { key: 'ArrowRight' });
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
    // Root chips are spelled in the chosen quality: B♭ minor stays flat, D# minor sharp.
    expect(buttons('Akord').map(text)).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B']);
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
