// English dictionary: a faithful translation of pl.ts. Typed `Dict`, so a missing key fails `astro check`.
import type { Dict } from './index';

export const en: Dict = {
  site: {
    name: 'Guitar',
    description: 'Interactive guitar cheat sheets.',
  },
  menu: {
    open: 'Open menu',
    close: 'Close menu',
    pages: 'Pages',
    language: 'Language',
    home: 'Home',
    wakeLock: 'Keep screen on',
  },
  langName: {
    pl: 'Polski',
    en: 'English',
  },
  home: {
    intro: 'Interactive guitar cheat sheets. Pick a page.',
  },
  footer: {
    copyright: '© {year} Grzegorz Motyl',
    link: 'motyl.dev',
  },
  notFound: {
    title: 'Page not found',
    body: 'This page does not exist or has been moved.',
    back: 'Back to the home page',
  },
  stub: {
    chooseLanguage: 'Choose language',
    redirecting: 'Redirecting…',
  },
  caged: {
    title: 'The CAGED system — five shapes for the C, A, G, E and D chords',
    subtitle:
      'Each of the five basic major or minor chords played with the five CAGED shapes on frets 0–15. The order of the shapes is always the same: C → A → G → E → D → C… Only the shape you start with at the nut changes. Standard tuning E A D G B E.',
    facts: [
      {
        title: 'How to read it',
        body: 'Color is the shape. The R dot is the root (the chord’s name), 3 is the major third, b3 is the minor third, 5 is the fifth. The same color in two places is the same shape repeated 12 frets higher.',
      },
      {
        title: 'Moving a shape',
        body: 'The shape moves together with its root. The E shape with its root on the 5th fret of the low E string is an A chord; with the root on the 3rd fret it is a G chord.',
      },
      {
        title: 'Major → minor',
        body: 'In every shape, move only the “3” dots one fret down. The roots and fifths stay where they are.',
      },
    ],
    chordLabel: 'Chord:',
    shapeLabel: 'Shape:',
    all: 'all',
    chordGroupAria: 'Key',
    shapeGroupAria: 'Shape',
    quality: {
      label: 'Quality:',
      groupAria: 'Chord quality',
      minor: 'minor',
      major: 'major',
    },
    legend: {
      root: 'R — root',
      third: '3 — major third',
      thirdMinor: 'b3 — minor third',
      fifth: '5 — fifth',
    },
    chordHeading: '{key} major',
    chordHeadingMinor: '{key} minor',
    tones: 'notes:',
    order: 'From the nut up:',
    orderRepeat: '(12 frets higher)',
    band: 'shape {shape}',
    tileFrets: 'frets {from}–{to}',
    tileGrip: 'fingering (E→e):',
    tileRoot: 'root:',
    boardAria: 'The five CAGED shapes of the {key} major chord on frets 0 to {max}',
    boardRegionAria: 'Fretboard of the {key} major chord',
    boardAriaMinor: 'The five CAGED shapes of the {key} minor chord on frets 0 to {max}',
    boardRegionAriaMinor: 'Fretboard of the {key} minor chord',
    hardShape: 'hard to play in full — usually played in part',
  },
  pentatonic: {
    title: 'The pentatonic scale with the key chords',
    subtitle:
      'The five boxes of the minor or major pentatonic on frets 0–15. A box takes the colour of the CAGED shape it holds. Pick several key chords at once: each has its own colour, so while you play the scale you see its shape in every box. Standard tuning E A D G B E.',
    rootLabel: 'Root:',
    rootGroupAria: 'Root',
    quality: {
      label: 'Scale:',
      groupAria: 'Scale',
      minor: 'minor',
      major: 'major',
    },
    boxLabel: 'Box:',
    boxGroupAria: 'Box',
    all: 'all',
    chordLabel: 'Chords:',
    chordGroupAria: 'Key chords',
    clear: 'clear',
    keyName: '{note} {quality}',
    relative: '{key} pentatonic: same notes as {rel}.',
    legend: {
      root: 'scale root',
      scale: 'other scale notes (degree)',
      outside: 'chord tone outside the pentatonic',
    },
    tile: 'Box {n}',
    tileDetail: 'shape {shape} · frets {ranges}',
    boardAria: 'The {key} pentatonic on frets 0–{max}',
    boardRegionAria: 'Fretboard: the {key} pentatonic',
  },
};
