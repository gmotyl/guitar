import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { CagedExplorer } from '../CagedExplorer';
import { t } from '../../i18n';

const renderExplorer = (lang: 'pl' | 'en' = 'pl') => render(<CagedExplorer lang={lang} t={t(lang).caged} />);
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const cards = (c: Element) => Array.from(c.querySelectorAll<HTMLElement>('section.card'));
const chordGroup = () => screen.getByRole('group', { name: 'Tonacja' });
const shapeGroup = () => screen.getByRole('group', { name: 'Kształt' });
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
});
