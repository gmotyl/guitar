import { describe, expect, it } from 'vitest';
import { hitsAtFret, isShown, toggleGroup } from '../selection';

const ALL = ['C', 'A', 'G', 'E', 'D'] as const;
type Shape = (typeof ALL)[number];

const set = (...ids: Shape[]): ReadonlySet<Shape> => new Set(ids);

describe('selection', () => {
  it('leaves the selection unchanged for an empty group', () => {
    const sel = set('C', 'A');
    expect(toggleGroup(sel, [], ALL)).toBe(sel);
    const empty = set();
    expect(toggleGroup(empty, [], ALL)).toBe(empty);
  });

  it('deselects a fully selected group', () => {
    expect(toggleGroup(set('C', 'A', 'G'), ['C', 'A'], ALL)).toEqual(set('G'));
    expect(toggleGroup(set('C'), ['C'], ALL)).toEqual(set());
  });

  it('selects the whole group when it is partly selected', () => {
    expect(toggleGroup(set('C'), ['C', 'A'], ALL)).toEqual(set('C', 'A'));
    expect(toggleGroup(set(), ['G'], ALL)).toEqual(set('G'));
  });

  it('collapses a full selection to empty', () => {
    expect(toggleGroup(set('C', 'A', 'G', 'E'), ['D'], ALL)).toEqual(set());
    expect(toggleGroup(set('C', 'A', 'G'), ['E', 'D'], ALL)).toEqual(set());
  });

  it('returns distinct ids covering a fret, copies included', () => {
    const ranges = [
      { id: 'C', from: 0, to: 3 },
      { id: 'A', from: 3, to: 5 },
      { id: 'C', from: 12, to: 15 },
    ];
    expect(hitsAtFret(ranges, 3)).toEqual(['C', 'A']);
    expect(hitsAtFret(ranges, 13)).toEqual(['C']);
    expect(hitsAtFret(ranges, 9)).toEqual([]);
    expect(hitsAtFret([...ranges, { id: 'C', from: 2, to: 4 }], 3)).toEqual(['C', 'A']);
  });

  it('treats an empty selection as all shown', () => {
    for (const id of ALL) expect(isShown(set(), id)).toBe(true);
    const sel = set('C', 'G');
    expect(ALL.filter((id) => isShown(sel, id))).toEqual(['C', 'G']);
  });
});
