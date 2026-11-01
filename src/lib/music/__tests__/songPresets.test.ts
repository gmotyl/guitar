import { describe, expect, it } from 'vitest';
import { parseProgression } from '../progression';
import { SONG_PRESETS } from '../songPresets';

describe('SONG_PRESETS', () => {
  it('lists the 13 song presets in order', () => {
    expect(SONG_PRESETS.map((p) => [p.title, p.src])).toEqual([
      ['Creep', 'G B C Cm'],
      ['Wish You Were Here', 'C D Am G'],
      ["Blowin' in the Wind", 'G C D G'],
      ['Time', 'F#m7 Amaj7'],
      ['Hit the Road Jack', 'Am G F E'],
      ['House of the Rising Sun', 'Am C D F Am C E'],
      ['Hey Jude', 'F C C F B♭ F C F'],
      ["Knockin' on Heaven's Door", 'G D Am G D C'],
      ['A Horse with No Name', 'Em D'],
      ['Wonderful Tonight', 'G D C D'],
      ['Jolene', 'Am C G Am'],
      ['Wehikuł czasu', 'A E F#m D'],
      ['No Woman, No Cry', 'C G Am F'],
    ]);
    expect(new Set(SONG_PRESETS.map((p) => p.id)).size).toBe(13);
  });

  it('every preset parses and detects its key', () => {
    const keys = SONG_PRESETS.map((p) => {
      const r = parseProgression(p.src, 0);
      if (!r.ok) throw new Error(`${p.title} failed to parse: ${r.error}`);
      return r.key;
    });
    // G, G, G, A, C, C, F, G, G, G, C, A, C
    expect(keys).toEqual([7, 7, 7, 9, 0, 0, 5, 7, 7, 7, 0, 9, 0]);
  });
});
