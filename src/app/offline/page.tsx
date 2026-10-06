'use client';

import React from 'react';
import { WifiOff, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-2">
          Internet Disconnect Hai
        </h1>
        <p className="text-sm text-slate-400 mb-1">
          No Internet Connection Detected
        </p>
        <p className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 my-4 text-left leading-relaxed">
          ShopFlow ka cloud data live sync hota hai. Barah-e-karam apna Wi-Fi ya Mobile Data check karein aur dobara try karein.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Retry (Dobara Koshish)
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all border border-slate-700"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
