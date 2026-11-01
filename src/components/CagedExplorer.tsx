import { useState } from 'preact/hooks';
import { format, type Dict, type Lang } from '../i18n';
import { KEYS, SHAPES, chordTones, role, shapeSummary, voicings, type ShapeKey, type Voicing } from '../lib/music/caged';
import type { Key, Quality } from '../lib/music/keys';
import { TUNING, semitonesFromRoot, type PitchClass } from '../lib/music/notes';
import { hitsAtFret, isShown, toggleGroup } from '../lib/selection';
import { Fretboard, type FretBand, type FretDot } from './Fretboard';

export interface CagedExplorerProps {
  lang: Lang;
  /** The `caged` dictionary section; plain strings only, so it serialises as an island prop. */
  t: Dict['caged'];
}

const MAX_FRET = 15;
const DIM = '0.12';
// Shape keys and colours are the same in both qualities.
const SHAPE_LIST = SHAPES.major;
const SHAPE_KEYS = SHAPE_LIST.map((s) => s.key);
const cssVar = (name: string) => `var(${name})`;
const lowest = (v: Voicing) => Math.min(...v.frets.filter((f): f is number => f != null));

const VARIANT = { R: 'filled', '3': 'outline', b3: 'outline', '5': 'muted' } as const;
const QUALITIES: readonly Quality[] = ['minor', 'major'];
/** Shapes too stretched to fret in full; their tiles carry a note. */
const HARD_SHAPES: Record<Quality, readonly ShapeKey[]> = { major: [], minor: ['C', 'G'] };

interface Chord {
  key: ShapeKey;
  pc: PitchClass;
  /** The chord as a key: its root plus the selected quality. */
  k: Key;
  tones: string;
  /** Every voicing on the board, sorted by lowest fret (board order). */
  all: Voicing[];
  /** Main voicings (no +12 copies), sorted by lowest fret. */
  main: Voicing[];
  dots: FretDot[];
  bands: FretBand[];
}

function buildChords(t: Dict['caged'], quality: Quality): Chord[] {
  return KEYS.map(({ key, pc }) => {
    const k: Key = { root: pc, quality };
    // Template order (C A G E D, each +12 copy right after its shape): later dots draw on top,
    // so shared notes show the same colour as the mockup.
    const drawn = voicings(k, MAX_FRET);
    const all = [...drawn].sort((a, b) => lowest(a) - lowest(b));
    const dots = drawn.flatMap((v) =>
      v.frets.flatMap((fret, string): FretDot[] => {
        if (fret == null) return [];
        const r = role(semitonesFromRoot(TUNING[string].pc, fret, pc), k.quality);
        if (!r) return [];
        return [{ string, fret, label: r, color: cssVar(v.color), variant: VARIANT[r], group: v.shape }];
      }),
    );
    const bands = all.map((v) => {
      const s = shapeSummary(v, k);
      return { from: s.lo, to: s.hi, color: cssVar(v.color), label: format(t.band, { shape: v.shape }), group: v.shape };
    });
    return { key, pc, k, tones: chordTones(k).join(' · '), all, main: all.filter((v) => !v.copy), dots, bands };
  });
}

