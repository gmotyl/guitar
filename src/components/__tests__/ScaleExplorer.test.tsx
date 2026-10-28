import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { ScaleExplorer } from '../ScaleExplorer';
import { t } from '../../i18n';

const renderExplorer = (lang: 'pl' | 'en' = 'pl') =>
  render(<ScaleExplorer lang={lang} t={t(lang).pentatonic} scale="pentatonic" />);
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const group = (name: string) => screen.getByRole('group', { name });
const buttons = (name: string) => within(group(name)).getAllByRole('button');
const click = (groupName: string, label: string) =>
  fireEvent.click(within(group(groupName)).getByRole('button', { name: label }));
const pressed = (name: string) =>
  buttons(name)
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent);
const hBoard = (c: Element) => c.querySelector<SVGSVGElement>('.board--h svg')!;
const dotAt = (svg: Element, string: number, fret: number) =>
  svg.querySelector(`[data-role="dot"][data-string="${string}"][data-fret="${fret}"]`);
const opacity = (el: Element | null) => Number(el?.getAttribute('opacity') ?? '1');
const legend = (c: Element) => Array.from(c.querySelectorAll('.legend > span')).map(text);

const ROOT = 'Pryma';
const SCALE = 'Skala';
const BOX = 'Pudełko';
const CHORDS = 'Akordy tonacji';

