import { describe, expect, it } from 'vitest';
import { PAGES } from '../pages';

describe('page registry', () => {
  it('registry lists the CAGED page in both languages', () => {
    expect(PAGES).toHaveLength(1);
    const [page] = PAGES;
    expect(page.slug).toBe('caged');
    for (const lang of ['pl', 'en'] as const) {
      expect(page.title[lang].trim()).not.toBe('');
      expect(page.blurb[lang].trim()).not.toBe('');
    }
    expect(page.title.pl).toBe('System CAGED');
    expect(page.title.en).toBe('The CAGED system');
  });
});
