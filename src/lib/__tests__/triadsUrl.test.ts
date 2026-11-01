import { describe, expect, it } from 'vitest';
import { DEFAULT_CHANGES, DEFAULT_INVERSIONS } from '../../components/TriadsExplorer';
import { DEFAULT_STATE, readTriadsQuery, writeTriadsQuery, type TriadsState } from '../triadsUrl';

describe('triadsUrl', () => {
  it('DEFAULT_STATE matches the component defaults', () => {
    expect(DEFAULT_STATE).toEqual({
      mode: 'inversions',
      inversions: { root: 0, quality: 'major', set: 'all', index: 0 },
      changes: { src: 'G B C Cm', key: 7, set: 'GBe', start: 0, overlay: 'none' },
    });
    const { root, quality, set, index } = DEFAULT_INVERSIONS;
    expect(DEFAULT_STATE.inversions).toEqual({ root, quality, set, index });
    expect(DEFAULT_STATE.changes).toMatchObject({
      src: DEFAULT_CHANGES.src,
      key: DEFAULT_CHANGES.key,
      set: DEFAULT_CHANGES.set,
      start: DEFAULT_CHANGES.start,
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
      changes: { src: 'C G Am F', key: 0, set: 'DGB', start: 1, overlay: 'penta' },
    });
    expect(readTriadsQuery('mode=changes&overlay=scale').changes.overlay).toBe('scale');

    // Invalid values fall back to each parameter's default.
    expect(
      readTriadsQuery('?mode=xyz&root=99&q=dim&set=XYZ&i=-1&key=12&start=-2&overlay=both'),
    ).toEqual(DEFAULT_STATE);
    expect(readTriadsQuery('?root=1.5&i=abc&key=&start=1e2')).toEqual(DEFAULT_STATE);
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

  it('round-trips a state through the query', () => {
    const states: TriadsState[] = [
      DEFAULT_STATE,
      { ...DEFAULT_STATE, inversions: { root: 11, quality: 'minor', set: 'EAD', index: 5 } },
      {
        mode: 'changes',
        inversions: { root: 4, quality: 'minor', set: 'all', index: 1 },
        changes: { src: 'Em C G D', key: 7, set: 'ADG', start: 3, overlay: 'penta' },
      },
      { ...DEFAULT_STATE, mode: 'changes', changes: { ...DEFAULT_STATE.changes, src: '1 5 6m 4 & ?' } },
    ];
    for (const s of states) expect(readTriadsQuery(writeTriadsQuery(s))).toEqual(s);
  });
});
