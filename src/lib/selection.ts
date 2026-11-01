/**
 * Shape selection state: a set of picked shapes (CAGED shapes or pentatonic Boxes).
 * An empty set means "all shown"; picking every member collapses back to empty.
 */

/**
 * Toggle `group` in `sel`: an empty group is a no-op; a fully selected group is removed,
 * otherwise every member is added. A result covering every member of `all` becomes empty.
 */
export function toggleGroup<T>(sel: ReadonlySet<T>, group: readonly T[], all: readonly T[]): ReadonlySet<T> {
  if (group.length === 0) return sel;
  const next = new Set(sel);
  if (group.every((id) => sel.has(id))) {
    for (const id of group) next.delete(id);
  } else {
    for (const id of group) next.add(id);
  }
  return all.every((id) => next.has(id)) ? new Set<T>() : next;
}

/** Distinct ids whose range covers `fret` (`from ≤ fret ≤ to`), in first-seen order. */
export function hitsAtFret<T>(ranges: readonly { id: T; from: number; to: number }[], fret: number): T[] {
  const hits = new Set<T>();
  for (const r of ranges) if (r.from <= fret && fret <= r.to) hits.add(r.id);
  return [...hits];
}

/** Whether `id` is visible: everything is shown when the selection is empty. */
export function isShown<T>(sel: ReadonlySet<T>, id: T): boolean {
  return sel.size === 0 || sel.has(id);
}
