'use client';

interface PosShortcutsBarProps {
  onSearchFocus: () => void;
}

export function PosShortcutsBar({ onSearchFocus }: PosShortcutsBarProps) {
  return (
    <footer className="shrink-0 flex items-center justify-between px-3 py-1.5 rounded-xl bg-card border border-border text-[11px] text-muted-foreground shadow-2xs">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap overflow-hidden">
        <button
          type="button"
          onClick={onSearchFocus}
          className="inline-flex items-center gap-1.5 hover:text-foreground cursor-pointer"
        >
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold text-[10px] text-foreground">
              F2
            </kbd>
            <span className="text-[10px]">or</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold text-[10px] text-foreground">
              /
            </kbd>
          </span>
          <span>Search</span>
        </button>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold text-[10px] text-foreground">
            Enter
          </kbd>
          <span>Add item</span>
        </span>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold text-[10px] text-foreground">
            Tab
          </kbd>
          <span>Move focus</span>
        </span>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold text-[10px] text-foreground">
            Ctrl+Enter
          </kbd>
          <span>Complete sale</span>
        </span>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold text-[10px] text-foreground">
            Esc
          </kbd>
          <span>Close/Cancel</span>
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-muted-foreground/80">
        <span>Counter POS</span>
      </div>
    </footer>
  );
}
