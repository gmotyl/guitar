/**
 * Triads page state <-> URL query. Parameters: `mode` (`changes`; absent = Inversions), `root`
 * (0–11), `q` (`maj` | `min`), `set`, `i` (index), `prog` (field text), `key` (0–11), `start` (≥ 0),
 * `overlay` (`penta` | `scale`). Only non-default values are written; invalid or missing values read
 * as the default.
 *
 * `set` is shared by both modes and belongs to the active one: in Inversions it may also be `all`,
 * in Chord changes it is one of the four string sets. The inactive mode's set is not written.
 */
import type { PitchClass } from './music/notes';
import type { StringSetId, TriadQuality } from './music/triads';

export type Overlay = 'none' | 'penta' | 'scale';

export interface TriadsState {
  mode: 'inversions' | 'changes';
  inversions: { root: PitchClass; quality: TriadQuality; set: 'all' | StringSetId; index: number };
  changes: { src: string; key: PitchClass; set: StringSetId; start: number; overlay: Overlay };
}

/** C major, all sets, index 0 · Creep (`G B C Cm`) in G on G-B-e, start 0, no overlay. */
export const DEFAULT_STATE: TriadsState = {
  mode: 'inversions',
  inversions: { root: 0, quality: 'major', set: 'all', index: 0 },
  changes: { src: 'G B C Cm', key: 7, set: 'GBe', start: 0, overlay: 'none' },
};

const SET_IDS: readonly StringSetId[] = ['EAD', 'ADG', 'DGB', 'GBe'];
const QUALITY_PARAM: Record<TriadQuality, string> = { major: 'maj', minor: 'min' };

/** A non-negative integer written in plain digits, else null. */
const nat = (v: string | null): number | null => (v !== null && /^\d+$/.test(v) ? Number(v) : null);
const pitchClass = (v: string | null): PitchClass | null => {
  const n = nat(v);
  return n !== null && n <= 11 ? n : null;
};
const setId = (v: string | null): StringSetId | null => SET_IDS.find((id) => id === v) ?? null;

/** Parse a query string (with or without the leading `?`). */
export function readTriadsQuery(search: string): TriadsState {
  const p = new URLSearchParams(search);
  const d = DEFAULT_STATE;
  const mode = p.get('mode') === 'changes' ? 'changes' : 'inversions';
  const set = p.get('set');
  const q = p.get('q');
  const overlay = p.get('overlay');
  return {
    mode,
    inversions: {
      root: pitchClass(p.get('root')) ?? d.inversions.root,
      quality: q === 'min' ? 'minor' : q === 'maj' ? 'major' : d.inversions.quality,
      set: mode === 'inversions' ? (set === 'all' ? 'all' : (setId(set) ?? d.inversions.set)) : d.inversions.set,
      index: nat(p.get('i')) ?? d.inversions.index,
    },
    changes: {
      src: p.get('prog') ?? d.changes.src,
      key: pitchClass(p.get('key')) ?? d.changes.key,
      set: mode === 'changes' ? (setId(set) ?? d.changes.set) : d.changes.set,
      start: nat(p.get('start')) ?? d.changes.start,
      overlay: overlay === 'penta' || overlay === 'scale' ? overlay : d.changes.overlay,
    },
  };
}

/** The query for `state`, with the leading `?`; '' when everything is default. */
export function writeTriadsQuery(state: TriadsState): string {
  const d = DEFAULT_STATE;
  const { inversions: inv, changes: ch } = state;
  const p = new URLSearchParams();
  if (state.mode !== d.mode) p.set('mode', state.mode);
  if (inv.root !== d.inversions.root) p.set('root', String(inv.root));
  if (inv.quality !== d.inversions.quality) p.set('q', QUALITY_PARAM[inv.quality]);
  const set = state.mode === 'changes' ? ch.set : inv.set;
  const defaultSet = state.mode === 'changes' ? d.changes.set : d.inversions.set;
  if (set !== defaultSet) p.set('set', set);
  if (inv.index !== d.inversions.index) p.set('i', String(inv.index));
  if (ch.src !== d.changes.src) p.set('prog', ch.src);
  if (ch.key !== d.changes.key) p.set('key', String(ch.key));
  if (ch.start !== d.changes.start) p.set('start', String(ch.start));
  if (ch.overlay !== d.changes.overlay) p.set('overlay', ch.overlay);
  const query = p.toString();
  return query === '' ? '' : `?${query}`;
}
