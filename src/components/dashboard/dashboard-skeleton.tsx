export function DashboardSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      {/* 1. Greeting & Date shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 sm:h-8 w-56 sm:w-64 rounded-xl bg-muted" />
          <div className="h-4 w-40 sm:w-48 rounded-lg bg-muted/70" />
        </div>
        <div className="h-6 w-32 rounded-full bg-muted/60 self-start sm:self-auto" />
      </div>

      {/* 2. Quick Actions row shimmer */}
      <div className="space-y-2.5">
        <div className="h-4 w-28 rounded bg-muted/70" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[68px] rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3"
            >
              <div className="h-11 w-11 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Hero Metrics shimmer (3 cards) */}
      <div className="space-y-2.5">
        <div className="h-4 w-32 rounded bg-muted/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[160px] rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
              </div>
              <div className="h-8 w-36 rounded-lg bg-muted" />
              <div className="h-3 w-40 rounded bg-muted/60 border-t border-border/40 pt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Secondary Metrics shimmer (4 cards) */}
      <div className="space-y-2.5">
        <div className="h-4 w-36 rounded bg-muted/70" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded bg-muted" />
                <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
              </div>
              <div className="h-7 w-28 rounded-lg bg-muted" />
              <div className="h-3 w-32 rounded bg-muted/60 border-t border-border/40 pt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Lower Content / Transactions shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 h-[320px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted/60" />
          </div>
          <div className="h-48 w-full rounded-xl bg-muted/40" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 h-[320px] flex flex-col justify-between">
          <div className="h-4 w-32 rounded bg-muted border-b border-border pb-3" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <div className="h-3.5 w-24 rounded bg-muted" />
                  <div className="h-2.5 w-16 rounded bg-muted/60" />
                </div>
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

