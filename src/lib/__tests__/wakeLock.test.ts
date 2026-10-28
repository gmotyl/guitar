import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WAKE_LOCK_KEY,
  disableWakeLock,
  enableWakeLock,
  isWakeLockSupported,
  setWakeLockPreference,
  wakeLockPreference,
} from '../wakeLock';

// Let pending request() promises settle.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mockWakeLock = (request = vi.fn(() => Promise.resolve({ release: vi.fn(() => Promise.resolve()) }))) => {
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return request;
};

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('wakeLock', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    disableWakeLock();
    Reflect.deleteProperty(navigator, 'wakeLock');
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('wakeLock: requests on enable', async () => {
    expect(isWakeLockSupported()).toBe(false);
    expect(() => enableWakeLock()).not.toThrow();

    const request = mockWakeLock();
    expect(isWakeLockSupported()).toBe(true);
    enableWakeLock();
    await flush();
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('wakeLock: re-requests on visibilitychange', async () => {
    const request = mockWakeLock();
    enableWakeLock();
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    expect(request).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(2);

    disableWakeLock();
    setVisibility('hidden');
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('wakeLock: disable releases sentinel', async () => {
    const release = vi.fn(() => Promise.resolve());
    mockWakeLock(vi.fn(() => Promise.resolve({ release })));
    enableWakeLock();
    await flush();
    disableWakeLock();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('wakeLock: rejected request is swallowed', async () => {
    const onUnhandled = vi.fn();
    process.on('unhandledRejection', onUnhandled);
    const request = mockWakeLock(vi.fn(() => Promise.reject(new Error('NotAllowedError'))));
    expect(() => enableWakeLock()).not.toThrow();
    await flush();
    expect(request).toHaveBeenCalled();
    expect(onUnhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', onUnhandled);

    const throwing = mockWakeLock(
      vi.fn(() => {
        throw new Error('sync failure');
      }),
    );
    disableWakeLock();
    expect(() => enableWakeLock()).not.toThrow();
    expect(throwing).toHaveBeenCalled();
  });

  it('wakeLock: storage throwing defaults to on', () => {
    expect(wakeLockPreference()).toBe('on');
    setWakeLockPreference('off');
    expect(localStorage.getItem(WAKE_LOCK_KEY)).toBe('off');
    expect(wakeLockPreference()).toBe('off');
    localStorage.setItem(WAKE_LOCK_KEY, 'whatever');
    expect(wakeLockPreference()).toBe('on');

    const getItem = vi.fn(() => {
      throw new Error('denied');
    });
    const setItem = vi.fn(() => {
      throw new Error('denied');
    });
    vi.stubGlobal('localStorage', { getItem, setItem });
    expect(wakeLockPreference()).toBe('on');
    expect(() => setWakeLockPreference('off')).not.toThrow();
    expect(getItem).toHaveBeenCalledWith(WAKE_LOCK_KEY);
    expect(setItem).toHaveBeenCalledWith(WAKE_LOCK_KEY, 'off');
  });
});
