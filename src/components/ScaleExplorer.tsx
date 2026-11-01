import { useState } from 'preact/hooks';
import { format, type Dict, type Lang } from '../i18n';
import { buildBoard, type ExplorerState } from '../lib/music/board';
import { SHAPES } from '../lib/music/caged';
import { chordName, keyChords, relativeKey, rootLabel, type Key, type Quality } from '../lib/music/keys';
import { noteName, type PitchClass } from '../lib/music/notes';
import { PENTATONIC, type Box, type Scale } from '../lib/music/scales';
import { hitsAtFret, toggleGroup } from '../lib/selection';
import { Fretboard } from './Fretboard';

export interface ScaleExplorerProps {
  lang: Lang;
  /** The `pentatonic` dictionary section; plain strings only, so it serialises as an island prop. */
  t: Dict['pentatonic'];
  /** Scale id; a string so it serialises as an island prop. */
  scale: Scale['id'];
}

const SCALES: Record<Scale['id'], Scale> = { pentatonic: PENTATONIC };
const MAX_FRET = 15;
const ROOTS: readonly PitchClass[] = Array.from({ length: 12 }, (_, pc) => pc);
const QUALITIES: readonly Quality[] = ['minor', 'major'];
const BOX_NUMBERS = [1, 2, 3, 4, 5] as const;
type BoxN = (typeof BOX_NUMBERS)[number];
/** CAGED shape held by box 1..5 (same order as `boxes()`). */
const BOX_SHAPES = ['E', 'D', 'C', 'A', 'G'] as const;
const cssVar = (name: string) => `var(${name})`;
const shapeColor = (shape: Box['shape']) => cssVar(SHAPES.minor.find((s) => s.key === shape)!.color);

export function ScaleExplorer({ t, scale: scaleId }: ScaleExplorerProps) {
  const scale = SCALES[scaleId];
  const [root, setRoot] = useState<PitchClass>(9);
  const [quality, setQualityState] = useState<Quality>('minor');
  const [boxes, setBoxes] = useState<ExplorerState['boxes']>(new Set());
  const [chords, setChords] = useState<ReadonlySet<number>>(new Set());

  const key: Key = { root, quality };
  const keyLabel = (k: Key) => format(t.keyName, { note: noteName(k.root, k), quality: t.quality[k.quality] });
  const board = buildBoard({ scale, key, boxes, chords });
  const kc = keyChords(key);
  const picked = kc.filter((c) => chords.has(c.index));

  // Switching minor/major changes every key chord, so the selection is dropped.
  const setQuality = (q: Quality) => {
    setQualityState(q);
    setChords(new Set());
  };
  const toggleChord = (index: number) => {
    const next = new Set(chords);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setChords(next);
  };
  const toggleBoxes = (group: readonly BoxN[]) => setBoxes(toggleGroup(boxes, group, BOX_NUMBERS));
  // A board click hits every Box whose fret range covers the column; +12 copies count too.
  const ranges = board.boxes.map((b) => ({ id: b.n, from: b.from, to: b.to }));
  const onFretClick = (fret: number) => toggleBoxes(hitsAtFret(ranges, fret));
  // Band groups are `box-<n>`.
  const onBandClick = (group: string) => {
    const n = Number(group.replace('box-', ''));
    if ((BOX_NUMBERS as readonly number[]).includes(n)) toggleBoxes([n as BoxN]);
  };

  const chip = (label: string, pressed: boolean | null, onClick: () => void, color?: string, cls?: string) => (
    <button
      type="button"
      class={cls}
      aria-pressed={pressed === null ? undefined : pressed ? 'true' : 'false'}
      style={color ? { '--sc': color } : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );

  // The relative-key line keeps the related key bold, as in the mockup.
  const [relBefore, relAfter] = t.relative.split('{rel}');
  const name = keyLabel(key);

  // Tiles: one per box in fret order, listing every placement (main and +12 copy).
  const tiles = board.boxes
    .filter((b) => !b.copy)
    .map((b) => ({ ...b, ranges: board.boxes.filter((o) => o.n === b.n).map((o) => `${o.from}–${o.to}`).join(', ') }));

  return (
    <div class="scale">
      <div class="controls">
        <div class="chips" role="group" aria-label={t.rootGroupAria}>
          <span class="lbl">{t.rootLabel}</span>
          {ROOTS.map((pc) => chip(rootLabel(pc), root === pc, () => setRoot(pc)))}
        </div>
        <div class="chips" role="group" aria-label={t.quality.groupAria}>
          <span class="lbl">{t.quality.label}</span>
          {QUALITIES.map((q) => chip(t.quality[q], quality === q, () => setQuality(q)))}
        </div>
        <div class="chips" role="group" aria-label={t.boxGroupAria}>
          <span class="lbl">{t.boxLabel}</span>
          {chip(t.all, boxes.size === 0, () => setBoxes(new Set()))}
          {BOX_NUMBERS.map((n) => chip(String(n), boxes.has(n), () => toggleBoxes([n]), shapeColor(BOX_SHAPES[n - 1])))}
        </div>
        <div class="chips" role="group" aria-label={t.chordGroupAria}>
          <span class="lbl">{t.chordLabel}</span>
          {kc.map((c) =>
            chip(`${c.degree} · ${chordName(c, key)}`, chords.has(c.index), () => toggleChord(c.index), cssVar(`--k${c.index}`), 'chord'),
          )}
          {chip(t.clear, null, () => setChords(new Set()))}
        </div>
      </div>

      <p class="rel">
        {format(relBefore, { key: name })}
        <b>{keyLabel(relativeKey(key))}</b>
        {format(relAfter ?? '', { key: name })}
      </p>

      {(['horizontal', 'vertical'] as const).map((orientation) => (
        <div
          class={`board scroll board--${orientation[0]}`}
          tabIndex={0}
          role="region"
          aria-label={format(t.boardRegionAria, { key: name })}
        >
          <Fretboard
            orientation={orientation}
            frets={MAX_FRET}
            dots={board.dots}
            bands={board.bands}
            outlines={board.outlines}
            onFretClick={onFretClick}
            onBandClick={onBandClick}
            ariaLabel={format(t.boardAria, { key: name, max: MAX_FRET })}
          />
        </div>
      ))}

      <div class="legend">
        {picked.map((c) => (
          <span>
            <i class="sw" style={{ background: cssVar(`--k${c.index}`) }} />
            {c.degree} · {chordName(c, key)}
          </span>
        ))}
        <span><i class="sw sw--root" />{t.legend.root}</span>
        <span><i class="sw sw--scale" />{t.legend.scale}</span>
        {picked.length > 0 && <span><i class="sw sw--outside" />{t.legend.outside}</span>}
      </div>

      <div class="tiles">
        {tiles.map((b) => (
          <div class="tile" data-box={b.n} style={{ '--sc': shapeColor(b.shape) }}>
            <b>{format(t.tile, { n: b.n })}</b>{' '}
            <span>{format(t.tileDetail, { shape: b.shape, ranges: b.ranges })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
