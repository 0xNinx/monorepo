"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, RefreshCw, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPost } from "@/lib/api";
import { usePolling, type PollingConfig } from "@/hooks/use-polling";
import {
  getStatusMeta,
  getTimelineStepStates,
  normalizeTransactionStatus,
  TIMELINE_STEP_STATE_META,
  TRANSACTION_TIMELINE_STEPS,
  type DisplayStatus,
} from "@/lib/transactionStatus";

// Re-exported for backwards compatibility with existing imports
// (e.g. hooks/use-realtime-transactions.ts).
export type { TransactionStatus } from "@/lib/transactionStatus";

export interface TransactionStatusPanelProps {
  /** Current (or initial) transaction status. */
  status: DisplayStatus;
  txId?: string | null;
  outboxId?: string | null;
  message?: string | null;
  allowRetry?: boolean;
  onRetry?: () => void | Promise<void>;
  className?: string;
  /** Show the loading/unknown state while the first status is being fetched. */
  loading?: boolean;
  /** Externally-detected stall (overrides the internal timer). */
  isStalled?: boolean;
  /** Mark a non-terminal transaction as stalled after this many ms (0 disables). */
  stalledAfterMs?: number;
  /** Where the "contact support" link points. */
  supportHref?: string;
  /**
   * Optional live status source. When provided, the panel polls it and advances
   * automatically to the terminal state. Reuses the shared {@link usePolling} hook.
   */
  poll?: () => Promise<{
    status: string;
    txId?: string | null;
    outboxId?: string | null;
    message?: string | null;
  }>;
  pollConfig?: PollingConfig;
}

interface RetryResponse {
  success: boolean;
  item?: {
    id: string;
    status: string;
    txId?: string;
  };
  message: string;
}

const DEFAULT_STALL_MS = 45_000;

