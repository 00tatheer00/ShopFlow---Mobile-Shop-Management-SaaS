'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';

export function PwaManager() {
  useEffect(() => {
    // 1. Register Service Worker in production
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
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

    // 2. Online/Offline Listeners
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // No popup banner — installation is handled non-intrusively by PwaInstallButton in the top header
  return null;
}
