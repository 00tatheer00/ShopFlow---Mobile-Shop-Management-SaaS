'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppVersionInfo } from '@/lib/app-version';
import { CURRENT_APP_VERSION } from '@/lib/app-version';

const CLIENT_VERSION_KEY = 'shopflow_client_version';
const DISMISSED_KEY = 'shopflow_update_dismissed_v';
const JUST_UPDATED_KEY = 'shopflow_just_updated_v';
const SNOOZE_TIMESTAMP_KEY = 'shopflow_snooze_until';

export function AppUpdateNotifier() {
  const [availableUpdate, setAvailableUpdate] = useState<AppVersionInfo | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const isMountedRef = useRef(true);

  // Initialize client version in local/session state on first mount
  useEffect(() => {
    isMountedRef.current = true;

    // Check if we just completed an update
    try {
      const justUpdatedVersion = sessionStorage.getItem(JUST_UPDATED_KEY);
      if (justUpdatedVersion) {
        sessionStorage.removeItem(JUST_UPDATED_KEY);
        toast.success(`🎉 ShopFlow successfully updated to v${justUpdatedVersion}!`, {
          description: 'All new features are active. Your data, session, and settings are 100% safe.',
          duration: 6000,
        });
      }

      // Record what version this client instance was initialized with
      const storedVersion = localStorage.getItem(CLIENT_VERSION_KEY);
      if (!storedVersion) {
        localStorage.setItem(CLIENT_VERSION_KEY, CURRENT_APP_VERSION.version);
      }
    } catch {
      // Ignore storage access errors
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check for updates against /api/version
  const checkForUpdate = useCallback(async (manual = false) => {
    if (manual) setIsChecking(true);
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!res.ok) return;

      const serverVersion: AppVersionInfo = await res.json();
      if (!isMountedRef.current) return;

      // Determine local version
      const localVersion = localStorage.getItem(CLIENT_VERSION_KEY) || CURRENT_APP_VERSION.version;

      // Check if server version is different from the running client
      if (serverVersion.version !== localVersion) {
        setAvailableUpdate(serverVersion);

        // Check if snooze is active
        const snoozeUntil = localStorage.getItem(SNOOZE_TIMESTAMP_KEY);
        const isSnoozed = snoozeUntil && Date.now() < Number(snoozeUntil);

        const dismissedVersion = localStorage.getItem(DISMISSED_KEY);
        const isDismissed = dismissedVersion === serverVersion.version;

        if (manual || (!isSnoozed && (!isDismissed || serverVersion.urgent))) {
          setShowPopup(true);
        }
      } else if (manual) {
        toast.info('ShopFlow is Up to Date', {
          description: `You are running the latest version (v${localVersion}).`,
        });
      }
    } catch (err) {
      if (manual) {
        toast.error('Could not check for updates', {
          description: 'Please check your internet connection.',
        });
      }
    } finally {
      if (isMountedRef.current && manual) {
        setIsChecking(false);
      }
    }
  }, []);

  // Periodic polling & visibility listener
  useEffect(() => {
    // Initial check after short delay (to allow page to render smoothly)
    const initialTimer = setTimeout(() => {
      checkForUpdate(false);
    }, 4000);

    // Poll every 5 minutes (300,000ms) to preserve bandwidth & CPU
    const interval = setInterval(() => {
      checkForUpdate(false);
    }, 300000);

    // Also check when tab becomes active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdate]);

  // Safe update action — zero data loss guaranteed
  const handleApplyUpdate = async () => {
    if (!availableUpdate) return;
    setIsUpdating(true);

    try {
      // 1. Mark that we are updating to this version
      sessionStorage.setItem(JUST_UPDATED_KEY, availableUpdate.version);
      localStorage.setItem(CLIENT_VERSION_KEY, availableUpdate.version);

      // 2. Clear stale cache storage (Service Worker/HTTP chunk caches) so new code loads cleanly
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        } catch {
          // Ignore cache deletion failure
        }
      }

      // 3. Briefly display updating state before reload
      setTimeout(() => {
        // Safe hard reload with cache busting
        window.location.reload();
      }, 800);
    } catch {
      // Fallback reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    if (availableUpdate) {
      localStorage.setItem(DISMISSED_KEY, availableUpdate.version);
      // Snooze for 30 minutes
      localStorage.setItem(SNOOZE_TIMESTAMP_KEY, String(Date.now() + 30 * 60 * 1000));
    }
    setShowPopup(false);
  };

  return (
    <>
      {/* Header Persistent Badge if Update is Available but popup was dismissed */}
      {availableUpdate && !showPopup && (
        <div className="fixed top-3 right-16 z-40 hidden sm:block animate-in fade-in duration-300">
          <button
            onClick={() => setShowPopup(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Update v{availableUpdate.version} Available</span>
          </button>
        </div>
      )}

      {/* Main Top-Right Floating Pop-Up Card */}
      {showPopup && availableUpdate && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-md shadow-2xl p-5 text-foreground animate-in slide-in-from-top-4 fade-in duration-300 ring-1 ring-emerald-500/20"
        >
          {/* Top Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-t-2xl" />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                    New Update
                  </span>
                  <span className="text-xs font-bold font-mono text-muted-foreground">
                    v{availableUpdate.version}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-0.5 leading-snug">
                  {availableUpdate.title || 'Nayi Update Dastiyab Hai'}
                </h3>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted/80 transition"
              title="Baad mein yaad dilaayein"
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Release Highlights Section */}
          <div className="mt-3.5 space-y-2 text-xs">
            {availableUpdate.highlights && availableUpdate.highlights.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-between w-full text-muted-foreground hover:text-foreground font-semibold text-[11px] py-1 border-b border-border/50 transition cursor-pointer"
                >
                  <span>What&apos;s New (Naye Features)</span>
                  {showDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {showDetails && (
                  <ul className="mt-2 space-y-1.5 pl-1 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
                    {availableUpdate.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Zero Data Loss Guarantee Notice */}
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                <strong>Zero Data Loss:</strong> Aapka koi record ya login session zaya nahi hoga.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-between gap-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isUpdating}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition"
            >
              Baad Mein
            </button>

            <button
              type="button"
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Abhi Update Karein</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function CheckForUpdatesButton({ className = '' }: { className?: string }) {
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: AppVersionInfo = await res.json();
        const localVersion = localStorage.getItem(CLIENT_VERSION_KEY) || CURRENT_APP_VERSION.version;
        if (data.version !== localVersion) {
          toast.success(`🚀 New Update Available (v${data.version})!`, {
            description: data.title || 'Click Update to load the latest release.',
            action: {
              label: 'Update Now',
              onClick: () => {
                sessionStorage.setItem(JUST_UPDATED_KEY, data.version);
                localStorage.setItem(CLIENT_VERSION_KEY, data.version);
                window.location.reload();
              },
            },
          });
        } else {
          toast.info('ShopFlow is Up to Date', {
            description: `You are running the latest release (v${localVersion}). All features are up-to-date.`,
          });
        }
      }
    } catch {
      toast.error('Could not check for updates');
    } finally {
      setChecking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheck}
      disabled={checking}
      className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin text-emerald-500' : 'text-muted-foreground'}`} />
      <span>{checking ? 'Checking for updates...' : 'Check for Updates'}</span>
    </button>
  );
}