export function CagedExplorer({ t }: CagedExplorerProps) {
  const [selKey, setSelKey] = useState<ShapeKey | null>(null);
  const [shapes, setShapes] = useState<ReadonlySet<ShapeKey>>(new Set());
  const [quality, setQuality] = useState<Quality>('major');
  const minor = quality === 'minor';
  const chords = buildChords(t, quality);
  const dimmed = SHAPE_KEYS.filter((k) => !isShown(shapes, k));
  const toggleShapes = (group: readonly ShapeKey[]) => setShapes(toggleGroup(shapes, group, SHAPE_KEYS));
  // A board click hits every shape whose band on that card covers the column; +12 copies count too.
  const onFretClick = (c: Chord) => (fret: number) =>
    toggleShapes(hitsAtFret(c.bands.map((b) => ({ id: b.group as ShapeKey, from: b.from, to: b.to })), fret));
  // Band groups are shape keys.
  const onBandClick = (group: string) => {
    if ((SHAPE_KEYS as readonly string[]).includes(group)) toggleShapes([group as ShapeKey]);
  };
  const shapeColor = Object.fromEntries(SHAPE_LIST.map((s) => [s.key, cssVar(s.color)])) as Record<ShapeKey, string>;

  const chip = (label: string, pressed: boolean, onClick: () => void, color?: string) => (
    <button
      type="button"
      aria-pressed={pressed ? 'true' : 'false'}
      style={color ? { '--sc': color } : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div class="caged">
      <div class="controls">
        <div class="chips" role="group" aria-label={t.chordGroupAria}>
          <span class="lbl">{t.chordLabel}</span>
          {chip(t.all, selKey === null, () => setSelKey(null))}
          {KEYS.map(({ key }) => chip(key, selKey === key, () => setSelKey(key)))}
        </div>
        <div class="chips" role="group" aria-label={t.shapeGroupAria}>
          <span class="lbl">{t.shapeLabel}</span>
          {chip(t.all, shapes.size === 0, () => setShapes(new Set()))}
          {SHAPE_LIST.map((s) => chip(s.key, shapes.has(s.key), () => toggleShapes([s.key]), cssVar(s.color)))}
        </div>
        <div class="chips" role="group" aria-label={t.quality.groupAria}>
          <span class="lbl">{t.quality.label}</span>
          {QUALITIES.map((q) => chip(t.quality[q], quality === q, () => setQuality(q)))}
        </div>
      </div>

      <div class="legend">
        <span><i class="dot dot--root" />{t.legend.root}</span>
        <span><i class="dot dot--third" />{minor ? t.legend.thirdMinor : t.legend.third}</span>
        <span><i class="dot dot--fifth" />{t.legend.fifth}</span>
      </div>

      {chords.map((c) => (
        <section class="card" data-key={c.key} hidden={selKey !== null && selKey !== c.key} key={c.key}>
          <h2>
            {format(minor ? t.chordHeadingMinor : t.chordHeading, { key: c.key })} <small>{t.tones} {c.tones}</small>
          </h2>
          <p class="order">
            {t.order}{' '}
            {c.main.map((v) => (
              <>
                <b style={{ color: shapeColor[v.shape] }}>{v.shape}</b>
                {' → '}
              </>
            ))}
            <b style={{ color: shapeColor[c.main[0].shape] }}>{c.main[0].shape}</b> {t.orderRepeat}
          </p>
          {(['horizontal', 'vertical'] as const).map((orientation) => (
            <div
              class={`board scroll board--${orientation[0]}`}
              tabIndex={0}
              role="region"
              aria-label={format(minor ? t.boardRegionAriaMinor : t.boardRegionAria, { key: c.key })}
            >
              <Fretboard
                orientation={orientation}
                frets={MAX_FRET}
                dots={c.dots}
                bands={c.bands}
                dimmedGroups={dimmed}
                onFretClick={onFretClick(c)}
                onBandClick={onBandClick}
                ariaLabel={format(minor ? t.boardAriaMinor : t.boardAria, { key: c.key, max: MAX_FRET })}
              />
            </div>
          ))}
          <div class="shapes">
            {c.main.map((v) => {
              const s = shapeSummary(v, c.k);
              return (
                <div
                  class="shape-card n"
                  data-shape={v.shape}
                  style={{ '--sc': shapeColor[v.shape], opacity: isShown(shapes, v.shape) ? '1' : DIM }}
                >
                  <h4>
                    {v.shape} · {format(t.tileFrets, { from: s.lo, to: s.hi })}
                  </h4>
                  <p>
                    {t.tileGrip} {s.grip}
                    <br />
                    {t.tileRoot} {s.roots.join(', ')}
                  </p>
                  {HARD_SHAPES[quality].includes(v.shape) && <p class="hard">{t.hardShape}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
