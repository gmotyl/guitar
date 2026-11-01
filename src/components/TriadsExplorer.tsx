import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { format, type Dict, type Lang } from '../i18n';
import { role } from '../lib/music/caged';
import { TUNING, noteName, type PitchClass } from '../lib/music/notes';
import {
  STRING_SETS,
  rungOrder,
  triadName,
  type RungTriad,
  type StringSet,
  type StringSetId,
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

/** A note spelled in the chord's own key, flats as '♭' (a minor chord spells like its relative major). */
const spell = (pc: PitchClass, root: PitchClass, quality: TriadQuality) =>
  noteName(pc, { root, quality }).replace(/^([A-G])b$/, '$1♭');
const fretsText = (frets: readonly number[]) => frets.join('–');
const chosenSets = (set: InversionsState['set']): readonly StringSet[] =>
  set === 'all' ? STRING_SETS : STRING_SETS.filter((s) => s.id === set);

/** Focus inside these does not step with ← → (chip rows and form fields keep their own keys). */
const KEY_SHIELD = '.chips, input, textarea, select';

export function TriadsExplorer({ t }: TriadsExplorerProps) {
  const [mode, setMode] = useState<Mode>('inversions');
  const [inv, setInv] = useState<InversionsState>(DEFAULT_INVERSIONS);

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

  /** Previous / Next of the active mode; Chord changes mode plugs in here. */
  const step = (dir: 1 | -1) => {
    if (mode === 'inversions') stepInv(dir);
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

  if (mode === 'changes') {
    return <div class="triads">{modeSwitch}</div>;
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
