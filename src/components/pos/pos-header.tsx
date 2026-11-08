'use client';

import Link from 'next/link';
import { ArrowLeft, RotateCcw, Store } from 'lucide-react';

interface PosHeaderProps {
  shopName: string;
  hasItems: boolean;
  onStartOver: () => void;
}

export function PosHeader({ shopName, hasItems, onStartOver }: PosHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between gap-3 bg-card border border-border rounded-xl px-3.5 py-2 shadow-2xs">
      {/* Left: Back Link & Status */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-lg hover:bg-muted shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </Link>

        <div className="h-4 w-px bg-border shrink-0" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground truncate">
            New Sale
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Live
          </span>
          {shopName && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 border border-border px-2.5 py-0.5 rounded-md truncate max-w-[220px]">
              <Store className="h-3 w-3 text-muted-foreground/80 shrink-0" />
              <span className="truncate">{shopName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Start Over Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onStartOver}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            hasItems
              ? 'border-rose-300 bg-rose-50/70 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title="Clear basket and start fresh"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Start Over</span>
        </button>
      </div>
    </header>
  );
}
