import { describe, expect, it } from 'vitest';
import { chordLabel, parseProgression, toNumber, transposeNames, type ParseResult } from '../progression';

const C = 0;
const D = 2;
const F = 5;
const G = 7;
const A = 9;
const B = 11;

type Ok = Extract<ParseResult, { ok: true }>;

function parsed(src: string, selectedKey = C): Ok {
  const r = parseProgression(src, selectedKey);
  if (!r.ok) throw new Error(`expected "${src}" to parse, got ${r.error} ${r.tokens.join(',')}`);
  return r;
}

const numbers = (r: Ok) => r.chords.map((c) => toNumber(c, r.key)).join(' ');
const labels = (r: Ok) => r.chords.map((c) => chordLabel(c, r.key)).join(' ');

describe('parseProgression', () => {
  it('names are translated to Numbers with the detected key', () => {
    const r = parsed('G C D G');
    expect(r.kind).toBe('names');
    expect(r.key).toBe(G);
    expect(numbers(r)).toBe('1 4 5 1');
  });

  it('chords outside the key get explicit Numbers', () => {
    const r = parsed('G B C Cm');
    expect(r.key).toBe(G);
    expect(numbers(r)).toBe('1 3 4 4-');
    expect(toNumber({ root: F, quality: 'major' }, G)).toBe('b7');
  });

  it('sevenths are read as their Triad', () => {
    const r = parsed('F#m7 Amaj7');
    expect(r.key).toBe(A);
    expect(r.chords).toEqual([
      { root: 6, quality: 'minor' },
      { root: A, quality: 'major' },
    ]);
    expect(numbers(r)).toBe('6- 1');
  });

  it('Numbers are translated to names in the selected key', () => {
    const r = parsed('1 5 6- 4', A);
    expect(r.kind).toBe('numbers');
    expect(r.key).toBe(A);
    expect(labels(r)).toBe('A E F#m D');
    expect(labels(parsed('2m 57 1maj7', A))).toBe('Bm E A');
  });

  it('accidental Numbers shift the root', () => {
    expect(parsed('b7', G).chords).toEqual([{ root: F, quality: 'major' }]);
    expect(parsed('♭3 #4-', C).chords).toEqual([
      { root: 3, quality: 'major' },
      { root: 6, quality: 'minor' },
    ]);
  });

  it('H, flats and sharps are read in any spelling', () => {
    const label = (src: string) => labels(parsed(src));
    expect(label('H')).toBe('B');
    expect(label('h')).toBe('B');
    expect(label('B♭')).toBe('B♭');
    expect(label('Bb')).toBe('B♭');
    expect(label('F♯m')).toBe('F#m');
    expect(parsed('H').chords).toEqual([{ root: B, quality: 'major' }]);
    expect(parsed('am').chords).toEqual([{ root: A, quality: 'minor' }]);
  });

  it('separators are interchangeable', () => {
    const expected = parsed('G C D G').chords;
    for (const src of ['G,C,D,G', 'G | C | D | G', 'G, C|D  G', ' G\tC\nD G ']) {
      expect(parsed(src).chords).toEqual(expected);
    }
  });

  it('key detection prefers key chords and the first chord', () => {
    // G: 4 key chords; C: 3 + 0.5 (C is its 1) → G
    expect(parsed('C D Am G').key).toBe(G);
    // A: 2 + 0.5 (F#m is its 6-); D and E also hold both → A
    expect(parsed('F#m Amaj7').key).toBe(A);
    // C: 4 + 0.5 (Am is its 6-); G: 4 → C
    expect(parsed('Am C G Am').key).toBe(C);
    // G: 2 + 0.5 (Em is its 6-); D: 2 → G
    expect(parsed('Em D').key).toBe(G);
    // Em Am: G 2 + 0.5 beats C 2; Am Em: C 2 + 0.5 beats G 2
    expect(parsed('Em Am').key).toBe(G);
    expect(parsed('Am Em').key).toBe(C);
    // D E: A holds both (4, 5) → A beats D and E (1 + 0.5 each)
    expect(parsed('D E').key).toBe(A);
    // Db C F: C and F hold 2 each, Db only 1 + 0.5 → tie to the lower pitch class C
    expect(parsed('Db C F').key).toBe(C);
    expect(parsed('Db F C').key).toBe(C);
  });

  it('invalid input reports empty, unknown tokens or unsupported quality', () => {
    expect(parseProgression('', G)).toEqual({ ok: false, error: 'empty', tokens: [] });
    expect(parseProgression('  , | ', G)).toEqual({ ok: false, error: 'empty', tokens: [] });
    expect(parseProgression('G X', G)).toEqual({ ok: false, error: 'unknown', tokens: ['X'] });
    expect(parseProgression('G 4', G)).toEqual({ ok: false, error: 'unknown', tokens: ['4'] });
    for (const t of ['Bdim', '7°', 'Gaug', '5+']) {
      expect(parseProgression(`${/\d/.test(t[0]) ? '1' : 'C'} ${t}`, G)).toEqual({
        ok: false,
        error: 'quality',
        tokens: [t],
      });
    }
  });
});

describe('transposeNames', () => {
  it('typed names transpose to a new key', () => {
    expect(transposeNames('G C D G', D)).toBe('D G A D');
    expect(transposeNames('G C D G', F)).toBe('F B♭ C F');
    expect(transposeNames('F#m7 Amaj7', C)).toBe('Am7 Cmaj7');
    expect(transposeNames('1 4 5 1', D)).toBeNull();
    expect(transposeNames('G X', D)).toBeNull();
  });
});
