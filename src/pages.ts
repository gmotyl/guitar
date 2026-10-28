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
];
