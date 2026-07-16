// Inline skeleton primitives: the project has no ui/skeleton component and
// adding one is out of scope for this change, so the placeholders are built
// from DS surface tokens directly. animate-pulse is disabled by the global
// prefers-reduced-motion rule in globals.css.
function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className ?? ''}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Bar className="h-7 w-56" />
        <Bar className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bar key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
