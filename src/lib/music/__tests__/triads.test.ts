import { describe, expect, it } from 'vitest';
import {
  STRING_SETS,
  anchoredPath,
  chordPentatonic,
  chordScale,
  nextWithNote,
  rungOrder,
  triadName,
  triadPath,
  triads,
  type PathChord,
  type StringSet,
  type StringSetId,
  type Triad,
} from '../triads';
import { TUNING } from '../notes';
import { parseProgression } from '../progression';
import { SONG_PRESETS } from '../songPresets';

const C = 0;
const G = 7;
const A = 9;
const B = 11;
const D = 2;
const E = 4;

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

describe('nextWithNote', () => {
  const G5 = { string: 2, fret: 5 };

  it('nextWithNote cycles the three C Triads through G/5 in Rung order', () => {
    const order = rungOrder(C, 'major', STRING_SETS);
    const seen: number[] = [];
    let cur = 0;
    for (let i = 0; i < 4; i++) {
      cur = nextWithNote(order, cur, G5)!;
      seen.push(cur);
    }
    expect(seen).toEqual([5, 6, 7, 5]);
    expect(seen.map((k) => `${order[k].set.id} ${frets(order[k])}`)).toEqual([
      'ADG 7-5-5',
      'DGB 5-5-5',
      'GBe 5-5-3',
      'ADG 7-5-5',
    ]);
  });

  it('nextWithNote starts after the current Triad', () => {
    const order = rungOrder(C, 'major', STRING_SETS);
    expect(`${order[5].set.id} ${frets(order[5])}`).toBe('ADG 7-5-5');
    expect(nextWithNote(order, 5, G5)).toBe(6);
  });

  it('nextWithNote returns the current Triad when it is the only match', () => {
    const order = rungOrder(C, 'major', [set('GBe')]);
    const only = order.findIndex((t) => frets(t) === '5-5-3');
    expect(only).toBeGreaterThanOrEqual(0);
    expect(nextWithNote(order, only, G5)).toBe(only);
  });

  it('nextWithNote returns null when no Triad contains the note', () => {
    const order = rungOrder(C, 'major', STRING_SETS);
    // G string fret 1 is G#, not a C major tone.
    expect(nextWithNote(order, 0, { string: 2, fret: 1 })).toBeNull();
    // The low E string is not on any set but E-A-D; a string outside the chosen sets never matches.
    expect(nextWithNote(rungOrder(C, 'major', [set('GBe')]), 0, { string: 5, fret: 3 })).toBeNull();
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

const maj = (root: number): PathChord => ({ root, quality: 'major' });
const min = (root: number): PathChord => ({ root, quality: 'minor' });
const dist = (a: Triad, b: Triad) => a.frets.reduce((acc, f, i) => acc + Math.abs(f - b.frets[i]), 0);
const fretSum = (t: Triad) => t.frets[0] + t.frets[1] + t.frets[2];

describe('triadPath', () => {
  it('triadPath starts Creep on G-B-e at G/B 4-3-3 then B 4-4-2', () => {
    const path = triadPath([maj(G), maj(B), maj(C), min(C)], set('GBe'), 0);
    expect(path).toHaveLength(4);
    expect(`${triadName(path[0])} ${frets(path[0])}`).toBe('G/B 4-3-3');
    expect(`${triadName(path[1])} ${frets(path[1])}`).toBe('B 4-4-2');
    expect(path.map((t) => t.root)).toEqual([G, B, C, C]);
    expect(path[3].quality).toBe('minor');
  });

  it('triadPath picks the nearest Triad and breaks ties low', () => {
    let ties = 0;
    for (const s of STRING_SETS) {
      for (let r1 = 0; r1 < 12; r1++) {
        for (let r2 = 0; r2 < 12; r2++) {
          for (const q of ['major', 'minor'] as const) {
            const chords: PathChord[] = [maj(r1), { root: r2, quality: q }];
            for (let start = 0; start < triads(r1, 'major', s).length; start++) {
              const [first, next] = triadPath(chords, s, start);
              expect(first).toEqual(triads(r1, 'major', s)[start]);
              const candidates = triads(r2, q, s);
              const best = Math.min(...candidates.map((c) => dist(c, first)));
              const tied = candidates.filter((c) => dist(c, first) === best);
              if (tied.length > 1) ties++;
              expect(dist(next, first)).toBe(best);
              expect(fretSum(next)).toBe(Math.min(...tied.map(fretSum)));
            }
          }
        }
      }
    }
    expect(ties).toBeGreaterThan(0);
  });

  it('triadPath wraps the start index', () => {
    const chords = [maj(G), maj(B), maj(C), min(C)];
    const n = triads(G, 'major', set('GBe')).length;
    expect(triadPath(chords, set('GBe'), n).map(frets)).toEqual(triadPath(chords, set('GBe'), 0).map(frets));
    expect(triadPath(chords, set('GBe'), n + 1).map(frets)).toEqual(triadPath(chords, set('GBe'), 1).map(frets));
  });
});

/** Frozen copy of the pre-Anchor `triadPath` (first chord at `start`, nearest Triads forward). */
function legacyPath(chords: readonly PathChord[], s: StringSet, start: number): Triad[] {
  if (chords.length === 0) return [];
  const first = triads(chords[0].root, chords[0].quality, s);
  if (first.length === 0) return [];
  const path: Triad[] = [first[((start % first.length) + first.length) % first.length]];
  for (const chord of chords.slice(1)) {
    const prev = path[path.length - 1];
    let best: Triad | undefined;
    for (const t of triads(chord.root, chord.quality, s)) if (!best || dist(t, prev) < dist(best, prev)) best = t;
    if (!best) break;
    path.push(best);
  }
  return path;
}

describe('anchoredPath', () => {
  const creep = [maj(G), maj(B), maj(C), min(C)];

  it('anchoredPath at chord 1 matches triadPath for all presets and sets', () => {
    for (const preset of SONG_PRESETS) {
      const r = parseProgression(preset.src, C);
      if (!r.ok) throw new Error(`preset ${preset.id} does not parse`);
      for (const s of STRING_SETS) {
        for (let k = 0; k <= 3; k++) {
          const expected = legacyPath(r.chords, s, k).map(frets);
          expect(anchoredPath(r.chords, s, { at: 0, start: k }).map(frets)).toEqual(expected);
          expect(triadPath(r.chords, s, k).map(frets)).toEqual(expected);
        }
      }
    }
  });

  it('anchoredPath builds backward from a middle Anchor (Creep, C 12-13-12)', () => {
    const path = anchoredPath(creep, set('GBe'), { at: 2, start: 3 });
    expect(path.map(frets)).toEqual(['12-12-10', '11-12-11', '12-13-12', '12-13-11']);
    expect(path.map((t) => t.root)).toEqual([G, B, C, C]);
  });

  it('anchoredPath on A-D-G from C 7-5-5', () => {
    const path = anchoredPath(creep, set('ADG'), { at: 2, start: 1 });
    expect(path.map(frets)).toEqual(['5-5-4', '6-4-4', '7-5-5', '6-5-5']);
  });

  it('anchoredPath wraps at and start', () => {
    const s = set('GBe');
    const n = triads(C, 'major', s).length;
    const base = anchoredPath(creep, s, { at: 2, start: 1 }).map(frets);
    expect(anchoredPath(creep, s, { at: 2 + creep.length, start: 1 }).map(frets)).toEqual(base);
    expect(anchoredPath(creep, s, { at: 2, start: 1 + n }).map(frets)).toEqual(base);
    expect(anchoredPath(creep, s, { at: 2 + 2 * creep.length, start: 1 + 2 * n }).map(frets)).toEqual(base);
  });

  it('anchoredPath breaks ties to the lower fret sum in both directions', () => {
    let forwardTies = 0;
    let backwardTies = 0;
    for (const s of STRING_SETS) {
      for (let r1 = 0; r1 < 12; r1++) {
        for (let r2 = 0; r2 < 12; r2++) {
          for (const q of ['major', 'minor'] as const) {
            const chords: PathChord[] = [maj(r1), { root: r2, quality: q }];
            const firsts = triads(r1, 'major', s);
            const seconds = triads(r2, q, s);
            // Forward: Anchor on chord 1, chord 2 is the nearest to it.
            for (let k = 0; k < firsts.length; k++) {
              const [a, next] = anchoredPath(chords, s, { at: 0, start: k });
              expect(a).toEqual(firsts[k]);
              const best = Math.min(...seconds.map((c) => dist(c, a)));
              const tied = seconds.filter((c) => dist(c, a) === best);
              if (tied.length > 1) forwardTies++;
              expect(dist(next, a)).toBe(best);
              expect(fretSum(next)).toBe(Math.min(...tied.map(fretSum)));
            }
            // Backward: Anchor on chord 2, chord 1 is the nearest to it.
            for (let k = 0; k < seconds.length; k++) {
              const [prev, a] = anchoredPath(chords, s, { at: 1, start: k });
              expect(a).toEqual(seconds[k]);
              const best = Math.min(...firsts.map((c) => dist(c, a)));
              const tied = firsts.filter((c) => dist(c, a) === best);
              if (tied.length > 1) backwardTies++;
              expect(dist(prev, a)).toBe(best);
              expect(fretSum(prev)).toBe(Math.min(...tied.map(fretSum)));
            }
          }
        }
      }
    }
    expect(forwardTies).toBeGreaterThan(0);
    expect(backwardTies).toBeGreaterThan(0);
  });
});

const spelled = (notes: { pc: number; label: string }[]) => notes.map((n) => `${n.pc}:${n.label}`).join(' ');

describe('chordPentatonic', () => {
  it('chordPentatonic follows the chord quality', () => {
    expect(spelled(chordPentatonic(maj(B)))).toBe('11:R 1:2 3:3 6:5 8:6');
    expect(spelled(chordPentatonic(min(A)))).toBe('9:R 0:b3 2:4 4:5 7:b7');
  });
});

describe('chordScale', () => {
  it("chordScale names the key's mode from the chord root", () => {
    expect(chordScale(min(A), G).mode).toBe('dorian');
    expect(chordScale(min(A), C).mode).toBe('aeolian');
    expect(chordScale(maj(D), G).mode).toBe('mixolydian');
    expect(chordScale(maj(C), G).mode).toBe('lydian');
    expect(chordScale(min(E), G).mode).toBe('aeolian');
    expect(chordScale(min(B), G).mode).toBe('phrygian');
    expect(chordScale(maj(G), G).mode).toBe('ionian');
    // A Dorian in G: the G major scale read from A.
    expect(spelled(chordScale(min(A), G).notes)).toBe('9:R 11:2 0:b3 2:4 4:5 6:6 7:b7');
    expect(spelled(chordScale(maj(C), G).notes)).toBe('0:R 2:2 4:3 6:#4 7:5 9:6 11:7');
  });

  it('chordScale falls back to Mixolydian or Dorian outside the key', () => {
    const b = chordScale(maj(B), G);
    expect(b.mode).toBe('mixolydian');
    expect(spelled(b.notes)).toBe('11:R 1:2 3:3 4:4 6:5 8:6 9:b7');
    const cm = chordScale(min(C), G);
    expect(cm.mode).toBe('dorian');
    expect(spelled(cm.notes)).toBe('0:R 2:2 3:b3 5:4 7:5 9:6 10:b7');
  });
});
