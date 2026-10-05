export default function DashboardLoading() {
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header shimmer */}
      <div>
        <div className="h-8 w-48 rounded-lg shimmer" />
        <div className="mt-2 h-4 w-64 rounded-lg shimmer" />
      </div>

      {/* Metric cards shimmer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded shimmer" />
              <div className="h-8 w-8 rounded-lg shimmer" />
            </div>
            <div className="mt-3 h-7 w-28 rounded shimmer" />
            <div className="mt-2 h-3 w-20 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Transactions shimmer */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="h-4 w-36 rounded shimmer" />
          <div className="h-3 w-14 rounded shimmer" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg shimmer" />
              <div>
                <div className="h-4 w-32 rounded shimmer" />
                <div className="mt-1 h-3 w-16 rounded shimmer" />
              </div>
            </div>
            <div className="h-4 w-20 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
