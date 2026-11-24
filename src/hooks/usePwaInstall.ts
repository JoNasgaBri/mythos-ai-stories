import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'mythos_pwa_dismiss_until_v1';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    Boolean(nav.standalone) ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

function detectIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (window.navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  return isIos && isSafari;
}

function isBannerDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Number(raw) > Date.now();
  } catch {
    return false;
  }
}

export interface PwaState {
  isStandalone: boolean;
  isIosSafari: boolean;
  isOnline: boolean;
  canPromptInstall: boolean;
  showInstallBanner: boolean;
  updateAvailable: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'ios_guide' | 'unavailable'>;
  dismissInstallBanner: (days?: number) => void;
  applyUpdate: () => void;
}

export function usePwaInstall(): PwaState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() =>
    detectStandalone(),
  );
  const [isIosSafari] = useState<boolean>(() => detectIosSafari());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [dismissed, setDismissed] = useState<boolean>(() => isBannerDismissed());
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onSwUpdate = () => setUpdateAvailable(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('mythos-sw-update', onSwUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('mythos-sw-update', onSwUpdate);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return choice.outcome;
    }
    if (isIosSafari && !isStandalone) {
      return 'ios_guide' as const;
    }
    return 'unavailable' as const;
  }, [deferredPrompt, isIosSafari, isStandalone]);

  const dismissInstallBanner = useCallback((days = 7) => {
    setDismissed(true);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + days * 24 * 60 * 60 * 1000),
      );
    } catch {
      // ignore
    }
  }, []);

  const applyUpdate = useCallback(() => {
    const reg = window.__mythosSwReg;
    if (reg?.waiting) {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.location.reload();
        },
        { once: true },
      );
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, []);

  const canPromptInstall = Boolean(deferredPrompt) && !isStandalone;
  const showInstallBanner =
    !isStandalone && !dismissed && (canPromptInstall || isIosSafari);

  return {
    isStandalone,
    isIosSafari,
    isOnline,
    canPromptInstall,
    showInstallBanner,
    updateAvailable,
    promptInstall,
    dismissInstallBanner,
    applyUpdate,
  };
}
