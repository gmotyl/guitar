import { TUNING, noteName, semitonesFromRoot, type PitchClass } from './notes';

export type ShapeKey = 'C' | 'A' | 'G' | 'E' | 'D';
export type Role = 'R' | '3' | '5';

export interface Shape {
  key: ShapeKey;
  /** CSS custom property name, e.g. '--c'. */
  color: string;
  /** Template as played for C major; index 0 = high e, null = muted. */
  frets: (number | null)[];
}

export const SHAPES: readonly Shape[] = [
  { key: 'C', color: '--c', frets: [0, 1, 0, 2, 3, null] },
  { key: 'A', color: '--a', frets: [3, 5, 5, 5, 3, null] },
  { key: 'G', color: '--g', frets: [8, 5, 5, 5, 7, 8] },
  { key: 'E', color: '--e', frets: [8, 8, 9, 10, 10, 8] },
  { key: 'D', color: '--d', frets: [12, 13, 12, 10, null, null] },
];

export const KEYS: readonly { key: ShapeKey; pc: PitchClass }[] = [
  { key: 'C', pc: 0 },
  { key: 'A', pc: 9 },
  { key: 'G', pc: 7 },
  { key: 'E', pc: 4 },
  { key: 'D', pc: 2 },
];

export interface Voicing {
  shape: ShapeKey;
  color: string;
  order: number;
  frets: (number | null)[];
  copy: boolean;
}

type Frets = (number | null)[];
const played = (fr: Frets) => fr.filter((f): f is number => f != null);
const shift = (fr: Frets, d: number) => fr.map((f) => (f == null ? null : f + d));

/** Place every shape of a key on frets 0..maxFret (shapes that do not fit are omitted), adding the +12 copy when it fits. */
export function voicings(keyPc: PitchClass, maxFret = 15): Voicing[] {
  const out: Voicing[] = [];
  SHAPES.forEach((s, order) => {
    let fr = shift(s.frets, keyPc);
    while (Math.min(...played(fr)) >= 12) fr = shift(fr, -12);
    if (Math.max(...played(fr)) > maxFret) return;
    out.push({ shape: s.key, color: s.color, order, frets: fr, copy: false });
    const up = shift(fr, 12);
    if (Math.max(...played(up)) <= maxFret) out.push({ shape: s.key, color: s.color, order, frets: up, copy: true });
  });
  return out;
}

const ROLES: Partial<Record<number, Role>> = { 0: 'R', 4: '3', 7: '5' };

export function role(semitones: number): Role | null {
  return ROLES[semitones] ?? null;
}

export function shapeSummary(
  v: Voicing,
  keyPc: PitchClass,
): { lo: number; hi: number; grip: string; roots: string[] } {
  const p = played(v.frets);
  const roots = v.frets.flatMap((f, si) =>
    f != null && semitonesFromRoot(TUNING[si].pc, f, keyPc) === 0 ? [`${TUNING[si].label}${f}`] : [],
  );
  const grip = [...v.frets].reverse().map((f) => (f == null ? '×' : String(f))).join(' ');
  return { lo: Math.min(...p), hi: Math.max(...p), grip, roots };
}

export function chordTones(keyPc: PitchClass): string[] {
  return [0, 4, 7].map((i) => noteName(keyPc + i));
}
