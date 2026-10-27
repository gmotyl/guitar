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

  it('computes semitones from root modulo 12', () => {
    expect(semitonesFromRoot(4, 5, 9)).toBe(0);
    expect(semitonesFromRoot(4, 0, 9)).toBe(7);
    expect(semitonesFromRoot(0, 15, 11)).toBe(4);
  });
});
