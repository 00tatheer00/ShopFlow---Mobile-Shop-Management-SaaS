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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(300, window.innerWidth - 24);

    let left = rect.left - tooltipWidth / 2 + rect.width / 2;
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - tooltipWidth;
    }
    if (left < 12) {
      left = 12;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 180 && rect.top > 180;
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

    setCoords({
      top,
      left,
      width: tooltipWidth,
      placeAbove,
    });
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

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
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center h-4.5 w-4.5 rounded-full bg-muted/70 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 active:scale-95"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        <span className="text-[10.5px] font-bold font-serif italic select-none">i</span>
      </button>

      {mounted && isOpen && coords && createPortal(
        <div
          className="fixed inset-0 z-[99999] pointer-events-none"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Transparent Backdrop to close on touch outside for mobile */}
          <div
            className="fixed inset-0 pointer-events-auto bg-transparent sm:hidden"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Floating Urdu Tooltip Card */}
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
            className="pointer-events-auto p-3 rounded-xl bg-card border border-border shadow-lg text-left animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/70">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate max-w-[190px]">{title || 'رہنمائی'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="بند کریں"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p
              dir="rtl"
              lang="ur"
              className="font-urdu text-[13px] text-foreground font-normal leading-[2.1] tracking-normal text-right select-text pt-0.5"
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
