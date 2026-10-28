import { describe, expect, it } from 'vitest';
import { LANGS, t } from '../index';

// Flatten a nested dictionary into dotted key → string value pairs.
const flatten = (obj: object, prefix = ''): Record<string, unknown> =>
  Object.entries(obj).reduce<Record<string, unknown>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, flatten(v, key));
    else if (Array.isArray(v)) v.forEach((item, i) => {
      if (item && typeof item === 'object') Object.assign(acc, flatten(item, `${key}.${i}`));
      else acc[`${key}.${i}`] = item;
    });
    else acc[key] = v;
    return acc;
  }, {});

describe('dictionaries', () => {
  it('pl and en dictionaries have identical non-empty keys', () => {
    expect(LANGS).toEqual(['pl', 'en']);
    const pl = flatten(t('pl'));
    const en = flatten(t('en'));
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
    expect(Object.keys(pl).length).toBeGreaterThan(20);
    for (const dict of [pl, en]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, key).toBe('string');
        expect((value as string).trim(), key).not.toBe('');
      }
    }
  });

  it('no dictionary string names the note H', () => {
    const standaloneH = /(^|[^\p{L}])H([^\p{L}]|$)/u;
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(flatten(t(lang)))) {
        expect(standaloneH.test(value as string), `${lang}.${key}: ${value}`).toBe(false);
      }
    }
    expect(t('pl').caged.subtitle).toContain('E A D G B E');
    expect(t('en').caged.subtitle).toContain('E A D G B E');
  });

  it('pl and en templates use the same placeholders', () => {
    const pl = flatten(t('pl'));
    const en = flatten(t('en'));
    const names = (value: unknown) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(pl)) {
      expect(names(en[key]), key).toEqual(names(pl[key]));
    }
  });

  it('dictionaries: caged quality strings exist in pl and en', () => {
    const pl = t('pl').caged;
    const en = t('en').caged;
    expect([pl.quality.minor, pl.quality.major]).toEqual(['moll', 'dur']);
    expect([en.quality.minor, en.quality.major]).toEqual(['minor', 'major']);
    expect(pl.quality.label).toBe('Tryb:');
    expect(en.quality.label).toBe('Quality:');
    expect(pl.legend.thirdMinor).toBe('b3 — tercja mała');
    expect(en.legend.thirdMinor).toBe('b3 — minor third');
    expect(pl.hardShape).toBe('trudny do zagrania w całości — zwykle grany częściowo');
    expect(en.hardShape).toBe('hard to play in full — usually played in part');
    for (const d of [pl, en]) {
      expect(d.chordHeadingMinor).toContain('{key}m');
      expect(d.boardAriaMinor).toContain('{max}');
      expect(d.boardRegionAriaMinor).toContain('{key}');
    }
  });
});
