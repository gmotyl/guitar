import { TUNING } from '../lib/music/notes';

export interface FretDot {
  string: number /* 0 = high e */;
  fret: number;
  label: string;
  color: string;
  /** `dashed`: a chord tone outside the scale — dashed ring, no fill colour. */
  variant: 'filled' | 'outline' | 'muted' | 'dashed';
  group?: string;
  /**
   * Two or more colours split a filled dot into equal pie slices, and a dashed
   * dot into equal dashed arcs, one per colour.
   */
  colors?: string[];
  /** Extra ring around the dot (the scale root). */
  ring?: boolean;
  /** Dims this dot alone, independently of `dimmedGroups`. */
  dimmed?: boolean;
}
export interface FretBand {
  from: number;
  to: number;
  color: string;
  label: string;
  group?: string;
  /** Dims this band alone, independently of `dimmedGroups`. */
  dimmed?: boolean;
}
/** Stepped hull drawn around a set of cells (a pentatonic box). */
export interface FretOutline {
  group: string;
  color: string;
  cells: { string: number; fret: number }[];
  dimmed?: boolean;
}
export interface FretboardProps {
  orientation: 'horizontal' | 'vertical';
  frets?: number /* 15 */;
  dots: FretDot[];
  bands?: FretBand[];
  dimmedGroups?: string[];
  outlines?: FretOutline[];
  ariaLabel: string;
}

const MARKERS = [3, 5, 7, 9, 12, 15];
const DIM = 0.12;
const DOT_DIM = 0.15;
const DOT_R = 11.5;
const RING_R = 14;
/** Outline padding around the outermost dot centres, along and across. */
const PAD = 18;
const STRINGS = TUNING.length; // 6

/**
 * Board geometry expressed along two axes: `along` runs with the frets
 * (nut → body), `across` runs over the strings (high e → low E).
 * Horizontal maps along→x, across→y (high e on top, as in the mockup).
 * Vertical maps along→y (nut on top), across→x mirrored so low E is left.
 */
interface Geometry {
  width: number;
  height: number;
  /** Position of fret line f (0 = nut) along the neck. */
  fretAt: (f: number) => number;
  /** Centre of fret cell f along the neck (f = 0 is the open-string slot). */
  cellAt: (f: number) => number;
  /** Position of string i (0 = high e) across the neck. */
  stringAt: (i: number) => number;
  /** Neck edges across (wood rect bounds). */
  acrossLo: number;
  acrossHi: number;
  /** Where open strings start along the neck. */
  openStart: number;
  /** Map (along, across) to SVG (x, y). */
  xy: (along: number, across: number) => [number, number];
  /** Position of the fret-number labels across the neck. */
  fretNumberAcross: number;
  /** Position of the string labels along the neck. */
  stringLabelAlong: number;
  /** Band lane position (outside the neck) for lane 0/1. */
  bandLane: (lane: number) => number;
}

function geometry(orientation: FretboardProps['orientation'], frets: number): Geometry {
  if (orientation === 'horizontal') {
    // Mirrors board() from the mockup.
    const L = 26, T = 44, fw = 46, sg = 28, openW = 34, x0 = L + openW;
    return {
      width: x0 + fw * frets + 12,
      height: T + sg * 5 + 34,
      fretAt: (f) => x0 + fw * f,
      cellAt: (f) => (f === 0 ? L + openW / 2 : x0 + fw * (f - 0.5)),
      stringAt: (i) => T + sg * i,
      acrossLo: T - 10,
      acrossHi: T + sg * 5 + 10,
      openStart: L + openW / 2,
      xy: (a, c) => [a, c],
      fretNumberAcross: T + sg * 5 + 28,
      stringLabelAlong: 10,
      bandLane: (lane) => (lane % 2 ? 12 : 26),
    };
  }
  // Vertical: nut on top, strings low E (left) → high e (right).
  // Sized for a ~360px phone column: string gap narrower than fret gap.
  const L = 34, T = 30, sg = 46, fh = 42, openH = 34, y0 = T + openH, right = 50;
  const lowEx = L + 10;
  return {
    width: lowEx + sg * 5 + right,
    height: y0 + fh * frets + 14,
    fretAt: (f) => y0 + fh * f,
    cellAt: (f) => (f === 0 ? T + openH / 2 : y0 + fh * (f - 0.5)),
    stringAt: (i) => lowEx + sg * (STRINGS - 1 - i),
    acrossLo: lowEx - 14,
    acrossHi: lowEx + sg * 5 + 14,
    openStart: T + openH / 2,
    xy: (a, c) => [c, a],
    fretNumberAcross: 14,
    stringLabelAlong: 16,
    bandLane: (lane) => lowEx + sg * 5 + (lane % 2 ? 34 : 22),
  };
}

