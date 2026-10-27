import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/preact';
import { Fretboard, type FretDot, type FretBand } from '../Fretboard';

const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
const all = (c: Element, role: string) => Array.from(c.querySelectorAll(`[data-role="${role}"]`));

const dots: FretDot[] = [
  { string: 1, fret: 1, label: 'R', color: 'var(--c)', variant: 'filled', group: 'C' },
  { string: 3, fret: 2, label: '3', color: 'var(--c)', variant: 'outline', group: 'C' },
  { string: 0, fret: 0, label: '5', color: 'var(--a)', variant: 'muted', group: 'A' },
];
const bands: FretBand[] = [
  { from: 0, to: 3, color: 'var(--c)', label: 'C', group: 'C' },
  { from: 3, to: 5, color: 'var(--a)', label: 'A', group: 'A' },
];

describe('Fretboard', () => {
  it('draws frets 0 to 15 with inlay markers and a double 12th marker', () => {
    const { container } = render(<Fretboard orientation="horizontal" dots={[]} ariaLabel="b" />);
    const nums = all(container, 'fret-number');
    expect(nums.map((n) => n.textContent)).toEqual(Array.from({ length: 16 }, (_, i) => String(i)));
    // fret numbers run left to right
    const xs = nums.map((n) => num(n, 'x'));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    const markers = all(container, 'marker').map((m) => m.getAttribute('data-fret'));
    expect(markers).toEqual(['3', '5', '7', '9', '12', '12', '15']);
    expect(all(container, 'nut')).toHaveLength(1);
    expect(all(container, 'fret')).toHaveLength(15);
  });

  it('orders string labels top to bottom in horizontal orientation', () => {
    const { container } = render(<Fretboard orientation="horizontal" dots={[]} ariaLabel="b" />);
    const labels = all(container, 'string-label').sort((a, b) => num(a, 'y') - num(b, 'y'));
    expect(labels.map((l) => l.textContent)).toEqual(['e', 'B', 'G', 'D', 'A', 'E']);
  });

  it('puts the nut on top and strings low E to high e in vertical orientation', () => {
    const { container } = render(<Fretboard orientation="vertical" dots={[]} ariaLabel="b" />);
    const nut = all(container, 'nut')[0];
    expect(num(nut, 'y1')).toBe(num(nut, 'y2'));
    const fretYs = all(container, 'fret').map((f) => num(f, 'y1'));
    expect(Math.min(...fretYs)).toBeGreaterThan(num(nut, 'y1'));
    const nums = all(container, 'fret-number');
    const ys = nums.map((n) => num(n, 'y'));
    expect(nums.map((n) => n.textContent)).toEqual(Array.from({ length: 16 }, (_, i) => String(i)));
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    const labels = all(container, 'string-label').sort((a, b) => num(a, 'x') - num(b, 'x'));
    expect(labels.map((l) => l.textContent)).toEqual(['E', 'A', 'D', 'G', 'B', 'e']);
  });

  it('renders one circle per dot with its label', () => {
    const { container } = render(<Fretboard orientation="horizontal" dots={dots} ariaLabel="b" />);
    const ds = all(container, 'dot');
    expect(ds).toHaveLength(3);
    expect(ds.map((d) => d.querySelectorAll('circle').length)).toEqual([1, 1, 1]);
    expect(ds.map((d) => d.querySelector('text')?.textContent)).toEqual(['R', '3', '5']);
    const [filled, outline, muted] = ds.map((d) => d.querySelector('circle')!);
    expect(filled.getAttribute('fill')).toBe('var(--c)');
    expect(outline.getAttribute('fill')).toBe('var(--card)');
    expect(outline.getAttribute('stroke')).toBe('var(--c)');
    expect(muted.getAttribute('fill')).toBe('var(--muted)');
  });

  it('dims bands and dots of dimmed groups to 12% opacity', () => {
    const { container } = render(
      <Fretboard orientation="vertical" dots={dots} bands={bands} dimmedGroups={['A']} ariaLabel="b" />,
    );
    const groups = Array.from(container.querySelectorAll('[data-group]'));
    expect(groups.length).toBeGreaterThan(0);
    const op = (g: string) =>
      groups.filter((n) => n.getAttribute('data-group') === g).map((n) => n.getAttribute('opacity'));
    expect(op('A').length).toBeGreaterThanOrEqual(2);
    expect(op('A').every((o) => o === '0.12')).toBe(true);
    expect(op('C').every((o) => o === '1')).toBe(true);
    expect(all(container, 'band')).toHaveLength(2);
  });

  it('exposes the board as an image with an aria label', () => {
    const { container } = render(<Fretboard orientation="horizontal" dots={[]} ariaLabel="CAGED C" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('CAGED C');
  });
});
