import type { Lang } from './i18n';

export interface SitePage {
  slug: string;
  title: Record<Lang, string>;
  blurb: Record<Lang, string>;
}

// Registry of content pages: drives the hamburger menu and the home tiles.
export const PAGES: readonly SitePage[] = [
  {
    slug: 'caged',
    title: { pl: 'System CAGED', en: 'The CAGED system' },
    blurb: {
      pl: 'Pięć kształtów CAGED dla akordów C, A, G, E i D na gryfie do 15. progu.',
      en: 'The five CAGED shapes for the C, A, G, E and D chords up to the 15th fret.',
    },
  },
  {
    slug: 'pentatonic',
    title: { pl: 'Pentatonika', en: 'The pentatonic scale' },
    blurb: {
      pl: 'Pięć pudełek pentatoniki molowej i durowej z nałożonymi akordami tonacji.',
      en: 'The five boxes of the minor and major pentatonic with the key chords on top.',
    },
  },
  {
    slug: 'nashville',
    title: { pl: 'System Nashville', en: 'The Nashville Number System' },
    blurb: {
      pl: 'Akordy zapisane numerami stopni: zmień tonację, a numery zostają. Progresje z chartem i akordem na gryfie.',
      en: 'Chords written as scale-step numbers: change the key and the numbers stay. Progressions as a chart with the chord on the fretboard.',
    },
  },
];
