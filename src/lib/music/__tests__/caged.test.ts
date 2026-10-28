import { describe, expect, it } from 'vitest';
import { KEYS, chordTones, role, shapeSummary, voicings } from '../caged';
import { TUNING, semitonesFromRoot } from '../notes';
import type { Key } from '../keys';

const major = (root: number): Key => ({ root, quality: 'major' });
const minor = (root: number): Key => ({ root, quality: 'minor' });

/** Major voicings for roots 0..11 as produced before minor shapes existed: `shape[+]:frets` (index 0 = high e). */
const MAJOR_BASELINE = [
  'C:0,1,0,2,3,x C+:12,13,12,14,15,x A:3,5,5,5,3,x G:8,5,5,5,7,8 E:8,8,9,10,10,8 D:12,13,12,10,x,x',
  'C:1,2,1,3,4,x A:4,6,6,6,4,x G:9,6,6,6,8,9 E:9,9,10,11,11,9 D:13,14,13,11,x,x',
  'C:2,3,2,4,5,x A:5,7,7,7,5,x G:10,7,7,7,9,10 E:10,10,11,12,12,10 D:2,3,2,0,x,x D+:14,15,14,12,x,x',
  'C:3,4,3,5,6,x A:6,8,8,8,6,x G:11,8,8,8,10,11 E:11,11,12,13,13,11 D:3,4,3,1,x,x',
  'C:4,5,4,6,7,x A:7,9,9,9,7,x G:12,9,9,9,11,12 E:0,0,1,2,2,0 E+:12,12,13,14,14,12 D:4,5,4,2,x,x',
  'C:5,6,5,7,8,x A:8,10,10,10,8,x G:13,10,10,10,12,13 E:1,1,2,3,3,1 E+:13,13,14,15,15,13 D:5,6,5,3,x,x',
  'C:6,7,6,8,9,x A:9,11,11,11,9,x G:14,11,11,11,13,14 E:2,2,3,4,4,2 D:6,7,6,4,x,x',
  'C:7,8,7,9,10,x A:10,12,12,12,10,x G:3,0,0,0,2,3 G+:15,12,12,12,14,15 E:3,3,4,5,5,3 D:7,8,7,5,x,x',
  'C:8,9,8,10,11,x A:11,13,13,13,11,x G:4,1,1,1,3,4 E:4,4,5,6,6,4 D:8,9,8,6,x,x',
  'C:9,10,9,11,12,x A:0,2,2,2,0,x A+:12,14,14,14,12,x G:5,2,2,2,4,5 E:5,5,6,7,7,5 D:9,10,9,7,x,x',
  'C:10,11,10,12,13,x A:1,3,3,3,1,x A+:13,15,15,15,13,x G:6,3,3,3,5,6 E:6,6,7,8,8,6 D:10,11,10,8,x,x',
  'C:11,12,11,13,14,x A:2,4,4,4,2,x G:7,4,4,4,6,7 E:7,7,8,9,9,7 D:11,12,11,9,x,x',
];

const encode = (key: Key) =>
  voicings(key)
    .map((v) => `${v.shape}${v.copy ? '+' : ''}:${v.frets.map((f) => (f == null ? 'x' : f)).join(',')}`)
    .join(' ');

const range = (frets: (number | null)[]) => {
  const p = frets.filter((f): f is number => f != null);
  return [Math.min(...p), Math.max(...p)];
};

