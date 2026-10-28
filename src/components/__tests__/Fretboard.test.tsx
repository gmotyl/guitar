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

  it('Fretboard: existing props render unchanged', () => {
    // CAGED-style board using only the pre-overlay props; the snapshot was
    // recorded before outlines/split/dashed/ring/dimmed dots existed.
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { container } = render(
        <Fretboard orientation={orientation} dots={dots} bands={bands} dimmedGroups={['A']} ariaLabel="CAGED C" />,
      );
      expect(container.innerHTML).toMatchSnapshot(orientation);
    }
  });

  it('Fretboard: split dot renders one slice per colour', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[{ string: 2, fret: 5, label: 'R', color: 'var(--k0)', colors: ['var(--k0)', 'var(--k1)'], variant: 'filled' }]}
        ariaLabel="b"
      />,
    );
    const slices = Array.from(all(container, 'dot')[0].querySelectorAll('[data-role="slice"]'));
    expect(slices.map((p) => p.getAttribute('fill'))).toEqual(['var(--k0)', 'var(--k1)']);
    // Equal halves: two arcs of the dot radius whose end points are a diameter apart.
    const arcs = slices.map((p) => {
      const m = p.getAttribute('d')!.match(/^M[-\d.]+,[-\d.]+ L[-\d.]+,[-\d.]+ A([\d.]+),\1 0 0 1 ([-\d.]+),([-\d.]+) Z$/);
      expect(m).not.toBeNull();
      return m!.slice(1).map(Number);
    });
    const [[r, x0, y0], [, x1, y1]] = arcs;
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(2 * r, 1);
  });

  it('Fretboard: dashed dot', () => {
    const { container } = render(
      <Fretboard
        orientation="vertical"
        dots={[{ string: 2, fret: 6, label: '3', color: 'var(--k2)', variant: 'dashed' }]}
        ariaLabel="b"
      />,
    );
    const circle = all(container, 'dot')[0].querySelector('circle')!;
    expect(circle.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(circle.getAttribute('stroke')).toBe('var(--k2)');
    expect(circle.getAttribute('fill')).not.toBe('var(--k2)');
  });

  it('Fretboard: root ring', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[
          { string: 0, fret: 5, label: 'R', color: 'var(--k0)', variant: 'filled', ring: true },
          { string: 1, fret: 5, label: '5', color: 'var(--k0)', variant: 'filled' },
        ]}
        ariaLabel="b"
      />,
    );
    const [ringed, plain] = all(container, 'dot');
    const ring = ringed.querySelector('[data-role="ring"]')!;
    expect(ring.tagName.toLowerCase()).toBe('circle');
    expect(ring.getAttribute('fill')).toBe('none');
    const body = ringed.querySelector('circle:not([data-role="ring"])')!;
    expect(num(ring, 'r')).toBeGreaterThan(num(body, 'r'));
    expect([num(ring, 'cx'), num(ring, 'cy')]).toEqual([num(body, 'cx'), num(body, 'cy')]);
    expect(plain.querySelector('[data-role="ring"]')).toBeNull();
  });

  it('Fretboard: per-dot dimming', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[
          { string: 0, fret: 5, label: '1', color: 'var(--muted)', variant: 'outline', dimmed: true },
          { string: 1, fret: 5, label: '5', color: 'var(--k0)', variant: 'filled' },
          { string: 2, fret: 5, label: 'b3', color: 'var(--k0)', variant: 'filled', dimmed: false },
        ]}
        ariaLabel="b"
      />,
    );
    expect(all(container, 'dot').map((d) => d.getAttribute('opacity'))).toEqual(['0.15', '1', '1']);
  });

  it('Fretboard: per-band dimming', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[]}
        bands={[
          { from: 5, to: 8, color: 'var(--e)', label: '1 · E', group: 'box-1', dimmed: true },
          { from: 7, to: 10, color: 'var(--d)', label: '2 · D', group: 'box-2' },
        ]}
        ariaLabel="b"
      />,
    );
    expect(all(container, 'band').map((b) => b.getAttribute('opacity'))).toEqual(['0.12', '1']);
  });

  it('Fretboard: box outline in horizontal and vertical orientation', () => {
    // A minor box 1: frets 5..8, two notes per string.
    const cells = [
      [0, 5], [0, 8], [1, 5], [1, 8], [2, 5], [2, 7],
      [3, 5], [3, 7], [4, 5], [4, 7], [5, 5], [5, 8],
    ].map(([string, fret]) => ({ string, fret }));
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { container } = render(
        <Fretboard
          orientation={orientation}
          dots={cells.map((c) => ({ ...c, label: '', color: 'var(--c)', variant: 'outline' as const }))}
          outlines={[{ group: '1', color: 'var(--c)', cells }]}
          ariaLabel="b"
        />,
      );
      const outlines = all(container, 'outline');
      expect(outlines).toHaveLength(1);
      const poly = outlines[0];
      expect(poly.tagName.toLowerCase()).toBe('polygon');
      expect(poly.getAttribute('stroke')).toBe('var(--c)');
      expect(poly.getAttribute('fill')).toBe('var(--c)');
      expect(poly.getAttribute('data-group')).toBe('1');
      const pts = poly.getAttribute('points')!.trim().split(/\s+/).map((p) => p.split(',').map(Number));
      // One vertex per string on each side plus two corners at each end.
      expect(pts).toHaveLength(2 * 6 + 4);
      const xs = pts.map(([x]) => x);
      const ys = pts.map(([, y]) => y);
      // Every dot centre lies strictly inside the polygon's bounding box (padding).
      for (const d of all(container, 'dot')) {
        const c = d.querySelector('circle')!;
        const [cx, cy] = [num(c, 'cx'), num(c, 'cy')];
        expect(cx).toBeGreaterThan(Math.min(...xs));
        expect(cx).toBeLessThan(Math.max(...xs));
        expect(cy).toBeGreaterThan(Math.min(...ys));
        expect(cy).toBeLessThan(Math.max(...ys));
      }
      // Stepped: the polygon passes the G string (2) at the fret-7 column, not fret 8.
      const g = all(container, 'dot').find((d) => d.getAttribute('data-string') === '2' && d.getAttribute('data-fret') === '7')!;
      const b = all(container, 'dot').find((d) => d.getAttribute('data-string') === '1' && d.getAttribute('data-fret') === '8')!;
      const along = (d: Element) => num(d.querySelector('circle')!, orientation === 'horizontal' ? 'cx' : 'cy');
      const across = (d: Element) => num(d.querySelector('circle')!, orientation === 'horizontal' ? 'cy' : 'cx');
      const alongOf = (p: number[]) => (orientation === 'horizontal' ? p[0] : p[1]);
      const acrossOf = (p: number[]) => (orientation === 'horizontal' ? p[1] : p[0]);
      const atG = pts.filter((p) => acrossOf(p) === across(g)).map(alongOf);
      const atB = pts.filter((p) => acrossOf(p) === across(b)).map(alongOf);
      expect(Math.max(...atG)).toBeGreaterThan(along(g));
      expect(Math.max(...atG)).toBeLessThan(along(b));
      expect(Math.max(...atB)).toBeGreaterThan(along(b));
    }
  });
});

