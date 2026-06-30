import { Skeleton } from "@/components/ui/skeleton";

export default function StakingLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="min-h-screen bg-background px-4 pb-16 pt-24 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading staking…</span>

      <div className="mx-auto max-w-4xl space-y-6" aria-hidden="true">
        {/* Heading */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Position summary cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 border-3 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Stake form */}
        <div className="space-y-4 border-3 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>

        {/* History table */}
        <div className="space-y-3 border-3 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b-2 border-dashed border-foreground/10 pb-3"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