const opacityFor = (group: string | undefined, dimmed: string[]) =>
  group !== undefined && dimmed.includes(group) ? DIM : 1;

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Stepped hull around a box: the polygon through the per-string min/max dot
 * centres (down the low-fret side string by string, back up the high-fret
 * side), grown outward by PAD with every edge kept parallel to its hull edge.
 * Each edge thus stays PAD away from the dots it wraps, diagonal steps
 * included, so no dot pokes through. Built in (along, across) so both
 * orientations share it.
 */
function outlinePoints(g: Geometry, cells: FretOutline['cells']): string {
  type P = [number, number];
  const strings = [...new Set(cells.map((c) => c.string))].sort((a, b) => a - b);
  const span = strings.map((s) => {
    const fs = cells.filter((c) => c.string === s).map((c) => g.cellAt(c.fret));
    return { across: g.stringAt(s), lo: Math.min(...fs), hi: Math.max(...fs) };
  });
  const out = (pts: P[]) => pts.map(([a, c]) => g.xy(a, c).map(r2).join(',')).join(' ');
  const cross = (u: P, v: P) => u[0] * v[1] - u[1] * v[0];

  // Hull through the dot centres, without repeated or collinear vertices.
  let hull: P[] = [...span.map((s): P => [s.lo, s.across]), ...[...span].reverse().map((s): P => [s.hi, s.across])];
  hull = hull.filter((p, i) => {
    const q = hull[(i + hull.length - 1) % hull.length];
    return p[0] !== q[0] || p[1] !== q[1];
  });
  for (let changed = true; changed && hull.length > 2; ) {
    changed = false;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[(i + hull.length - 1) % hull.length], p = hull[i], b = hull[(i + 1) % hull.length];
      if (Math.abs(cross([p[0] - a[0], p[1] - a[1]], [b[0] - p[0], b[1] - p[1]])) < 1e-9) {
        hull.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  if (hull.length < 3) {
    // A single string (or a single cell): a plain padded rectangle.
    const first = span[0], last = span[span.length - 1];
    const lo = Math.min(...span.map((s) => s.lo)) - PAD, hi = Math.max(...span.map((s) => s.hi)) + PAD;
    const c0 = Math.min(first.across, last.across) - PAD, c1 = Math.max(first.across, last.across) + PAD;
    return out([[lo, c0], [lo, c1], [hi, c1], [hi, c0]]);
  }

  // Outward normal side follows the winding (sign of the shoelace area).
  const area = hull.reduce((sum, p, i) => sum + cross(p, hull[(i + 1) % hull.length]), 0);
  const side = Math.sign(area) || 1;
  const edges = hull.map((a, i) => {
    const b = hull[(i + 1) % hull.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u: P = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const n: P = [side * u[1], -side * u[0]];
    return { p: [a[0] + PAD * n[0], a[1] + PAD * n[1]] as P, u };
  });
  // Each vertex is where the offset lines of its two edges meet (mitre join).
  // A sharp convex corner (a diagonal side meeting an end) would spike far out,
  // so its mitre is cut square, PAD past the hull vertex along the axis the
  // spike runs on: the stepped ends of the mockup.
  const pts = edges.flatMap((e, i): P[] => {
    const prev = edges[(i + edges.length - 1) % edges.length];
    const turn = cross(prev.u, e.u);
    const t = cross([e.p[0] - prev.p[0], e.p[1] - prev.p[1]], e.u) / turn;
    const m: P = [prev.p[0] + t * prev.u[0], prev.p[1] + t * prev.u[1]];
    const v = hull[i];
    const over = [Math.abs(m[0] - v[0]) - PAD, Math.abs(m[1] - v[1]) - PAD];
    const k = over[0] >= over[1] ? 0 : 1;
    if (Math.sign(turn) !== side || over[k] < 0.01 || !prev.u[k] || !e.u[k]) return [m];
    const cap = v[k] + Math.sign(m[k] - v[k]) * PAD;
    const on = (l: { p: P; u: P }): P => {
      const s = (cap - l.p[k]) / l.u[k];
      return [l.p[0] + s * l.u[0], l.p[1] + s * l.u[1]];
    };
    return [on(prev), on(e)];
  });
  return out(pts);
}

/** Arc k of n on the dot rim around (x, y), clockwise from 12 o'clock. */
function arcPath(x: number, y: number, k: number, n: number): string {
  const a0 = -Math.PI / 2 + (k * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
  const p = (a: number) => `${r2(x + DOT_R * Math.cos(a))},${r2(y + DOT_R * Math.sin(a))}`;
  return `M${p(a0)} A${DOT_R},${DOT_R} 0 0 1 ${p(a1)}`;
}

/** Pie slice k of n around (x, y): the matching arc closed through the centre. */
function slicePath(x: number, y: number, k: number, n: number): string {
  return `M${r2(x)},${r2(y)} L${arcPath(x, y, k, n).slice(1)} Z`;
}

export function Fretboard({
  orientation,
  frets = 15,
  dots,
  bands = [],
  dimmedGroups = [],
  outlines = [],
  ariaLabel,
}: FretboardProps) {
  const g = geometry(orientation, frets);
  const vertical = orientation === 'vertical';
  const mid = (g.stringAt(0) + g.stringAt(STRINGS - 1)) / 2;
  const gap = Math.abs(g.stringAt(1) - g.stringAt(0));

  const line = (a1: number, a2: number, c1: number, c2: number) => {
    const [x1, y1] = g.xy(a1, c1);
    const [x2, y2] = g.xy(a2, c2);
    return { x1, y1, x2, y2 };
  };

  // Wood rect
  const [wx, wy] = g.xy(g.fretAt(0), g.acrossLo);
  const [ww, wh] = g.xy(g.fretAt(frets) - g.fretAt(0), g.acrossHi - g.acrossLo);

  const markers = MARKERS.filter((m) => m <= frets).flatMap((m) =>
    (m === 12 ? [mid - gap, mid + gap] : [mid]).map((c) => ({ m, c })),
  );

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${g.width} ${g.height}`}
      width="100%"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      data-orientation={orientation}
    >
      <rect x={wx} y={wy} width={ww} height={wh} rx={4} fill="var(--wood)" />
      {markers.map(({ m, c }, i) => {
        const [cx, cy] = g.xy(g.cellAt(m), c);
        return (
          <circle key={`m${i}`} data-role="marker" data-fret={m} cx={cx} cy={cy} r={5} fill="var(--fret)" opacity={0.5} />
        );
      })}
      {Array.from({ length: frets + 1 }, (_, f) => (
        <line
          key={`f${f}`}
          data-role={f ? 'fret' : 'nut'}
          {...line(g.fretAt(f), g.fretAt(f), g.acrossLo, g.acrossHi)}
          stroke={f ? 'var(--fret)' : 'var(--nut)'}
          stroke-width={f ? 2 : 5}
        />
      ))}
      {Array.from({ length: frets + 1 }, (_, f) => {
        const [x, y] = g.xy(g.cellAt(f), g.fretNumberAcross);
        return (
          <text
            key={`n${f}`}
            data-role="fret-number"
            x={x}
            y={vertical ? y + 4 : y}
            text-anchor="middle"
            font-size={12}
            fill="var(--muted)"
          >
            {f}
          </text>
        );
      })}
      {TUNING.map((s, i) => {
        const c = g.stringAt(i);
        const [lx, ly] = g.xy(g.stringLabelAlong, c);
        return (
          <g key={`s${i}`}>
            <line
              data-role="string"
              {...line(g.openStart, g.fretAt(frets), c, c)}
              stroke="var(--string)"
              stroke-width={1 + i * 0.35}
            />
            <text
              data-role="string-label"
              x={lx}
              y={vertical ? ly : ly + 4}
              text-anchor={vertical ? 'middle' : undefined}
              font-size={13}
              font-weight={600}
              fill="var(--muted)"
            >
              {s.label}
            </text>
          </g>
        );
      })}
      <g>
        {bands.map((b, i) => {
          const a = b.from === 0 ? g.openStart - 13 : g.fretAt(b.from - 1) + 3;
          const z = g.fretAt(b.to) - 3;
          const lane = g.bandLane(i);
          const [rx, ry] = g.xy(a, g.acrossLo - 4);
          const [rw, rh] = g.xy(z - a, g.acrossHi - g.acrossLo + 8);
          const [tx, ty] = g.xy((a + z) / 2, lane);
          return (
            <g key={`b${i}`} data-role="band" data-group={b.group} opacity={b.dimmed ? DIM : opacityFor(b.group, dimmedGroups)}>
              <rect x={rx} y={ry} width={rw} height={rh} rx={8} fill={b.color} opacity={0.1} />
              <line {...line(a, z, lane, lane)} stroke={b.color} stroke-width={3} stroke-linecap="round" />
              <text
                x={vertical ? tx + 4 : tx}
                y={vertical ? ty : ty - 4}
                text-anchor="middle"
                font-size={12}
                font-weight={700}
                fill={b.color}
                transform={vertical ? `rotate(90 ${tx + 4} ${ty})` : undefined}
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </g>
      {outlines.length > 0 && (
        <g>
          {outlines.filter((o) => o.cells.length > 0).map((o, i) => (
            <polygon
              key={`o${i}`}
              data-role="outline"
              data-group={o.group}
              points={outlinePoints(g, o.cells)}
              fill={o.color}
              fill-opacity={0.07}
              stroke={o.color}
              stroke-width={2.2}
              stroke-linejoin="round"
              opacity={o.dimmed ? DIM : opacityFor(o.group, dimmedGroups)}
            />
          ))}
        </g>
      )}
      <g>
        {dots.map((d, i) => {
          const [x, y] = g.xy(g.cellAt(d.fret), g.stringAt(d.string));
          const fill =
            d.variant === 'filled'
              ? d.color
              : d.variant === 'outline' || d.variant === 'dashed'
                ? 'var(--card)'
                : 'var(--muted)';
          const multi = d.colors !== undefined && d.colors.length > 1;
          const split = d.variant === 'filled' && multi;
          const arcs = d.variant === 'dashed' && multi;
          return (
            <g
              key={`d${i}`}
              data-role="dot"
              data-group={d.group}
              data-string={d.string}
              data-fret={d.fret}
              opacity={d.dimmed ? DOT_DIM : opacityFor(d.group, dimmedGroups)}
            >
              {split ? (
                d.colors!.map((c, k) => (
                  <path key={`p${k}`} data-role="slice" d={slicePath(x, y, k, d.colors!.length)} fill={c} />
                ))
              ) : arcs ? (
                <>
                  <circle cx={x} cy={y} r={DOT_R} fill={fill} />
                  {d.colors!.map((c, k) => (
                    <path
                      key={`a${k}`}
                      data-role="arc"
                      d={arcPath(x, y, k, d.colors!.length)}
                      fill="none"
                      stroke={c}
                      stroke-width={2.5}
                      stroke-dasharray="3 2"
                    />
                  ))}
                </>
              ) : (
                <circle
                  cx={x}
                  cy={y}
                  r={DOT_R}
                  fill={d.variant === 'filled' && d.colors?.length === 1 ? d.colors[0] : fill}
                  stroke={d.color}
                  stroke-width={2.5}
                  stroke-dasharray={d.variant === 'dashed' ? '3 2' : undefined}
                />
              )}
              {d.ring && (
                <circle data-role="ring" cx={x} cy={y} r={RING_R} fill="none" stroke="var(--fg)" stroke-width={2} />
              )}
              <text
                x={x}
                y={y + 4}
                text-anchor="middle"
                font-size={11}
                font-weight={700}
                fill={d.variant === 'outline' ? 'var(--fg)' : d.variant === 'dashed' ? d.color : 'var(--on)'}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
