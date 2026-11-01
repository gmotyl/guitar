import { describe, expect, it } from 'vitest';
import { PAGES } from '../pages';

describe('page registry', () => {
  it('registry lists caged, pentatonic and nashville', () => {
    expect(PAGES.map((p) => p.slug)).toEqual(['caged', 'pentatonic', 'nashville']);
    for (const page of PAGES) {
      for (const lang of ['pl', 'en'] as const) {
        expect(page.title[lang].trim(), `${page.slug}.${lang}`).not.toBe('');
        expect(page.blurb[lang].trim(), `${page.slug}.${lang}`).not.toBe('');
      }
    }
    expect(PAGES.map((p) => p.title.pl)).toEqual(['System CAGED', 'Pentatonika', 'System Nashville']);
    expect(PAGES.map((p) => p.title.en)).toEqual([
      'The CAGED system',
      'The pentatonic scale',
      'The Nashville Number System',
    ]);
  });
});
