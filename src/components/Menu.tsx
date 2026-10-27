import { useEffect, useRef, useState } from 'preact/hooks';
import { LANGS, type Dict, type Lang } from '../i18n';
import { storeLang } from '../lib/lang';
import { PAGES } from '../pages';

export interface MenuProps {
  lang: Lang;
  /** Path after the language prefix ('' for home), so the switch keeps the page. */
  slug: string;
  labels: Dict['menu'];
  langNames: Dict['langName'];
}

const PANEL_ID = 'site-menu';

export function Menu({ lang, slug, labels, langNames }: MenuProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onPointer);
    };
  }, [open]);

  return (
    <div class="menu">
      <button
        ref={button}
        type="button"
        class="menu-button"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={PANEL_ID}
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      <div ref={panel} id={PANEL_ID} class="menu-panel" hidden={!open}>
        <nav aria-label={labels.pages}>
          <ul>
            <li>
              <a href={`/${lang}/`} aria-current={slug === '' ? 'page' : undefined}>
                {labels.home}
              </a>
            </li>
            {PAGES.map((p) => (
              <li key={p.slug}>
                <a href={`/${lang}/${p.slug}`} aria-current={slug === p.slug ? 'page' : undefined}>
                  {p.title[lang]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div class="menu-lang" role="group" aria-label={labels.language}>
          {LANGS.map((l) =>
            l === lang ? (
              <span key={l} lang={l} aria-current="true">
                {langNames[l]}
              </span>
            ) : (
              <a key={l} href={`/${l}/${slug}`} hreflang={l} lang={l} onClick={() => storeLang(l)}>
                {langNames[l]}
              </a>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
