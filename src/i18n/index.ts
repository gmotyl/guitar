import { en } from './en';
import { pl } from './pl';

export type Lang = 'pl' | 'en';
export const LANGS: readonly Lang[] = ['pl', 'en'];
export type Dict = typeof pl;

const DICTS: Record<Lang, Dict> = { pl, en };

export function t(lang: Lang): Dict {
  return DICTS[lang];
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

// Fill `{name}` placeholders in a dictionary template; unknown placeholders are left as is.
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
