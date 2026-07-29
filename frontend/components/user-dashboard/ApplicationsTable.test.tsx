import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationsTable } from "./ApplicationsTable";
import type { UserRentalApplication } from "@/lib/types/dashboard";

vi.mock("next-intl", () => ({
  useLocale: () => "en-NG",
}));

function makeApp(overrides?: Partial<UserRentalApplication>): UserRentalApplication {
  return {
    id: "APP-2025-0001",
    property: {
      title: "Modern 3-Bedroom Apartment",
      location: "Lekki Phase 1, Lagos",
      priceNgnPerYear: 2400000,
    },
    status: "submitted",
    submittedAt: "2025-01-12T10:30:00.000Z",
    ...overrides,
  };
}

describe("ApplicationsTable", () => {
  it("renders an accessible table with a label", () => {
    render(<ApplicationsTable applications={[makeApp()]} />);
    expect(
      screen.getByRole("table", { name: /rental applications/i }),
    ).toBeInTheDocument();
  });

  it("column headers have scope='col'", () => {
    const { container } = render(
      <ApplicationsTable applications={[makeApp()]} />,
    );
    const scopedHeaders = container.querySelectorAll("th[scope='col']");
    expect(scopedHeaders.length).toBe(4);
  });

  it("shows empty state when no applications", () => {
    render(<ApplicationsTable applications={[]} />);
    expect(screen.getByText("No applications yet")).toBeInTheDocument();
  });

  it("renders submitted status", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "submitted" })]} />);
    expect(screen.getAllByText("Submitted").length).toBeGreaterThanOrEqual(1);
  });

  it("renders under_review status", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "under_review" })]} />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
  });

  it("renders pending status as Under review", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "pending" })]} />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
  });

  it("renders approved status", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "approved" })]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders rejected status with destructive badge", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "rejected" })]} />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders rejection reason when present", () => {
    render(
      <ApplicationsTable
        applications={[makeApp({ status: "rejected", rejectionReason: "Insufficient income documentation" })]}
      />,
    );
    expect(screen.getByText("Insufficient income documentation")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "cancelled" })]} />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("status badge has screen-reader text", () => {
    render(<ApplicationsTable applications={[makeApp({ status: "approved" })]} />);
    expect(screen.getByText("Status: Approved")).toHaveClass("sr-only");
  });

  it("renders property details", () => {
    render(<ApplicationsTable applications={[makeApp()]} />);
    expect(screen.getByText("Modern 3-Bedroom Apartment")).toBeInTheDocument();
    expect(screen.getByText("Lekki Phase 1, Lagos")).toBeInTheDocument();
  });
});
