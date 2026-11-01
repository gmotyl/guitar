/**
 * Own progressions saved by name in localStorage. Storage failures are ignored: reads fall back to
 * an empty list and writes still return the list the caller should show. Mutations take the
 * caller's current list, so the session keeps its changes while writes fail.
 */
import type { PitchClass } from './music/notes';

export const SAVED_KEY = 'guitar.triads.saved';

export interface SavedProgression {
  name: string;
  /** The progression field as typed. */
  src: string;
  /** The major key the progression was saved in. */
  key: PitchClass;
}

const isSaved = (v: unknown): v is SavedProgression => {
  if (typeof v !== 'object' || v === null) return false;
  const { name, src, key } = v as Record<string, unknown>;
  return (
    typeof name === 'string' &&
    name !== '' &&
    typeof src === 'string' &&
    typeof key === 'number' &&
    Number.isInteger(key) &&
    key >= 0 &&
    key <= 11
  );
};

/** Saved progressions; [] on missing, corrupt or throwing storage. Invalid entries are dropped. */
export function loadSaved(): SavedProgression[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSaved).map(({ name, src, key }) => ({ name, src, key }));
  } catch {
    return [];
  }
}

function store(list: SavedProgression[]): SavedProgression[] {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: the list just is not persisted.
  }
  return list;
}

/**
 * Save `p` into `current` (default: the stored list); a same-named entry is replaced in place,
 * otherwise `p` is appended. Pass the list on screen so a failed earlier write does not drop it.
 */
export function saveProgression(p: SavedProgression, current: readonly SavedProgression[] = loadSaved()): SavedProgression[] {
  const list = [...current];
  const entry = { name: p.name, src: p.src, key: p.key };
  const at = list.findIndex((s) => s.name === p.name);
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  return store(list);
}

/** Remove the entry named `name` from `current` (default: the stored list); no-op when absent. */
export function deleteProgression(name: string, current: readonly SavedProgression[] = loadSaved()): SavedProgression[] {
  return store(current.filter((s) => s.name !== name));
}
