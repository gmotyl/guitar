import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/preact';
import { Fretboard, type FretDot, type FretBand } from '../Fretboard';
import { boxes } from '../../lib/music/scales';

const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
const all = (c: Element, role: string) => Array.from(c.querySelectorAll(`[data-role="${role}"]`));
/** Along-the-neck positions where a polygon crosses the string line at `across`. */
const crossings = (pts: number[][], across: number, h: boolean) =>
  pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const [pa, pc] = h ? [p[0], p[1]] : [p[1], p[0]];
    const [qa, qc] = h ? [q[0], q[1]] : [q[1], q[0]];
    if (pc === qc || (across - pc) * (across - qc) > 0) return [];
    return [pa + ((across - pc) / (qc - pc)) * (qa - pa)];
  });

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
      // Stepped, not a plain rectangle.
      expect(pts.length).toBeGreaterThan(4);
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
      const atG = crossings(pts, across(g), orientation === 'horizontal');
      const atB = crossings(pts, across(b), orientation === 'horizontal');
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
      // Low-fret edge where it crosses each string's line.
      const edges = lows.map((lo, s) => Math.min(...crossings(pts, across(dotAt(s, lo)), h)));
      // The edge stays at least the padding before every string's own lowest note...
      lows.forEach((lo, s) => expect(along(dotAt(s, lo)) - edges[s]).toBeGreaterThanOrEqual(18));
      // ...and steps with them: e 5 → B 6 move in, D 4 juts out past e and G.
      // (G's crossing is set by the steep G 7 → D 4 edge, so it is not ordered vs B.)
      expect(edges[1]).toBeGreaterThan(edges[0]);
      expect(edges[3]).toBeLessThan(edges[0]);
      expect(edges[3]).toBeLessThan(edges[2]);
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

describe('Fretboard outline clearance', () => {
  type P = [number, number];
  /** Distance from p to segment ab. */
  const segDist = ([px, py]: P, [ax, ay]: P, [bx, by]: P) => {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  /** Even-odd point-in-polygon. */
  const inside = ([px, py]: P, poly: P[]) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const MARGIN = 3;
  const PAD = 18;

  for (const [name, key] of [
    ['A minor', { root: 9, quality: 'minor' }],
    ['C major', { root: 0, quality: 'major' }],
  ] as const) {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      it(`keeps every box dot clear of its outline edges: ${name}, ${orientation}`, () => {
        for (const b of boxes(key, 15)) {
          const { container, unmount } = render(
            <Fretboard
              orientation={orientation}
              dots={b.cells.map((c) => ({ ...c, label: '', color: 'var(--c)', variant: 'outline' as const }))}
              outlines={[{ group: `box-${b.n}`, color: 'var(--c)', cells: b.cells }]}
              ariaLabel="b"
            />,
          );
          const poly = all(container, 'outline')[0]
            .getAttribute('points')!
            .trim()
            .split(/\s+/)
            .map((p) => p.split(',').map(Number) as P);
          for (const d of all(container, 'dot')) {
            const c = d.querySelector('circle')!;
            const centre: P = [num(c, 'cx'), num(c, 'cy')];
            const where = `box ${b.n} dot ${d.getAttribute('data-string')}:${d.getAttribute('data-fret')}`;
            expect(inside(centre, poly), where).toBe(true);
            const clearance = Math.min(...poly.map((a, i) => segDist(centre, a, poly[(i + 1) % poly.length])));
            expect(clearance, where).toBeGreaterThanOrEqual(num(c, 'r') + MARGIN);
          }
          // ...without mitre spikes: the outline hugs the dots' bounding box by about the padding.
          const cs = all(container, 'dot').map((d) => d.querySelector('circle')!);
          for (const [axis, i] of [['cx', 0], ['cy', 1]] as const) {
            const vs = cs.map((c) => num(c, axis));
            const ps = poly.map((p) => p[i]);
            expect(Math.min(...vs) - Math.min(...ps), `box ${b.n} ${axis} low`).toBeLessThanOrEqual(PAD + 0.5);
            expect(Math.max(...ps) - Math.max(...vs), `box ${b.n} ${axis} high`).toBeLessThanOrEqual(PAD + 0.5);
          }
          unmount();
        }
      });
    }
  }
});
