import { describe, expect, it } from 'vitest';
import { PAGES } from '../pages';

describe('page registry', () => {
  it('pages: registry lists caged and pentatonic', () => {
    expect(PAGES.map((p) => p.slug)).toEqual(['caged', 'pentatonic']);
    for (const page of PAGES) {
      for (const lang of ['pl', 'en'] as const) {
        expect(page.title[lang].trim(), `${page.slug}.${lang}`).not.toBe('');
        expect(page.blurb[lang].trim(), `${page.slug}.${lang}`).not.toBe('');
      }
    }
    expect(PAGES.map((p) => p.title.pl)).toEqual(['System CAGED', 'Pentatonika']);
    expect(PAGES.map((p) => p.title.en)).toEqual(['The CAGED system', 'The pentatonic scale']);
  });
});
