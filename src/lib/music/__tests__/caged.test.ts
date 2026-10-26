import { describe, expect, it } from 'vitest';
import { KEYS, chordTones, role, shapeSummary, voicings } from '../caged';
import { TUNING, semitonesFromRoot } from '../notes';

const range = (frets: (number | null)[]) => {
  const p = frets.filter((f): f is number => f != null);
  return [Math.min(...p), Math.max(...p)];
};

describe('caged', () => {
  it("places the five C-major shapes at the mockup's fret ranges with a +12 copy", () => {
    const vs = voicings(0);
    const main = vs.filter((v) => !v.copy);
    expect(main.map((v) => [v.shape, ...range(v.frets)])).toEqual([
      ['C', 0, 3],
      ['A', 3, 5],
      ['G', 5, 8],
      ['E', 8, 10],
      ['D', 10, 13],
    ]);
    const copies = vs.filter((v) => v.copy);
    expect(copies.map((v) => [v.shape, ...range(v.frets)])).toEqual([['C', 12, 15]]);
  });

  it('pins open-position voicings with a +12 copy for keys other than C', () => {
    const at = (keyPc: number, shape: string) =>
      voicings(keyPc)
        .filter((v) => v.shape === shape)
        .map((v) => [v.copy, ...range(v.frets)]);
    expect(at(2, 'D')).toEqual([
      [false, 0, 3],
      [true, 12, 15],
    ]);
    expect(at(9, 'A')).toEqual([
      [false, 0, 2],
      [true, 12, 14],
    ]);
  });

  it('keeps every voicing of every key within frets 0 to 15', () => {
    for (const { pc } of KEYS) {
      const vs = voicings(pc);
      expect(vs.filter((v) => !v.copy)).toHaveLength(5);
      for (const v of vs) {
        const [lo, hi] = range(v.frets);
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(15);
      }
    }
  });

  it('keeps every voicing within a smaller maxFret', () => {
    const vs = voicings(0, 12);
    for (const v of vs) expect(range(v.frets)[1]).toBeLessThanOrEqual(12);
    expect(vs.some((v) => v.shape === 'D')).toBe(false);
  });

  it('classifies every played note as R, 3 or 5', () => {
    for (const { pc } of KEYS) {
      for (const v of voicings(pc)) {
        v.frets.forEach((f, si) => {
          if (f != null) expect(role(semitonesFromRoot(TUNING[si].pc, f, pc))).not.toBeNull();
        });
      }
    }
    expect(role(0)).toBe('R');
    expect(role(4)).toBe('3');
    expect(role(7)).toBe('5');
    expect(role(2)).toBeNull();
  });

  it('assigns roles for the E shape of A major', () => {
    const e = voicings(9).find((v) => v.shape === 'E' && !v.copy)!;
    const at = (si: number) => role(semitonesFromRoot(TUNING[si].pc, e.frets[si]!, 9));
    expect([e.frets[5], at(5)]).toEqual([5, 'R']);
    expect([e.frets[4], at(4)]).toEqual([7, '5']);
    expect([e.frets[3], at(3)]).toEqual([7, 'R']);
    expect([e.frets[2], at(2)]).toEqual([6, '3']);
  });

  it('names chord tones with B', () => {
    expect(chordTones(7)).toEqual(['G', 'B', 'D']);
  });

  it('summarises a voicing as fret range, E-to-e grip and root positions', () => {
    const c = voicings(0).find((v) => v.shape === 'C' && !v.copy)!;
    const s = shapeSummary(c, 0);
    expect(s.lo).toBe(0);
    expect(s.hi).toBe(3);
    expect(s.grip).toBe('× 3 2 0 1 0');
    expect(s.roots).toEqual(expect.arrayContaining(['A3', 'B1']));
  });
});
