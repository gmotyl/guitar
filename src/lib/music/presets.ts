import type { PitchClass } from './notes';

/** A preset chart: its key and its source in the `parseChart` format. */
export interface ChartPreset {
  id: 'blues' | 'pop' | 'twoFiveOne' | 'dooWop' | 'minor';
  keyRoot: PitchClass;
  src: string;
}

/** Preset charts in picker order. */
export const PRESETS: readonly ChartPreset[] = [
  { id: 'blues', keyRoot: 9, src: '1 1 1 1 | 4 4 1 1 | 57 4 1 >57' },
  { id: 'pop', keyRoot: 7, src: '1 5 6- 4 | 1 5 6- 4 | 1/3 4 5 1◇' },
  { id: 'twoFiveOne', keyRoot: 2, src: '2- 57 1 1 | 6- 2-_57 1 1◇' },
  { id: 'dooWop', keyRoot: 0, src: '1 6- 4 5 | 1 6- 4_5 >1' },
  { id: 'minor', keyRoot: 0, src: '6- 4 1 5 | 6- 4 1 5' },
];
