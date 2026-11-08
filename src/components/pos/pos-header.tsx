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
    <header className="shrink-0 flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-2.5 py-1 shadow-2xs">
      {/* Left: Back Link & Status */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted shrink-0"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back</span>
        </Link>

        <div className="h-3.5 w-px bg-border shrink-0" />

        <div className="flex items-center gap-1.5 min-w-0">
          <h1 className="text-xs font-semibold tracking-tight text-foreground truncate">
            New Sale
          </h1>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Live
          </span>
          {shopName && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground bg-muted/40 border border-border/80 px-2 py-0.2 rounded truncate max-w-[200px]">
              <Store className="h-2.5 w-2.5 text-muted-foreground/80 shrink-0" />
              <span className="truncate">{shopName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Start Over Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onStartOver}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer shadow-2xs ${
            hasItems
              ? 'border-rose-300 bg-rose-50/70 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title="Clear basket and start fresh"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Start Over</span>
        </button>
      </div>
    </header>
  );
}
