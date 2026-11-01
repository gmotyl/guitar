import { noteName, type PitchClass } from './notes';

/** A scale degree of the major key, 1..7. */
export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type NumberQuality = 'major' | 'minor' | 'dim';

/** One chord written as a Nashville Number, e.g. `6-`, `5⁷`, `1/3`, `>57`, `1◇`. */
export interface NumberChord {
  step: Step;
  quality: NumberQuality;
  ext?: '7';
  bass?: Step;
  push?: boolean;
  hold?: boolean;
}

/** 1 chord, or 2 for a split bar. */
export type ChartBar = NumberChord[];
/** Lines of 4 bars. */
export type Chart = ChartBar[][];
export type ChordRole = 'R' | '3' | 'b3' | 'b5' | '5' | 'b7';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Semitones above the key root for steps 1..7 of the major scale. */
const STEP_SEMIS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** Diatonic triad qualities in a major key: 1 4 5 major, 2 3 6 minor, 7 dim. */
const DIATONIC: readonly NumberQuality[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];

const TRIAD: Record<NumberQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
};

const ROLES: Record<number, ChordRole> = { 0: 'R', 4: '3', 3: 'b3', 6: 'b5', 7: '5', 10: 'b7' };

const TOKEN = /^(>)?([1-7])(-|°)?(7)?(?:\/([1-7]))?(◇)?$/;

function parseChord(token: string): NumberChord {
  const m = TOKEN.exec(token);
  if (!m) throw new Error(`Invalid Nashville token: "${token}"`);
  const [, push, step, q, ext, bass, hold] = m;
  const chord: NumberChord = {
    step: Number(step) as Step,
    quality: q === '-' ? 'minor' : q === '°' ? 'dim' : 'major',
  };
  if (ext) chord.ext = '7';
  if (bass) chord.bass = Number(bass) as Step;
  if (push) chord.push = true;
  if (hold) chord.hold = true;
  return chord;
}

/** Parse the preset source format: bars split by whitespace, lines by `|`, `_` joins a split bar. */
export function parseChart(src: string): Chart {
  return src.split('|').map((line) => {
    const bars = line.trim().split(/\s+/).filter(Boolean);
    if (bars.length === 0) throw new Error('Empty chart line');
    return bars.map((bar) => bar.split('_').map(parseChord));
  });
}

/** The Number as written on a chart: '6-', '5⁷', '1/3', '7°', '1'. */
export function numberLabel(c: NumberChord): string {
  const q = c.quality === 'minor' ? '-' : c.quality === 'dim' ? '°' : '';
  return `${c.step}${q}${c.ext ? '⁷' : ''}${c.bass ? `/${c.bass}` : ''}`;
}

/** Pitch class of a step in the major key on `keyRoot`. */
export function stepPc(step: Step, keyRoot: PitchClass): PitchClass {
  return mod12(keyRoot + STEP_SEMIS[step - 1]);
}

/** Pitch class of the chord's root. */
export function numberRoot(c: NumberChord, keyRoot: PitchClass): PitchClass {
  return stepPc(c.step, keyRoot);
}

/** Chord symbol in the key: 'Em', 'A7', 'G#dim', 'G/B', spelled like the major key. */
export function numberName(c: NumberChord, keyRoot: PitchClass): string {
  const key = { root: keyRoot, quality: 'major' } as const;
  const q = c.quality === 'minor' ? 'm' : c.quality === 'dim' ? 'dim' : '';
  const bass = c.bass ? `/${noteName(stepPc(c.bass, keyRoot), key)}` : '';
  return `${noteName(numberRoot(c, keyRoot), key)}${q}${c.ext ? '7' : ''}${bass}`;
}

/** The Number table chord for a step. */
export function diatonic(step: Step): NumberChord {
  return { step, quality: DIATONIC[step - 1] };
}

/** The chord's tones (root first) with their Role; the slash bass is not added. */
export function chordTones(c: NumberChord, keyRoot: PitchClass): { pc: PitchClass; role: ChordRole }[] {
  const root = numberRoot(c, keyRoot);
  const semis = c.ext ? [...TRIAD[c.quality], 10] : TRIAD[c.quality];
  return semis.map((s) => ({ pc: mod12(root + s), role: ROLES[s] }));
}

/** Steps 1..6 reuse the key chord colours `--k0`…`--k5`; 7 is muted. */
export function numberColor(step: Step): string {
  return step === 7 ? 'var(--muted)' : `var(--k${step - 1})`;
}

export type CagedShape = 'E' | 'D' | 'C' | 'A' | 'G';

/** Fret span of each CAGED shape relative to the key root's fret on the low E string. */
const SHAPE_OFFSETS: Record<CagedShape, readonly [number, number]> = {
  E: [-1, 3],
  D: [1, 5],
  C: [4, 8],
  A: [6, 10],
  G: [8, 12],
};

const MAX_FRET = 15;

/** The Position window `[from, to]` of a CAGED shape in the key, kept inside frets 0–15. */
export function positionWindow(keyRoot: PitchClass, shape: CagedShape): [from: number, to: number] {
  const e = mod12(keyRoot - 4); // root fret on low E (open E = pc 4)
  let from = e + SHAPE_OFFSETS[shape][0];
  let to = e + SHAPE_OFFSETS[shape][1];
  while (to > MAX_FRET && from - 12 >= -1) {
    from -= 12;
    to -= 12;
  }
  if (from < 0) {
    from += 12;
    to += 12;
  }
  return [Math.max(0, from), Math.min(MAX_FRET, to)];
}
