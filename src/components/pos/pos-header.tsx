'use client';

import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface PosHeaderProps {
  shopName?: string;
  hasItems: boolean;
  onStartOver: () => void;
}

export function PosHeader({ hasItems, onStartOver }: PosHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between gap-2 py-1">
      {/* Left: Back Link & Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </Link>

        <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          New Sale
        </h1>

        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          Live
        </span>
      </div>

      {/* Right: Start Over Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onStartOver}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
            hasItems
              ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
          title="Clear basket and start fresh"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Start over</span>
        </button>
      </div>
    </header>
  );
}