describe('caged', () => {
  it("places the five C-major shapes at the mockup's fret ranges with a +12 copy", () => {
    const vs = voicings(major(0));
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
      voicings(major(keyPc))
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
      const vs = voicings(major(pc));
      expect(vs.filter((v) => !v.copy)).toHaveLength(5);
      for (const v of vs) {
        const [lo, hi] = range(v.frets);
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(15);
      }
    }
  });

  it('keeps every voicing within a smaller maxFret', () => {
    const vs = voicings(major(0), 12);
    for (const v of vs) expect(range(v.frets)[1]).toBeLessThanOrEqual(12);
    expect(vs.some((v) => v.shape === 'D')).toBe(false);
  });

  it('classifies every played note as R, 3 or 5', () => {
    for (const { pc } of KEYS) {
      for (const v of voicings(major(pc))) {
        v.frets.forEach((f, si) => {
          if (f != null) expect(role(semitonesFromRoot(TUNING[si].pc, f, pc), 'major')).not.toBeNull();
        });
      }
    }
    expect(role(0, 'major')).toBe('R');
    expect(role(4, 'major')).toBe('3');
    expect(role(7, 'major')).toBe('5');
    expect(role(2, 'major')).toBeNull();
    expect(role(3, 'major')).toBeNull();
  });

  it('assigns roles for the E shape of A major', () => {
    const e = voicings(major(9)).find((v) => v.shape === 'E' && !v.copy)!;
    const at = (si: number) => role(semitonesFromRoot(TUNING[si].pc, e.frets[si]!, 9), 'major');
    expect([e.frets[5], at(5)]).toEqual([5, 'R']);
    expect([e.frets[4], at(4)]).toEqual([7, '5']);
    expect([e.frets[3], at(3)]).toEqual([7, 'R']);
    expect([e.frets[2], at(2)]).toEqual([6, '3']);
  });

  it('names chord tones with B', () => {
    expect(chordTones(major(7))).toEqual(['G', 'B', 'D']);
  });

  it('summarises a voicing as fret range, E-to-e grip and root positions', () => {
    const c = voicings(major(0)).find((v) => v.shape === 'C' && !v.copy)!;
    const s = shapeSummary(c, major(0));
    expect(s.lo).toBe(0);
    expect(s.hi).toBe(3);
    expect(s.grip).toBe('× 3 2 0 1 0');
    expect(s.roots).toEqual(expect.arrayContaining(['A3', 'B1']));
  });

  it('voicings: major output unchanged', () => {
    expect(Array.from({ length: 12 }, (_, pc) => encode(major(pc)))).toEqual(MAJOR_BASELINE);
  });

  it('voicings: C minor grips', () => {
    const grips = voicings(minor(0))
      .filter((v) => !v.copy)
      .map((v) => [v.shape, shapeSummary(v, minor(0)).grip]);
    expect(grips).toEqual([
      ['C', '× 3 1 0 1 ×'],
      ['A', '× 3 5 5 4 3'],
      ['G', '8 6 5 5 4 8'],
      ['E', '8 10 10 8 8 8'],
      ['D', '× × 10 12 13 11'],
    ]);
  });

  it('role: E shape for A minor has b3 on G string', () => {
    const e = voicings(minor(9)).find((v) => v.shape === 'E' && !v.copy)!;
    const at = (si: number) => role(semitonesFromRoot(TUNING[si].pc, e.frets[si]!, 9), 'minor');
    expect([e.frets[5], at(5)]).toEqual([5, 'R']);
    expect([e.frets[4], at(4)]).toEqual([7, '5']);
    expect([e.frets[3], at(3)]).toEqual([7, 'R']);
    expect([e.frets[2], at(2)]).toEqual([5, 'b3']);
    expect(role(3, 'minor')).toBe('b3');
    expect(role(4, 'minor')).toBeNull();
  });

  it('voicings: minor keys stay on the board', () => {
    for (const pc of [0, 9, 7, 4, 2]) {
      const vs = voicings(minor(pc));
      expect(vs.filter((v) => !v.copy)).toHaveLength(5);
      for (const v of vs) {
        const [lo, hi] = range(v.frets);
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(15);
        v.frets.forEach((f, si) => {
          if (f != null) expect(role(semitonesFromRoot(TUNING[si].pc, f, pc), 'minor')).not.toBeNull();
        });
      }
    }
  });

  it('chordTones: C minor spells Eb', () => {
    expect(chordTones(minor(0))).toEqual(['C', 'Eb', 'G']);
  });
});
