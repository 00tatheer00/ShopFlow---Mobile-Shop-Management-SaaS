'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

interface InfoTooltipProps {
  title?: string;
  urduText: string;
  className?: string;
  ariaLabel?: string;
}

interface Coords {
  top: number;
  left: number;
  width: number;
  placeAbove: boolean;
}

export function InfoTooltip({
  title,
  urduText,
  className = '',
  ariaLabel = 'اردو رہنمائی دیکھیں',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 24);

    let left = rect.left - (tooltipWidth / 2) + (rect.width / 2);
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - tooltipWidth;
    }
    if (left < 12) {
      left = 12;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 200 && rect.top > 200;
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({
      top,
      left,
      width: tooltipWidth,
      placeAbove,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleScrollOrResize() {
      updatePosition();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        <span className="text-[12px] font-bold font-serif italic select-none">i</span>
      </button>

      {mounted && isOpen && coords && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-none">
          {/* Backdrop to capture touch/click outside */}
          <div
            className="fixed inset-0 pointer-events-auto bg-black/20 backdrop-blur-[1px] sm:bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Floating Urdu Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              ...(coords.placeAbove
                ? { bottom: `${window.innerHeight - coords.top}px` }
                : { top: `${coords.top}px` }),
              width: `${coords.width}px`,
            }}
            className="pointer-events-auto p-4 rounded-2xl bg-card border border-border shadow-xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[200px]">{title || 'رہنمائی'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="بند کریں"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p
              dir="rtl"
              lang="ur"
              className="font-urdu text-[14px] text-foreground font-normal leading-[2.3] tracking-normal text-right select-text pt-1"
            >
              {urduText}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

