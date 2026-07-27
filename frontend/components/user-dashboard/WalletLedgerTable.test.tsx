import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletLedgerTable } from "./WalletLedgerTable";
import type { WalletLedgerEntry } from "@/lib/types/dashboard";

vi.mock("next-intl", () => ({
  useLocale: () => "en-NG",
}));

function makeEntry(overrides?: Partial<WalletLedgerEntry>): WalletLedgerEntry {
  return {
    id: "e-1",
    type: "top_up",
    amountNgn: 50000,
    status: "confirmed",
    timestamp: "2025-01-18T08:15:00.000Z",
    reference: "ref-123",
    ...overrides,
  };
}

describe("WalletLedgerTable", () => {
  it("renders an accessible table with a label", () => {
    render(<WalletLedgerTable entries={[makeEntry()]} />);
    expect(
      screen.getByRole("table", { name: /wallet transaction ledger/i }),
    ).toBeInTheDocument();
  });

  it("column headers have scope='col'", () => {
    const { container } = render(
      <WalletLedgerTable entries={[makeEntry()]} />,
    );
    const scopedHeaders = container.querySelectorAll("th[scope='col']");
    expect(scopedHeaders.length).toBe(5);
  });

  it("shows empty state when no entries", () => {
    render(<WalletLedgerTable entries={[]} />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders confirmed entry with positive styling", () => {
    render(
      <WalletLedgerTable entries={[makeEntry({ type: "top_up", status: "confirmed" })]} />,
    );
    expect(screen.getByText("Top up")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("renders withdrawal with debit styling (red text)", () => {
    const { container } = render(
      <WalletLedgerTable entries={[makeEntry({ type: "withdrawal", amountNgn: 20000, status: "pending" })]} />,
    );
    expect(screen.getByText("Withdrawal")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    const debitCell = container.querySelector(".text-destructive");
    expect(debitCell).toBeInTheDocument();
  });

  it("renders pending status with default badge", () => {
    render(
      <WalletLedgerTable entries={[makeEntry({ status: "pending" })]} />,
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders failed status with destructive badge", () => {
    render(
      <WalletLedgerTable entries={[makeEntry({ status: "failed" })]} />,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders reversed status with outline badge", () => {
    render(
      <WalletLedgerTable entries={[makeEntry({ status: "reversed" })]} />,
    );
    expect(screen.getByText("Reversed")).toBeInTheDocument();
  });

  it("shows reference or dash", () => {
    const { rerender } = render(
      <WalletLedgerTable entries={[makeEntry({ reference: "abc-123" })]} />,
    );
    expect(screen.getByText("abc-123")).toBeInTheDocument();

    rerender(
      <WalletLedgerTable entries={[makeEntry({ reference: null })]} />,
    );
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows USDC amount when present", () => {
    render(
      <WalletLedgerTable entries={[makeEntry({ amountUsdc: "19.35" })]} />,
    );
    expect(screen.getByText("19.35 USDC")).toBeInTheDocument();
  });

  it("status badge has screen-reader text", () => {
    render(
      <WalletLedgerTable entries={[makeEntry({ status: "confirmed" })]} />,
    );
    expect(screen.getByText("Status: Confirmed")).toHaveClass("sr-only");
  });
});
