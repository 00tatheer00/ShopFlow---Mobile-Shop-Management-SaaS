'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** true only after hydration on the client (safe replacement for setMounted-in-effect). */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function subscribeStandalone(callback: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mq.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Is the app running as an installed PWA? */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, () => false);
}

/** Is this an iPhone / iPad (no install prompt, needs "Add to Home Screen")? */
export function useIsIos(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()),
    () => false
  );
}
