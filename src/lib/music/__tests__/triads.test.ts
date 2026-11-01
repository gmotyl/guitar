import { describe, expect, it } from 'vitest';
import { STRING_SETS, rungOrder, triadName, triads, type StringSet, type StringSetId, type Triad } from '../triads';
import { TUNING } from '../notes';

const C = 0;
const G = 7;
const A = 9;

const set = (id: StringSetId): StringSet => STRING_SETS.find((s) => s.id === id)!;
const frets = (t: Triad) => t.frets.join('-');

/** Absolute pitch (semitones above open low E) per TUNING index. */
const OPEN = [24, 19, 15, 10, 5, 0];

describe('triads', () => {
  it('C major has four Triads per String set at the expected frets', () => {
    const expected: Record<StringSetId, string[]> = {
      EAD: ['3-3-2', '8-7-5', '12-10-10', '15-15-14'],
      ADG: ['3-2-0', '7-5-5', '10-10-9', '15-14-12'],
      DGB: ['2-0-1', '5-5-5', '10-9-8', '14-12-13'],
      GBe: ['0-1-0', '5-5-3', '9-8-8', '12-13-12'],
    };
    for (const s of STRING_SETS) {
      expect(triads(C, 'major', s).map(frets)).toEqual(expected[s.id]);
    }
  });

  it('Triads are close-voiced, ascending and within a four-fret span', () => {
    for (let root = 0; root < 12; root++) {
      for (const quality of ['major', 'minor'] as const) {
        for (const s of STRING_SETS) {
          for (const maxFret of [15, 12]) {
            const ts = triads(root, quality, s, maxFret);
            expect(ts.length).toBeGreaterThan(0);
            for (const t of ts) {
              const pitches = t.frets.map((f, i) => OPEN[s.strings[i]] + f);
              expect(pitches[0]).toBeLessThan(pitches[1]);
              expect(pitches[1]).toBeLessThan(pitches[2]);
              expect(pitches[2] - pitches[0]).toBeLessThan(12);
              const fretted = t.frets.filter((f) => f > 0);
              if (fretted.length) expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(4);
              expect(Math.max(...t.frets)).toBeLessThanOrEqual(maxFret);
              expect(Math.min(...t.frets)).toBeGreaterThanOrEqual(0);
              const pcs = t.frets.map((f, i) => (TUNING[s.strings[i]].pc + f) % 12);
              expect(new Set(pcs).size).toBe(3);
            }
          }
        }
      }
    }
  });

  it('A minor on G-B-e has the expected Inversions and b3', () => {
    const ts = triads(A, 'minor', set('GBe'));
    expect(ts.map(frets)).toEqual(['2-1-0', '5-5-5', '9-10-8', '14-13-12']);
    expect(ts.map((t) => t.inversion)).toEqual([0, 1, 2, 0]);
    for (const t of ts) {
      expect(t.roles).toContain('b3');
      expect(t.roles).not.toContain('3');
      expect(t.root).toBe(A);
      expect(t.quality).toBe('minor');
    }
    expect(ts[0].roles).toEqual(['R', 'b3', '5']);
  });
});

describe('rungOrder', () => {
  it('rungOrder walks the String sets of a Rung before moving up the neck', () => {
    const order = rungOrder(C, 'major', STRING_SETS);
    expect(order).toHaveLength(16);
    expect(order.slice(0, 5).map((t) => `${t.set.id} ${frets(t)}`)).toEqual([
      'EAD 3-3-2',
      'ADG 3-2-0',
      'DGB 2-0-1',
      'GBe 0-1-0',
      'EAD 8-7-5',
    ]);
    expect(order.slice(0, 5).map((t) => t.rung)).toEqual([0, 0, 0, 0, 1]);
  });

  it("rungOrder with one set equals that set's Triads", () => {
    for (const s of STRING_SETS) {
      const order = rungOrder(G, 'minor', [s]);
      const plain = triads(G, 'minor', s);
      expect(order.map(frets)).toEqual(plain.map(frets));
      expect(order.map((t) => t.rung)).toEqual(plain.map((_, k) => k));
    }
  });

  it('rungOrder skips a missing Rung', () => {
    // With maxFret capped, sets end up with different Triad counts; rungOrder uses the default (15),
    // so check with a root whose sets differ in count at fret 15.
    let checked = false;
    for (let root = 0; root < 12 && !checked; root++) {
      for (const quality of ['major', 'minor'] as const) {
        const counts = STRING_SETS.map((s) => triads(root, quality, s).length);
        if (new Set(counts).size === 1) continue;
        const order = rungOrder(root, quality, STRING_SETS);
        expect(order).toHaveLength(counts.reduce((a, b) => a + b, 0));
        const keys = order.map((t) => `${t.set.id} ${frets(t)}`);
        expect(new Set(keys).size).toBe(keys.length);
        const max = Math.max(...counts);
        const short = STRING_SETS[counts.findIndex((c) => c < max)];
        const lastRung = order.filter((t) => t.rung === max - 1);
        expect(lastRung.some((t) => t.set.id === short.id)).toBe(false);
        expect(lastRung.length).toBe(counts.filter((c) => c === max).length);
        checked = true;
        break;
      }
    }
    expect(checked).toBe(true);
  });
});

describe('triadName', () => {
  it('triadName spells slash chords and minor bass notes from the relative major', () => {
    const gm = triads(G, 'minor', set('GBe')).find((t) => t.inversion === 1)!;
    expect(triadName(gm)).toBe('Gm/B♭');
    const c2 = triads(C, 'major', set('EAD')).find((t) => t.inversion === 2)!;
    expect(triadName(c2)).toBe('C/G');
    const c0 = triads(C, 'major', set('EAD')).find((t) => t.inversion === 0)!;
    expect(triadName(c0)).toBe('C');
    const am0 = triads(A, 'minor', set('GBe'))[0];
    expect(triadName(am0)).toBe('Am');
  });
});
