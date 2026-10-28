import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { CagedExplorer } from '../CagedExplorer';
import { t } from '../../i18n';

const renderExplorer = (lang: 'pl' | 'en' = 'pl') => render(<CagedExplorer lang={lang} t={t(lang).caged} />);
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const cards = (c: Element) => Array.from(c.querySelectorAll<HTMLElement>('section.card'));
const chordGroup = () => screen.getByRole('group', { name: 'Tonacja' });
const shapeGroup = () => screen.getByRole('group', { name: 'Kształt' });
const qualityGroup = () => screen.getByRole('group', { name: 'Tryb akordu' });
const chip = (group: HTMLElement, name: string) => within(group).getByRole('button', { name });
const opacityOf = (el: Element) =>
  el instanceof HTMLElement ? el.style.opacity || '1' : el.getAttribute('opacity') ?? '1';

describe('CagedExplorer', () => {
  afterEach(cleanup);

  it('renders chord and shape chips with shape colours', () => {
    renderExplorer();
    const chords = within(chordGroup()).getAllByRole('button');
    expect(chords.map((b) => b.textContent)).toEqual(['wszystkie', 'C', 'A', 'G', 'E', 'D']);
    const shapes = within(shapeGroup()).getAllByRole('button');
    expect(shapes.map((b) => b.textContent)).toEqual(['wszystkie', 'C', 'A', 'G', 'E', 'D']);
    for (const b of [...chords, ...shapes]) expect(['true', 'false']).toContain(b.getAttribute('aria-pressed'));
    expect(chords[0].getAttribute('aria-pressed')).toBe('true');
    expect(shapes[0].getAttribute('aria-pressed')).toBe('true');
    ['C', 'A', 'G', 'E', 'D'].forEach((k, i) =>
      expect(shapes[i + 1].style.getPropertyValue('--sc')).toBe(`var(--${k.toLowerCase()})`),
    );
    expect(screen.getByText('Akord:')).toBeTruthy();
    expect(screen.getByText('Kształt:')).toBeTruthy();
  });

  it('renders the R, 3, 5 legend', () => {
    const { container } = renderExplorer();
    const items = Array.from(container.querySelectorAll('.legend > span'));
    expect(items.map(text)).toEqual(['R — pryma', '3 — tercja wielka', '5 — kwinta']);
    const dot = (i: number) => items[i].querySelector<HTMLElement>('.dot')!;
    expect(dot(0).classList.contains('dot--root')).toBe(true);
    expect(dot(1).classList.contains('dot--third')).toBe(true);
    expect(dot(2).classList.contains('dot--fifth')).toBe(true);
  });

  it('renders five chord cards in order C A G E D with tiles', () => {
    const { container } = renderExplorer();
    const cs = cards(container);
    expect(cs.map((c) => c.dataset.key)).toEqual(['C', 'A', 'G', 'E', 'D']);
    expect(text(cs[0].querySelector('h2'))).toBe('Akord C-dur dźwięki: C · E · G');
    expect(text(cs[0].querySelector('.order'))).toBe('Od siodełka w górę: C → A → G → E → D → C (12 progów wyżej)');
    for (const c of cs) {
      expect(c.querySelectorAll('.shape-card')).toHaveLength(5);
      for (const board of c.querySelectorAll('svg')) {
        expect(board.querySelectorAll('[data-role="band"]').length).toBeGreaterThanOrEqual(5);
        const labels = Array.from(board.querySelectorAll('[data-role="dot"] text')).map((n) => n.textContent);
        expect(new Set(labels)).toEqual(new Set(['R', '3', '5']));
        expect(text(board.querySelector('[data-role="band"] text'))).toMatch(/^kształt [CAGED]$/);
      }
    }
    const tile = cs[0].querySelector('.shape-card')!;
    expect(text(tile.querySelector('h4'))).toBe('C · progi 0–3');
    expect(tile.querySelector('p')!.innerHTML.replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim()).toBe('chwyt (E→e): × 3 2 0 1 0 pryma: B1, A3');
    expect(tile.getAttribute('style')).toContain('--sc: var(--c)');
  });

  it('C card shows the mockup voicings', () => {
    const { container } = renderExplorer();
    const c = cards(container)[0];
    expect(Array.from(c.querySelectorAll('.shape-card h4')).map(text)).toEqual([
      'C · progi 0–3',
      'A · progi 3–5',
      'G · progi 5–8',
      'E · progi 8–10',
      'D · progi 10–13',
    ]);
    const board = c.querySelector('.board--h svg')!;
    const bands = Array.from(board.querySelectorAll('[data-role="band"]'));
    expect(bands.map((b) => b.getAttribute('data-group'))).toEqual(['C', 'A', 'G', 'E', 'D', 'C']);
    expect(bands.map((b) => text(b.querySelector('text')))).toEqual(
      ['C', 'A', 'G', 'E', 'D', 'C'].map((k) => `kształt ${k}`),
    );
  });

  it('shared notes show the shape drawn last in the mockup', () => {
    const { container } = renderExplorer();
    const board = cards(container)[0].querySelector('.board--h svg')!;
    const top = (string: number, fret: number) => {
      const at = board.querySelectorAll(`[data-role="dot"][data-string="${string}"][data-fret="${fret}"]`);
      return Array.from(at).map((n) => n.getAttribute('data-group'));
    };
    // The mockup draws C's +12 copy first, then D on top (e12, G12, B13).
    expect(top(0, 12)).toEqual(['C', 'D']);
    expect(top(2, 12)).toEqual(['C', 'D']);
    expect(top(1, 13)).toEqual(['C', 'D']);
    const dot = board.querySelectorAll('[data-role="dot"][data-string="0"][data-fret="12"] circle')[1];
    expect(dot.getAttribute('stroke')).toBe('var(--d)');
  });

  it('chord filter shows only the picked card and presses its chip', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(chordGroup(), 'G'));
    const visible = cards(container).filter((c) => !c.hidden);
    expect(visible.map((c) => c.dataset.key)).toEqual(['G']);
    expect(chip(chordGroup(), 'G').getAttribute('aria-pressed')).toBe('true');
    expect(chip(chordGroup(), 'wszystkie').getAttribute('aria-pressed')).toBe('false');
  });

  it('shape filter dims other shapes to 12%', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(shapeGroup(), 'E'));
    expect(chip(shapeGroup(), 'E').getAttribute('aria-pressed')).toBe('true');
    const nodes = Array.from(
      container.querySelectorAll('[data-role="band"], [data-role="dot"], .shape-card'),
    ) as Element[];
    const groupOf = (n: Element) => n.getAttribute('data-group') ?? (n as HTMLElement).dataset.shape;
    expect(nodes.length).toBeGreaterThan(50);
    for (const n of nodes) expect(opacityOf(n)).toBe(groupOf(n) === 'E' ? '1' : '0.12');
  });

  it('all resets both filters', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(chordGroup(), 'G'));
    fireEvent.click(chip(shapeGroup(), 'E'));
    fireEvent.click(chip(chordGroup(), 'wszystkie'));
    fireEvent.click(chip(shapeGroup(), 'wszystkie'));
    expect(cards(container).every((c) => !c.hidden)).toBe(true);
    const nodes = container.querySelectorAll('[data-role="band"], [data-role="dot"], .shape-card');
    for (const n of nodes) expect(opacityOf(n)).toBe('1');
    expect(chip(chordGroup(), 'wszystkie').getAttribute('aria-pressed')).toBe('true');
    expect(chip(shapeGroup(), 'wszystkie').getAttribute('aria-pressed')).toBe('true');
  });

  it('CagedExplorer: major by default', () => {
    const { container } = renderExplorer();
    const qs = within(qualityGroup()).getAllByRole('button');
    expect(qs.map((b) => b.textContent)).toEqual(['moll', 'dur']);
    expect(chip(qualityGroup(), 'dur').getAttribute('aria-pressed')).toBe('true');
    expect(chip(qualityGroup(), 'moll').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Tryb:')).toBeTruthy();
    expect(cards(container).map((c) => text(c.querySelector('h2')))).toEqual([
      'Akord C-dur dźwięki: C · E · G',
      'Akord A-dur dźwięki: A · C# · E',
      'Akord G-dur dźwięki: G · B · D',
      'Akord E-dur dźwięki: E · G# · B',
      'Akord D-dur dźwięki: D · F# · A',
    ]);
    expect(container.querySelectorAll('.shape-card .hard')).toHaveLength(0);
  });

  it('CagedExplorer: minor switches cards to C-moll A-moll G-moll E-moll D-moll', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(qualityGroup(), 'moll'));
    expect(chip(qualityGroup(), 'moll').getAttribute('aria-pressed')).toBe('true');
    expect(chip(qualityGroup(), 'dur').getAttribute('aria-pressed')).toBe('false');
    const cs = cards(container);
    expect(cs.map((c) => c.dataset.key)).toEqual(['C', 'A', 'G', 'E', 'D']);
    expect(cs.map((c) => text(c.querySelector('h2')).split(' dźwięki: ')[0])).toEqual(
      ['C', 'A', 'G', 'E', 'D'].map((n) => `Akord ${n}-moll`),
    );
    expect(text(cs[0].querySelector('h2 small'))).toBe('dźwięki: C · Eb · G');
    expect(text(cs[2].querySelector('h2 small'))).toBe('dźwięki: G · Bb · D');
    const legend = Array.from(container.querySelectorAll('.legend > span')).map(text);
    expect(legend).toEqual(['R — pryma', 'b3 — tercja mała', '5 — kwinta']);
    for (const board of container.querySelectorAll('svg')) {
      const labels = Array.from(board.querySelectorAll('[data-role="dot"] text')).map((n) => n.textContent);
      expect(new Set(labels)).toEqual(new Set(['R', 'b3', '5']));
    }
    expect(Array.from(cs[0].querySelectorAll('.shape-card h4')).map(text)).toEqual([
      'C · progi 0–3',
      'A · progi 3–5',
      'G · progi 4–8',
      'E · progi 8–10',
      'D · progi 10–13',
    ]);
  });

  it('CagedExplorer: minor b3 dots use the outline variant', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(qualityGroup(), 'moll'));
    const b3 = Array.from(container.querySelectorAll('[data-role="dot"]')).filter(
      (d) => d.querySelector('text')?.textContent === 'b3',
    );
    expect(b3.length).toBeGreaterThan(20);
    for (const d of b3) {
      // Outline dot: card-coloured fill, fg label (muted would fill with var(--muted)).
      expect(d.querySelector('circle')!.getAttribute('fill')).toBe('var(--card)');
      expect(d.querySelector('text')!.getAttribute('fill')).toBe('var(--fg)');
    }
  });

  it('CagedExplorer: minor C and G shape tiles carry the hard-shape note', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(qualityGroup(), 'moll'));
    for (const c of cards(container)) {
      for (const tile of c.querySelectorAll<HTMLElement>('.shape-card')) {
        const note = tile.querySelector('.hard');
        if (tile.dataset.shape === 'C' || tile.dataset.shape === 'G') {
          expect(text(note)).toBe('trudny do zagrania w całości — zwykle grany częściowo');
        } else {
          expect(note).toBeNull();
        }
      }
    }
    fireEvent.click(chip(qualityGroup(), 'dur'));
    expect(container.querySelectorAll('.shape-card .hard')).toHaveLength(0);
  });

  it('CagedExplorer: english minor switch and note are English', () => {
    const { container } = renderExplorer('en');
    const group = screen.getByRole('group', { name: 'Chord quality' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['minor', 'major']);
    fireEvent.click(chip(group, 'minor'));
    const cs = cards(container);
    expect(text(cs[0].querySelector('h2'))).toBe('C minor notes: C · Eb · G');
    expect(text(cs[0].querySelector('.shape-card .hard'))).toBe('hard to play in full — usually played in part');
    expect(text(container.querySelector('.legend > span:nth-child(2)'))).toBe('b3 — minor third');
    expect(cs[0].querySelector('.board')!.getAttribute('aria-label')).toBe('Fretboard of the C minor chord');
  });

  it('CagedExplorer: minor board svg aria-label names the minor chord (pl and en)', () => {
    const cases = [
      ['pl', 'Tryb akordu', 'moll', 'Pięć kształtów CAGED akordu C-moll na progach 0 do 15', 'Pięć kształtów CAGED akordu C-dur na progach 0 do 15'],
      ['en', 'Chord quality', 'minor', 'The five CAGED shapes of the C minor chord on frets 0 to 15', 'The five CAGED shapes of the C major chord on frets 0 to 15'],
    ] as const;
    for (const [lang, groupName, minorName, minorAria, majorAria] of cases) {
      const { container } = renderExplorer(lang);
      const svgAria = () => cards(container)[0].querySelector('.board svg')!.getAttribute('aria-label');
      expect(svgAria()).toBe(majorAria);
      fireEvent.click(chip(screen.getByRole('group', { name: groupName }), minorName));
      expect(svgAria()).toBe(minorAria);
      cleanup();
    }
  });

  it('CagedExplorer: filters survive the quality switch', () => {
    const { container } = renderExplorer();
    fireEvent.click(chip(chordGroup(), 'A'));
    fireEvent.click(chip(shapeGroup(), 'E'));
    fireEvent.click(chip(qualityGroup(), 'moll'));
    const visible = cards(container).filter((c) => !c.hidden);
    expect(visible.map((c) => text(c.querySelector('h2')).split(' dźwięki')[0])).toEqual(['Akord A-moll']);
    expect(chip(chordGroup(), 'A').getAttribute('aria-pressed')).toBe('true');
    expect(chip(shapeGroup(), 'E').getAttribute('aria-pressed')).toBe('true');
    const nodes = Array.from(visible[0].querySelectorAll('[data-role="band"], [data-role="dot"], .shape-card'));
    const groupOf = (n: Element) => n.getAttribute('data-group') ?? (n as HTMLElement).dataset.shape;
    expect(nodes.some((n) => groupOf(n) === 'E')).toBe(true);
    for (const n of nodes) expect(opacityOf(n)).toBe(groupOf(n) === 'E' ? '1' : '0.12');
  });
});
