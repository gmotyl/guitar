import { LANGS, isLang, type Lang } from '../i18n';

export const LANG_KEY = 'guitar.lang';

/** Stored choice if valid, else `pl` for Polish browsers, else `en`. */
export function pickLang(stored: string | null, navigatorLang: string | undefined): Lang {
  if (isLang(stored)) return stored;
  return navigatorLang?.toLowerCase().startsWith('pl') ? 'pl' : 'en';
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
var l=${JSON.stringify(LANGS)}.indexOf(s)>=0?s:(/^pl/i.test(n)?'pl':'en');
location.replace('/'+l+'/'+${JSON.stringify(slug)});})();`;
}
