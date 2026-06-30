import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for mapping backend transaction status enums to the
 * user-facing labels, descriptions and (non-color-only) icons used across the
 * payment / transaction status surfaces.
 *
 * Keeping this mapping in one place means every status surface stays
 * consistent and accessible (text + icon, never color alone).
 */

export type TransactionStatus = "pending" | "queued" | "confirmed" | "failed";

/** Status used while we are still fetching, or when the backend value is unrecognised. */
export type DisplayStatus = TransactionStatus | "loading" | "unknown";

export type StatusTone = "info" | "progress" | "success" | "error" | "neutral";

export interface StatusMeta {
  /** Short, user-facing label (also read by screen readers). */
  label: string;
  /** Default human-readable description; consumers may override with a server message. */
  description: string;
  /** Distinct icon shape so status is never conveyed by colour alone. */
  icon: LucideIcon;
  /** Whether the icon should spin (in-progress states). */
  spin?: boolean;
  /** Whether this is a terminal state (no further updates expected). */
  isTerminal: boolean;
  tone: StatusTone;
  /** Tailwind classes — text/border tones chosen to meet WCAG AA contrast on light/dark cards. */
  iconClass: string;
  bgClass: string;
  borderClass: string;
}

export const TRANSACTION_STATUS_META: Record<DisplayStatus, StatusMeta> = {
  loading: {
    label: "Checking status",
    description: "Fetching the latest transaction status…",
    icon: Loader2,
    spin: true,
    isTerminal: false,
    tone: "neutral",
    iconClass: "text-muted-foreground motion-safe:animate-spin",
    bgClass: "bg-muted",
    borderClass: "border-foreground/20",
  },
  pending: {
    label: "Processing",
    description: "Your transaction is being processed…",
    icon: Clock,
    isTerminal: false,
    tone: "info",
    iconClass: "text-blue-700 dark:text-blue-300",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
    borderClass: "border-blue-300 dark:border-blue-800",
  },
  queued: {
    label: "Queued for retry",
    description: "Your transaction is queued and will be retried automatically.",
    icon: Loader2,
    spin: true,
    isTerminal: false,
    tone: "progress",
    iconClass: "text-amber-700 dark:text-amber-300 motion-safe:animate-spin",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-300 dark:border-amber-800",
  },
  confirmed: {
    label: "Confirmed",
    description: "Your transaction has been confirmed successfully.",
    icon: CheckCircle2,
    isTerminal: true,
    tone: "success",
    iconClass: "text-emerald-700 dark:text-emerald-300",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-300 dark:border-emerald-800",
  },
  failed: {
    label: "Failed",
    description: "Your transaction failed. You can retry or contact support.",
    icon: XCircle,
    isTerminal: true,
    tone: "error",
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/40",
  },
  unknown: {
    label: "Status unavailable",
    description:
      "We couldn't determine the current status. Refresh or contact support if this persists.",
    icon: HelpCircle,
    isTerminal: false,
    tone: "neutral",
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
    borderClass: "border-foreground/20",
  },
};

/**
 * Normalise an arbitrary backend status string into one of our known statuses.
 * Unrecognised values map to "unknown" so the UI degrades gracefully.
 */
export function normalizeTransactionStatus(
  raw: string | null | undefined,
): DisplayStatus {
  if (!raw) return "unknown";
  const value = raw.toLowerCase().trim();
  switch (value) {
    case "pending":
    case "processing":
    case "submitted":
      return "pending";
    case "queued":
    case "retrying":
      return "queued";
    case "confirmed":
    case "completed":
    case "success":
    case "succeeded":
      return "confirmed";
    case "failed":
    case "error":
    case "rejected":
      return "failed";
    default:
      return "unknown";
  }
}

export function getStatusMeta(status: DisplayStatus): StatusMeta {
  return TRANSACTION_STATUS_META[status] ?? TRANSACTION_STATUS_META.unknown;
}

/* ------------------------------------------------------------------ */
/* Stepped progress timeline (initiated → settling → confirmed)        */
/* ------------------------------------------------------------------ */

export type TimelineStepState =
  | "complete"
  | "current"
  | "upcoming"
  | "failed";

export interface TimelineStep {
  key: string;
  label: string;
  description: string;
}

export const TRANSACTION_TIMELINE_STEPS: readonly TimelineStep[] = [
  {
    key: "initiated",
    label: "Initiated",
    description: "Payment request submitted.",
  },
  {
    key: "settling",
    label: "Settling",
    description: "Confirming the transaction on the network.",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    description: "Payment complete.",
  },
] as const;

/**
 * Compute the state of each timeline step from the current status, in the same
 * order as {@link TRANSACTION_TIMELINE_STEPS}.
 */
export function getTimelineStepStates(
  status: DisplayStatus,
): TimelineStepState[] {
  switch (status) {
    case "confirmed":
      return ["complete", "complete", "complete"];
    case "failed":
      // The network/settling step is where a transaction fails.
      return ["complete", "failed", "upcoming"];
    case "queued":
    case "pending":
      return ["complete", "current", "upcoming"];
    case "loading":
    case "unknown":
    default:
      return ["upcoming", "upcoming", "upcoming"];
  }
}

export interface StepStateMeta {
  /** Screen-reader status text, e.g. "Done", "In progress". */
  label: string;
  icon: LucideIcon;
  spin?: boolean;
  iconClass: string;
}

export const TIMELINE_STEP_STATE_META: Record<TimelineStepState, StepStateMeta> = {
  complete: {
    label: "Done",
    icon: CheckCircle2,
    iconClass: "text-emerald-700 dark:text-emerald-300",
  },
  current: {
    label: "In progress",
    icon: Loader2,
    spin: true,
    iconClass: "text-blue-700 dark:text-blue-300 motion-safe:animate-spin",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
  upcoming: {
    label: "Pending",
    icon: CircleDashed,
    iconClass: "text-muted-foreground",
  },
};
