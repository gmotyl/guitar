import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickLang, redirectScript, storeLang } from '../lang';

const throwingStorage = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

describe('lang', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pickLang prefers a valid stored language', () => {
    expect(pickLang('en', 'pl-PL')).toBe('en');
    expect(pickLang('pl', 'en-US')).toBe('pl');
    expect(pickLang('xx', undefined)).toBe('en');
  });

  it('pickLang maps pl browsers to pl and everything else to en', () => {
    expect(pickLang(null, 'pl-PL')).toBe('pl');
    expect(pickLang(null, 'pl')).toBe('pl');
    expect(pickLang(null, 'PL-pl')).toBe('pl');
    expect(pickLang(null, 'de-DE')).toBe('en');
    expect(pickLang(null, 'pt-BR')).toBe('en');
    expect(pickLang(null, 'plx')).toBe('en');
    expect(pickLang(null, undefined)).toBe('en');
  });

  it('pickLang defaults to pl on the gitara host unless a choice is stored', () => {
    expect(pickLang(null, 'en-US', 'gitara.motyl.dev')).toBe('pl');
    expect(pickLang('en', 'en-US', 'gitara.motyl.dev')).toBe('en');
    expect(pickLang(null, 'en-US', 'guitar.motyl.dev')).toBe('en');
    expect(pickLang(null, 'en-US', 'mygitara.dev')).toBe('en');
  });

  it('redirect stub sends en browsers on the gitara host to pl', () => {
    const run = new Function('localStorage', 'navigator', 'location', redirectScript('caged'));
    const empty = { getItem: () => null, setItem: () => {} };
    const replace = vi.fn();
    run(empty, { language: 'en-US' }, { hostname: 'gitara.motyl.dev', replace });
    expect(replace).toHaveBeenLastCalledWith('/pl/caged');
    run(empty, { language: 'en-US' }, { hostname: 'guitar.motyl.dev', replace });
    expect(replace).toHaveBeenLastCalledWith('/en/caged');
    const stored = { getItem: () => 'en', setItem: () => {} };
    run(stored, { language: 'en-US' }, { hostname: 'gitara.motyl.dev', replace });
    expect(replace).toHaveBeenLastCalledWith('/en/caged');
  });

  it('storeLang survives a throwing localStorage', () => {
    vi.stubGlobal('localStorage', throwingStorage);
    expect(() => storeLang('pl')).not.toThrow();

    // The stub page's inline script follows the same rules and must not throw either.
    const replace = vi.fn();
    const run = new Function('localStorage', 'navigator', 'location', redirectScript('caged'));
    expect(() => run(throwingStorage, { language: 'pl-PL' }, { replace })).not.toThrow();
    expect(replace).toHaveBeenCalledWith('/pl/caged');

    const stored = { getItem: () => 'en', setItem: () => {} };
    run(stored, { language: 'pl-PL' }, { replace });
    expect(replace).toHaveBeenLastCalledWith('/en/caged');

    const empty = { getItem: () => null, setItem: () => {} };
    run(empty, { language: 'pt-BR' }, { replace });
    expect(replace).toHaveBeenLastCalledWith('/en/caged');
    run(empty, { language: 'pl' }, { replace });
    expect(replace).toHaveBeenLastCalledWith('/pl/caged');

    vi.unstubAllGlobals();
    storeLang('en');
    expect(localStorage.getItem('guitar.lang')).toBe('en');
  });
});
