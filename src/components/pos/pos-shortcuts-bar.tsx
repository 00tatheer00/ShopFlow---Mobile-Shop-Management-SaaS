'use client';

interface PosShortcutsBarProps {
  onSearchFocus: () => void;
}

export function PosShortcutsBar({ onSearchFocus }: PosShortcutsBarProps) {
  return (
    <footer className="shrink-0 flex items-center justify-between px-2.5 py-1 rounded-lg bg-card border border-border text-[10px] text-muted-foreground shadow-2xs">
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap overflow-hidden">
        <button
          type="button"
          onClick={onSearchFocus}
          className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
        >
          <span className="inline-flex items-center gap-0.5">
            <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-[9px] text-foreground">
              F2
            </kbd>
            <span className="text-[9px]">/</span>
            <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-[9px] text-foreground">
              /
            </kbd>
          </span>
          <span>Search</span>
        </button>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1">
          <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-[9px] text-foreground">
            Enter
          </kbd>
          <span>Add</span>
        </span>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1">
          <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-[9px] text-foreground">
            Tab
          </kbd>
          <span>Focus</span>
        </span>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1">
          <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-[9px] text-foreground">
            Ctrl+Enter
          </kbd>
          <span>Complete</span>
        </span>

        <span className="text-border">•</span>

        <span className="inline-flex items-center gap-1">
          <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-[9px] text-foreground">
            Esc
          </kbd>
          <span>Close</span>
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
        <span>Counter POS</span>
      </div>
    </footer>
  );
}
