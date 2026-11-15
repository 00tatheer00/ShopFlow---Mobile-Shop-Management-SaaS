'use client';

import Link from 'next/link';
import { ArrowLeft, RotateCcw, Plus } from 'lucide-react';

interface PosHeaderProps {
  shopName?: string;
  hasItems: boolean;
  onStartOver: () => void;
}

export function PosHeader({ hasItems, onStartOver }: PosHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
      {/* Left: POS Pill Badge, Title, Subtitle & Live Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
          POS
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate">
              Point of Sale
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block mt-0.5 truncate">
            Walk-in customer checkout & thermal receipts
          </p>
        </div>
      </div>

      {/* Right: + New Product, Start Over & Back link (Strict single line, no wrapping) */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>New Product</span>
        </Link>

        <button
          type="button"
          onClick={onStartOver}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
            hasItems
              ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
          title="Clear basket and start fresh"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Start over</span>
        </button>

        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pl-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>
    </header>
  );
}
