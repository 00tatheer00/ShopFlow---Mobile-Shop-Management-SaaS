export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5 animate-pulse">
      {/* 1. Greeting & Date shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1.5">
          <div className="h-6 sm:h-7 w-48 sm:w-56 rounded-lg bg-muted" />
          <div className="h-3.5 w-36 sm:w-44 rounded bg-muted/70" />
        </div>
      </div>

      {/* 2. Quick Actions row shimmer */}
      <div className="space-y-2">
        <div className="h-3.5 w-24 rounded bg-muted/70" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[46px] rounded-xl border border-border bg-card p-2.5 sm:p-3 flex items-center gap-2.5"
            >
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
              <div className="h-3.5 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Hero Metrics shimmer (3 cards) */}
      <div className="space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-muted/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[105px] rounded-xl border border-border bg-card p-3.5 sm:p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded bg-muted" />
                <div className="h-7 w-7 rounded-lg bg-muted shrink-0" />
              </div>
              <div className="h-6 w-32 rounded bg-muted" />
              <div className="h-2.5 w-36 rounded bg-muted/60 border-t border-border/40 pt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Secondary Metrics shimmer (4 cards) */}
      <div className="space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-muted/70" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[95px] rounded-xl border border-border bg-card p-3 sm:p-3.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-6 w-6 rounded-lg bg-muted shrink-0" />
              </div>
              <div className="h-5 w-24 rounded bg-muted" />
              <div className="h-2 w-28 rounded bg-muted/60 border-t border-border/40 pt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Lower Content / Chart & Sales shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 h-[210px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="h-3.5 w-32 rounded bg-muted" />
            <div className="h-3 w-14 rounded bg-muted/60" />
          </div>
          <div className="h-32 w-full rounded-lg bg-muted/40" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 h-[210px] flex flex-col justify-between">
          <div className="h-3.5 w-28 rounded bg-muted border-b border-border/60 pb-2.5" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="space-y-1">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-2 w-12 rounded bg-muted/60" />
                </div>
                <div className="h-3.5 w-14 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
