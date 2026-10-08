'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface CardInfoTooltipProps {
  title?: string;
  urduDetail: string;
  className?: string;
}

interface Coords {
  top: number;
  left: number;
  width: number;
  placeAbove: boolean;
}

export function CardInfoTooltip({ title, urduDetail, className = '' }: CardInfoTooltipProps) {
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

    // Horizontal positioning: align to button, clamp strictly within viewport margins
    let left = rect.left;
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - tooltipWidth;
    }
    if (left < 12) {
      left = 12;
    }

    // Vertical positioning: check available space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 180 && rect.top > 180;
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
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 hover:bg-primary text-primary hover:text-white border-2 border-primary/40 text-[11px] font-black font-serif italic shadow-xs transition-all duration-150 cursor-pointer active:scale-95 shrink-0"
        aria-label="اردو تفصیل"
        title="اردو میں تفصیل دیکھنے کے لیے کلک کریں"
      >
        i
      </button>

      {/* Floating Urdu Info Popover rendered via Portal to prevent any container clipping */}
      {mounted && isOpen && coords && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-none">
          {/* Transparent Backdrop to detect click outside */}
          <div
            className="fixed inset-0 pointer-events-auto bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Floating Popover Container */}
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
            className="pointer-events-auto p-4 rounded-2xl bg-card border-2 border-primary/50 shadow-2xl text-left animate-in fade-in-0 zoom-in-95 duration-150 ring-2 ring-primary/20"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-border">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span>💡</span>
                <span className="truncate max-w-[220px]">{title || 'رہنمائی'}</span>
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
              className="font-urdu text-[13.5px] sm:text-[14.5px] text-foreground/95 font-medium leading-[2.3] tracking-normal text-right select-text pt-1"
            >
              {urduDetail}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
