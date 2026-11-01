import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { format, type Dict, type Lang } from '../i18n';
import { role } from '../lib/music/caged';
import { TUNING, noteName, type PitchClass } from '../lib/music/notes';
import { chordLabel, parseProgression, toNumber, transposeNames, type ParseResult } from '../lib/music/progression';
import { SONG_PRESETS } from '../lib/music/songPresets';
import {
  STRING_SETS,
  rungOrder,
  triadName,
  triadPath,
  triads,
  type PathChord,
  type RungTriad,
  type StringSet,
  type StringSetId,
  type Triad,
  type TriadQuality,
} from '../lib/music/triads';
import { Fretboard, type FretDot, type FretPath } from './Fretboard';

export interface TriadsExplorerProps {
  lang: Lang;
  /** The `triads` dictionary section; plain strings only, so it serialises as an island prop. */
  t: Dict['triads'];
}

const MAX_FRET = 15;
const ROOTS: readonly PitchClass[] = Array.from({ length: 12 }, (_, pc) => pc);
const QUALITIES: readonly TriadQuality[] = ['major', 'minor'];
/** Colour of the current Triad in Inversions mode. */
const TRIAD_COLOR = 'var(--k0)';
const mod12 = (n: number) => ((n % 12) + 12) % 12;

export type Mode = 'inversions' | 'changes';
export interface InversionsState {
  root: PitchClass;
  quality: TriadQuality;
  set: 'all' | StringSetId;
  /** Place in Rung order (0-based). */
  index: number;
  showChordTones: boolean;
}
export const DEFAULT_INVERSIONS: InversionsState = {
  root: 0,
  quality: 'major',
  set: 'all',
  index: 0,
  showChordTones: true,
};

export interface ChangesState {
  /** The progression field as typed (Numbers or chord names). */
  src: string;
  /** The major key: detected from typed names, picked for Numbers, set explicitly by a key chip. */
  key: PitchClass;
  set: StringSetId;
  /** Current chord (0-based place in the progression). */
  idx: number;
  /** Which Triad of the first chord starts the Triad path. */
  start: number;
  /** Song preset id in the select, null for a typed progression. */
  preset: string | null;
}
export const DEFAULT_CHANGES: ChangesState = { src: 'G B C Cm', key: 7, set: 'GBe', idx: 0, start: 0, preset: 'creep' };

type ValidProgression = Extract<ParseResult, { ok: true }>;
/** Order colour of the i-th chord of a progression (`--k0`…`--k6`, cycling). */
const orderColor = (i: number) => `var(--k${i % 7})`;
/** Open-string pitches (semitones above low E), high e first like TUNING. */
const OPEN_PITCH = [24, 19, 15, 10, 5, 0];
const pitchesOf = (t: Triad) => t.set.strings.map((s, i) => OPEN_PITCH[s] + t.frets[i]);
const cellsOf = (t: Triad) => t.set.strings.map((string, i) => ({ string, fret: t.frets[i] }));
const sameTriad = (a: Triad, b: Triad) => a.set.id === b.set.id && a.frets.every((f, i) => f === b.frets[i]);
const keyName = (key: PitchClass) => chordLabel({ root: key, quality: 'major' }, key);
const setById = (id: StringSetId) => STRING_SETS.find((s) => s.id === id)!;

/** `format` with every variable in bold (the translation line). */
function formatBold(template: string, vars: Record<string, string>): ComponentChildren[] {
  return template.split(/(\{\w+\})/).map((part) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return m && m[1] in vars ? <b>{vars[m[1]]}</b> : part;
  });
}

/** A note spelled in the chord's own key, flats as '♭' (a minor chord spells like its relative major). */
const spell = (pc: PitchClass, root: PitchClass, quality: TriadQuality) =>
  noteName(pc, { root, quality }).replace(/^([A-G])b$/, '$1♭');
const fretsText = (frets: readonly number[]) => frets.join('–');
const chosenSets = (set: InversionsState['set']): readonly StringSet[] =>
  set === 'all' ? STRING_SETS : STRING_SETS.filter((s) => s.id === set);

/** Focus inside these does not step with ← → (chip rows and form fields keep their own keys). */
const KEY_SHIELD = '.chips, input, textarea, select';
const FIELD_ID = 'triads-progression';
const SONGS_ID = 'triads-songs';

