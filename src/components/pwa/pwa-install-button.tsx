'use client';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useIsIos, useIsStandalone } from '@/lib/hooks';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const isStandalone = useIsStandalone();
  const isIos = useIsIos();
  const isInstalled = isStandalone || justInstalled;

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setJustInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // Already installed: nothing to show
  if (isInstalled) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setJustInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      toast.info("iPhone par install karne ke liye: Safari ke bottom Share icon (📤) par click karein aur 'Add to Home Screen' dabayein.", { duration: 9000 });
    } else {
      toast.info("App install karne ke liye browser menu (3 dots) par ja kar 'Install ShopFlow' ya 'Add to Home Screen' par click karein.", { duration: 9000 });
    }
  };

  return (
    <button
      onClick={handleInstall}
      title="Install ShopFlow App on this Device"
      className={`btn btn-outline ${className}`}
    >
      <Download className="h-4 w-4 text-primary" />
      <span>Install App</span>
    </button>
  );
}
