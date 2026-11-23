'use client';

import { useState, useEffect } from 'react';
import { Download, Check } from 'lucide-react';
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

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg ${className}`}>
        <Check className="w-3 h-3" />
        App Active
      </span>
    );
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setJustInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      alert("iPhone par install karne ke liye: Safari ke bottom Share icon (📤) par click karein aur 'Add to Home Screen' dabayein.");
    } else {
      alert("App install karne ke liye browser menu (3 dots) par ja kar 'Install ShopFlow' ya 'Add to Home Screen' par click karein.");
    }
  };

  return (
    <button
      onClick={handleInstall}
      title="Install ShopFlow App on this Device"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors active:scale-95 ${className}`}
    >
      <Download className="w-3.5 h-3.5 text-blue-400" />
      <span>Install App</span>
    </button>
  );
}