export function TriadsExplorer({ t }: TriadsExplorerProps) {
  const [mode, setMode] = useState<Mode>('inversions');
  const [inv, setInv] = useState<InversionsState>(DEFAULT_INVERSIONS);
  const [ch, setCh] = useState<ChangesState>(DEFAULT_CHANGES);
  // The board keeps the last valid progression while the field holds invalid text.
  const lastValid = useRef<ValidProgression>(parseProgression(DEFAULT_CHANGES.src, DEFAULT_CHANGES.key) as ValidProgression);
  const parsed = parseProgression(ch.src, ch.key);
  if (parsed.ok) lastValid.current = { ...parsed, key: ch.key };
  const prog = lastValid.current;

  const sets = chosenSets(inv.set);
  const order: RungTriad[] = rungOrder(inv.root, inv.quality, sets);
  const index = Math.min(inv.index, order.length - 1);
  const triad = order[index];

  const patchInv = (patch: Partial<InversionsState>) => setInv((s) => ({ ...s, ...patch }));
  const stepInv = (dir: 1 | -1) =>
    setInv((s) => {
      const n = rungOrder(s.root, s.quality, chosenSets(s.set)).length;
      return { ...s, index: (((s.index + dir) % n) + n) % n };
    });

  const patchCh = (patch: Partial<ChangesState>) => setCh((s) => ({ ...s, ...patch }));
  const n = prog.chords.length;
  const stepCh = (dir: 1 | -1) => setCh((s) => ({ ...s, idx: (((s.idx + dir) % n) + n) % n }));

  /** Previous / Next of the active mode. */
  const step = (dir: 1 | -1) => {
    if (mode === 'inversions') stepInv(dir);
    else stepCh(dir);
  };
  // Keep the key handler pointed at the latest render's `step`.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as Element | null;
      if (target?.closest?.(KEY_SHIELD)) return;
      e.preventDefault();
      stepRef.current(e.key === 'ArrowRight' ? 1 : -1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const chip = (label: string, pressed: boolean, onClick: () => void) => (
    <button type="button" aria-pressed={pressed ? 'true' : 'false'} onClick={onClick}>
      {label}
    </button>
  );
  const chipRow = (lbl: string, children: ComponentChildren) => (
    <div class="chips" role="group" aria-label={lbl}>
      <span class="lbl">{lbl}</span>
      {children}
    </div>
  );

  const modeSwitch = (
    <div class="modes" role="group" aria-label={t.modeGroupAria}>
      {(['inversions', 'changes'] as const).map((m) => (
        <button type="button" aria-pressed={mode === m ? 'true' : 'false'} onClick={() => setMode(m)}>
          {t.modes[m]}
        </button>
      ))}
    </div>
  );

  function renderChanges() {
    const t2 = t.changes;
    const set = setById(ch.set);
    const path = triadPath(prog.chords, set, ch.start);
    const idx = Math.min(ch.idx, path.length - 1);
    const cur = path[idx];
    const nxt = path[(idx + 1) % path.length];
    const numbers = prog.chords.map((c) => toNumber(c, prog.key));
    const names = prog.chords.map((c) => chordLabel(c, prog.key));
    const shared = pitchesOf(cur).filter((p) => pitchesOf(nxt).includes(p)).length;

    const onInput = (value: string) => {
      const r = parseProgression(value, ch.key);
      patchCh({ src: value, preset: null, idx: 0, start: 0, ...(r.ok && r.kind === 'names' ? { key: r.key } : {}) });
    };
    const pickKey = (key: PitchClass) => {
      // Typed names move to the picked key; the key is set explicitly (re-detecting could tie elsewhere).
      const moved = transposeNames(ch.src, key);
      patchCh({ key, start: 0, ...(moved != null ? { src: moved } : {}) });
    };
    const pickSong = (id: string) => {
      const song = SONG_PRESETS.find((p) => p.id === id);
      if (!song) return;
      const r = parseProgression(song.src, ch.key);
      patchCh({ src: song.src, preset: id, idx: 0, start: 0, ...(r.ok ? { key: r.key } : {}) });
    };
    const otherStart = () => {
      const first: PathChord = prog.chords[0];
      const count = Math.max(1, triads(first.root, first.quality, set).length);
      patchCh({ start: (ch.start + 1) % count, idx: 0 });
    };

    let lineClass = 'tr';
    let lineBody: ComponentChildren;
    if (!parsed.ok) {
      lineClass = 'tr err';
      const tokens = parsed.tokens.join(', ');
      lineBody = format(parsed.error === 'empty' ? t2.errEmpty : parsed.error === 'unknown' ? t2.errUnknown : t2.errQuality, { tokens });
    } else if (parsed.kind === 'names') {
      lineBody = formatBold(t2.namesLine, { numbers: numbers.join(' '), key: keyName(prog.key) });
    } else {
      lineBody = formatBold(t2.numbersLine, { names: names.join(' '), key: keyName(prog.key) });
    }

    // Board: every other Triad of the path dashed in its order colour, the current one filled on top.
    const curCells = cellsOf(cur);
    const onCurrent = (c: { string: number; fret: number }) =>
      curCells.some((x) => x.string === c.string && x.fret === c.fret);
    const others = path.map((tr, i) => ({ tr, i })).filter(({ tr, i }) => i !== idx && !sameTriad(tr, cur));
    const dashed = new Map<string, FretDot>();
    for (const { tr, i } of others) {
      cellsOf(tr).forEach((c, k) => {
        if (onCurrent(c)) return;
        const id = `${c.string}:${c.fret}`;
        const color = orderColor(i);
        const dot = dashed.get(id);
        if (!dot) dashed.set(id, { ...c, label: tr.roles[k], color, variant: 'dashed', colors: [color] });
        else if (!dot.colors!.includes(color)) dot.colors!.push(color);
      });
    }
    const curColor = orderColor(idx);
    const dots: FretDot[] = [
      ...dashed.values(),
      ...curCells.map((c, k) => ({ ...c, label: cur.roles[k], color: curColor, variant: 'filled' as const, ring: cur.roles[k] === 'R' })),
    ];
    const paths: FretPath[] = [
      ...others.map(({ tr, i }) => ({ cells: cellsOf(tr) as FretPath['cells'], color: orderColor(i), dashed: true })),
      { cells: curCells as FretPath['cells'], color: curColor },
    ];
    const curName = triadName(cur);

    return (
      <div class="triads">
        {modeSwitch}

        <div class="entry">
          <label for={FIELD_ID}>{t2.fieldLabel}</label>
          <input
            id={FIELD_ID}
            type="text"
            autocomplete="off"
            spellcheck={false}
            value={ch.src}
            onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
          />
          <div class={lineClass} aria-live="polite">
            {lineBody}
          </div>
        </div>

        <div class="controls">
          <div class="row">
            <label class="lbl" for={SONGS_ID}>
              {t2.songsLabel}
            </label>
            <select id={SONGS_ID} value={ch.preset ?? ''} onChange={(e) => pickSong((e.currentTarget as HTMLSelectElement).value)}>
              <option value="" disabled hidden>
                {t2.ownProgression}
              </option>
              <optgroup label={t2.songsGroup}>
                {SONG_PRESETS.map((p) => (
                  <option value={p.id}>{p.title}</option>
                ))}
              </optgroup>
            </select>
          </div>
          {chipRow(
            t2.keyLabel,
            ROOTS.map((pc) => chip(keyName(pc), ch.key === pc, () => pickKey(pc))),
          )}
          {chipRow(
            t.setsLabel,
            STRING_SETS.map((s) => chip(s.label, ch.set === s.id, () => patchCh({ set: s.id, start: 0 }))),
          )}
        </div>

        <div class="prog" role="group" aria-label={t2.progAria}>
          {prog.chords.map((_, i) => (
            <button
              type="button"
              aria-pressed={i === idx ? 'true' : 'false'}
              style={`--sc: ${orderColor(i)};`}
              onClick={() => patchCh({ idx: i })}
            >
              <span class="ord">{`${i + 1}.`}</span>
              <span class="num">{numbers[i]}</span>
              <span class="name">{names[i]}</span>
            </button>
          ))}
        </div>

        <div class="stepper">
          <button type="button" class="nav" onClick={() => step(-1)}>
            {t.prev}
          </button>
          <button type="button" class="nav next" onClick={() => step(1)}>
            {t.next}
          </button>
          <button type="button" class="nav alt" onClick={otherStart}>
            {t2.otherStart}
          </button>
          <div class="now" aria-live="polite">
            <b>{format(t2.now, { n: idx + 1, number: numbers[idx], name: curName })}</b>
            <span>
              {format(t2.detail, {
                inversion: t.inversions[cur.inversion],
                frets: fretsText(cur.frets),
                next: triadName(nxt),
                nextFrets: fretsText(nxt.frets),
              })}
            </span>
          </div>
          <span class="count">{format(t2.shared, { n: shared })}</span>
        </div>

        {(['horizontal', 'vertical'] as const).map((orientation) => (
          <div
            class={`board scroll board--${orientation[0]}`}
            tabIndex={0}
            role="region"
            aria-label={format(t2.boardRegionAria, { names: names.join(' ') })}
          >
            <Fretboard
              orientation={orientation}
              frets={MAX_FRET}
              dots={dots}
              paths={paths}
              ariaLabel={format(t2.boardAria, { names: names.join(' '), set: set.label, name: curName })}
            />
          </div>
        ))}

        <div class="legend">
          <span>
            <i class="key-now" style={{ background: curColor }} aria-hidden="true" />
            {t2.legend.now}
          </span>
          <span>
            <i class="key-others" aria-hidden="true" />
            {t2.legend.others}
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'changes') {
    return renderChanges();
  }

  const name = triadName(triad);
  const frets = fretsText(triad.frets);
  const triadCells = triad.set.strings.map((string, i) => ({ string, fret: triad.frets[i] }));

  const dots: FretDot[] = [];
  if (inv.showChordTones) {
    // The chord's other tones on the whole neck: faint outlined dots with their Role.
    TUNING.forEach((s, string) => {
      for (let fret = 0; fret <= MAX_FRET; fret++) {
        const r = role(mod12(s.pc + fret - inv.root), inv.quality);
        if (!r || triadCells.some((c) => c.string === string && c.fret === fret)) continue;
        dots.push({ string, fret, label: r, color: TRIAD_COLOR, variant: 'outline', dimmed: true });
      }
    });
  }
  triadCells.forEach((c, i) => {
    const r = triad.roles[i];
    dots.push({ ...c, label: r, color: TRIAD_COLOR, variant: 'filled', ring: r === 'R' });
  });
  const paths: FretPath[] = [{ cells: triadCells as FretPath['cells'], color: TRIAD_COLOR }];

  const rungs = Math.max(0, ...order.map((x) => x.rung)) + 1;
  const grid = (
    <div
      class="grid"
      role="group"
      aria-label={t.gridAria}
      style={{ gridTemplateColumns: `auto repeat(${sets.length}, minmax(0, 1fr))` }}
    >
      <span />
      {sets.map((s) => (
        <span class="h">{s.label}</span>
      ))}
      {Array.from({ length: rungs }, (_, rung) => [
        <span class="r">{`${rung + 1}.`}</span>,
        ...sets.map((s) => {
          const j = order.findIndex((x) => x.rung === rung && x.set.id === s.id);
          if (j < 0) return <span />;
          return (
            <button type="button" aria-pressed={j === index ? 'true' : 'false'} onClick={() => patchInv({ index: j })}>
              {triadName(order[j])} <small>{fretsText(order[j].frets)}</small>
            </button>
          );
        }),
      ])}
    </div>
  );

  return (
    <div class="triads">
      {modeSwitch}

      <div class="controls">
        {chipRow(
          t.rootLabel,
          ROOTS.map((pc) => chip(spell(pc, pc, inv.quality), inv.root === pc, () => patchInv({ root: pc, index: 0 }))),
        )}
        {chipRow(
          t.qualityLabel,
          QUALITIES.map((q) => chip(t.quality[q], inv.quality === q, () => patchInv({ quality: q, index: 0 }))),
        )}
        {chipRow(t.setsLabel, [
          chip(t.allSets, inv.set === 'all', () => patchInv({ set: 'all', index: 0 })),
          ...STRING_SETS.map((s) => chip(s.label, inv.set === s.id, () => patchInv({ set: s.id, index: 0 }))),
        ])}
        {chipRow(
          t.neckLabel,
          chip(t.chordTones, inv.showChordTones, () => patchInv({ showChordTones: !inv.showChordTones })),
        )}
      </div>

      <div class="stepper">
        <button type="button" class="nav" onClick={() => step(-1)}>
          {t.prev}
        </button>
        <button type="button" class="nav next" onClick={() => step(1)}>
          {t.next}
        </button>
        <div class="now" aria-live="polite">
          <b>{format(t.now, { name, inversion: t.inversions[triad.inversion] })}</b>
          <span>{format(t.detail, { set: triad.set.label, frets, bass: triad.roles[0] })}</span>
        </div>
        <span class="count">{format(t.count, { n: index + 1, total: order.length })}</span>
      </div>

      {grid}

      {(['horizontal', 'vertical'] as const).map((orientation) => (
        <div
          class={`board scroll board--${orientation[0]}`}
          tabIndex={0}
          role="region"
          aria-label={format(t.boardRegionAria, { name })}
        >
          <Fretboard
            orientation={orientation}
            frets={MAX_FRET}
            dots={dots}
            paths={paths}
            ariaLabel={format(t.boardAria, { name, set: triad.set.label, frets })}
          />
        </div>
      ))}

      <div class="legend">
        <span>
          <i class="key-triad" aria-hidden="true" />
          {t.legend.triad}
        </span>
        <span>
          <i class="key-root" aria-hidden="true" />
          {t.legend.root}
        </span>
        {inv.showChordTones && (
          <span>
            <i class="key-tones" aria-hidden="true" />
            {t.legend.tones}
          </span>
        )}
      </div>
    </div>
  );
}
