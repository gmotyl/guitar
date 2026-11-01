import { describe, expect, it } from 'vitest';
import { numberLabel, numberName, parseChart } from '../numbers';
import { PRESETS } from '../presets';

const preset = (id: string) => {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`missing preset ${id}`);
  return p;
};

describe('presets', () => {
  it('every preset parses into lines of four bars', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['blues', 'pop', 'twoFiveOne', 'dooWop', 'minor']);
    for (const p of PRESETS) {
      const chart = parseChart(p.src);
      expect(chart.length, p.id).toBeGreaterThan(0);
      for (const line of chart) expect(line, p.id).toHaveLength(4);
    }
  });

  it('blues in A has E7 in bar 9 and a pushed bar 12', () => {
    const blues = preset('blues');
    expect(blues.keyRoot).toBe(9);
    const bars = parseChart(blues.src).flat();
    expect(bars).toHaveLength(12);
    expect(bars[8].map((c) => numberName(c, blues.keyRoot))).toEqual(['E7']);
    expect(bars[11][0].push).toBe(true);
  });

  it('minor preset starts on 6- in C', () => {
    const minor = preset('minor');
    expect(minor.keyRoot).toBe(0);
    expect(numberLabel(parseChart(minor.src)[0][0][0])).toBe('6-');
  });
});
