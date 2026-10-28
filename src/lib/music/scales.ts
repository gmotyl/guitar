import type { ShapeKey } from './caged';
import type { Key, Quality } from './keys';
import { TUNING } from './notes';

export interface Scale {
  id: 'pentatonic';
  /** Semitones above the root, ascending. */
  intervals: Record<Quality, number[]>;
  /** Degree label per interval in semitones, e.g. 3 → 'b3'. */
  degreeLabels: Record<Quality, Record<number, string>>;
}

export const PENTATONIC: Scale = {
  id: 'pentatonic',
  intervals: { minor: [0, 3, 5, 7, 10], major: [0, 2, 4, 7, 9] },
  degreeLabels: {
    minor: { 0: 'R', 3: 'b3', 5: '4', 7: '5', 10: 'b7' },
    major: { 0: 'R', 2: '2', 4: '3', 7: '5', 9: '6' },
  },
};

/** One of the five pentatonic boxes (two notes per string); `string` index 0 = high e. */
export interface Box {
  n: 1 | 2 | 3 | 4 | 5;
  shape: ShapeKey;
  cells: { string: number; fret: number }[];
  from: number;
  to: number;
  copy: boolean;
}

/** CAGED shape held by box 1..5. */
const BOX_SHAPES: readonly ShapeKey[] = ['E', 'D', 'C', 'A', 'G'];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Open-string pitch in semitones above the low E string, per TUNING index. */
const OPEN: number[] = [];
// Strings are tuned upwards from low E; accumulate the ascending intervals.
for (let si = TUNING.length - 1, pitch = 0; si >= 0; si--) {
  if (si < TUNING.length - 1) pitch += mod12(TUNING[si].pc - TUNING[si + 1].pc);
  OPEN[si] = pitch;
}

/**
 * The pentatonic boxes of `key` on frets 0..maxFret, sorted by `from`.
 * Box k starts at the k-th scale note on low E (fret 0–11) and takes two ascending
 * scale notes per string up to high e; it gets a +12 copy when that fits, and a
 * placement is dropped when any note leaves 0..maxFret. A box that would need a fret
 * below 0 is drawn only 12 frets higher, as its primary (non-copy) placement.
 */
export function boxes(key: Key, maxFret = 15): Box[] {
  const intervals = PENTATONIC.intervals[key.quality];
  const lowE = TUNING.length - 1;
  // Ascending scale pitches (semitones above open low E) covering the whole neck.
  const pitches: number[] = [];
  for (let p = 0; p <= OPEN[0] + 24; p++) {
    if (intervals.includes(mod12(TUNING[lowE].pc + p - key.root))) pitches.push(p);
  }

  const out: Box[] = [];
  intervals.forEach((iv, k) => {
    const start = mod12(key.root + iv - TUNING[lowE].pc);
    const first = pitches.indexOf(start);
    const cells = Array.from({ length: TUNING.length * 2 }, (_, j) => {
      const string = lowE - Math.floor(j / 2);
      return { string, fret: pitches[first + j] - OPEN[string] };
    });
    let copy = false;
    for (const shift of [0, 12]) {
      const placed = cells.map((c) => ({ string: c.string, fret: c.fret + shift }));
      const frets = placed.map((c) => c.fret);
      const from = Math.min(...frets);
      const to = Math.max(...frets);
      if (from < 0 || to > maxFret) continue;
      out.push({ n: (k + 1) as Box['n'], shape: BOX_SHAPES[k], cells: placed, from, to, copy });
      copy = true;
    }
  });
  return out.sort((a, b) => a.from - b.from);
}
