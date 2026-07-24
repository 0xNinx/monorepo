import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useRiskStore from "../useRiskStore";

vi.mock("@/lib/risk", () => ({
  getRiskState: vi.fn(),
}));

import { getRiskState } from "@/lib/risk";

const mockGetRiskState = vi.mocked(getRiskState);

function resetStore() {
  useRiskStore.setState({
    isFrozen: false,
    freezeReason: null,
    deficitNgn: 0,
    updatedAt: null,
    isLoading: false,
    error: null,
  });
}

describe("useRiskStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetStore();
  });

  describe("initial state", () => {
    it("starts with default values", () => {
      const { result } = renderHook(() => useRiskStore());

      expect(result.current.isFrozen).toBe(false);
      expect(result.current.freezeReason).toBeNull();
      expect(result.current.deficitNgn).toBe(0);
      expect(result.current.updatedAt).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("setRiskState", () => {
    it("partially updates risk state", () => {
      const { result } = renderHook(() => useRiskStore());

      act(() => { result.current.setRiskState({ isFrozen: true, freezeReason: "Dispute" }); });

      expect(result.current.isFrozen).toBe(true);
      expect(result.current.freezeReason).toBe("Dispute");
      expect(result.current.deficitNgn).toBe(0); // untouched
    });

    it("updates deficit", () => {
      const { result } = renderHook(() => useRiskStore());

      act(() => { result.current.setRiskState({ deficitNgn: 50000 }); });

      expect(result.current.deficitNgn).toBe(50000);
    });
  });

  describe("fetchRiskState", () => {
    it("loads risk state from API", async () => {
      mockGetRiskState.mockResolvedValue({
        isFrozen: true,
        freezeReason: "Compliance Review",
        deficitNgn: 120000,
        updatedAt: "2025-06-01T00:00:00Z",
      });

      const { result } = renderHook(() => useRiskStore());

      await act(async () => { await result.current.fetchRiskState(); });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFrozen).toBe(true);
      expect(result.current.freezeReason).toBe("Compliance Review");
      expect(result.current.deficitNgn).toBe(120000);
      expect(result.current.updatedAt).toBe("2025-06-01T00:00:00Z");
      expect(result.current.error).toBeNull();
    });

    it("sets loading state during fetch", async () => {
      let resolvePromise: (v: any) => void;
      mockGetRiskState.mockReturnValue(
        new Promise((resolve) => { resolvePromise = resolve; }),
      );

      const { result } = renderHook(() => useRiskStore());

      act(() => { result.current.fetchRiskState(); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ isFrozen: false, freezeReason: null, deficitNgn: 0, updatedAt: null });
      });
      expect(result.current.isLoading).toBe(false);
    });

    it("sets error on failure", async () => {
      mockGetRiskState.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useRiskStore());

      await act(async () => { await result.current.fetchRiskState(); });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("Network error");
      expect(result.current.isFrozen).toBe(false); // unchanged
    });

    it("handles non-Error exceptions", async () => {
      mockGetRiskState.mockRejectedValue("string error");

      const { result } = renderHook(() => useRiskStore());

      await act(async () => { await result.current.fetchRiskState(); });

      expect(result.current.error).toBe("Failed to fetch risk state");
    });

    it("clears previous error on successful refetch", async () => {
      mockGetRiskState.mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useRiskStore());

      await act(async () => { await result.current.fetchRiskState(); });
      expect(result.current.error).toBe("fail");

      mockGetRiskState.mockResolvedValue({
        isFrozen: false, freezeReason: null, deficitNgn: 0, updatedAt: null,
      });
      await act(async () => { await result.current.fetchRiskState(); });
      expect(result.current.error).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears all risk state back to defaults", () => {
      const { result } = renderHook(() => useRiskStore());

      act(() => {
        result.current.setRiskState({
          isFrozen: true,
          freezeReason: "Frozen",
          deficitNgn: 99999,
          updatedAt: "2025-01-01T00:00:00Z",
        });
      });

      expect(result.current.isFrozen).toBe(true);

      act(() => { result.current.reset(); });

      expect(result.current.isFrozen).toBe(false);
      expect(result.current.freezeReason).toBeNull();
      expect(result.current.deficitNgn).toBe(0);
      expect(result.current.updatedAt).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("cross-user isolation", () => {
    it("reset prevents risk state from carrying across users", () => {
      // User A's risk state
      const { result } = renderHook(() => useRiskStore());

      act(() => {
        result.current.setRiskState({
          isFrozen: true,
          freezeReason: "User A dispute",
          deficitNgn: 50000,
        });
      });

      expect(result.current.isFrozen).toBe(true);
      expect(result.current.freezeReason).toBe("User A dispute");

      // Simulate logout — reset should clear everything
      act(() => { result.current.reset(); });

      expect(result.current.isFrozen).toBe(false);
      expect(result.current.freezeReason).toBeNull();
      expect(result.current.deficitNgn).toBe(0);
    });
  });

  describe("persistence", () => {
    it("persists to localStorage", () => {
      const { result } = renderHook(() => useRiskStore());

      act(() => { result.current.setRiskState({ isFrozen: true, deficitNgn: 100 }); });

      const stored = JSON.parse(localStorage.getItem("shelterflex-risk-storage")!);
      expect(stored.state.isFrozen).toBe(true);
      expect(stored.state.deficitNgn).toBe(100);
    });

    it("reset clears persisted state", () => {
      const { result } = renderHook(() => useRiskStore());

      act(() => { result.current.setRiskState({ isFrozen: true }); });
      act(() => { result.current.reset(); });

      const stored = JSON.parse(localStorage.getItem("shelterflex-risk-storage")!);
      expect(stored.state.isFrozen).toBe(false);
      expect(stored.state.deficitNgn).toBe(0);
    });

    it("does not resurrect cleared state on fresh load", () => {
      localStorage.setItem(
        "shelterflex-risk-storage",
        JSON.stringify({
          state: {
            isFrozen: false,
            freezeReason: null,
            deficitNgn: 0,
            updatedAt: null,
            isLoading: false,
            error: null,
          },
          version: 1,
        }),
      );

      const stored = JSON.parse(localStorage.getItem("shelterflex-risk-storage")!);
      expect(stored.state.isFrozen).toBe(false);
      expect(stored.state.deficitNgn).toBe(0);
    });
  });
});
