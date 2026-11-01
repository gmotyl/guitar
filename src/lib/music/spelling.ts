import type { PitchClass } from './notes';

/**
 * The Triads page's one spelling rule (the mockup's `nm(p, key)`): a note is spelled with the
 * flat table in the major keys D♭ E♭ F G♭ A♭ B♭ and with the sharp table otherwise. The tables
 * hold only C D E F G A B plus one accidental each, so G♭ major reads `G♭ A♭ B♭ B D♭ E♭ F`
 * (B, not C♭). The shared `noteName` is left alone for the other pages.
 */
const SHARP: readonly string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT: readonly string[] = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const FLAT_MAJOR_KEYS: readonly PitchClass[] = [1, 3, 5, 6, 8, 10];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** `pc` spelled for the major key on `majorKey`. */
export function spellNote(pc: PitchClass, majorKey: PitchClass): string {
  return (FLAT_MAJOR_KEYS.includes(mod12(majorKey)) ? FLAT : SHARP)[mod12(pc)];
}

/** `pc` spelled with flats (any flat key spells every pitch class the same). */
export const spellFlat = (pc: PitchClass): string => FLAT[mod12(pc)];

/** `pc` spelled with sharps. */
export const spellSharp = (pc: PitchClass): string => SHARP[mod12(pc)];

/** The chord's own major key: its root, or the relative major (root + 3) for a minor chord. */
export const ownKey = (root: PitchClass, minor: boolean): PitchClass => mod12(minor ? root + 3 : root);
