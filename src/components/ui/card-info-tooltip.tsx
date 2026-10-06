'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface CardInfoTooltipProps {
  title?: string;
  urduDetail: string;
  className?: string;
}

export function CardInfoTooltip({ title, urduDetail, className = '' }: CardInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center h-4.5 w-4.5 rounded-full bg-foreground/10 hover:bg-primary/20 text-foreground/80 hover:text-primary border border-border/80 text-[11px] font-black font-serif italic shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
        aria-label="Roman Urdu Detail"
        title="Click or hover for Roman Urdu explanation"
      >
        i
      </button>

      {/* Floating Roman Urdu Info Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 sm:w-72 p-3 rounded-2xl bg-card border border-border shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150 ring-1 ring-primary/20"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span>💡</span>
              <span>{title || 'Yeh Card Kis Liye Hai?'}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-foreground font-medium leading-relaxed">
            {urduDetail}
          </p>
        </div>
      )}
    </div>
  );
}
