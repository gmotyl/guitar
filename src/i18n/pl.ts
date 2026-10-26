// Polish dictionary. CAGED strings come verbatim from the mockup
// (projects/gitara/mockups/2026-10-26-caged-piec-akordow-c-a-g-e-d.html), with the note H written as B.
// Parametrised strings use `{name}` placeholders, filled with `format()` from ./index,
// so the whole dictionary stays plain data and can be passed as an island prop.
// Not `as const`: `Dict = typeof pl` must type values as `string` so en.ts can satisfy it.
export const pl = {
  site: {
    name: 'Gitara',
    description: 'Interaktywne ściągi do nauki gitary.',
  },
  menu: {
    open: 'Otwórz menu',
    close: 'Zamknij menu',
    pages: 'Strony',
    language: 'Język',
    home: 'Strona główna',
  },
  langName: {
    pl: 'Polski',
    en: 'English',
  },
  home: {
    intro: 'Interaktywne ściągi do nauki gitary. Wybierz stronę.',
  },
  footer: {
    copyright: '© {year} Grzegorz Motyl',
    link: 'motyl.dev',
  },
  notFound: {
    title: 'Nie znaleziono strony',
    body: 'Ta strona nie istnieje albo została przeniesiona.',
    back: 'Wróć na stronę główną',
  },
  stub: {
    chooseLanguage: 'Wybierz język',
    redirecting: 'Przekierowuję…',
  },
  caged: {
    title: 'System CAGED — pięć kształtów dla akordów C, A, G, E i D',
    subtitle:
      'Każdy z pięciu podstawowych akordów durowych zagrany pięcioma kształtami CAGED na progach 0–15. Kolejność kształtów jest zawsze ta sama: C → A → G → E → D → C… Zmienia się tylko kształt, od którego zaczynasz przy siodełku. Strój standardowy E A D G B E.',
    facts: [
      {
        title: 'Jak czytać',
        body: 'Kolor to kształt. Kropka R to pryma (nazwa akordu), 3 to tercja, 5 to kwinta. Ten sam kolor w dwóch miejscach to ten sam kształt powtórzony 12 progów wyżej.',
      },
      {
        title: 'Zasada przesuwania',
        body: 'Kształt przesuwasz razem z primą. Kształt E z primą na 5. progu struny E to akord A, z primą na 3. progu to akord G.',
      },
      {
        title: 'Dur → moll',
        body: 'W każdym kształcie zmieniasz tylko kropki „3” o jeden próg w dół. Prymy i kwinty zostają na miejscu.',
      },
    ],
    chordLabel: 'Akord:',
    shapeLabel: 'Kształt:',
    all: 'wszystkie',
    chordGroupAria: 'Tonacja',
    shapeGroupAria: 'Kształt',
    legend: {
      root: 'R — pryma',
      third: '3 — tercja wielka',
      fifth: '5 — kwinta',
    },
    chordHeading: 'Akord {key}-dur',
    tones: 'dźwięki:',
    order: 'Od siodełka w górę:',
    orderRepeat: '(12 progów wyżej)',
    band: 'kształt {shape}',
    tileFrets: 'progi {from}–{to}',
    tileGrip: 'chwyt (E→e):',
    tileRoot: 'pryma:',
    boardAria: 'Pięć kształtów CAGED akordu {key}-dur na progach 0 do {max}',
    boardRegionAria: 'Gryf akordu {key}-dur',
  },
};