describe('ScaleExplorer', () => {
  afterEach(cleanup);

  it('ScaleExplorer: control rows in mockup order', () => {
    const { container } = renderExplorer();
    const groups = Array.from(container.querySelectorAll('.controls [role="group"]'));
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([ROOT, SCALE, BOX, CHORDS]);
    expect(groups.map((g) => text(g.querySelector('.lbl')))).toEqual(['Pryma:', 'Skala:', 'Pudełko:', 'Akordy:']);

    expect(buttons(ROOT).map((b) => b.textContent)).toEqual(
      ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'],
    );
    expect(buttons(SCALE).map((b) => b.textContent)).toEqual(['moll', 'dur']);

    const boxes = buttons(BOX);
    expect(boxes.map((b) => b.textContent)).toEqual(['wszystkie', '1', '2', '3', '4', '5']);
    ['e', 'd', 'c', 'a', 'g'].forEach((shape, i) =>
      expect(boxes[i + 1].style.getPropertyValue('--sc')).toBe(`var(--${shape})`),
    );

    const chords = buttons(CHORDS);
    expect(chords).toHaveLength(7);
    chords.slice(0, 6).forEach((b, i) => {
      expect(b.classList.contains('chord')).toBe(true);
      expect(b.style.getPropertyValue('--sc')).toBe(`var(--k${i})`);
      expect(b.textContent).toMatch(/^[ivIV]+ · [A-G][#b]?m?$/);
    });
    expect(chords[6].textContent).toBe('wyczyść');
    expect(chords[6].hasAttribute('aria-pressed')).toBe(false);
  });

  it('ScaleExplorer: initial state A minor, no chords', () => {
    renderExplorer();
    expect(pressed(ROOT)).toEqual(['A']);
    expect(pressed(SCALE)).toEqual(['moll']);
    expect(pressed(BOX)).toEqual(['wszystkie']);
    expect(pressed(CHORDS)).toEqual([]);
    expect(buttons(CHORDS).slice(0, 6).map((b) => b.textContent)).toEqual(
      ['i · Am', 'III · C', 'iv · Dm', 'v · Em', 'VI · F', 'VII · G'],
    );
  });

  it('ScaleExplorer: quality switch clears chords and relabels chips', () => {
    renderExplorer();
    click(CHORDS, 'i · Am');
    click(CHORDS, 'iv · Dm');
    expect(pressed(CHORDS)).toEqual(['i · Am', 'iv · Dm']);
    click(SCALE, 'dur');
    expect(pressed(SCALE)).toEqual(['dur']);
    expect(pressed(CHORDS)).toEqual([]);
    expect(buttons(CHORDS).slice(0, 6).map((b) => b.textContent)).toEqual(
      ['I · A', 'ii · Bm', 'iii · C#m', 'IV · D', 'V · E', 'vi · F#m'],
    );
    // Root C major names the relative chords; C minor is a flat key.
    click(ROOT, 'C');
    expect(buttons(CHORDS).slice(0, 6).map((b) => b.textContent)).toEqual(
      ['I · C', 'ii · Dm', 'iii · Em', 'IV · F', 'V · G', 'vi · Am'],
    );
    click(SCALE, 'moll');
    expect(buttons(CHORDS).slice(0, 6).map((b) => b.textContent)).toEqual(
      ['i · Cm', 'III · Eb', 'iv · Fm', 'v · Gm', 'VI · Ab', 'VII · Bb'],
    );
    // "clear" drops every selected chord.
    click(CHORDS, 'i · Cm');
    click(CHORDS, 'VI · Ab');
    click(CHORDS, 'wyczyść');
    expect(pressed(CHORDS)).toEqual([]);
  });

  it('ScaleExplorer: relative-key line updates', () => {
    const { container } = renderExplorer();
    const rel = () => text(container.querySelector('.rel'));
    expect(rel()).toBe('A-moll pentatonika: te same dźwięki co C-dur.');
    expect(text(container.querySelector('.rel b'))).toBe('C-dur');
    click(ROOT, 'C');
    click(SCALE, 'dur');
    expect(rel()).toBe('C-dur pentatonika: te same dźwięki co A-moll.');
    click(ROOT, 'A#/Bb');
    expect(rel()).toBe('Bb-dur pentatonika: te same dźwięki co G-moll.');
  });

  it('ScaleExplorer: degree labels and ringed root', () => {
    const { container } = renderExplorer();
    const svg = hBoard(container);
    const label = (s: number, f: number) => text(dotAt(svg, s, f)?.querySelector('text'));
    expect(label(5, 5)).toBe('R');
    expect(dotAt(svg, 5, 5)!.querySelector('[data-role="ring"]')).not.toBeNull();
    expect(label(5, 8)).toBe('b3');
    expect(label(4, 5)).toBe('4');
    expect(dotAt(svg, 5, 8)!.querySelector('[data-role="ring"]')).toBeNull();
    const dots = Array.from(svg.querySelectorAll('[data-role="dot"]'));
    expect(new Set(dots.map((d) => text(d.querySelector('text'))))).toEqual(new Set(['R', 'b3', '4', '5', 'b7']));
    const frets = dots.map((d) => Number(d.getAttribute('data-fret')));
    expect(Math.min(...frets)).toBe(0);
    expect(Math.max(...frets)).toBe(15);
    // Every ringed dot is an A.
    const rings = dots.filter((d) => d.querySelector('[data-role="ring"]'));
    expect(rings.every((d) => text(d.querySelector('text')) === 'R')).toBe(true);
    click(SCALE, 'dur');
    const major = Array.from(hBoard(container).querySelectorAll('[data-role="dot"] text')).map(text);
    expect(new Set(major)).toEqual(new Set(['R', '2', '3', '5', '6']));
  });

  it('ScaleExplorer: box outlines and bands in shape colours', () => {
    const { container } = renderExplorer();
    const svg = hBoard(container);
    const bands = Array.from(svg.querySelectorAll('[data-role="band"]'));
    expect(bands.map((b) => text(b.querySelector('text')))).toEqual(
      ['4 · A', '5 · G', '1 · E', '2 · D', '3 · C', '4 · A'],
    );
    expect(bands.map((b) => b.querySelector('line')!.getAttribute('stroke'))).toEqual(
      ['var(--a)', 'var(--g)', 'var(--e)', 'var(--d)', 'var(--c)', 'var(--a)'],
    );
    const outlines = Array.from(svg.querySelectorAll('[data-role="outline"]'));
    expect(outlines).toHaveLength(6);
    expect(outlines.map((o) => o.getAttribute('stroke'))).toEqual(
      ['var(--a)', 'var(--g)', 'var(--e)', 'var(--d)', 'var(--c)', 'var(--a)'],
    );
    // The +12 copy of box 4 shares its group with the original.
    expect(outlines.filter((o) => o.getAttribute('data-group') === 'box-4')).toHaveLength(2);
    for (const o of outlines) expect(opacity(o)).toBe(1);
  });

  it('ScaleExplorer: box filter keeps chord tones full', () => {
    const { container } = renderExplorer();
    click(CHORDS, 'v · Em');
    click(BOX, '1');
    expect(pressed(BOX)).toEqual(['1']);
    const svg = hBoard(container);
    for (const o of svg.querySelectorAll('[data-role="outline"], [data-role="band"]')) {
      expect(opacity(o), o.getAttribute('data-group')!).toBe(o.getAttribute('data-group') === 'box-1' ? 1 : 0.12);
    }
    // Box 1 spans frets 5–8: a plain scale note outside it is dimmed, one inside stays.
    expect(opacity(dotAt(svg, 5, 0))).toBe(1); // open E is an Em root
    expect(opacity(dotAt(svg, 4, 0))).toBe(0.15); // open A, plain scale note outside box 1
    expect(opacity(dotAt(svg, 4, 5))).toBe(1); // D in box 1
    // Em tones outside box 1 stay full: B on the A string, fret 2 (dashed, outside the pentatonic).
    expect(opacity(dotAt(svg, 4, 2))).toBe(1);
    expect(opacity(dotAt(svg, 5, 12))).toBe(1);
  });

  it('ScaleExplorer: chord overlay split and dashed dots', () => {
    const { container } = renderExplorer();
    click(CHORDS, 'i · Am');
    click(CHORDS, 'iv · Dm');
    const svg = hBoard(container);
    // A (low E, fret 5) belongs to both chords: two slices, label = role in Am.
    const a = dotAt(svg, 5, 5)!;
    expect(Array.from(a.querySelectorAll('[data-role="slice"]')).map((s) => s.getAttribute('fill'))).toEqual(
      ['var(--k0)', 'var(--k2)'],
    );
    expect(text(a.querySelector('text'))).toBe('R');
    expect(a.querySelector('[data-role="ring"]')).not.toBeNull();
    // C (low E, fret 8) only in Am: filled in the Am colour, labelled b3.
    const c = dotAt(svg, 5, 8)!;
    expect(c.querySelector('circle')!.getAttribute('fill')).toBe('var(--k0)');
    expect(text(c.querySelector('text'))).toBe('b3');
    // D (A string, fret 5) only in Dm: root.
    expect(dotAt(svg, 4, 5)!.querySelector('circle')!.getAttribute('fill')).toBe('var(--k2)');
    expect(text(dotAt(svg, 4, 5)!.querySelector('text'))).toBe('R');
    // Every F is a dashed Dm ring labelled b3.
    for (const [s, f] of [[5, 1], [5, 13], [4, 8], [3, 3], [3, 15], [2, 10], [1, 6], [0, 1], [0, 13]]) {
      const dot = dotAt(svg, s, f)!;
      const circle = dot.querySelector('circle')!;
      expect(circle.getAttribute('stroke-dasharray'), `${s}:${f}`).toBe('3 2');
      expect(circle.getAttribute('stroke')).toBe('var(--k2)');
      expect(text(dot.querySelector('text'))).toBe('b3');
    }
  });

  it('ScaleExplorer: F shared by Dm and F shows both chord colours', () => {
    const { container } = renderExplorer();
    click(CHORDS, 'iv · Dm');
    click(CHORDS, 'VI · F');
    const svg = hBoard(container);
    // F lies outside the A minor pentatonic: dashed, one arc per chord colour.
    for (const [s, f] of [[5, 1], [4, 8], [3, 3], [2, 10], [1, 6], [0, 13]]) {
      const arcs = Array.from(dotAt(svg, s, f)!.querySelectorAll('[data-role="arc"]'));
      expect(arcs.map((a) => a.getAttribute('stroke')), `${s}:${f}`).toEqual(['var(--k2)', 'var(--k4)']);
      for (const a of arcs) expect(a.getAttribute('stroke-dasharray')).toBe('3 2');
    }
  });

  it('ScaleExplorer: legend entries follow selection', () => {
    const { container } = renderExplorer();
    expect(legend(container)).toEqual(['pryma skali', 'reszta skali (stopień)']);
    click(CHORDS, 'i · Am');
    click(CHORDS, 'iv · Dm');
    expect(legend(container)).toEqual([
      'i · Am',
      'iv · Dm',
      'pryma skali',
      'reszta skali (stopień)',
      'dźwięk akordu spoza pentatoniki',
    ]);
    const sw = Array.from(container.querySelectorAll<HTMLElement>('.legend .sw'));
    expect(sw[0].style.background).toBe('var(--k0)');
    expect(sw[1].style.background).toBe('var(--k2)');
    expect(sw[2].classList.contains('sw--root')).toBe(true);
    expect(sw[3].classList.contains('sw--scale')).toBe(true);
    expect(sw[4].classList.contains('sw--outside')).toBe(true);
    click(CHORDS, 'wyczyść');
    expect(legend(container)).toEqual(['pryma skali', 'reszta skali (stopień)']);
  });

  it('ScaleExplorer: box tiles in fret order', () => {
    const { container } = renderExplorer();
    const tiles = Array.from(container.querySelectorAll<HTMLElement>('.tiles .tile'));
    expect(tiles.map(text)).toEqual([
      'Pudełko 4 kształt A · progi 0–3, 12–15',
      'Pudełko 5 kształt G · progi 2–5',
      'Pudełko 1 kształt E · progi 5–8',
      'Pudełko 2 kształt D · progi 7–10',
      'Pudełko 3 kształt C · progi 9–13',
    ]);
    expect(tiles.map((t) => t.style.getPropertyValue('--sc'))).toEqual(
      ['var(--a)', 'var(--g)', 'var(--e)', 'var(--d)', 'var(--c)'],
    );
  });

  it('ScaleExplorer: both orientations rendered', () => {
    const { container } = renderExplorer();
    expect(container.querySelectorAll('.board.scroll')).toHaveLength(2);
    expect(container.querySelector('.board--h svg[data-orientation="horizontal"]')).not.toBeNull();
    expect(container.querySelector('.board--v svg[data-orientation="vertical"]')).not.toBeNull();
    // Both boards carry the same notes.
    const count = (sel: string) => container.querySelectorAll(`${sel} [data-role="dot"]`).length;
    expect(count('.board--v')).toBe(count('.board--h'));
    expect(screen.getAllByRole('img', { name: 'Pentatonika A-moll na progach 0–15' })).toHaveLength(2);
  });

  it('ScaleExplorer: English copy has no Polish strings', () => {
    const { container } = renderExplorer('en');
    fireEvent.click(within(screen.getByRole('group', { name: 'Key chords' })).getByRole('button', { name: 'iv · Dm' }));
    const body = text(container) + ' ' + Array.from(container.querySelectorAll('[aria-label]'))
      .map((e) => e.getAttribute('aria-label')).join(' ');
    for (const pl of ['Pryma', 'Skala', 'Pudełko', 'Akordy', 'wszystkie', 'wyczyść', 'moll', 'dur', 'pentatonika', 'pryma', 'reszta', 'spoza', 'kształt', 'progi', 'dźwięk', 'Gryf']) {
      expect(body, pl).not.toContain(pl);
    }
    expect(text(container.querySelector('.rel'))).toBe('A minor pentatonic: same notes as C major.');
    expect(legend(container)).toEqual(['iv · Dm', 'scale root', 'other scale notes (degree)', 'chord tone outside the pentatonic']);
    expect(text(container.querySelector('.tiles .tile'))).toBe('Box 4 shape A · frets 0–3, 12–15');
  });
});
