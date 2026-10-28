import { describe, expect, it } from 'vitest';
import { NOTES, TUNING, noteName, semitonesFromRoot } from '../notes';

describe('notes', () => {
  it('names pitch class 11 as B and never H', () => {
    expect(noteName(11)).toBe('B');
    expect(NOTES).not.toContain('H');
    expect(TUNING.map((s) => s.label)).not.toContain('H');
  });

  it('lists standard tuning low to high as E A D G B e', () => {
    expect([...TUNING].reverse().map((s) => s.label).join(' ')).toBe('E A D G B e');
  });

  it('noteName: E major spells sharps', () => {
    const key = { root: 4, quality: 'major' } as const;
    expect([4, 6, 8, 11, 1].map((pc) => noteName(pc, key)).join(' ')).toBe('E F# G# B C#');
  });

  it('noteName: no key keeps sharps', () => {
    expect(Array.from({ length: 12 }, (_, pc) => noteName(pc))).toEqual([...NOTES]);
    expect(noteName(3)).toBe('D#');
  });

  it('noteName: flat keys spell flats', () => {
    expect(noteName(3, { root: 0, quality: 'minor' })).toBe('Eb');
    expect(noteName(10, { root: 5, quality: 'major' })).toBe('Bb');
  });

  it.each([
    // [root, quality, pitch class, expected name]: a characteristic note of each flat key
    [5, 'major', 10, 'Bb'],
    [10, 'major', 3, 'Eb'],
    [3, 'major', 8, 'Ab'],
    [8, 'major', 1, 'Db'],
    [1, 'major', 6, 'Gb'],
    [2, 'minor', 10, 'Bb'],
    [7, 'minor', 3, 'Eb'],
    [0, 'minor', 8, 'Ab'],
    [5, 'minor', 1, 'Db'],
    [10, 'minor', 6, 'Gb'],
    // sharp-key controls
    [7, 'major', 6, 'F#'],
    [4, 'minor', 6, 'F#'],
    [2, 'major', 1, 'C#'],
  ] as const)('noteName: key %i %s spells pc %i as %s', (root, quality, pc, name) => {
    expect(noteName(pc, { root, quality })).toBe(name);
  });

  it('computes semitones from root modulo 12', () => {
    expect(semitonesFromRoot(4, 5, 9)).toBe(0);
    expect(semitonesFromRoot(4, 0, 9)).toBe(7);
    expect(semitonesFromRoot(0, 15, 11)).toBe(4);
  });
});