describe('Fretboard overlays', () => {
  const box = [
    [0, 5], [0, 8], [1, 5], [1, 8],
  ].map(([string, fret]) => ({ string, fret }));

  it('dims an outline by its own flag or by dimmedGroups', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[]}
        outlines={[
          { group: '1', color: 'var(--e)', cells: box, dimmed: true },
          { group: '2', color: 'var(--d)', cells: box },
          { group: '3', color: 'var(--c)', cells: box },
        ]}
        dimmedGroups={['2']}
        ariaLabel="b"
      />,
    );
    expect(all(container, 'outline').map((o) => o.getAttribute('opacity'))).toEqual(['0.12', '0.12', '1']);
  });

  it('renders a single-colour dot as a plain filled circle', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[{ string: 2, fret: 5, label: 'R', color: 'var(--k0)', colors: ['var(--k3)'], variant: 'filled' }]}
        ariaLabel="b"
      />,
    );
    const dot = all(container, 'dot')[0];
    expect(dot.querySelectorAll('[data-role="slice"]')).toHaveLength(0);
    const circles = dot.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0].getAttribute('fill')).toBe('var(--k3)');
  });

  it('splits filled dots into slices and dashed dots into dashed arcs', () => {
    const colors = ['var(--k0)', 'var(--k1)'];
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[
          { string: 0, fret: 5, label: 'R', color: 'var(--k0)', colors, variant: 'filled' },
          { string: 1, fret: 5, label: '3', color: 'var(--k0)', colors, variant: 'outline' },
          { string: 2, fret: 5, label: 'b3', color: 'var(--k0)', colors, variant: 'dashed' },
          { string: 3, fret: 5, label: '5', color: 'var(--k0)', colors, variant: 'muted' },
        ]}
        ariaLabel="b"
      />,
    );
    const ds = all(container, 'dot');
    expect(ds.map((d) => d.querySelectorAll('[data-role="slice"]').length)).toEqual([2, 0, 0, 0]);
    expect(ds.map((d) => d.querySelectorAll('[data-role="arc"]').length)).toEqual([0, 0, 2, 0]);
  });

  it('draws a multi-colour dashed dot as one dashed arc per colour on a card fill', () => {
    const colors = ['var(--k2)', 'var(--k4)'];
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { container } = render(
        <Fretboard
          orientation={orientation}
          dots={[{ string: 5, fret: 1, label: 'b3', color: 'var(--k2)', colors, variant: 'dashed' }]}
          ariaLabel="b"
        />,
      );
      const dot = all(container, 'dot')[0];
      const body = dot.querySelector('circle:not([data-role="ring"])')!;
      expect(body.getAttribute('fill')).toBe('var(--card)');
      const [cx, cy] = [num(body, 'cx'), num(body, 'cy')];
      const arcs = Array.from(dot.querySelectorAll('[data-role="arc"]'));
      expect(arcs.map((a) => a.getAttribute('stroke'))).toEqual(colors);
      for (const a of arcs) {
        expect(a.getAttribute('fill')).toBe('none');
        expect(a.getAttribute('stroke-dasharray')).toBe('3 2');
      }
      // Same split as the filled pie: halves from 12 o'clock, clockwise, on the dot radius.
      const ends = arcs.map((a) => {
        const m = a.getAttribute('d')!.match(/^M([-\d.]+),([-\d.]+) A([\d.]+),\3 0 0 1 ([-\d.]+),([-\d.]+)$/);
        expect(m).not.toBeNull();
        return m!.slice(1).map(Number);
      });
      const [[x0, y0, r, x1, y1], [x2, y2, , x3, y3]] = ends;
      expect(r).toBe(num(body, 'r'));
      expect([x0, y0]).toEqual([cx, cy - r]);
      expect([x1, y1]).toEqual([cx, cy + r]);
      expect([x2, y2]).toEqual([x1, y1]);
      expect([x3, y3]).toEqual([x0, y0]);
      expect(dot.querySelector('text')!.getAttribute('fill')).toBe('var(--k2)');
    }
  });

  it('keeps a single-colour dashed dot a plain dashed circle', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[{ string: 2, fret: 6, label: 'b3', color: 'var(--k2)', colors: ['var(--k2)'], variant: 'dashed' }]}
        ariaLabel="b"
      />,
    );
    const dot = all(container, 'dot')[0];
    expect(dot.querySelectorAll('[data-role="arc"], [data-role="slice"]')).toHaveLength(0);
    const circles = dot.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0].getAttribute('fill')).toBe('var(--card)');
    expect(circles[0].getAttribute('stroke')).toBe('var(--k2)');
    expect(circles[0].getAttribute('stroke-dasharray')).toBe('3 2');
  });

  it('fills a dashed dot with the card colour and labels it in the dot colour', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[{ string: 2, fret: 6, label: 'b3', color: 'var(--k2)', variant: 'dashed' }]}
        ariaLabel="b"
      />,
    );
    const dot = all(container, 'dot')[0];
    expect(dot.querySelector('circle')!.getAttribute('fill')).toBe('var(--card)');
    expect(dot.querySelector('text')!.getAttribute('fill')).toBe('var(--k2)');
  });

  it('strokes the root ring in the foreground colour', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[{ string: 0, fret: 5, label: 'R', color: 'var(--muted)', variant: 'outline', ring: true }]}
        ariaLabel="b"
      />,
    );
    expect(container.querySelector('[data-role="ring"]')!.getAttribute('stroke')).toBe('var(--fg)');
  });

  it('steps the outline low-fret side string by string', () => {
    // Lowest fret per string: e 5, B 6, G 7, D 4.
    const cells = [
      [0, 5], [0, 8], [1, 6], [1, 8], [2, 7], [2, 9], [3, 4], [3, 7],
    ].map(([string, fret]) => ({ string, fret }));
    const lows = [5, 6, 7, 4];
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { container } = render(
        <Fretboard
          orientation={orientation}
          dots={cells.map((c) => ({ ...c, label: '', color: 'var(--c)', variant: 'outline' as const }))}
          outlines={[{ group: '1', color: 'var(--c)', cells }]}
          ariaLabel="b"
        />,
      );
      const pts = all(container, 'outline')[0]
        .getAttribute('points')!
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map(Number));
      const h = orientation === 'horizontal';
      const dotAt = (string: number, fret: number) =>
        all(container, 'dot')
          .find((d) => d.getAttribute('data-string') === String(string) && d.getAttribute('data-fret') === String(fret))!
          .querySelector('circle')!;
      const along = (c: Element) => num(c, h ? 'cx' : 'cy');
      const across = (c: Element) => num(c, h ? 'cy' : 'cx');
      // Low-fret edge on each string's line, measured from the lowest dot on that string.
      const offsets = lows.map((lo, s) => {
        const d = dotAt(s, lo);
        const edge = Math.min(...pts.filter((p) => (h ? p[1] : p[0]) === across(d)).map((p) => (h ? p[0] : p[1])));
        return along(d) - edge;
      });
      // The edge follows every string's own lowest note by the same padding.
      expect(offsets[0]).toBeGreaterThan(0);
      for (const o of offsets) expect(o).toBeCloseTo(offsets[0], 1);
    }
  });

  it('draws nothing for an outline without cells', () => {
    const { container } = render(
      <Fretboard
        orientation="horizontal"
        dots={[]}
        outlines={[{ group: '1', color: 'var(--c)', cells: [] }]}
        ariaLabel="b"
      />,
    );
    expect(all(container, 'outline')).toHaveLength(0);
    expect(container.querySelectorAll('polygon')).toHaveLength(0);
  });
});
