import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { render as preactRender } from 'preact';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NashvilleExplorer } from '../NashvilleExplorer';
import { t } from '../../i18n';

const renderExplorer = (lang: 'pl' | 'en' = 'pl') => render(<NashvilleExplorer lang={lang} t={t(lang).nashville} />);
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const group = (name: string) => screen.getByRole('group', { name });
const buttons = (name: string) => within(group(name)).getAllByRole('button');
/** Chips are matched by their visible text (table entries carry a longer aria-label). */
const click = (groupName: string, label: string) => {
  const b = buttons(groupName).find((x) => text(x) === label);
  if (!b) throw new Error(`No "${label}" in ${groupName}`);
  fireEvent.click(b);
};
const pressed = (name: string) =>
  buttons(name)
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => text(b));
const css = readFileSync(join(process.cwd(), 'src/components/nashville.css'), 'utf8');

// Chart helpers: bars in reading order, each bar's chord buttons.
const bars = (c: Element) => Array.from(c.querySelectorAll('.chart .bar'));
const chords = (bar: Element) => Array.from(bar.querySelectorAll<HTMLButtonElement>('button.ch'));
const chartBy = (c: Element, part: '.num' | '.name') =>
  Array.from(c.querySelectorAll('.chart .line'))
    .map((line) =>
      Array.from(line.querySelectorAll('.bar'))
        .map((bar) => chords(bar).map((ch) => text(ch.querySelector(part))).join('/'))
        .join(' '),
    )
    .join(' | ');
const pressedBars = (c: Element) =>
  Array.from(c.querySelectorAll('.chart button.ch[aria-pressed="true"]')).map((b) => b.getAttribute('aria-label'));

// Board helpers (horizontal board; both orientations carry the same data).
const hBoard = (c: Element) => c.querySelector<SVGSVGElement>('.board--h svg')!;
const dots = (c: Element) => Array.from(hBoard(c).querySelectorAll('[data-role="dot"]'));
const fillOf = (dot: Element) => dot.querySelector('circle')!.getAttribute('fill');
const label = (dot: Element) => text(dot.querySelector('text'));
const isDimmed = (dot: Element) => Number(dot.getAttribute('opacity') ?? '1') < 1;
const chordDots = (c: Element) => dots(c).filter((d) => fillOf(d) !== 'var(--card)');
const stepDots = (c: Element) => dots(c).filter((d) => fillOf(d) === 'var(--card)');
const outlines = (c: Element) => Array.from(hBoard(c).querySelectorAll('[data-role="outline"]'));
const fretColumn = (c: Element, fret: number) =>
  hBoard(c).querySelector(`[data-role="fret-column"][data-fret="${fret}"]`);
const chordLine = (c: Element) => text(c.querySelector('.chordline'));
const keyLine = (c: Element) => text(c.querySelector('.keyline'));

const KEY = 'Tonacja';
const PRESET = 'Progresja';
const TABLE = 'Akordy tonacji według stopni';
const SHAPE = 'Kształt akordu 1';
const SWITCH = 'Pokaż pozycję CAGED';
const switchButton = () => screen.getByRole('button', { name: SWITCH });

/** Key G on the blues: bar 1 is the G chord. */
const blueInGWithSwitch = () => {
  const r = renderExplorer();
  click(KEY, 'G');
  fireEvent.click(switchButton());
  return r;
};

