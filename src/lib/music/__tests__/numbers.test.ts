import { describe, expect, it } from 'vitest';
import {
  chordTones,
  diatonic,
  numberColor,
  numberLabel,
  numberName,
  parseChart,
  type NumberChord,
  type Step,
} from '../numbers';
import { noteName } from '../notes';

const A = 9;
const C = 0;
const D = 2;
const F = 5;
const G = 7;

const STEPS: Step[] = [1, 2, 3, 4, 5, 6, 7];

describe('numbers', () => {
  it('parses lines, split bars, push and hold', () => {
    const chart = parseChart('2- 57 1 1 | 6- 2-_57 1 1◇');
    expect(chart).toHaveLength(2);
    expect(chart.every((line) => line.length === 4)).toBe(true);
    expect(chart[0][0]).toEqual([{ step: 2, quality: 'minor' }]);
    expect(chart[0][1]).toEqual([{ step: 5, quality: 'major', ext: '7' }]);
    // bar 6 = line 2, bar 2
    expect(chart[1][1]).toEqual([
      { step: 2, quality: 'minor' },
      { step: 5, quality: 'major', ext: '7' },
    ]);
    // bar 8 = line 2, bar 4
    expect(chart[1][3]).toEqual([{ step: 1, quality: 'major', hold: true }]);

    const pushed = parseChart('57 4 1 >57');
    expect(pushed[0][3]).toEqual([{ step: 5, quality: 'major', ext: '7', push: true }]);
    expect(pushed[0][0][0].push).toBeUndefined();

    expect(parseChart('1/3 7°')[0]).toEqual([
      [{ step: 1, quality: 'major', bass: 3 }],
      [{ step: 7, quality: 'dim' }],
    ]);
  });

  it('throws on an invalid token', () => {
    expect(() => parseChart('1 8 4 5')).toThrow();
    expect(() => parseChart('1 x 4 5')).toThrow();
    expect(() => parseChart('1 4 5/9 1')).toThrow();
    expect(() => parseChart('1 4_ 5 1')).toThrow();
  });

  it('labels numbers with explicit quality, seventh and bass', () => {
    const labels = (['6-', '57', '1/3', '7°', '1'] as const).map((src) => numberLabel(parseChart(src)[0][0][0]));
    expect(labels).toEqual(['6-', '5⁷', '1/3', '7°', '1']);
  });

  it('names the diatonic table in A', () => {
    expect(STEPS.map((s) => numberName(diatonic(s), A)).join(' ')).toBe('A Bm C#m D E F#m G#dim');
    const chord = (src: string): NumberChord => parseChart(src)[0][0][0];
    expect(numberName(chord('2-'), D)).toBe('Em');
    expect(numberName(chord('57'), D)).toBe('A7');
    expect(numberName(chord('1/3'), G)).toBe('G/B');
  });

  it('spells names with flats in flat keys', () => {
    // noteName spells flats as ASCII 'b' (e.g. 'Bb'), not '♭'.
    expect(noteName(10, { root: F, quality: 'major' })).toBe('Bb');
    expect(numberName(diatonic(4), F)).toBe('Bb');
    expect(numberName(parseChart('57')[0][0][0], F)).toBe('C7');
    expect(STEPS.map((s) => numberName(diatonic(s), F)).join(' ')).toBe('F Gm Am Bb C Dm Edim');
  });

  it('classifies chord tones as R 3 b3 b5 5 b7', () => {
    const fmt = (c: NumberChord, key: number) =>
      chordTones(c, key).map(({ pc, role }) => `${noteName(pc)} ${role}`);
    expect(fmt(parseChart('57')[0][0][0], A)).toEqual(['E R', 'G# 3', 'B 5', 'D b7']);
    expect(fmt(diatonic(7), A)).toEqual(['G# R', 'B b3', 'D b5']);
    expect(chordTones(diatonic(6), A).map((t) => t.role)).toEqual(['R', 'b3', '5']);
    expect(chordTones(diatonic(6), C).map((t) => t.pc)).toEqual([9, 0, 4]);
  });

  it('maps steps 1–6 to the key chord colours and 7 to muted', () => {
    expect(STEPS.map(numberColor)).toEqual([
      'var(--k0)',
      'var(--k1)',
      'var(--k2)',
      'var(--k3)',
      'var(--k4)',
      'var(--k5)',
      'var(--muted)',
    ]);
  });
});
