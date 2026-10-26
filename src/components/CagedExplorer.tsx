import { useState } from 'preact/hooks';
import { format, type Dict, type Lang } from '../i18n';
import { KEYS, SHAPES, chordTones, role, shapeSummary, voicings, type ShapeKey, type Voicing } from '../lib/music/caged';
import { TUNING, semitonesFromRoot, type PitchClass } from '../lib/music/notes';
import { Fretboard, type FretBand, type FretDot } from './Fretboard';

export interface CagedExplorerProps {
  lang: Lang;
  /** The `caged` dictionary section; plain strings only, so it serialises as an island prop. */
  t: Dict['caged'];
}

const MAX_FRET = 15;
const DIM = '0.12';
const SHAPE_KEYS = SHAPES.map((s) => s.key);
const cssVar = (name: string) => `var(${name})`;
const lowest = (v: Voicing) => Math.min(...v.frets.filter((f): f is number => f != null));

const VARIANT = { R: 'filled', '3': 'outline', '5': 'muted' } as const;

interface Chord {
  key: ShapeKey;
  pc: PitchClass;
  tones: string;
  /** Every voicing on the board, sorted by lowest fret (board order). */
  all: Voicing[];
  /** Main voicings (no +12 copies), sorted by lowest fret. */
  main: Voicing[];
  dots: FretDot[];
  bands: FretBand[];
}

function buildChords(t: Dict['caged']): Chord[] {
  return KEYS.map(({ key, pc }) => {
    const all = [...voicings(pc, MAX_FRET)].sort((a, b) => lowest(a) - lowest(b));
    const dots = all.flatMap((v) =>
      v.frets.flatMap((fret, string): FretDot[] => {
        if (fret == null) return [];
        const r = role(semitonesFromRoot(TUNING[string].pc, fret, pc));
        if (!r) return [];
        return [{ string, fret, label: r, color: cssVar(v.color), variant: VARIANT[r], group: v.shape }];
      }),
    );
    const bands = all.map((v) => {
      const s = shapeSummary(v, pc);
      return { from: s.lo, to: s.hi, color: cssVar(v.color), label: format(t.band, { shape: v.shape }), group: v.shape };
    });
    return { key, pc, tones: chordTones(pc).join(' · '), all, main: all.filter((v) => !v.copy), dots, bands };
  });
}

export function CagedExplorer({ t }: CagedExplorerProps) {
  const [selKey, setSelKey] = useState<ShapeKey | null>(null);
  const [selShape, setSelShape] = useState<ShapeKey | null>(null);
  const chords = buildChords(t);
  const dimmed = selShape ? SHAPE_KEYS.filter((k) => k !== selShape) : [];
  const shapeColor = Object.fromEntries(SHAPES.map((s) => [s.key, cssVar(s.color)])) as Record<ShapeKey, string>;

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
          {chip(t.all, selShape === null, () => setSelShape(null))}
          {SHAPES.map((s) => chip(s.key, selShape === s.key, () => setSelShape(s.key), cssVar(s.color)))}
        </div>
      </div>

      <div class="legend">
        <span><i class="dot dot--root" />{t.legend.root}</span>
        <span><i class="dot dot--third" />{t.legend.third}</span>
        <span><i class="dot dot--fifth" />{t.legend.fifth}</span>
      </div>

      {chords.map((c) => (
        <section class="card" data-key={c.key} hidden={selKey !== null && selKey !== c.key} key={c.key}>
          <h2>
            {format(t.chordHeading, { key: c.key })} <small>{t.tones} {c.tones}</small>
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
              aria-label={format(t.boardRegionAria, { key: c.key })}
            >
              <Fretboard
                orientation={orientation}
                frets={MAX_FRET}
                dots={c.dots}
                bands={c.bands}
                dimmedGroups={dimmed}
                ariaLabel={format(t.boardAria, { key: c.key, max: MAX_FRET })}
              />
            </div>
          ))}
          <div class="shapes">
            {c.main.map((v) => {
              const s = shapeSummary(v, c.pc);
              return (
                <div
                  class="shape-card n"
                  data-shape={v.shape}
                  style={{ '--sc': shapeColor[v.shape], opacity: selShape && selShape !== v.shape ? DIM : '1' }}
                >
                  <h4>
                    {v.shape} · {format(t.tileFrets, { from: s.lo, to: s.hi })}
                  </h4>
                  <p>
                    {t.tileGrip} {s.grip}
                    <br />
                    {t.tileRoot} {s.roots.join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
