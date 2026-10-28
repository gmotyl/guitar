import { noteName, type PitchClass } from './notes';

export type Quality = 'minor' | 'major';

/** A root plus a quality, e.g. C minor. */
export interface Key {
  root: PitchClass;
  quality: Quality;
}

/** A triad built only from the key's notes; `index` 0..5 picks its colour (`--k0`…`--k5`). */
export interface KeyChord {
  degree: string;
  root: PitchClass;
  quality: Quality;
  index: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The six non-diminished triads of natural minor / major, in degree order: [semitones, degree, quality]. */
const CHORDS: Record<Quality, readonly [number, string, Quality][]> = {
  minor: [
    [0, 'i', 'minor'],
    [3, 'III', 'major'],
    [5, 'iv', 'minor'],
    [7, 'v', 'minor'],
    [8, 'VI', 'major'],
    [10, 'VII', 'major'],
  ],
  major: [
    [0, 'I', 'major'],
    [2, 'ii', 'minor'],
    [4, 'iii', 'minor'],
    [5, 'IV', 'major'],
    [7, 'V', 'major'],
    [9, 'vi', 'minor'],
  ],
};

export function keyChords(key: Key): KeyChord[] {
  return CHORDS[key.quality].map(([semis, degree, quality], index) => ({
    degree,
    root: mod12(key.root + semis),
    quality,
    index,
  }));
}

/** A minor ↔ C major. */
export function relativeKey(key: Key): Key {
  return key.quality === 'minor'
    ? { root: mod12(key.root + 3), quality: 'major' }
    : { root: mod12(key.root - 3), quality: 'minor' };
}

/** Chord symbol spelled in the key, e.g. 'Am', 'Eb'. */
export function chordName(c: KeyChord, key: Key): string {
  return noteName(c.root, key) + (c.quality === 'minor' ? 'm' : '');
}

/** Root picker label; black keys show both names, e.g. 'C#/Db'. */
export function rootLabel(pc: PitchClass): string {
  const sharp = noteName(pc);
  const flat = noteName(pc, { root: 5, quality: 'major' });
  return sharp === flat ? sharp : `${sharp}/${flat}`;
}
