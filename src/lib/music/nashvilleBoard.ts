import type { FretDot, FretOutline } from '../../components/Fretboard';
import { SHAPES } from './caged';
import { TUNING, type PitchClass } from './notes';
import { chordTones, numberColor, positionWindow, stepPc, type CagedShape, type NumberChord, type Step } from './numbers';
import { isShown } from '../selection';

const MAX_FRET = 15;
/** Window order on the board: the CAGED sequence up the neck from the E shape. */
const SHAPE_ORDER: readonly CagedShape[] = ['E', 'D', 'C', 'A', 'G'];
const STEPS: readonly Step[] = [1, 2, 3, 4, 5, 6, 7];

/** CSS colour of a CAGED shape, e.g. 'var(--e)'. */
const shapeColor = (shape: CagedShape) => `var(${SHAPES.major.find((s) => s.key === shape)!.color})`;

/**
 * Board data for the Nashville page. `shapes === null` means the position switch is off:
 * the chord's tones on the whole neck. Otherwise each selected CAGED window (empty set = all
 * five, in E D C A G order) gets one dashed outline over all six strings; chord tones outside
 * every window are dimmed, and the key's other scale notes inside any window are outlined
 * dots labelled with their step.
 */
export function buildNumberBoard(s: { keyRoot: PitchClass; chord: NumberChord; shapes: ReadonlySet<CagedShape> | null }): {
  dots: FretDot[];
  outlines: FretOutline[];
  windows: { shape: CagedShape; from: number; to: number }[];
} {
  const { keyRoot, chord, shapes } = s;
  const windows =
    shapes === null
      ? []
      : SHAPE_ORDER.filter((shape) => isShown(shapes, shape)).map((shape) => {
          const [from, to] = positionWindow(keyRoot, shape);
          return { shape, from, to };
        });
  const inWindow = (fret: number) => windows.some((w) => w.from <= fret && fret <= w.to);

  const outlines: FretOutline[] = windows.map((w) => ({
    group: `window-${w.shape}`,
    color: shapeColor(w.shape),
    cells: TUNING.flatMap((_, string) =>
      Array.from({ length: w.to - w.from + 1 }, (_, i) => ({ string, fret: w.from + i })),
    ),
    dashed: true,
  }));

  const tones = chordTones(chord, keyRoot);
  const color = numberColor(chord.step);
  const dots: FretDot[] = [];
  TUNING.forEach((str, string) => {
    for (let fret = 0; fret <= MAX_FRET; fret++) {
      const pc = (str.pc + fret) % 12;
      const tone = tones.find((t) => t.pc === pc);
      if (tone) {
        dots.push({
          string,
          fret,
          label: tone.role,
          color,
          variant: 'filled',
          ring: tone.role === 'R',
          dimmed: windows.length > 0 && !inWindow(fret),
        });
        continue;
      }
      if (windows.length === 0 || !inWindow(fret)) continue;
      const step = STEPS.find((st) => stepPc(st, keyRoot) === pc);
      if (!step) continue;
      dots.push({ string, fret, label: String(step), color: numberColor(step), variant: 'outline' });
    }
  });

  return { dots, outlines, windows };
}
