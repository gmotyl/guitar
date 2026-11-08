import { role, type Role } from './caged';
import { TUNING, type PitchClass } from './notes';
import { ownKey, spellFlat, spellNote, spellSharp } from './spelling';

export type TriadQuality = 'major' | 'minor';
export type StringSetId = 'EAD' | 'ADG' | 'DGB' | 'GBe';

/** Three adjacent strings; `strings` are TUNING indices low → high (0 = high e). */
export interface StringSet {
  id: StringSetId;
  label: string;
  strings: [number, number, number];
}

export const STRING_SETS: readonly StringSet[] = [
  { id: 'EAD', label: 'E-A-D', strings: [5, 4, 3] },
  { id: 'ADG', label: 'A-D-G', strings: [4, 3, 2] },
  { id: 'DGB', label: 'D-G-B', strings: [3, 2, 1] },
  { id: 'GBe', label: 'G-B-e', strings: [2, 1, 0] },
];

export interface Triad {
  set: StringSet;
  root: PitchClass;
  quality: TriadQuality;
  /** Bass = R (0) | 3rd (1) | 5th (2). */
  inversion: 0 | 1 | 2;
  /** Low → high string of the set. */
  frets: [number, number, number];
  roles: [Role, Role, Role];
}

export interface RungTriad extends Triad {
  /** 0-based Rung. */
  rung: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Open-string pitch in semitones above open low E, per TUNING index. */
const OPEN: number[] = [];
for (let si = TUNING.length - 1, pitch = 0; si >= 0; si--) {
  if (si < TUNING.length - 1) pitch += mod12(TUNING[si].pc - TUNING[si + 1].pc);
  OPEN[si] = pitch;
}

const INVERSION: Partial<Record<Role, 0 | 1 | 2>> = { R: 0, '3': 1, b3: 1, '5': 2 };

/**
 * Every close-voiced Triad of the chord on `set` within frets 0..maxFret: three distinct
 * chord tones ascending from the set's lowest string, top − bass < 12 semitones and a
 * fretted (non-zero) span ≤ 4. Sorted by fret sum (up the neck).
 */
export function triads(root: PitchClass, quality: TriadQuality, set: StringSet, maxFret = 15): Triad[] {
  const [s0, s1, s2] = set.strings;
  const roleAt = (si: number, f: number) => role(mod12(TUNING[si].pc + f - root), quality);
  const out: Triad[] = [];
  for (let f0 = 0; f0 <= maxFret; f0++) {
    const r0 = roleAt(s0, f0);
    if (!r0) continue;
    for (let f1 = 0; f1 <= maxFret; f1++) {
      const r1 = roleAt(s1, f1);
      if (!r1 || r1 === r0) continue;
      for (let f2 = 0; f2 <= maxFret; f2++) {
        const r2 = roleAt(s2, f2);
        if (!r2 || r2 === r0 || r2 === r1) continue;
        const p = [OPEN[s0] + f0, OPEN[s1] + f1, OPEN[s2] + f2];
        if (!(p[0] < p[1] && p[1] < p[2] && p[2] - p[0] < 12)) continue;
        const fretted = [f0, f1, f2].filter((f) => f > 0);
        if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 4) continue;
        out.push({ set, root, quality, inversion: INVERSION[r0]!, frets: [f0, f1, f2], roles: [r0, r1, r2] });
      }
    }
  }
  const sum = (t: Triad) => t.frets[0] + t.frets[1] + t.frets[2];
  return out.sort((a, b) => sum(a) - sum(b));
}

/** The chosen sets' Triads interleaved: Rung k = the k-th Triad of each set, sets low to high; missing ones are skipped. */
export function rungOrder(root: PitchClass, quality: TriadQuality, sets: readonly StringSet[]): RungTriad[] {
  const ordered = STRING_SETS.filter((s) => sets.some((x) => x.id === s.id));
  const perSet = ordered.map((s) => triads(root, quality, s));
  const rungs = Math.max(0, ...perSet.map((ts) => ts.length));
  const out: RungTriad[] = [];
  for (let rung = 0; rung < rungs; rung++) {
    for (const ts of perSet) if (ts[rung]) out.push({ ...ts[rung], rung });
  }
  return out;
}

/** A fretboard cell; string 0 = high e, as FretDot. */
export type Cell = { string: number; fret: number };

/** Whether the Triad plays `cell` (one of its three strings at that fret). */
const holds = (t: Triad, cell: Cell) => t.set.strings.some((si, i) => si === cell.string && t.frets[i] === cell.fret);

/**
 * The first index after `cur` in `order` (wrapping, `cur` itself last) whose Triad contains
 * `cell`; null when none does.
 */
