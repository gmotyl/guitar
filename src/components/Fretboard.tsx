import { TUNING } from '../lib/music/notes';

export interface FretDot {
  string: number /* 0 = high e */;
  fret: number;
  label: string;
  color: string;
  variant: 'filled' | 'outline' | 'muted';
  group?: string;
}
export interface FretBand {
  from: number;
  to: number;
  color: string;
  label: string;
  group?: string;
}
export interface FretboardProps {
  orientation: 'horizontal' | 'vertical';
  frets?: number /* 15 */;
  dots: FretDot[];
  bands?: FretBand[];
  dimmedGroups?: string[];
  ariaLabel: string;
}

const MARKERS = [3, 5, 7, 9, 12, 15];
const DIM = 0.12;
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

export function Fretboard({ orientation, frets = 15, dots, bands = [], dimmedGroups = [], ariaLabel }: FretboardProps) {
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
            <g key={`b${i}`} data-role="band" data-group={b.group} opacity={opacityFor(b.group, dimmedGroups)}>
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
      <g>
        {dots.map((d, i) => {
          const [x, y] = g.xy(g.cellAt(d.fret), g.stringAt(d.string));
          const fill = d.variant === 'filled' ? d.color : d.variant === 'outline' ? 'var(--card)' : 'var(--muted)';
          return (
            <g key={`d${i}`} data-role="dot" data-group={d.group} opacity={opacityFor(d.group, dimmedGroups)}>
              <circle cx={x} cy={y} r={11.5} fill={fill} stroke={d.color} stroke-width={2.5} />
              <text
                x={x}
                y={y + 4}
                text-anchor="middle"
                font-size={11}
                font-weight={700}
                fill={d.variant === 'outline' ? 'var(--fg)' : 'var(--on)'}
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
