import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVED_KEY, deleteProgression, loadSaved, saveProgression } from '../savedProgressions';

describe('savedProgressions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadSaved returns [] for missing, corrupt or throwing storage', () => {
    expect(loadSaved()).toEqual([]);

    localStorage.setItem(SAVED_KEY, '{not json');
    expect(loadSaved()).toEqual([]);

    localStorage.setItem(SAVED_KEY, JSON.stringify({ name: 'Moja', src: 'C G', key: 0 }));
    expect(loadSaved()).toEqual([]);

    // Invalid entries are dropped, valid ones kept.
    localStorage.setItem(
      SAVED_KEY,
      JSON.stringify([
        { name: 'Moja', src: 'Em C G D', key: 7 },
        { name: '', src: 'C', key: 0 },
        { name: 'Bad key', src: 'C', key: 12 },
        { name: 'Frac key', src: 'C', key: 1.5 },
        { name: 'No src', key: 0 },
        null,
        'x',
      ]),
    );
    expect(loadSaved()).toEqual([{ name: 'Moja', src: 'Em C G D', key: 7 }]);

    const getItem = vi.fn(() => {
      throw new Error('denied');
    });
    const setItem = vi.fn(() => {
      throw new Error('denied');
    });
    vi.stubGlobal('localStorage', { getItem, setItem });
    expect(loadSaved()).toEqual([]);
    expect(getItem).toHaveBeenCalledWith(SAVED_KEY);
    // Writes against a throwing storage do not throw either.
    expect(saveProgression({ name: 'Moja', src: 'C', key: 0 })).toEqual([{ name: 'Moja', src: 'C', key: 0 }]);
    expect(setItem).toHaveBeenCalled();
    expect(deleteProgression('Moja')).toEqual([]);
  });

  it('saveProgression replaces a same-named entry', () => {
    expect(saveProgression({ name: 'Moja', src: 'Em C G D', key: 7 })).toEqual([
      { name: 'Moja', src: 'Em C G D', key: 7 },
    ]);
    expect(JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null')).toEqual([{ name: 'Moja', src: 'Em C G D', key: 7 }]);

    saveProgression({ name: 'Druga', src: 'C G Am F', key: 0 });
    const list = saveProgression({ name: 'Moja', src: 'Am F C G', key: 0 });
    expect(list).toEqual([
      { name: 'Moja', src: 'Am F C G', key: 0 },
      { name: 'Druga', src: 'C G Am F', key: 0 },
    ]);
    expect(loadSaved()).toEqual(list);
  });

  it('deleteProgression removes by name', () => {
    saveProgression({ name: 'Moja', src: 'Em C G D', key: 7 });
    saveProgression({ name: 'Druga', src: 'C G Am F', key: 0 });
    expect(deleteProgression('Moja')).toEqual([{ name: 'Druga', src: 'C G Am F', key: 0 }]);
    expect(loadSaved()).toEqual([{ name: 'Druga', src: 'C G Am F', key: 0 }]);
    expect(deleteProgression('Nope')).toEqual([{ name: 'Druga', src: 'C G Am F', key: 0 }]);
    expect(deleteProgression('Druga')).toEqual([]);
    expect(loadSaved()).toEqual([]);
  });
});
