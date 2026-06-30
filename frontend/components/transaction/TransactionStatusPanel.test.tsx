import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TransactionStatusPanel } from "./TransactionStatusPanel";

// next/link renders a plain anchor in tests.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("TransactionStatusPanel accessibility", () => {
  it("renders the status as text inside a live region", () => {
    render(<TransactionStatusPanel status="pending" />);
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(screen.getAllByText(/processing/i).length).toBeGreaterThan(0);
  });

  it("renders an ordered, navigable progress timeline with a current step", () => {
    render(<TransactionStatusPanel status="pending" />);
    const list = screen.getByRole("list", { name: /transaction progress/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // pending => second step ("Settling") is current
    expect(items[1]).toHaveAttribute("aria-current", "step");
  });

  it("conveys each step state with text, not colour alone", () => {
    render(<TransactionStatusPanel status="confirmed" />);
    // All three steps complete => "Done" appears for each.
    expect(screen.getAllByText("Done")).toHaveLength(3);
  });

  it("shows failure guidance, a retry action and a support link", () => {
    render(<TransactionStatusPanel status="failed" allowRetry onRetry={vi.fn()} />);
    expect(screen.getByText(/didn't go through/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry transaction/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get help/i })).toHaveAttribute("href", "/contact");
  });

  it("shows the loading state while a status is being fetched", () => {
    render(<TransactionStatusPanel status="pending" loading />);
    expect(screen.getAllByText(/checking status/i).length).toBeGreaterThan(0);
  });
});
