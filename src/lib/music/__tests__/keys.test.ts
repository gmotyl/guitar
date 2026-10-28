import { describe, expect, it } from 'vitest';
import { chordName, keyChords, relativeKey, rootLabel, type Key } from '../keys';

const A_MINOR: Key = { root: 9, quality: 'minor' };
const C_MAJOR: Key = { root: 0, quality: 'major' };
const C_MINOR: Key = { root: 0, quality: 'minor' };

const summary = (key: Key) => keyChords(key).map((c) => `${c.degree} ${chordName(c, key)}`).join(' ');

describe('keys', () => {
  it('keyChords: A minor gives i Am III C iv Dm v Em VI F VII G', () => {
    expect(summary(A_MINOR)).toBe('i Am III C iv Dm v Em VI F VII G');
    expect(keyChords(A_MINOR).map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('keyChords: C major gives I C ii Dm iii Em IV F V G vi Am', () => {
    expect(summary(C_MAJOR)).toBe('I C ii Dm iii Em IV F V G vi Am');
    expect(keyChords(C_MAJOR).map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('chordName: C minor spells flats (Eb Ab Bb)', () => {
    expect(keyChords(C_MINOR).map((c) => chordName(c, C_MINOR))).toEqual(['Cm', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb']);
  });

  it('rootLabel: black keys show both names', () => {
    expect(rootLabel(1)).toBe('C#/Db');
    expect(rootLabel(0)).toBe('C');
    expect(rootLabel(10)).toBe('A#/Bb');
  });

  it('relativeKey: A minor and C major map to each other', () => {
    expect(relativeKey(A_MINOR)).toEqual(C_MAJOR);
    expect(relativeKey(C_MAJOR)).toEqual(A_MINOR);
  });
});
