export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded-lg shimmer" />
          <div className="h-4 w-72 bg-muted/60 rounded-md shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-muted rounded-lg shimmer" />
          <div className="h-9 w-32 bg-primary/20 rounded-lg shimmer" />
        </div>
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-xs space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded shimmer" />
              <div className="h-8 w-8 rounded-xl bg-primary/10 shimmer" />
            </div>
            <div className="h-7 w-36 bg-muted/80 rounded-md shimmer" />
            <div className="h-3 w-28 bg-muted/50 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton Area */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="h-5 w-36 bg-muted rounded shimmer" />
          <div className="h-8 w-44 bg-muted/60 rounded-lg shimmer" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted shimmer" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-muted rounded shimmer" />
                  <div className="h-3 w-20 bg-muted/60 rounded shimmer" />
                </div>
              </div>
              <div className="h-4 w-20 bg-muted rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
