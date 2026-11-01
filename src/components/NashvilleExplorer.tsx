import { useState } from 'preact/hooks';
import { format, type Dict, type Lang } from '../i18n';
import { SHAPES } from '../lib/music/caged';
import { rootLabel } from '../lib/music/keys';
import { buildNumberBoard } from '../lib/music/nashvilleBoard';
import { noteName, type PitchClass } from '../lib/music/notes';
import {
  chordTones,
  diatonic,
  numberColor,
  numberLabel,
  numberName,
  parseChart,
  positionWindow,
  stepPc,
  type CagedShape,
  type NumberChord,
  type Step,
} from '../lib/music/numbers';
import { PRESETS, type ChartPreset } from '../lib/music/presets';
import { hitsAtFret, toggleGroup } from '../lib/selection';
import { Fretboard } from './Fretboard';

export interface NashvilleExplorerProps {
  lang: Lang;
  /** The `nashville` dictionary section; plain strings only, so it serialises as an island prop. */
  t: Dict['nashville'];
}

const MAX_FRET = 15;
const ROOTS: readonly PitchClass[] = Array.from({ length: 12 }, (_, pc) => pc);
const STEPS: readonly Step[] = [1, 2, 3, 4, 5, 6, 7];
/** Shape chips and windows in CAGED order up the neck from the E shape. */
const SHAPE_ORDER: readonly CagedShape[] = ['E', 'D', 'C', 'A', 'G'];
const shapeColor = (shape: CagedShape) => `var(${SHAPES.major.find((s) => s.key === shape)!.color})`;
/** Presets are compile-time data; parse each once. */
const CHARTS = Object.fromEntries(PRESETS.map((p) => [p.id, parseChart(p.src)])) as Record<ChartPreset['id'], ReturnType<typeof parseChart>>;

/** A chord picked on the chart (line, bar, part of a split bar) or a step picked in the Number table. */
type Selection = { line: number; bar: number; part: number } | { step: Step };
const FIRST_BAR: Selection = { line: 0, bar: 0, part: 0 };

