import { describe, expect, it } from 'vitest';
import type { Key, Quality } from '../keys';
import { TUNING } from '../notes';
import { PENTATONIC, boxes } from '../scales';

const A_MINOR: Key = { root: 9, quality: 'minor' };
const C_MAJOR: Key = { root: 0, quality: 'major' };

/** Frets per string, low E first, e.g. 'E 5 8'. */
const perString = (cells: { string: number; fret: number }[]) =>
  [5, 4, 3, 2, 1, 0].map(
    (si) =>
      `${TUNING[si].label} ${cells
        .filter((c) => c.string === si)
        .map((c) => c.fret)
        .sort((a, b) => a - b)
        .join(' ')}`,
  );

const cellSet = (key: Key) =>
  [...new Set(boxes(key).flatMap((b) => b.cells.map((c) => `${c.string}:${c.fret}`)))].sort();

describe('scales', () => {
  it('boxes: A minor box 1 cells', () => {
    const b1 = boxes(A_MINOR).find((b) => b.n === 1 && !b.copy)!;
    expect(b1.shape).toBe('E');
    expect(perString(b1.cells)).toEqual(['E 5 8', 'A 5 7', 'D 5 7', 'G 5 7', 'B 5 8', 'e 5 8']);
  });

  it('boxes: A minor fret ranges incl. box 4 copy', () => {
    const ranges = boxes(A_MINOR).map((b) => `${b.n}: ${b.from}–${b.to}${b.copy ? ' copy' : ''}`);
    expect(ranges).toEqual(['4: 0–3', '5: 2–5', '1: 5–8', '2: 7–10', '3: 9–13', '4: 12–15 copy']);
    expect(boxes(A_MINOR).map((b) => b.shape)).toEqual(['A', 'G', 'E', 'D', 'C', 'A']);
  });

  it('boxes: relative keys share cells', () => {
    expect(cellSet(A_MINOR)).toEqual(cellSet(C_MAJOR));
  });

  it('boxes: all keys stay on frets 0–15 with five box numbers', () => {
    for (const quality of ['minor', 'major'] as Quality[]) {
      for (let root = 0; root < 12; root++) {
        const bs = boxes({ root, quality });
        const frets = bs.flatMap((b) => b.cells.map((c) => c.fret));
        expect(Math.min(...frets)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...frets)).toBeLessThanOrEqual(15);
        expect([...new Set(bs.map((b) => b.n))].sort()).toEqual([1, 2, 3, 4, 5]);
        expect(bs.map((b) => b.from)).toEqual([...bs.map((b) => b.from)].sort((a, b) => a - b));
      }
    }
  });

  it('boxes: a box that would wrap above the nut is drawn 12 frets higher as the primary', () => {
    const b3 = boxes({ root: 11, quality: 'minor' }).filter((b) => b.n === 3);
    expect(b3.map((b) => `${b.from}–${b.to}${b.copy ? ' copy' : ''}`)).toEqual(['11–15']);
  });

  it('boxes: every key has exactly one non-copy placement per box number', () => {
    for (const quality of ['minor', 'major'] as Quality[]) {
      for (let root = 0; root < 12; root++) {
        const primaries = boxes({ root, quality })
          .filter((b) => !b.copy)
          .map((b) => b.n)
          .sort();
        expect(primaries, `${root} ${quality}`).toEqual([1, 2, 3, 4, 5]);
      }
    }
  });

  it('PENTATONIC: degree labels per quality', () => {
    const labels = (q: Quality) => PENTATONIC.intervals[q].map((i) => PENTATONIC.degreeLabels[q][i]).join(' ');
    expect(labels('minor')).toBe('R b3 4 5 b7');
    expect(labels('major')).toBe('R 2 3 5 6');
  });
});
