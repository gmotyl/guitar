import type { FretBand, FretDot, FretboardProps } from '../../components/Fretboard';
import { SHAPES, role } from './caged';
import { keyChords, type Key } from './keys';
import { TUNING, semitonesFromRoot } from './notes';
import { boxes, type Box, type Scale } from './scales';

/** State of the scale explorer island; `chords` holds `KeyChord.index` values. */
export interface ExplorerState {
  scale: Scale;
  key: Key;
  box: 'all' | 1 | 2 | 3 | 4 | 5;
  chords: ReadonlySet<number>;
}

const MAX_FRET = 15;

/** CSS colour of a CAGED shape, e.g. 'var(--e)'. */
const shapeColor = (shape: Box['shape']) => `var(${SHAPES.minor.find((s) => s.key === shape)!.color})`;
const cellKey = (string: number, fret: number) => `${string}:${fret}`;

/**
 * Board data for <Fretboard>: degree-labelled scale dots (root ringed), one outline
 * and band per box placement, and the selected chords' tones labelled by role in
 * their chord colours. The box filter dims other boxes and plain scale dots outside
 * the picked box, never chord tones.
 */
export function buildBoard(s: ExplorerState): {
  dots: FretDot[];
  outlines: FretboardProps['outlines'];
  bands: FretBand[];
  boxes: Box[];
} {
  const { scale, key, box } = s;
  const bx = boxes(key, MAX_FRET);
  const shown = (b: Box) => box === 'all' || b.n === box;
  const inBox = new Set(bx.filter(shown).flatMap((b) => b.cells.map((c) => cellKey(c.string, c.fret))));

  const outlines = bx.map((b) => ({
    group: `box-${b.n}`,
    color: shapeColor(b.shape),
    cells: b.cells,
    dimmed: !shown(b),
  }));
  const bands: FretBand[] = bx.map((b) => ({
    from: b.from,
    to: b.to,
    color: shapeColor(b.shape),
    label: `${b.n} · ${b.shape}`,
    group: `box-${b.n}`,
    dimmed: !shown(b),
  }));

  const picked = keyChords(key).filter((c) => s.chords.has(c.index));
  const labels = scale.degreeLabels[key.quality];
  const dots: FretDot[] = [];
  TUNING.forEach((str, string) => {
    for (let fret = 0; fret <= MAX_FRET; fret++) {
      const r = semitonesFromRoot(str.pc, fret, key.root);
      const inScale = scale.intervals[key.quality].includes(r);
      const hits = picked.flatMap((c) => {
        const tone = role(semitonesFromRoot(str.pc, fret, c.root), c.quality);
        return tone ? [{ tone, color: `var(--k${c.index})` }] : [];
      });
      if (hits.length === 0) {
        if (!inScale) continue;
        dots.push({
          string,
          fret,
          label: labels[r],
          color: 'var(--muted)',
          variant: 'outline',
          ring: r === 0,
          dimmed: box !== 'all' && !inBox.has(cellKey(string, fret)),
        });
        continue;
      }
      // Chord tones stay at full opacity on the whole neck; the first chord names the role.
      dots.push({
        string,
        fret,
        label: hits[0].tone,
        color: hits[0].color,
        colors: hits.map((h) => h.color),
        variant: inScale ? 'filled' : 'dashed',
        ring: r === 0,
        dimmed: false,
      });
    }
  });

  return { dots, outlines, bands, boxes: bx };
}