export function NashvilleExplorer({ t }: NashvilleExplorerProps) {
  const [presetId, setPresetId] = useState<ChartPreset['id']>(PRESETS[0].id);
  const [keyRoot, setKeyRoot] = useState<PitchClass>(PRESETS[0].keyRoot);
  const [sel, setSel] = useState<Selection>(FIRST_BAR);
  // null = position switch off; an empty set = all five windows.
  const [shapes, setShapes] = useState<ReadonlySet<CagedShape> | null>(null);

  const chart = CHARTS[presetId];
  const keyName = noteName(keyRoot, { root: keyRoot, quality: 'major' });
  const chord: NumberChord = 'step' in sel ? diatonic(sel.step) : chart[sel.line][sel.bar][sel.part];
  const chordName = numberName(chord, keyRoot);
  const board = buildNumberBoard({ keyRoot, chord, shapes });

  const pickPreset = (p: ChartPreset) => {
    setPresetId(p.id);
    setKeyRoot(p.keyRoot);
    setSel(FIRST_BAR);
  };
  const toggleShapes = (group: readonly CagedShape[]) => setShapes(toggleGroup(shapes ?? new Set(), group, SHAPE_ORDER));
  // A board click hits every window covering the column, selected or not.
  const ranges = SHAPE_ORDER.map((shape) => {
    const [from, to] = positionWindow(keyRoot, shape);
    return { id: shape, from, to };
  });
  const onFretClick = shapes === null ? undefined : (fret: number) => toggleShapes(hitsAtFret(ranges, fret));

  const chip = (label: string, pressed: boolean, onClick: () => void, color?: string, cls?: string, aria?: string) => (
    <button
      type="button"
      class={cls}
      aria-pressed={pressed ? 'true' : 'false'}
      aria-label={aria}
      style={color ? { '--sc': color } : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );

  // Bars are numbered through the whole chart.
  let barNo = 0;
  const chartLines = chart.map((line, li) => (
    <div class="line">
      {line.map((bar, bi) => {
        barNo += 1;
        const n = barNo;
        const buttons = bar.map((c, pi) => {
          const name = numberName(c, keyRoot);
          const on = !('step' in sel) && sel.line === li && sel.bar === bi && sel.part === pi;
          return (
            <button
              type="button"
              class={c.hold ? 'ch hold' : 'ch'}
              aria-pressed={on ? 'true' : 'false'}
              aria-label={format(t.barAria, { bar: n, number: numberLabel(c), chord: name })}
              style={{ '--sc': numberColor(c.step) }}
              onClick={() => setSel({ line: li, bar: bi, part: pi })}
            >
              {c.push && <span class="push" aria-hidden="true">{'>'}</span>}
              <span class="num">{numberLabel(c)}</span>
              <span class="name">{name}</span>
            </button>
          );
        });
        return bar.length > 1 ? (
          <div class="bar split">
            <div class="pair">{buttons}</div>
          </div>
        ) : (
          <div class="bar">{buttons}</div>
        );
      })}
    </div>
  ));

  // Roles in tone order, e.g. 'R / 3 / 5 / b7'.
  const roles = chordTones(chord, keyRoot).map((x) => x.role).join(' / ');
  const windows = shapes !== null && shapes.size > 0 ? board.windows : [];
  const suffix = windows.map((w) => format(t.shapeWindow, w)).join(', ');
  // The chord line keeps "Number = chord" bold in the Number colour, as in the mockup.
  const [lineBefore, lineRest = ''] = t.chordLine.split('{number}');
  const [lineMid, lineAfter = ''] = lineRest.split('{chord}');
  const number = numberLabel(chord);
  const relMinor = presetId === 'minor'
    ? ` · ${format(t.relativeMinor, { key: noteName(stepPc(6, keyRoot), { root: keyRoot, quality: 'major' }) })}`
    : '';

  return (
    <div class="nashville">
      <div class="controls">
        <div class="chips" role="group" aria-label={t.keyGroupAria}>
          <span class="lbl">{t.keyLabel}</span>
          {ROOTS.map((pc) => chip(rootLabel(pc), keyRoot === pc, () => setKeyRoot(pc)))}
        </div>
        <div class="chips" role="group" aria-label={t.presetGroupAria}>
          <span class="lbl">{t.presetLabel}</span>
          {PRESETS.map((p) => chip(t.presets[p.id], presetId === p.id, () => pickPreset(p)))}
        </div>
        <div class="chips" role="group" aria-label={t.tableGroupAria}>
          <span class="lbl">{t.tableLabel}</span>
          {STEPS.map((step) => {
            const c = diatonic(step);
            const name = numberName(c, keyRoot);
            return chip(
              `${numberLabel(c)} · ${name}`,
              'step' in sel && sel.step === step,
              () => setSel({ step }),
              numberColor(step),
              'deg',
              format(t.tableAria, { number: numberLabel(c), chord: name }),
            );
          })}
        </div>
      </div>

      <p class="keyline">
        {format(t.keyLine, { key: keyName })}
        {relMinor}
      </p>

      <div class="chart" role="group" aria-label={t.chartAria}>
        {chartLines}
      </div>

      <div class="legend" role="group" aria-label={t.legendAria}>
        <span><b>6-</b> {t.legend.minor}</span>
        <span><b>5⁷</b> {t.legend.seventh}</span>
        <span><b>1/3</b> {t.legend.bass}</span>
        <span><span class="pair"><b>2-</b> <b>5⁷</b></span> {t.legend.split}</span>
        <span><b>{'>'}</b> {t.legend.push}</span>
        <span><b class="hold">1</b> {t.legend.hold}</span>
      </div>

      {(['horizontal', 'vertical'] as const).map((orientation) => (
        <div
          class={`board scroll board--${orientation[0]}`}
          tabIndex={0}
          role="region"
          aria-label={format(t.boardRegionAria, { chord: chordName })}
        >
          <Fretboard
            orientation={orientation}
            frets={MAX_FRET}
            dots={board.dots}
            outlines={board.outlines}
            onFretClick={onFretClick}
            ariaLabel={format(t.boardAria, { chord: chordName, max: MAX_FRET })}
          />
        </div>
      ))}

      <p class="chordline">
        {lineBefore}
        <b style={{ color: numberColor(chord.step) }}>
          {number}
          {lineMid}
          {chordName}
        </b>
        {format(lineAfter, { roles })}
        {suffix && ` · ${suffix}`}
      </p>

      <div class="position">
        <button
          type="button"
          class="switch"
          aria-pressed={shapes !== null ? 'true' : 'false'}
          onClick={() => setShapes(shapes === null ? new Set() : null)}
        >
          <span class="knob" aria-hidden="true" />
          {t.positionSwitch}
        </button>
        {shapes !== null && (
          <div class="chips" role="group" aria-label={t.shapeGroupAria}>
            <span class="lbl">{t.shapeLabel}</span>
            {chip(t.all, shapes.size === 0, () => setShapes(new Set()))}
            {SHAPE_ORDER.map((s) => chip(s, shapes.has(s), () => toggleShapes([s]), shapeColor(s)))}
          </div>
        )}
      </div>
    </div>
  );
}
