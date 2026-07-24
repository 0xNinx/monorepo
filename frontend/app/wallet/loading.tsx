import { Skeleton } from "@/components/ui/skeleton";

export default function WalletLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="min-h-screen bg-background px-4 pb-16 pt-24 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading your wallet…</span>

      <div className="mx-auto max-w-5xl space-y-6" aria-hidden="true">
        {/* Page heading + currency toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-48 border-3 border-foreground" />
        </div>

        {/* Balance + action cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-4 border-3 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* Ledger filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Ledger table */}
        <div className="space-y-3 border-3 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b-2 border-dashed border-foreground/10 pb-3"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