export function nextWithNote(order: readonly RungTriad[], cur: number, cell: Cell): number | null {
  const n = order.length;
  for (let step = 1; step <= n; step++) {
    const k = (((cur + step) % n) + n) % n;
    if (holds(order[k], cell)) return k;
  }
  return null;
}

/**
 * Chord symbol with a slash bass for inversions, e.g. 'C/G', 'Gm/B♭'. The root is spelled in the
 * chord's own key (a minor chord's relative major) unless `rootName` gives it (Chord changes
 * spells roots in the progression key). The bass follows the root's accidental; a natural root
 * leaves it to the chord's own key.
 */
export function triadName(t: Triad, rootName?: string): string {
  const own = ownKey(t.root, t.quality === 'minor');
  const root = rootName ?? spellNote(t.root, own);
  const name = root + (t.quality === 'minor' ? 'm' : '');
  if (t.inversion === 0) return name;
  const bass = mod12(TUNING[t.set.strings[0]].pc + t.frets[0]);
  const bassName = root.includes('#') ? spellSharp(bass) : root.includes('♭') ? spellFlat(bass) : spellNote(bass, own);
  return `${name}/${bassName}`;
}

export interface PathChord {
  root: PitchClass;
  quality: TriadQuality;
}

const wrap = (n: number, m: number) => ((n % m) + m) % m;

/**
 * A Triad path on one String set: Triad 0 = the first chord's Triad at `start mod n`; each next
 * Triad is the next chord's Triad with the least summed |fret difference| to the previous one,
 * ties to the lower fret sum.
 */
export function triadPath(chords: readonly PathChord[], set: StringSet, start: number): Triad[] {
  if (chords.length === 0) return [];
  const first = triads(chords[0].root, chords[0].quality, set);
  if (first.length === 0) return [];
  const path: Triad[] = [first[wrap(start, first.length)]];
  for (const chord of chords.slice(1)) {
    const prev = path[path.length - 1];
    const dist = (t: Triad) => t.frets.reduce((acc, f, i) => acc + Math.abs(f - prev.frets[i]), 0);
    // Candidates are sorted by fret sum, so a strict `<` keeps the lower one on ties.
    let best: Triad | undefined;
    for (const t of triads(chord.root, chord.quality, set)) if (!best || dist(t) < dist(best)) best = t;
    if (!best) break;
    path.push(best);
  }
  return path;
}

export interface ScaleNote {
  pc: PitchClass;
  /** Interval label relative to the chord root: 'R' | 'b2' | '2' | 'b3' | '3' | '4' | '#4' | '5' | 'b6' | '6' | 'b7' | '7'. */
  label: string;
}

const LABELS = ['R', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
const notesFrom = (root: PitchClass, intervals: readonly number[]): ScaleNote[] =>
  intervals.map((i) => ({ pc: mod12(root + i), label: LABELS[mod12(i)] }));

const PENTATONIC: Record<TriadQuality, readonly number[]> = {
  major: [0, 2, 4, 7, 9],
  minor: [0, 3, 5, 7, 10],
};

/** The current chord's pentatonic: major for a major chord, minor for a minor one, rooted on the chord. */
export function chordPentatonic(chord: PathChord): ScaleNote[] {
  return notesFrom(chord.root, PENTATONIC[chord.quality]);
}

export type ModeName = 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
/** Key chords of the major key, steps 1–6: [mode, diatonic quality]. */
const STEPS: readonly [ModeName, TriadQuality][] = [
  ['ionian', 'major'],
  ['dorian', 'minor'],
  ['phrygian', 'minor'],
  ['lydian', 'major'],
  ['mixolydian', 'major'],
  ['aeolian', 'minor'],
];

/** Intervals of the mode on major-scale `step` (0-based), from its own root. */
const modeIntervals = (step: number) => MAJOR_SCALE.map((_, i) => mod12(MAJOR_SCALE[(step + i) % 7] - MAJOR_SCALE[step]));

/**
 * The scale over `chord` in the major key on `keyRoot`: a key chord (steps 1–6 with the diatonic
 * quality) gets the key's major scale read from its root (that step's mode); any other chord gets
 * Mixolydian (major) or Dorian (minor) on its root.
 */
export function chordScale(chord: PathChord, keyRoot: PitchClass): { mode: ModeName; notes: ScaleNote[] } {
  const step = STEPS.findIndex(
    ([, quality], i) => quality === chord.quality && mod12(keyRoot + MAJOR_SCALE[i]) === mod12(chord.root),
  );
  const s = step >= 0 ? step : chord.quality === 'major' ? 4 : 1;
  return { mode: STEPS[s][0], notes: notesFrom(chord.root, modeIntervals(s)) };
}
