import { describe, expect, it } from 'vitest';
import { DEFAULT_CHANGES, DEFAULT_INVERSIONS } from '../../components/TriadsExplorer';
import { DEFAULT_STATE, readTriadsQuery, writeTriadsQuery, type TriadsState } from '../triadsUrl';

describe('triadsUrl', () => {
  it('DEFAULT_STATE matches the component defaults', () => {
    expect(DEFAULT_STATE).toEqual({
      mode: 'inversions',
      inversions: { root: 0, quality: 'major', set: 'all', index: 0 },
      changes: { src: 'G B C Cm', key: 7, set: 'GBe', at: 0, start: 0, overlay: 'none', tones: true },
    });
    const { root, quality, set, index } = DEFAULT_INVERSIONS;
    expect(DEFAULT_STATE.inversions).toEqual({ root, quality, set, index });
    expect(DEFAULT_STATE.changes).toMatchObject({
      src: DEFAULT_CHANGES.src,
      key: DEFAULT_CHANGES.key,
      set: DEFAULT_CHANGES.set,
      at: DEFAULT_CHANGES.anchor.at,
      start: DEFAULT_CHANGES.anchor.start,
      tones: DEFAULT_CHANGES.tones,
    });
  });

  it('reads every parameter and ignores invalid ones', () => {
    expect(readTriadsQuery('')).toEqual(DEFAULT_STATE);

    expect(readTriadsQuery('?root=9&q=min&set=GBe&i=2')).toEqual({
      ...DEFAULT_STATE,
      inversions: { root: 9, quality: 'minor', set: 'GBe', index: 2 },
    });

    expect(readTriadsQuery('?mode=changes&prog=C+G+Am+F&set=DGB&key=0&start=1&overlay=penta')).toEqual({
      ...DEFAULT_STATE,
      mode: 'changes',
      changes: { src: 'C G Am F', key: 0, set: 'DGB', at: 0, start: 1, overlay: 'penta', tones: true },
    });
    expect(readTriadsQuery('mode=changes&overlay=scale').changes.overlay).toBe('scale');

    // Invalid values fall back to each parameter's default.
    expect(
      readTriadsQuery('?mode=xyz&root=99&q=dim&set=XYZ&i=-1&key=12&start=-2&overlay=both'),
    ).toEqual(DEFAULT_STATE);
    expect(readTriadsQuery('?root=1.5&i=abc&key=&start=1e2')).toEqual(DEFAULT_STATE);
    // Digits past the safe-integer range (they would read as Infinity or lose precision) are invalid.
    const huge = '9'.repeat(400);
    expect(readTriadsQuery(`?mode=changes&i=${huge}&start=${huge}`).changes.start).toBe(0);
    expect(readTriadsQuery(`?i=${huge}`).inversions.index).toBe(0);
    expect(readTriadsQuery('?start=9007199254740993').changes.start).toBe(0);
    expect(readTriadsQuery('?start=9007199254740991').changes.start).toBe(9007199254740991);
    // `all` is an Inversions-only set.
    expect(readTriadsQuery('?mode=changes&set=all').changes.set).toBe('GBe');
    expect(readTriadsQuery('?set=all').inversions.set).toBe('all');
    // An empty `prog` is a typed (empty) field, not a missing one.
    expect(readTriadsQuery('?mode=changes&prog=').changes.src).toBe('');
  });

  it('writes only non-default values', () => {
    expect(writeTriadsQuery(DEFAULT_STATE)).toBe('');

    expect(
      writeTriadsQuery({ ...DEFAULT_STATE, inversions: { root: 9, quality: 'minor', set: 'GBe', index: 2 } }),
    ).toBe('?root=9&q=min&set=GBe&i=2');

    expect(
      writeTriadsQuery({
        ...DEFAULT_STATE,
        mode: 'changes',
        changes: { ...DEFAULT_STATE.changes, src: 'C G Am F', key: 0, set: 'DGB' },
      }),
    ).toBe('?mode=changes&set=DGB&prog=C+G+Am+F&key=0');

    expect(
      writeTriadsQuery({
        ...DEFAULT_STATE,
        mode: 'changes',
        changes: { ...DEFAULT_STATE.changes, start: 2, overlay: 'scale' },
      }),
    ).toBe('?mode=changes&start=2&overlay=scale');
  });

  it('keeps the default key when typed names would detect another', () => {
    // `C` alone and `A♭ G C` detect as C: dropping `key=7` would restore C.
    const inG = (src: string) =>
      writeTriadsQuery({ ...DEFAULT_STATE, mode: 'changes', changes: { ...DEFAULT_STATE.changes, src } });
    expect(inG('C')).toBe('?mode=changes&prog=C&key=7');
    expect(inG('A♭ G C')).toBe('?mode=changes&prog=A%E2%99%AD+G+C&key=7');
    // Names that detect as G and Numbers leave the default key out.
    expect(inG('G C D')).toBe('?mode=changes&prog=G+C+D');
    expect(inG('1 4 5')).toBe('?mode=changes&prog=1+4+5');
    expect(inG('G X')).toBe('?mode=changes&prog=G+X');
  });

  it('round-trips a state through the query', () => {
    const states: TriadsState[] = [
      DEFAULT_STATE,
      { ...DEFAULT_STATE, inversions: { root: 11, quality: 'minor', set: 'EAD', index: 5 } },
      {
        mode: 'changes',
        inversions: { root: 4, quality: 'minor', set: 'all', index: 1 },
        changes: { src: 'Em C G D', key: 7, set: 'ADG', at: 2, start: 3, overlay: 'penta', tones: false },
      },
      { ...DEFAULT_STATE, mode: 'changes', changes: { ...DEFAULT_STATE.changes, src: '1 5 6m 4 & ?' } },
    ];
    for (const s of states) expect(readTriadsQuery(writeTriadsQuery(s))).toEqual(s);
  });

  it('round-trips the Anchor as at and start', () => {
    const s: TriadsState = { ...DEFAULT_STATE, mode: 'changes', changes: { ...DEFAULT_STATE.changes, at: 2, start: 3 } };
    const query = writeTriadsQuery(s);
    expect(query).toBe('?mode=changes&at=2&start=3');
    expect(readTriadsQuery(query)).toEqual(s);
  });

  it('a start-only link anchors on chord 1', () => {
    const { changes } = readTriadsQuery('?mode=changes&start=1');
    expect(changes.at).toBe(0);
    expect(changes.start).toBe(1);
  });

  it('round-trips tones=off and omits the default', () => {
    const off: TriadsState = { ...DEFAULT_STATE, mode: 'changes', changes: { ...DEFAULT_STATE.changes, tones: false } };
    expect(writeTriadsQuery(off)).toBe('?mode=changes&tones=off');
    expect(readTriadsQuery(writeTriadsQuery(off)).changes.tones).toBe(false);
    const on: TriadsState = { ...DEFAULT_STATE, mode: 'changes', changes: { ...DEFAULT_STATE.changes, tones: true } };
    expect(writeTriadsQuery(on)).toBe('?mode=changes');
  });

  it('falls back to defaults for bad at and tones', () => {
    for (const q of ['?at=-1', '?at=x', '?tones=maybe', '?at=1.5&tones=', '?at=-1&tones=maybe']) {
      expect(() => readTriadsQuery(q)).not.toThrow();
      expect(readTriadsQuery(q)).toEqual(DEFAULT_STATE);
    }
  });
});
