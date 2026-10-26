import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { Menu } from '../Menu';
import { PAGES } from '../../pages';
import { t } from '../../i18n';

const renderMenu = (lang: 'pl' | 'en', slug: string) =>
  render(<Menu lang={lang} slug={slug} labels={t(lang).menu} langNames={t(lang).langName} />);

describe('Menu', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('menu toggles aria-expanded and closes on Escape with focus returned', () => {
    renderMenu('pl', 'caged');
    const button = screen.getByRole('button', { name: 'Otwórz menu' });
    const panelId = button.getAttribute('aria-controls')!;
    const panel = document.getElementById(panelId)!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Zamknij menu');
    expect(panel.hidden).toBe(false);
    expect(panel.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it('menu lists registry pages and links the switch to the same page in the other language', () => {
    renderMenu('en', 'caged');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/en/');
    for (const page of PAGES) {
      expect(screen.getByRole('link', { name: page.title.en }).getAttribute('href')).toBe(`/en/${page.slug}`);
    }

    const other = screen.getByRole('link', { name: 'Polski' });
    expect(other.getAttribute('href')).toBe('/pl/caged');
    expect(other.getAttribute('hreflang')).toBe('pl');
    expect(screen.queryByRole('link', { name: 'English' })).toBeNull();

    other.addEventListener('click', (e) => e.preventDefault()); // keep jsdom from navigating
    fireEvent.click(other);
    expect(localStorage.getItem('guitar.lang')).toBe('pl');
  });
});