export function TransactionStatusPanel({
  status,
  txId,
  outboxId,
  message,
  allowRetry = false,
  onRetry,
  className = "",
  loading = false,
  isStalled,
  stalledAfterMs = DEFAULT_STALL_MS,
  supportHref = "/contact",
  poll,
  pollConfig,
}: TransactionStatusPanelProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  // Local override used after a retry when there is no live poll source.
  const [localStatus, setLocalStatus] = useState<DisplayStatus | null>(null);
  const [internalStalled, setInternalStalled] = useState(false);

  // Adapt the consumer-supplied poll callback to the usePolling `{ data, status }`
  // contract, normalising the backend status so polling stops on terminal states.
  const polling = usePolling(
    poll
      ? async () => {
          const result = await poll();
          return { data: result, status: normalizeTransactionStatus(result.status) };
        }
      : async () => ({ data: null, status: "" }),
    {
      enabled: Boolean(poll),
      stopOnStatuses: ["confirmed", "failed"],
      ...pollConfig,
    },
  );

  const polled = poll ? polling.data : null;

  // Resolve the effective raw status: live poll > local override (post-retry) > prop.
  const rawStatus = polled?.status ?? localStatus ?? status;
  const display: DisplayStatus = loading ? "loading" : normalizeTransactionStatus(String(rawStatus));
  const meta = getStatusMeta(display);
  const StatusIcon = meta.icon;

  const effectiveTxId = polled?.txId || txId || null;
  const effectiveMessage = polled?.message || message || meta.description;

  // Stall detection: arm a timer whenever we enter a non-terminal, known state.
  useEffect(() => {
    setInternalStalled(false);
    if (meta.isTerminal || display === "loading" || display === "unknown") return;
    if (!stalledAfterMs || stalledAfterMs <= 0) return;
    const timer = setTimeout(() => setInternalStalled(true), stalledAfterMs);
    return () => clearTimeout(timer);
  }, [display, meta.isTerminal, stalledAfterMs]);

  const stalled = (isStalled ?? false) || internalStalled;

  const handleRetry = async () => {
    if (!onRetry && !outboxId) return;

    setIsRetrying(true);
    setRetryError(null);

    try {
      if (onRetry) {
        await onRetry();
      } else if (outboxId) {
        const response = await apiPost<RetryResponse>(`/api/admin/outbox/${outboxId}/retry`, {});
        if (response.success) {
          setLocalStatus(normalizeTransactionStatus(response.item?.status) === "confirmed" ? "confirmed" : "queued");
        } else {
          setRetryError(response.message || "Retry failed");
        }
      }
      // If we have a live poll source, restart it to pick up the new state.
      if (poll) polling.restart();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setIsRetrying(false);
    }
  };

  const stepStates = useMemo(() => getTimelineStepStates(display), [display]);
  const showTimeline = display !== "unknown";
  const showRetry =
    (display === "failed" || stalled) && (allowRetry || Boolean(onRetry) || Boolean(outboxId) || Boolean(poll));

  // Build the announcement read by screen readers when the status changes.
  const announcement = `${meta.label}. ${effectiveMessage}`;

  return (
    <Card className={`border-3 border-foreground shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] ${className}`}>
      <CardHeader className={`${meta.bgClass} border-b ${meta.borderClass}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
          <div>
            {/* Status conveyed as text + icon, never colour alone. */}
            <CardTitle className="font-mono text-lg">{meta.label}</CardTitle>
            {effectiveTxId && (
              <CardDescription className="font-mono text-xs mt-1">
                Tx: {effectiveTxId.slice(0, 16)}...{effectiveTxId.slice(-8)}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Live region: announces status transitions to assistive tech. */}
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-sm text-muted-foreground"
        >
          {announcement}
        </p>

        {/* Ordered, screen-reader-navigable progress timeline. */}
        {showTimeline && (
          <ol aria-label="Transaction progress" className="space-y-3">
            {TRANSACTION_TIMELINE_STEPS.map((step, index) => {
              const state = stepStates[index];
              const stateMeta = TIMELINE_STEP_STATE_META[state];
              const StepIcon = stateMeta.icon;
              return (
                <li
                  key={step.key}
                  aria-current={state === "current" ? "step" : undefined}
                  className="flex items-start gap-3"
                >
                  <StepIcon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${stateMeta.iconClass} ${
                      stateMeta.spin ? "motion-safe:animate-spin" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {step.label}
                      {/* Status word so the step state is not conveyed by colour/icon alone. */}
                      <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">
                        {stateMeta.label}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {(effectiveTxId || outboxId) && (
          <div className="space-y-2 text-xs font-mono text-muted-foreground">
            {effectiveTxId && (
              <div className="flex justify-between gap-2">
                <span>Transaction ID:</span>
                <span className="truncate max-w-[200px]">{effectiveTxId}</span>
              </div>
            )}
            {outboxId && (
              <div className="flex justify-between gap-2">
                <span>Outbox ID:</span>
                <span className="truncate max-w-[200px]">{outboxId}</span>
              </div>
            )}
          </div>
        )}

        {/* Stalled / failed guidance with a clear next step. */}
        {(stalled || display === "failed" || display === "unknown") && (
          <div className="flex items-start gap-2 rounded-md border-2 border-foreground/20 bg-muted p-3 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-bold">
                {display === "failed"
                  ? "This transaction didn't go through"
                  : stalled
                    ? "This is taking longer than expected"
                    : "We can't show the latest status"}
              </p>
              <p className="text-muted-foreground">
                {display === "failed"
                  ? "No funds have moved. You can retry, or contact support if the problem continues."
                  : "It may still complete. You can wait a moment, retry, or reach out to support."}{" "}
                <Link href={supportHref} className="font-bold text-foreground underline underline-offset-2">
                  Contact support
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {retryError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{retryError}</span>
          </div>
        )}

        {showRetry && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="outline"
              className="w-full border-2 border-foreground font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                  Retrying…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Retry transaction
                </>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-2 border-foreground font-bold sm:w-auto"
            >
              <Link href={supportHref}>
                <LifeBuoy className="mr-2 h-4 w-4" aria-hidden="true" />
                Get help
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionStatusPanel;
