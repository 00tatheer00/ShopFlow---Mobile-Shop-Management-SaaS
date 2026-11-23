'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';

export function PwaManager() {
  useEffect(() => {
    // 1. Register the Service Worker. This effect usually runs AFTER the
    //    window 'load' event, so only waiting for 'load' meant it often never registered.
    const registerSw = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    };
    if ('serviceWorker' in navigator) {
      if (document.readyState === 'complete') registerSw();
      else window.addEventListener('load', registerSw, { once: true });
    }

    // 2. Online/Offline Listeners
    const handleOnline = () => {
      toast.success('Internet Bahal Ho Gaya!', {
        description: 'ShopFlow ab online sync mode mein hai.',
        duration: 3500,
      });
    };

    const handleOffline = () => {
      toast.warning('Internet Disconnect Hai!', {
        description: 'Aap offline hain. Sale save karne ke liye internet zaroori hai.',
        icon: <WifiOff className="w-4 h-4 text-amber-500" />,
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('load', registerSw);
    };
  }, []);

  // No popup banner — installation is handled non-intrusively by PwaInstallButton in the top header
  return null;
}
