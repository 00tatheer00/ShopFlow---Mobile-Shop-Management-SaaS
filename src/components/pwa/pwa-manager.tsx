'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, WifiOff, X, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isApple);

    // 3. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            // Check for updates periodically
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version ready.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 4. Online/Offline Listeners
    const handleOnline = () => {
      toast.success('Internet Bahal Ho Gaya!', {
        description: 'ShopFlow ab online sync mode mein hai.',
        duration: 3500,
      });
    };

    const handleOffline = () => {
      toast.warning('Internet Disconnect Hai!', {
        description: 'Aap offline hain. App cached screen dikha rahi hai.',
        icon: <WifiOff className="w-4 h-4 text-amber-500" />,
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Capture PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user dismissed recently
      const dismissedUntil = localStorage.getItem('shopflow_pwa_banner_dismissed');
      if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
        // Show after 3 seconds of usage
        setTimeout(() => {
          if (!isStandaloneMode) {
            setShowBanner(true);
          }
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success('🎉 ShopFlow App Install Ho Gai!', {
        description: 'Ab aap apni Home Screen se direct use kar saktay hain.',
        duration: 5000,
      });
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    // Snooze for 3 days
    localStorage.setItem(
      'shopflow_pwa_banner_dismissed',
      (Date.now() + 3 * 24 * 60 * 60 * 1000).toString()
    );
  };

  // If already running standalone or no banner to show
  if (isStandalone || (!showBanner && !showIosGuide)) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      {showBanner && !showIosGuide && (
        <aside
          aria-label="PWA App Installation"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900/95 border border-blue-500/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-blue-950/40 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
              <Smartphone className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">
                  ShopFlow App Install Karein
                </h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-medium">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-snug">
                Apne mobile ya PC par direct app ki tarah chalaein — fast aur responsive!
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-md shadow-blue-600/30 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  Baad mein (Later)
                </button>
              </div>
            </div>

            <button
              onClick={handleDismissBanner}
              className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-md"
              aria-label="Close banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-base">iPhone par Install Karein</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p>Safari browser ke neechay <strong>Share (📤)</strong> button dabayein.</p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p>Options mein scroll kar ke <strong>&apos;Add to Home Screen&apos; (➕)</strong> par tap karein.</p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p>Top right par <strong>&apos;Add&apos;</strong> dabayein. App home screen par show ho jaye gi!</p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-xs text-white transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Samajh Gaya (Done)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
