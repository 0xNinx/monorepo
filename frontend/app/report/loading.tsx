import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="min-h-screen bg-background px-4 pb-16 pt-24 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading the anonymous report form…</span>

      <div className="mx-auto max-w-2xl space-y-6" aria-hidden="true">
        {/* Heading + trust badge */}
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="mx-auto h-4 w-80" />
          <Skeleton className="mx-auto h-7 w-44" />
        </div>

        {/* Form card */}
        <div className="space-y-6 border-3 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          {/* Report type select */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
          </div>

          {/* Description textarea */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>

          {/* Evidence URL */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-12 w-full" />
          </div>

          {/* Optional contact email */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-full" />
          </div>

          {/* Submit */}
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
