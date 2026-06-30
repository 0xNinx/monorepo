import { describe, it, expect } from "vitest";
import {
  normalizeTransactionStatus,
  getStatusMeta,
  getTimelineStepStates,
  TRANSACTION_TIMELINE_STEPS,
} from "./transactionStatus";

describe("normalizeTransactionStatus", () => {
  it("maps backend synonyms onto known statuses", () => {
    expect(normalizeTransactionStatus("processing")).toBe("pending");
    expect(normalizeTransactionStatus("retrying")).toBe("queued");
    expect(normalizeTransactionStatus("COMPLETED")).toBe("confirmed");
    expect(normalizeTransactionStatus("success")).toBe("confirmed");
    expect(normalizeTransactionStatus("rejected")).toBe("failed");
  });

  it("falls back to 'unknown' for empty or unrecognised values", () => {
    expect(normalizeTransactionStatus(null)).toBe("unknown");
    expect(normalizeTransactionStatus(undefined)).toBe("unknown");
    expect(normalizeTransactionStatus("weird-value")).toBe("unknown");
  });
});

describe("getStatusMeta", () => {
  it("marks terminal states", () => {
    expect(getStatusMeta("confirmed").isTerminal).toBe(true);
    expect(getStatusMeta("failed").isTerminal).toBe(true);
    expect(getStatusMeta("pending").isTerminal).toBe(false);
  });

  it("always provides a human-readable label and icon", () => {
    for (const status of ["pending", "queued", "confirmed", "failed", "loading", "unknown"] as const) {
      const meta = getStatusMeta(status);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon).toBeTruthy();
    }
  });
});

describe("getTimelineStepStates", () => {
  it("returns one state per step", () => {
    expect(getTimelineStepStates("pending")).toHaveLength(TRANSACTION_TIMELINE_STEPS.length);
  });

  it("advances steps as the transaction progresses", () => {
    expect(getTimelineStepStates("pending")).toEqual(["complete", "current", "upcoming"]);
    expect(getTimelineStepStates("confirmed")).toEqual(["complete", "complete", "complete"]);
    expect(getTimelineStepStates("failed")).toEqual(["complete", "failed", "upcoming"]);
  });
});
