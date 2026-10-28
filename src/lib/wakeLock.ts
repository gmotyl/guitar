// Screen wake lock: keeps the screen on while a cheat sheet is open. Every failure is silent.

export const WAKE_LOCK_KEY = 'guitar.wakeLock';

export type WakeLockPreference = 'on' | 'off';

let enabled = false;
let sentinel: WakeLockSentinel | null = null;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator && !!navigator.wakeLock;
}

function release(): void {
  const held = sentinel;
  sentinel = null;
  try {
    held?.release().catch(() => {});
  } catch {
    // Ignore: the browser may have released it already.
  }
}

function request(): void {
  if (!enabled || !isWakeLockSupported()) return;
  try {
    navigator.wakeLock.request('screen').then(
      (s) => {
        if (enabled) {
          release();
          sentinel = s;
        } else {
          s.release().catch(() => {});
        }
      },
      () => {
        // Ignore: e.g. the page is hidden or a battery saver refuses the lock.
      },
    );
  } catch {
    // Ignore: a broken implementation must not break the page.
  }
}

/** The browser drops the lock when the page is hidden, so request it again on return. */
function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') request();
}

/** Request the screen lock and keep it across tab switches; a no-op without the API. */
export function enableWakeLock(): void {
  if (!isWakeLockSupported()) return;
  if (!enabled) document.addEventListener('visibilitychange', onVisibilityChange);
  enabled = true;
  request();
}

export function disableWakeLock(): void {
  if (enabled) document.removeEventListener('visibilitychange', onVisibilityChange);
  enabled = false;
  release();
}

/** Stored `'off'` disables; anything else, or unavailable storage (private mode), means on. */
export function wakeLockPreference(): WakeLockPreference {
  try {
    return localStorage.getItem(WAKE_LOCK_KEY) === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
}

/** Remember the visitor's choice; storage may be unavailable, so never throw. */
export function setWakeLockPreference(value: WakeLockPreference): void {
  try {
    localStorage.setItem(WAKE_LOCK_KEY, value);
  } catch {
    // Ignore: the choice just won't persist.
  }
}
