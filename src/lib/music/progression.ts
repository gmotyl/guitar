import { keyChords, type Key } from './keys';
import type { PitchClass } from './notes';
import { stepPc, type Step } from './numbers';
import { spellFlat, spellNote } from './spelling';
import type { PathChord } from './triads';

export type ProgressionKind = 'numbers' | 'names';
export type ParseResult =
  | { ok: true; kind: ProgressionKind; key: PitchClass; chords: PathChord[] }
  | { ok: false; error: 'empty' | 'unknown' | 'quality'; tokens: string[] };

const mod12 = (n: number) => ((n % 12) + 12) % 12;

const majorKey = (root: PitchClass): Key => ({ root, quality: 'major' });

/** `b7`, `#4-`, `6m`, `57`, `1maj7`; an accidental shifts the step's root, a seventh is dropped. */
const NUMBER = /^([b#♭♯])?([1-7])(-|m)?(7|maj7)?$/;
/** `G`, `F#m7`, `B♭`, `H` (= B), `am`; lowercase accepted, a seventh is dropped. */
const NAME = /^([A-Ha-h])([#♯b♭])?(m|min|-)?(7|maj7|m7)?$/;
/** A Number or name with a quality the Triads cannot play: dim, °, aug, +. */
const BAD_QUALITY = /^(?:[b#♭♯]?[1-7]|[A-Ha-h][#♯b♭]?)(?:dim7?|°7?|aug|\+)$/;

const LETTER_PC: Record<string, PitchClass> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };

const accidental = (a: string | undefined) => (a === 'b' || a === '♭' ? -1 : a ? 1 : 0);

interface Token {
  kind: ProgressionKind;
  chord: PathChord;
  /** The seventh as typed, normalised: '' | '7' | 'maj7'. */
  ext: string;
}

function readNumber(token: string, key: PitchClass): Token | null {
  const m = NUMBER.exec(token);
  if (!m) return null;
  const [, acc, step, q, ext] = m;
  const root = mod12(stepPc(Number(step) as Step, key) + accidental(acc));
  return { kind: 'numbers', chord: { root, quality: q ? 'minor' : 'major' }, ext: ext ?? '' };
}

function readName(token: string): Token | null {
  const m = NAME.exec(token);
  if (!m) return null;
  const [, letter, acc, q, ext] = m;
  const root = mod12(LETTER_PC[letter.toUpperCase()] + accidental(acc));
  const minor = q != null || ext === 'm7';
  return { kind: 'names', chord: { root, quality: minor ? 'minor' : 'major' }, ext: ext ? (ext === 'maj7' ? 'maj7' : '7') : '' };
}

const splitTokens = (src: string) => src.split(/[\s,|]+/).filter(Boolean);

function isKeyChord(chord: PathChord, key: PitchClass): boolean {
  return keyChords(majorKey(key)).some((c) => c.root === chord.root && c.quality === chord.quality);
}

/** The major key with the most key chords; +0.5 when the first chord is its 1 or 6-; ties → lower pitch class. */
function detectKey(chords: readonly PathChord[]): PitchClass {
  let best = 0;
  let bestScore = -1;
  for (let key = 0; key < 12; key++) {
    let score = chords.filter((c) => isKeyChord(c, key)).length;
    const first = chords[0];
    const isOne = first.root === key && first.quality === 'major';
    const isSixMinor = first.root === mod12(key + 9) && first.quality === 'minor';
    if (isOne || isSixMinor) score += 0.5;
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

function readTokens(src: string, selectedKey: PitchClass): { ok: true; kind: ProgressionKind; tokens: Token[] } | Extract<ParseResult, { ok: false }> {
  const raw = splitTokens(src);
  if (raw.length === 0) return { ok: false, error: 'empty', tokens: [] };
  const read = raw.map((t) => readNumber(t, selectedKey) ?? readName(t));
  const kind = read.find((t) => t != null)?.kind;
  const unknown = raw.filter((t, i) => (read[i] == null || read[i]!.kind !== kind) && !BAD_QUALITY.test(t));
  if (unknown.length > 0) return { ok: false, error: 'unknown', tokens: unknown };
  const quality = raw.filter((t) => BAD_QUALITY.test(t));
  if (quality.length > 0 || kind == null) return { ok: false, error: 'quality', tokens: quality };
  return { ok: true, kind, tokens: read as Token[] };
}

/** Read Numbers (in `selectedKey`) or chord names (key detected); mixed or unknown tokens are errors. */
export function parseProgression(src: string, selectedKey: PitchClass): ParseResult {
  const r = readTokens(src, selectedKey);
  if (!r.ok) return r;
  const chords = r.tokens.map((t) => t.chord);
  const key = r.kind === 'numbers' ? mod12(selectedKey) : detectKey(chords);
  return { ok: true, kind: r.kind, key, chords };
}

/** The chord as a Number in the major key: '4-', or 'b7' for a root outside the scale. */
export function toNumber(chord: PathChord, key: PitchClass): string {
  const semis = mod12(chord.root - key);
  const minor = chord.quality === 'minor' ? '-' : '';
  for (let step = 1 as Step; step <= 7; step++) {
    if (stepPc(step, 0) === semis) return `${step}${minor}`;
  }
  for (let step = 1 as Step; step <= 7; step++) {
    if (stepPc(step, 0) === mod12(semis + 1)) return `b${step}${minor}`;
  }
  return '?'; // unreachable: every semitone is a step or a flattened step
}

/**
 * The chord's root spelled for the major key by the Triads page rule (see `spelling.ts`); a root
 * outside the scale is the flat of the next step, as in `toNumber` (b7 in C → 'B♭', b3 in E → 'G').
 */
export function rootLabel(chord: PathChord, key: PitchClass): string {
  return toNumber(chord, key).startsWith('b') ? spellFlat(chord.root) : spellNote(chord.root, key);
}

/** Chord symbol spelled like the major key, flats shown as ♭: 'F#m', 'B♭'. */
export function chordLabel(chord: PathChord, key: PitchClass): string {
  return rootLabel(chord, key) + (chord.quality === 'minor' ? 'm' : '');
}

/**
 * Typed chord names moved to the key `to` (sevenths kept); null when `src` is not all valid names.
 * `from` is the names' current key; without it the key is detected, which can tie elsewhere once
 * the names have been moved (`A♭ G C` in G detects as C).
 */
export function transposeNames(src: string, to: PitchClass, from?: PitchClass): string | null {
  const r = readTokens(src, to);
  if (!r.ok || r.kind !== 'names') return null;
  from ??= detectKey(r.tokens.map((t) => t.chord));
  const shift = to - from;
  return r.tokens
    .map(({ chord, ext }) => chordLabel({ root: mod12(chord.root + shift), quality: chord.quality }, to) + ext)
    .join(' ');
}
