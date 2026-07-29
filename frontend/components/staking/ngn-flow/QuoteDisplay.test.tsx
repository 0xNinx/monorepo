import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteDisplay } from "./QuoteDisplay";
import type { Quote } from "@/lib/ngnStakingApi";

function makeQuote(): Quote {
  return {
    id: "quote-1",
    ngnAmount: 160000,
    usdcAmount: 98.1234567,
    fxRate: 1632.45,
    fees: {
      conversionFee: 1500,
      platformFee: 350,
      total: 1850,
    },
    createdAt: "2026-07-27T10:00:00.000Z",
    expiresAt: "2026-07-27T10:10:00.000Z",
  };
}

describe("QuoteDisplay", () => {
  it("shows converted amount labels with rate timestamp and settlement currency", () => {
    render(
      <QuoteDisplay quote={makeQuote()} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByText("Converted amount (estimated)")).toBeInTheDocument();
    expect(screen.getByText("98.123457 USDC")).toBeInTheDocument();
    expect(screen.getByText("1 USDC = 1,632.4500 NGN")).toBeInTheDocument();
    expect(screen.getByText("Rate timestamp")).toBeInTheDocument();
    expect(screen.getByText("Quote valid until")).toBeInTheDocument();
    expect(
      screen.getByText(/Settlement currency: NGN\. Conversion preview does not change the NGN amount charged\./i)
    ).toBeInTheDocument();
  });

  it("triggers callbacks from quote actions", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const quote = makeQuote();
    render(
      <QuoteDisplay quote={quote} onConfirm={onConfirm} onCancel={onCancel} />
    );

    await user.click(screen.getByRole("button", { name: /confirm quote/i }));
    expect(onConfirm).toHaveBeenCalledWith(quote);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
