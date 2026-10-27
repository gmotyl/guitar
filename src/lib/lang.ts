import { LANGS, isLang, type Lang } from '../i18n';

export const LANG_KEY = 'guitar.lang';

/** Polish-branded hosts (`gitara.motyl.dev`) default to Polish regardless of the browser. */
const PL_HOST = /^gitara\./i;

/**
 * Stored choice if valid, else `pl` on a Polish-branded host, else `pl` when the primary
 * language subtag is `pl`, else `en`.
 */
export function pickLang(stored: string | null, navigatorLang: string | undefined, host = ''): Lang {
  if (isLang(stored)) return stored;
  if (PL_HOST.test(host)) return 'pl';
  return /^pl(-|$)/i.test(navigatorLang ?? '') ? 'pl' : 'en';
}

/** Remember the visitor's language; storage may be unavailable (private mode), so never throw. */
export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore: the choice just won't persist.
  }
}

/**
 * Inline script for unprefixed redirect stubs (`/`, `/caged`): the same rules as `pickLang`,
 * written as plain ES5 so it runs before any bundle, then `location.replace('/<lang>/<slug>')`.
 */
export function redirectScript(slug: string): string {
  return `(function(){var s=null,n='';
try{s=localStorage.getItem(${JSON.stringify(LANG_KEY)})}catch(e){}
try{n=navigator.language||''}catch(e){}
var l=${JSON.stringify(LANGS)}.indexOf(s)>=0?s:(${PL_HOST}.test(location.hostname||'')||/^pl(-|$)/i.test(n)?'pl':'en');
location.replace('/'+l+'/'+${JSON.stringify(slug)});})();`;
}