describe('NashvilleExplorer', () => {
  afterEach(cleanup);

  it('renders controls in mockup order with the A number table', () => {
    const { container } = renderExplorer();
    const root = container.firstElementChild!;
    // Page order: controls, key line, chart, legend, boards, chord line, position switch.
    expect(Array.from(root.children).map((el) => el.classList[0])).toEqual([
      'controls', 'keyline', 'chart', 'legend', 'board', 'board', 'chordline', 'position',
    ]);
    const groups = Array.from(container.querySelectorAll('.controls [role="group"]'));
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([KEY, PRESET, TABLE]);
    expect(groups.map((g) => text(g.querySelector('.lbl')))).toEqual(['Tonacja:', 'Progresja:', 'Stopnie:']);

    expect(buttons(KEY).map((b) => b.textContent)).toEqual(
      ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'],
    );
    expect(buttons(PRESET).map((b) => b.textContent)).toEqual(
      ['Blues 12 taktów', 'Pop 1-5-6-4', '2-5-1', 'Doo-wop 1-6-4-5', 'Moll 6-4-1-5'],
    );
    expect(pressed(KEY)).toEqual(['A']);
    expect(pressed(PRESET)).toEqual(['Blues 12 taktów']);

    const table = buttons(TABLE);
    expect(table.map(text)).toEqual(['1 · A', '2- · Bm', '3- · C#m', '4 · D', '5 · E', '6- · F#m', '7° · G#dim']);
    expect(table.map((b) => b.style.getPropertyValue('--sc'))).toEqual([
      'var(--k0)', 'var(--k1)', 'var(--k2)', 'var(--k3)', 'var(--k4)', 'var(--k5)', 'var(--muted)',
    ]);
    expect(table[6].getAttribute('aria-label')).toBe('Stopień 7°: G#dim');
    expect(pressed(TABLE)).toEqual([]);
    // The position switch starts off with no shape chips.
    expect(switchButton().getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('group', { name: SHAPE })).toBeNull();
  });

  it('shows the key line above the chart', () => {
    const { container } = renderExplorer();
    expect(keyLine(container)).toBe('Tonacja A — 1 = A');
    expect(container.querySelector('.keyline')!.nextElementSibling!.classList.contains('chart')).toBe(true);
    cleanup();
    const en = renderExplorer('en');
    expect(keyLine(en.container)).toBe('Key of A — 1 = A');
  });

  it('draws the chart in lines of four with names under numbers', () => {
    const { container } = renderExplorer();
    const lines = Array.from(container.querySelectorAll('.chart .line'));
    expect(lines).toHaveLength(3);
    lines.forEach((line) => expect(line.querySelectorAll(':scope > .bar')).toHaveLength(4));
    expect(screen.getByRole('group', { name: 'Chart w numerach' })).toBe(container.querySelector('.chart'));

    expect(chartBy(container, '.num')).toBe('1 1 1 1 | 4 4 1 1 | 5⁷ 4 1 5⁷');
    expect(chartBy(container, '.name')).toBe('A A A A | D D A A | E7 D A E7');
    // Number on top, name under it, both inside the chord button; the button carries the Number colour.
    const bar9 = chords(bars(container)[8])[0];
    expect(Array.from(bar9.children).map((el) => el.className).filter((c) => c !== 'push')).toEqual(['num', 'name']);
    expect(bar9.style.getPropertyValue('--sc')).toBe('var(--k4)');
    expect(bar9.getAttribute('aria-label')).toBe('Takt 9: 5⁷, E7');
    expect(chords(bars(container)[4])[0].style.getPropertyValue('--sc')).toBe('var(--k3)');

    // Bar 1 is selected initially, and only bar 1.
    expect(pressedBars(container)).toEqual(['Takt 1: 1, A']);
    expect(container.querySelectorAll('.chart button.ch[aria-pressed="false"]')).toHaveLength(11);

    // Four equal columns that keep on a phone; the Number in its colour; the selected bar tinted in its colour.
    expect(css).toMatch(/\.line\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/\.ch \.num\s*\{[^}]*color:\s*var\(--sc\)/);
    expect(css).toMatch(/\.ch\[aria-pressed="true"\]\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--sc\)/);
    expect(css).toMatch(/@media \(max-width: 520px\)\s*\{[^}]*\.ch \.num\s*\{\s*font-size/);
  });

  it('draws split bar underline, hold diamond and push mark', () => {
    const { container } = renderExplorer();
    // Blues bar 12: '>' above the Number.
    const bar12 = chords(bars(container)[11])[0];
    expect(text(bar12.firstElementChild)).toBe('>');
    expect(bar12.firstElementChild!.classList.contains('push')).toBe(true);
    expect(container.querySelectorAll('.chart .push')).toHaveLength(1);

    click(PRESET, '2-5-1');
    const b = bars(container);
    // Bar 6: two chords in one cell, joined by an underline.
    expect(b[5].classList.contains('split')).toBe(true);
    const pair = b[5].querySelector('.pair')!;
    expect(chords(pair).map((ch) => text(ch.querySelector('.num')))).toEqual(['2-', '5⁷']);
    expect(chords(b[5]).map((ch) => ch.getAttribute('aria-label'))).toEqual(['Takt 6: 2-, Em', 'Takt 6: 5⁷, A7']);
    expect(css).toMatch(/\.pair\s*\{[^}]*border-bottom:\s*2px solid/);
    // Bar 8: a diamond, a rotated square.
    expect(chords(b[7])[0].classList.contains('hold')).toBe(true);
    expect(container.querySelectorAll('.chart .hold')).toHaveLength(1);
    expect(css).toMatch(/\.ch\.hold \.num::before\s*\{[^}]*rotate\(45deg\)/);
  });

  it('renders the symbol legend', () => {
    const { container } = renderExplorer();
    const legend = screen.getByRole('group', { name: 'Symbole chartu' });
    expect(container.querySelector('.chart')!.nextElementSibling).toBe(legend);
    const items = Array.from(legend.querySelectorAll(':scope > span'));
    expect(items.map(text)).toEqual([
      '6- moll',
      '5⁷ septyma',
      '1/3 tercja w basie',
      '2- 5⁷ podkreślenie: dwa akordy w takcie',
      '> push (wejście przed taktem)',
      '1 romb: uderz i trzymaj',
    ]);
    expect(items[3].querySelector('.pair')).not.toBeNull();
    expect(items[5].querySelector('.hold')).not.toBeNull();
  });

  it('selecting a bar draws its chord and names it in the chord line', () => {
    const { container } = renderExplorer();
    expect(chordLine(container)).toBe('Na gryfie: 1 = A — role R / 3 / 5');

    fireEvent.click(screen.getByRole('button', { name: 'Takt 9: 5⁷, E7' }));
    expect(pressedBars(container)).toEqual(['Takt 9: 5⁷, E7']);
    expect(pressed(TABLE)).toEqual([]);

    const d = dots(container);
    expect(new Set(d.map(label))).toEqual(new Set(['R', '3', '5', 'b7']));
    expect(new Set(d.map(fillOf))).toEqual(new Set(['var(--k4)']));
    expect(d.some(isDimmed)).toBe(false);
    // Low E open = E = R with the root ring; G# on the low E at fret 4 = 3; D at fret 10 = b7.
    const at = (s: number, f: number) => hBoard(container).querySelector(`[data-role="dot"][data-string="${s}"][data-fret="${f}"]`)!;
    expect(label(at(5, 0))).toBe('R');
    expect(label(at(5, 4))).toBe('3');
    expect(label(at(5, 10))).toBe('b7');
    const ringed = d.filter((x) => x.querySelector('[data-role="ring"]'));
    expect(ringed.length).toBeGreaterThan(0);
    expect(ringed.every((x) => label(x) === 'R')).toBe(true);
    expect(d.filter((x) => label(x) === 'R').every((x) => x.querySelector('[data-role="ring"]'))).toBe(true);
    // Both orientations carry the chord.
    expect(container.querySelector('.board--v svg')!.querySelectorAll('[data-role="dot"]')).toHaveLength(d.length);

    expect(chordLine(container)).toBe('Na gryfie: 5⁷ = E7 — role R / 3 / 5 / b7');
    const bold = container.querySelector('.chordline b') as HTMLElement;
    expect(text(bold)).toBe('5⁷ = E7');
    expect(bold.style.color).toBe('var(--k4)');
    expect(hBoard(container).getAttribute('aria-label')).toBe('Akord E7 na progach 0–15');
  });

  it('selecting a table number clears the bar selection', () => {
    const { container } = renderExplorer();
    click(TABLE, '7° · G#dim');
    expect(pressedBars(container)).toEqual([]);
    expect(pressed(TABLE)).toEqual(['7° · G#dim']);
    const d = dots(container);
    expect(new Set(d.map(label))).toEqual(new Set(['R', 'b3', 'b5']));
    expect(new Set(d.map(fillOf))).toEqual(new Set(['var(--muted)']));
    expect(chordLine(container)).toBe('Na gryfie: 7° = G#dim — role R / b3 / b5');

    fireEvent.click(screen.getByRole('button', { name: 'Takt 5: 4, D' }));
    expect(pressed(TABLE)).toEqual([]);
    expect(pressedBars(container)).toEqual(['Takt 5: 4, D']);
  });

  it('preset change sets its key and selects the first bar', () => {
    const { container } = renderExplorer();
    fireEvent.click(screen.getByRole('button', { name: 'Takt 9: 5⁷, E7' }));
    click(PRESET, '2-5-1');
    expect(pressed(PRESET)).toEqual(['2-5-1']);
    expect(pressed(KEY)).toEqual(['D']);
    expect(chartBy(container, '.num')).toBe('2- 5⁷ 1 1 | 6- 2-/5⁷ 1 1');
    expect(chartBy(container, '.name')).toBe('Em A7 D D | Bm Em/A7 D D');
    expect(pressedBars(container)).toEqual(['Takt 1: 2-, Em']);
    expect(chordLine(container)).toBe('Na gryfie: 2- = Em — role R / b3 / 5');

    // A table selection is dropped too.
    click(TABLE, '4 · G');
    click(PRESET, 'Pop 1-5-6-4');
    expect(pressed(KEY)).toEqual(['G']);
    expect(pressed(TABLE)).toEqual([]);
    expect(pressedBars(container)).toEqual(['Takt 1: 1, G']);
    expect(chartBy(container, '.name')).toBe('G D Em C | G D Em C | G/B C D G');
  });

  it('key change keeps numbers and respells names', () => {
    const { container } = renderExplorer();
    click(PRESET, '2-5-1');
    click(PRESET, 'Blues 12 taktów');
    expect(pressed(KEY)).toEqual(['A']);
    const numbers = chartBy(container, '.num');
    click(KEY, 'F');
    expect(pressed(KEY)).toEqual(['F']);
    expect(pressed(PRESET)).toEqual(['Blues 12 taktów']);
    expect(chartBy(container, '.num')).toBe(numbers);
    expect(chartBy(container, '.name')).toBe('F F F F | Bb Bb F F | C7 Bb F C7');
    expect(keyLine(container)).toBe('Tonacja F — 1 = F');
    expect(buttons(TABLE).map(text)).toEqual(['1 · F', '2- · Gm', '3- · Am', '4 · Bb', '5 · C', '6- · Dm', '7° · Edim']);
    // The selected bar stays selected.
    expect(pressedBars(container)).toEqual(['Takt 1: 1, F']);
  });

  it('minor preset names the relative minor', () => {
    const { container } = renderExplorer();
    click(PRESET, 'Moll 6-4-1-5');
    expect(pressed(KEY)).toEqual(['C']);
    expect(chartBy(container, '.num')).toBe('6- 4 1 5 | 6- 4 1 5');
    expect(chords(bars(container)[0])[0].getAttribute('aria-label')).toBe('Takt 1: 6-, Am');
    expect(keyLine(container)).toBe('Tonacja C — 1 = C · 6- = A-moll');
    click(PRESET, 'Doo-wop 1-6-4-5');
    expect(keyLine(container)).toBe('Tonacja C — 1 = C');
    cleanup();
    const en = renderExplorer('en');
    click('Progression', 'Minor 6-4-1-5');
    expect(keyLine(en.container)).toBe('Key of C — 1 = C · 6- = A minor');
  });

  it('position switch draws the window and step numbers', () => {
    const { container } = renderExplorer();
    expect(outlines(container)).toHaveLength(0);
    expect(stepDots(container)).toHaveLength(0);

    fireEvent.click(switchButton());
    expect(switchButton().getAttribute('aria-pressed')).toBe('true');
    expect(buttons(SHAPE).map(text)).toEqual(['wszystkie', 'E', 'D', 'C', 'A', 'G']);
    expect(buttons(SHAPE).slice(1).map((b) => b.style.getPropertyValue('--sc'))).toEqual(
      ['var(--e)', 'var(--d)', 'var(--c)', 'var(--a)', 'var(--g)'],
    );
    expect(pressed(SHAPE)).toEqual(['wszystkie']);
    const all = outlines(container);
    expect(all.map((o) => o.getAttribute('data-group'))).toEqual(
      ['window-E', 'window-D', 'window-C', 'window-A', 'window-G'],
    );
    expect(all.every((o) => o.getAttribute('stroke-dasharray') === '6 4')).toBe(true);
    expect(chordLine(container)).toBe('Na gryfie: 1 = A — role R / 3 / 5');

    click(KEY, 'G');
    click(SHAPE, 'E');
    expect(pressed(SHAPE)).toEqual(['E']);
    expect(outlines(container).map((o) => o.getAttribute('data-group'))).toEqual(['window-E']);
    // Step-numbered scale notes only inside frets 2–6, e.g. F# (7) on the high e at fret 2.
    const steps = stepDots(container);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((d) => Number(d.getAttribute('data-fret')) >= 2 && Number(d.getAttribute('data-fret')) <= 6)).toBe(true);
    expect(new Set(steps.map(label))).toEqual(new Set(['2', '4', '6', '7']));
    const fs = steps.find((d) => d.getAttribute('data-string') === '0' && d.getAttribute('data-fret') === '2')!;
    expect(label(fs)).toBe('7');
    expect(fs.querySelector('circle')!.getAttribute('stroke')).toBe('var(--muted)');
    // Chord tones of G outside 2–6 are dimmed, inside are not.
    chordDots(container).forEach((d) => {
      const f = Number(d.getAttribute('data-fret'));
      expect(isDimmed(d)).toBe(f < 2 || f > 6);
    });
    expect(chordLine(container)).toBe('Na gryfie: 1 = G — role R / 3 / 5 · kształt E · progi 2–6');

    // Switch off: no window, nothing dimmed, no step dots, no click areas, no suffix.
    fireEvent.click(switchButton());
    expect(switchButton().getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('group', { name: SHAPE })).toBeNull();
    expect(outlines(container)).toHaveLength(0);
    expect(stepDots(container)).toHaveLength(0);
    expect(dots(container).some(isDimmed)).toBe(false);
    expect(fretColumn(container, 5)).toBeNull();
    expect(chordLine(container)).toBe('Na gryfie: 1 = G — role R / 3 / 5');
    // Turning it on again starts from all five windows.
    fireEvent.click(switchButton());
    expect(pressed(SHAPE)).toEqual(['wszystkie']);
    expect(outlines(container)).toHaveLength(5);
  });

  it('position chips select several windows', () => {
    const { container } = blueInGWithSwitch();
    click(SHAPE, 'E');
    click(SHAPE, 'D');
    expect(pressed(SHAPE)).toEqual(['E', 'D']);
    expect(outlines(container).map((o) => o.getAttribute('data-group'))).toEqual(['window-E', 'window-D']);
    chordDots(container).forEach((d) => {
      const f = Number(d.getAttribute('data-fret'));
      expect(isDimmed(d)).toBe(f < 2 || f > 8);
    });
    expect(chordLine(container)).toBe(
      'Na gryfie: 1 = G — role R / 3 / 5 · kształt E · progi 2–6, kształt D · progi 4–8',
    );
    // A second click on a chip drops it.
    click(SHAPE, 'D');
    expect(pressed(SHAPE)).toEqual(['E']);
    // "all" clears the selection.
    click(SHAPE, 'wszystkie');
    expect(pressed(SHAPE)).toEqual(['wszystkie']);
    expect(outlines(container)).toHaveLength(5);
    expect(chordLine(container)).toBe('Na gryfie: 1 = G — role R / 3 / 5');
  });

  it('board click toggles the windows meeting there', () => {
    const { container } = renderExplorer();
    click(KEY, 'G');
    // Switch off: the board has no click areas.
    expect(fretColumn(container, 5)).toBeNull();

    fireEvent.click(switchButton());
    click(SHAPE, 'E');
    // Fret 5 lies in E (2–6) and D (4–8).
    fireEvent.click(fretColumn(container, 5)!);
    expect(pressed(SHAPE)).toEqual(['E', 'D']);
    expect(outlines(container)).toHaveLength(2);
    fireEvent.click(fretColumn(container, 5)!);
    expect(pressed(SHAPE)).toEqual(['wszystkie']);
    expect(outlines(container)).toHaveLength(5);
    // The vertical board clicks the same way.
    fireEvent.click(container.querySelector('.board--v svg [data-role="fret-column"][data-fret="3"]')!);
    expect(pressed(SHAPE)).toEqual(['E']);
  });

  it('server render shows the blues chart in A with the A chord', () => {
    // The island's first render is what Astro prerenders: default state, no effects, no events.
    const host = document.createElement('div');
    preactRender(<NashvilleExplorer lang="pl" t={t('pl').nashville} />, host);
    expect(chartBy(host, '.num')).toBe('1 1 1 1 | 4 4 1 1 | 5⁷ 4 1 5⁷');
    expect(chartBy(host, '.name')).toBe('A A A A | D D A A | E7 D A E7');
    expect(host.querySelector('.chart button.ch[aria-pressed="true"]')!.getAttribute('aria-label')).toBe('Takt 1: 1, A');
    expect(Array.from(host.querySelectorAll('.board svg')).map((s) => s.getAttribute('data-orientation'))).toEqual(
      ['horizontal', 'vertical'],
    );
    const d = Array.from(host.querySelectorAll('.board--h svg [data-role="dot"]'));
    expect(d.length).toBeGreaterThan(0);
    expect(new Set(d.map(label))).toEqual(new Set(['R', '3', '5']));
    expect(new Set(d.map(fillOf))).toEqual(new Set(['var(--k0)']));
    expect(host.querySelectorAll('[data-role="outline"]')).toHaveLength(0);
    expect(text(host.querySelector('.chordline'))).toBe('Na gryfie: 1 = A — role R / 3 / 5');
    preactRender(null, host);
  });
});
