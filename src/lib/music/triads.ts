import { role, type Role } from './caged';
import { TUNING, noteName, type PitchClass } from './notes';

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

/** Note name with '♭' for flats, spelled in the chord's own key (a minor chord thus spells like its relative major). */
function spell(pc: PitchClass, root: PitchClass, quality: TriadQuality): string {
  return noteName(pc, { root, quality }).replace(/^([A-G])b$/, '$1♭');
}

/** Chord symbol with a slash bass for inversions, e.g. 'C/G', 'Gm/B♭'. */
export function triadName(t: Triad): string {
  const name = spell(t.root, t.root, t.quality) + (t.quality === 'minor' ? 'm' : '');
  if (t.inversion === 0) return name;
  const bass = mod12(TUNING[t.set.strings[0]].pc + t.frets[0]);
  return `${name}/${spell(bass, t.root, t.quality)}`;
}
