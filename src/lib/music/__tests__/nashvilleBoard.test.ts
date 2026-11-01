import { describe, expect, it } from 'vitest';
import { buildNumberBoard } from '../nashvilleBoard';
import { TUNING } from '../notes';
import { chordTones, numberColor, stepPc, type CagedShape, type NumberChord, type Step } from '../numbers';

const A = 9;
const G = 7;

const ONE: NumberChord = { step: 1, quality: 'major' };
const FIVE_7: NumberChord = { step: 5, quality: 'major', ext: '7' };

/** Pitch class of a board cell. */
const pcAt = (string: number, fret: number) => (TUNING[string].pc + fret) % 12;
const cells = () => TUNING.flatMap((_, string) => Array.from({ length: 16 }, (_, fret) => ({ string, fret })));

describe('nashvilleBoard', () => {
  it('draws the chord on the whole neck without a window', () => {
    const { dots, outlines, windows } = buildNumberBoard({ keyRoot: A, chord: ONE, shapes: null });
    const tones = chordTones(ONE, A);
    const expected = cells()
      .flatMap(({ string, fret }) => {
        const t = tones.find((x) => x.pc === pcAt(string, fret));
        return t ? [`${string}:${fret}:${t.role}`] : [];
      })
      .sort();
    expect(dots.map((d) => `${d.string}:${d.fret}:${d.label}`).sort()).toEqual(expected);
    for (const d of dots) {
      expect(d).toMatchObject({ variant: 'filled', color: numberColor(1) });
      expect(!!d.ring).toBe(d.label === 'R');
      expect(!!d.dimmed).toBe(false);
    }
    expect(outlines).toEqual([]);
    expect(windows).toEqual([]);
  });

  it("labels a seventh chord's tones with roles", () => {
    const { dots } = buildNumberBoard({ keyRoot: A, chord: FIVE_7, shapes: null });
    const roleOf: Record<number, string> = { 4: 'R', 8: '3', 11: '5', 2: 'b7' }; // E G# B D
    const expected = cells()
      .flatMap(({ string, fret }) => {
        const role = roleOf[pcAt(string, fret)];
        return role ? [`${string}:${fret}:${role}`] : [];
      })
      .sort();
    expect(dots.map((d) => `${d.string}:${d.fret}:${d.label}`).sort()).toEqual(expected);
    expect(dots.every((d) => d.color === numberColor(5))).toBe(true);
  });

  it('dims chord tones outside the position window', () => {
    const { dots, outlines, windows } = buildNumberBoard({ keyRoot: G, chord: ONE, shapes: new Set<CagedShape>(['E']) });
    expect(windows).toEqual([{ shape: 'E', from: 2, to: 6 }]);
    expect(outlines).toHaveLength(1);
    expect(outlines[0].dashed).toBe(true);
    const covered = outlines[0].cells.map((c) => `${c.string}:${c.fret}`).sort();
    const expectedCells = cells()
      .filter((c) => c.fret >= 2 && c.fret <= 6)
      .map((c) => `${c.string}:${c.fret}`)
      .sort();
    expect(covered).toEqual(expectedCells);

    const chordDots = dots.filter((d) => d.variant === 'filled');
    expect(chordDots.some((d) => d.fret < 2 || d.fret > 6)).toBe(true);
    for (const d of chordDots) expect(!!d.dimmed, `${d.string}:${d.fret}`).toBe(d.fret < 2 || d.fret > 6);
  });

  it("numbers the key's scale notes inside the window", () => {
    const { dots } = buildNumberBoard({ keyRoot: G, chord: ONE, shapes: new Set<CagedShape>(['E']) });
    const chordPcs = chordTones(ONE, G).map((t) => t.pc);
    const expected: string[] = [];
    for (const { string, fret } of cells()) {
      if (fret < 2 || fret > 6) continue;
      const pc = pcAt(string, fret);
      if (chordPcs.includes(pc)) continue;
      const step = ([1, 2, 3, 4, 5, 6, 7] as Step[]).find((s) => stepPc(s, G) === pc);
      if (step) expected.push(`${string}:${fret}:${step}:${numberColor(step)}`);
    }
    const outlined = dots.filter((d) => d.variant === 'outline');
    expect(outlined.map((d) => `${d.string}:${d.fret}:${d.label}:${d.color}`).sort()).toEqual(expected.sort());
    expect(new Set(outlined.map((d) => d.label))).toEqual(new Set(['2', '4', '6', '7']));
  });

  it('draws one outline per selected window', () => {
    const { dots, outlines, windows } = buildNumberBoard({
      keyRoot: G,
      chord: ONE,
      shapes: new Set<CagedShape>(['E', 'D']),
    });
    expect(windows).toEqual([
      { shape: 'E', from: 2, to: 6 },
      { shape: 'D', from: 4, to: 8 },
    ]);
    expect(outlines).toHaveLength(2);
    expect(outlines.every((o) => o.dashed)).toBe(true);
    const span = (o: (typeof outlines)[number]) => [
      Math.min(...o.cells.map((c) => c.fret)),
      Math.max(...o.cells.map((c) => c.fret)),
    ];
    expect(outlines.map(span)).toEqual([
      [2, 6],
      [4, 8],
    ]);
    for (const d of dots.filter((x) => x.variant === 'filled')) {
      expect(!!d.dimmed, `${d.string}:${d.fret}`).toBe(d.fret < 2 || d.fret > 8);
    }
  });

  it('treats an empty selection as all five windows', () => {
    const { outlines, windows } = buildNumberBoard({ keyRoot: G, chord: ONE, shapes: new Set<CagedShape>() });
    expect(windows.map((w) => w.shape)).toEqual(['E', 'D', 'C', 'A', 'G']);
    expect(outlines).toHaveLength(5);
    expect(outlines.every((o) => o.dashed)).toBe(true);
  });
});
