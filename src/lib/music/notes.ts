/** Pitch class 0..11, C = 0. */
export type PitchClass = number;

/** English note names; pitch class 11 is B (never the German H). */
export const NOTES: readonly string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface GuitarString {
  label: string;
  pc: PitchClass;
}

/** Standard tuning; index 0 = high e … 5 = low E. */
export const TUNING: readonly GuitarString[] = [
  { label: 'e', pc: 4 },
  { label: 'B', pc: 11 },
  { label: 'G', pc: 7 },
  { label: 'D', pc: 2 },
  { label: 'A', pc: 9 },
  { label: 'E', pc: 4 },
];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function noteName(pc: PitchClass): string {
  return NOTES[mod12(pc)];
}

/** Interval in semitones (0..11) from the root to the note at `fret` on a string. */
export function semitonesFromRoot(stringPc: PitchClass, fret: number, rootPc: PitchClass): number {
  return mod12(stringPc + fret - rootPc);
}
