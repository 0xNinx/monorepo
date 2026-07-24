import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useSessionStore from "../useSessionStore";

function resetStore() {
  useSessionStore.setState({
    lastRoute: null,
    activeTab: null,
    unreadCount: 0,
    sidebarCollapsed: false,
  });
}

describe("useSessionStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  describe("initial state", () => {
    it("starts with all defaults", () => {
      const { result } = renderHook(() => useSessionStore());

      expect(result.current.lastRoute).toBeNull();
      expect(result.current.activeTab).toBeNull();
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.sidebarCollapsed).toBe(false);
    });
  });

  describe("setLastRoute", () => {
    it("sets the last route", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setLastRoute("/dashboard/landlord/properties"); });

      expect(result.current.lastRoute).toBe("/dashboard/landlord/properties");
    });

    it("overwrites previous route", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setLastRoute("/route-a"); });
      act(() => { result.current.setLastRoute("/route-b"); });

      expect(result.current.lastRoute).toBe("/route-b");
    });
  });

  describe("setActiveTab", () => {
    it("sets active tab", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setActiveTab("payments"); });

      expect(result.current.activeTab).toBe("payments");
    });

    it("clears active tab on null", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setActiveTab("payments"); });
      act(() => { result.current.setActiveTab(null); });

      expect(result.current.activeTab).toBeNull();
    });
  });

  describe("setUnreadCount", () => {
    it("sets unread count", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setUnreadCount(5); });

      expect(result.current.unreadCount).toBe(5);
    });

    it("allows zero", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setUnreadCount(3); });
      act(() => { result.current.setUnreadCount(0); });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe("toggleSidebar", () => {
    it("toggles from false to true", () => {
      const { result } = renderHook(() => useSessionStore());

      expect(result.current.sidebarCollapsed).toBe(false);

      act(() => { result.current.toggleSidebar(); });

      expect(result.current.sidebarCollapsed).toBe(true);
    });

    it("toggles back to false", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.toggleSidebar(); });
      act(() => { result.current.toggleSidebar(); });

      expect(result.current.sidebarCollapsed).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears all session state to defaults", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setLastRoute("/dashboard"); });
      act(() => { result.current.setActiveTab("payouts"); });
      act(() => { result.current.setUnreadCount(12); });
      act(() => { result.current.toggleSidebar(); });

      expect(result.current.lastRoute).toBe("/dashboard");
      expect(result.current.activeTab).toBe("payouts");
      expect(result.current.unreadCount).toBe(12);
      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => { result.current.reset(); });

      expect(result.current.lastRoute).toBeNull();
      expect(result.current.activeTab).toBeNull();
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.sidebarCollapsed).toBe(false);
    });
  });

  describe("logout clears session", () => {
    it("reset acts as logout — no residual state", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setLastRoute("/sensitive-page"); });
      act(() => { result.current.setUnreadCount(99); });
      act(() => { result.current.reset(); });

      expect(result.current.lastRoute).toBeNull();
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe("persistence", () => {
    it("persists to sessionStorage", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setLastRoute("/persisted"); });
      act(() => { result.current.setUnreadCount(7); });

      const stored = JSON.parse(sessionStorage.getItem("shelterflex-session-storage")!);
      expect(stored.state.lastRoute).toBe("/persisted");
      expect(stored.state.unreadCount).toBe(7);
    });

    it("reset clears persisted state", () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => { result.current.setLastRoute("/persisted"); });
      act(() => { result.current.reset(); });

      const stored = JSON.parse(sessionStorage.getItem("shelterflex-session-storage")!);
      expect(stored.state.lastRoute).toBeNull();
      expect(stored.state.unreadCount).toBe(0);
    });
  });
});
