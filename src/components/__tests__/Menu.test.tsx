import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { Menu } from '../Menu';
import { PAGES } from '../../pages';
import { t } from '../../i18n';

const renderMenu = (lang: 'pl' | 'en', slug: string) =>
  render(<Menu lang={lang} slug={slug} labels={t(lang).menu} langNames={t(lang).langName} />);

describe('Menu', () => {
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, 'wakeLock');
    vi.unstubAllGlobals();
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

  it('menu closes on a second activation of the button', () => {
    renderMenu('en', 'caged');
    const button = screen.getByRole('button', { name: 'Open menu' });
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;

    fireEvent.click(button);
    expect(panel.hidden).toBe(false);

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Open menu');
    expect(panel.hidden).toBe(true);
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

  describe('wake lock switch', () => {
    // Let pending request() promises settle.
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const mockWakeLock = () => {
      const release = vi.fn(() => Promise.resolve());
      const request = vi.fn(() => Promise.resolve({ release }));
      Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
      return { request, release };
    };

    it('Menu: switch toggles and stores preference', async () => {
      const { request, release } = mockWakeLock();
      renderMenu('en', 'caged');
      await flush();
      expect(request).toHaveBeenCalledWith('screen');

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      const toggle = screen.getByRole('button', { name: 'Keep screen on' });
      expect(toggle.getAttribute('aria-pressed')).toBe('true');

      fireEvent.click(toggle);
      expect(release).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('guitar.wakeLock')).toBe('off');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');

      fireEvent.click(toggle);
      await flush();
      expect(request).toHaveBeenCalledTimes(2);
      expect(localStorage.getItem('guitar.wakeLock')).toBe('on');
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
    });

    it('Menu: stored off makes no request', async () => {
      localStorage.setItem('guitar.wakeLock', 'off');
      const { request } = mockWakeLock();
      renderMenu('pl', 'caged');
      await flush();
      expect(request).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Otwórz menu' }));
      const toggle = screen.getByRole('button', { name: 'Ekran nie gaśnie' });
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });

    it('Menu: no switch without wakeLock API', () => {
      expect('wakeLock' in navigator).toBe(false);
      expect(() => renderMenu('en', 'caged')).not.toThrow();
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(screen.queryByRole('button', { name: 'Keep screen on' })).toBeNull();
    });

    it('Menu: storage throwing still requests the lock', async () => {
      const getItem = vi.fn(() => {
        throw new Error('denied');
      });
      const setItem = vi.fn(() => {
        throw new Error('denied');
      });
      vi.stubGlobal('localStorage', { getItem, setItem, clear: () => {} });
      const { request } = mockWakeLock();
      expect(() => renderMenu('en', 'caged')).not.toThrow();
      await flush();
      expect(getItem).toHaveBeenCalledWith('guitar.wakeLock');
      expect(request).toHaveBeenCalledWith('screen');

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      const toggle = screen.getByRole('button', { name: 'Keep screen on' });
      expect(() => fireEvent.click(toggle)).not.toThrow();
      expect(setItem).toHaveBeenCalledWith('guitar.wakeLock', 'off');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });
  });
});
