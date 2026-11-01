import { describe, expect, it } from 'vitest';
import { numberLabel, numberName, parseChart } from '../numbers';
import { PRESETS } from '../presets';

const preset = (id: string) => {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`missing preset ${id}`);
  return p;
};

describe('presets', () => {
  it('pins every preset to its spec key and source', () => {
    expect(PRESETS.map(({ id, keyRoot, src }) => ({ id, keyRoot, src }))).toEqual([
      { id: 'blues', keyRoot: 9, src: '1 1 1 1 | 4 4 1 1 | 57 4 1 >57' },
      { id: 'pop', keyRoot: 7, src: '1 5 6- 4 | 1 5 6- 4 | 1/3 4 5 1◇' },
      { id: 'twoFiveOne', keyRoot: 2, src: '2- 57 1 1 | 6- 2-_57 1 1◇' },
      { id: 'dooWop', keyRoot: 0, src: '1 6- 4 5 | 1 6- 4_5 >1' },
      { id: 'minor', keyRoot: 0, src: '6- 4 1 5 | 6- 4 1 5' },
    ]);
  });

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
