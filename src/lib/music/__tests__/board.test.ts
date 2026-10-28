import { describe, expect, it } from 'vitest';
import { buildBoard, type ExplorerState } from '../board';
import { chordName, keyChords, type Key } from '../keys';
import { TUNING, semitonesFromRoot } from '../notes';
import { PENTATONIC, boxes } from '../scales';

const A_MINOR: Key = { root: 9, quality: 'minor' };
const state = (over: Partial<ExplorerState> = {}): ExplorerState => ({
  scale: PENTATONIC,
  key: A_MINOR,
  box: 'all',
  chords: new Set<number>(),
  ...over,
});

/** Chord slots in A minor: 0 = Am, 2 = Dm, 3 = Em. */
const AM = 0, DM = 2, EM = 3;

/** Pitch class of a board cell. */
const pcAt = (string: number, fret: number) => (TUNING[string].pc + fret) % 12;
const at = (dots: ReturnType<typeof buildBoard>['dots'], string: number, fret: number) =>
  dots.find((d) => d.string === string && d.fret === fret);
const LOW_E = 5, A_STR = 4;

describe('board', () => {
  it('buildBoard: scale dots with degree labels and ringed roots', () => {
    const { dots } = buildBoard(state());
    const labels = PENTATONIC.degreeLabels.minor;
    // Every pentatonic note on frets 0–15 has exactly one dot labelled with its degree.
    const expected: string[] = [];
    for (let s = 0; s < TUNING.length; s++) {
      for (let f = 0; f <= 15; f++) {
        const r = semitonesFromRoot(TUNING[s].pc, f, A_MINOR.root);
        if (labels[r] !== undefined) expected.push(`${s}:${f}:${labels[r]}:${r === 0}`);
      }
    }
    expect(dots.map((d) => `${d.string}:${d.fret}:${d.label}:${!!d.ring}`).sort()).toEqual(expected.sort());
    expect(dots.every((d) => d.variant === 'outline' && !d.dimmed)).toBe(true);
    expect(at(dots, LOW_E, 5)).toMatchObject({ label: 'R', ring: true });
    expect(at(dots, LOW_E, 8)).toMatchObject({ label: 'b3' });
    expect(at(dots, LOW_E, 8)!.ring).toBeFalsy();
    expect(at(dots, A_STR, 5)).toMatchObject({ label: '4' });
  });

  it('buildBoard: one outline and band per box incl. copies', () => {
    const { outlines, bands, boxes: bx } = buildBoard(state());
    expect(bx).toEqual(boxes(A_MINOR));
    expect(outlines).toHaveLength(bx.length);
    expect(bands).toHaveLength(bx.length);
    expect(bands.map((b) => `${b.label} ${b.from}–${b.to} ${b.color}`)).toEqual([
      '4 · A 0–3 var(--a)',
      '5 · G 2–5 var(--g)',
      '1 · E 5–8 var(--e)',
      '2 · D 7–10 var(--d)',
      '3 · C 9–13 var(--c)',
      '4 · A 12–15 var(--a)',
    ]);
    outlines!.forEach((o, i) => {
      expect(o.cells).toEqual(bx[i].cells);
      expect(o.color).toBe(bands[i].color);
      expect(o.group).toBe(bands[i].group);
      expect(o.dimmed).toBeFalsy();
    });
    expect(bands.every((b) => !b.dimmed)).toBe(true);
  });

  it('buildBoard: box filter dims other boxes and plain notes', () => {
    const { dots, outlines, bands, boxes: bx } = buildBoard(state({ box: 3 }));
    expect(outlines!.map((o) => !!o.dimmed)).toEqual(bx.map((b) => b.n !== 3));
    expect(bands.map((b) => !!b.dimmed)).toEqual(bx.map((b) => b.n !== 3));
    const inBox3 = new Set(bx.filter((b) => b.n === 3).flatMap((b) => b.cells.map((c) => `${c.string}:${c.fret}`)));
    expect(inBox3.size).toBe(12);
    for (const d of dots) expect(!!d.dimmed).toBe(!inBox3.has(`${d.string}:${d.fret}`));
  });

  it('buildBoard: shared chord tones carry several colours', () => {
    const { dots } = buildBoard(state({ chords: new Set([AM, DM]) }));
    const byPc = (pc: number) => dots.filter((d) => pcAt(d.string, d.fret) === pc);
    const A = 9, C = 0, D = 2, E = 4, F = 5;
    for (const d of [...byPc(C), ...byPc(E)]) expect(d.colors).toEqual(['var(--k0)']);
    for (const d of [...byPc(D), ...byPc(F)]) expect(d.colors).toEqual(['var(--k2)']);
    expect(byPc(A).length).toBeGreaterThan(0);
    for (const d of byPc(A)) {
      expect(d.colors).toEqual(['var(--k0)', 'var(--k2)']);
      expect(d.variant).toBe('filled');
      expect(d.ring).toBe(true);
      // Am (slot 0) is the lowest-index chord, so its role names the shared tone.
      expect(d.label).toBe('R');
    }
    // G is a plain scale note.
    for (const d of byPc(7)) expect(d).toMatchObject({ variant: 'outline', label: 'b7' });
    expect(byPc(7)[0].colors).toBeUndefined();
  });

  it('buildBoard: chord tone outside the scale is dashed', () => {
    const { dots } = buildBoard(state({ chords: new Set([DM]) }));
    const fs = dots.filter((d) => pcAt(d.string, d.fret) === 5);
    // Every F on frets 0–15: E 1 13, A 8, D 3 15, G 10, B 6, e 1 13.
    expect(fs.map((d) => `${TUNING[d.string].label}${d.fret}`).sort()).toEqual(
      ['E1', 'E13', 'A8', 'D3', 'D15', 'G10', 'B6', 'e1', 'e13'].sort(),
    );
    for (const d of fs) expect(d).toMatchObject({ variant: 'dashed', color: 'var(--k2)', label: 'b3' });
    // Without a chord, F is not drawn at all.
    expect(buildBoard(state()).dots.some((d) => pcAt(d.string, d.fret) === 5)).toBe(false);
    expect(dots.filter((d) => d.variant === 'dashed').every((d) => pcAt(d.string, d.fret) === 5)).toBe(true);
  });

  it('buildBoard: tone outside the scale shared by two chords is dashed with both colours', () => {
    // A minor, iv · Dm (slot 2) + VI · F (slot 4): F is b3 of Dm and the root of F.
    const { dots } = buildBoard(state({ chords: new Set([DM, 4]) }));
    const fs = dots.filter((d) => pcAt(d.string, d.fret) === 5);
    expect(fs).toHaveLength(9);
    for (const d of fs) {
      expect(d).toMatchObject({ variant: 'dashed', color: 'var(--k2)', label: 'b3' });
      expect(d.colors).toEqual(['var(--k2)', 'var(--k4)']);
    }
  });

  it('buildBoard: chord tones are never dimmed by the box filter', () => {
    const { dots, boxes: bx } = buildBoard(state({ chords: new Set([EM]), box: 1 }));
    const inBox1 = new Set(bx.filter((b) => b.n === 1).flatMap((b) => b.cells.map((c) => `${c.string}:${c.fret}`)));
    const em = dots.filter((d) => d.colors?.includes('var(--k3)'));
    expect(em.some((d) => !inBox1.has(`${d.string}:${d.fret}`))).toBe(true);
    for (const d of em) expect(d.dimmed).toBeFalsy();
    const plainOutside = dots.filter((d) => d.variant === 'outline' && !inBox1.has(`${d.string}:${d.fret}`));
    expect(plainOutside.length).toBeGreaterThan(0);
    for (const d of plainOutside) expect(d.dimmed).toBe(true);
  });

  it('buildBoard: chord tones labelled by role', () => {
    const { dots } = buildBoard(state({ chords: new Set([EM]) }));
    // Em = E G B: E is the chord root, G the b3, B the 5 (B is outside A minor pentatonic).
    expect(at(dots, LOW_E, 0)).toMatchObject({ label: 'R', variant: 'filled', color: 'var(--k3)' });
    expect(at(dots, LOW_E, 3)).toMatchObject({ label: 'b3', variant: 'filled' });
    expect(at(dots, LOW_E, 7)).toMatchObject({ label: '5', variant: 'dashed' });
    // A plain scale note keeps its degree label.
    expect(at(dots, LOW_E, 5)).toMatchObject({ label: 'R', variant: 'outline', ring: true });
    expect(at(dots, A_STR, 5)).toMatchObject({ label: '4', variant: 'outline' });
    // A major chord labels its third '3'.
    const c = buildBoard(state({ chords: new Set([1]) })).dots; // III = C major
    expect(at(c, LOW_E, 0)).toMatchObject({ label: '3', variant: 'filled', color: 'var(--k1)' });
  });

  it('buildBoard: major key labels degrees and colours one chord', () => {
    const C_MAJOR: Key = { root: 0, quality: 'major' };
    const plain = buildBoard(state({ key: C_MAJOR })).dots;
    expect([...new Set(plain.map((d) => d.label))].sort()).toEqual(['2', '3', '5', '6', 'R']);
    expect(at(plain, LOW_E, 8)).toMatchObject({ label: 'R', ring: true, variant: 'outline' });
    expect(at(plain, LOW_E, 0)).toMatchObject({ label: '3' });
    expect(at(plain, LOW_E, 5)).toMatchObject({ label: '6' });
    expect(at(plain, LOW_E, 1)).toBeUndefined(); // F is not in C major pentatonic

    const kc = keyChords(C_MAJOR);
    expect(kc.map((c) => `${c.degree} ${chordName(c, C_MAJOR)}`)).toEqual(['I C', 'ii Dm', 'iii Em', 'IV F', 'V G', 'vi Am']);
    const VI = kc.find((c) => c.degree === 'vi')!.index;

    const { dots } = buildBoard(state({ key: C_MAJOR, chords: new Set([VI]) }));
    const colour = `var(--k${VI})`;
    const am = dots.filter((d) => d.colors !== undefined);
    // Am = A C E: every A, C and E on the neck, nothing else.
    expect(new Set(am.map((d) => pcAt(d.string, d.fret)))).toEqual(new Set([9, 0, 4]));
    for (const d of am) expect(d).toMatchObject({ colors: [colour], variant: 'filled' });
    expect(at(dots, LOW_E, 5)).toMatchObject({ label: 'R', color: colour });
    expect(at(dots, LOW_E, 8)).toMatchObject({ label: 'b3', ring: true, color: colour });
    expect(at(dots, LOW_E, 0)).toMatchObject({ label: '5', color: colour });
    // G stays a plain scale note with its major degree label.
    expect(at(dots, LOW_E, 3)).toMatchObject({ label: '5', variant: 'outline' });
    expect(at(dots, LOW_E, 3)!.colors).toBeUndefined();
  });
});
