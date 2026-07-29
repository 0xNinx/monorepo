import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";

const mockT = (key: string) => key;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/properties/1",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => mockT,
}));

const mockFn = vi.fn();
vi.mock("@/lib/reviewApi", () => ({
  getApartmentReviews: (...args: unknown[]) => mockFn(...args),
}));

vi.mock("@/lib/sanitize", () => ({
  sanitizeText: (text: string) => text,
}));

import { ApartmentReviews } from "./ApartmentReviews";

describe("ApartmentReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFn.mockReturnValue(new Promise(() => {}));
    render(<ApartmentReviews propertyId="apt-1" />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows empty state when no reviews", async () => {
    mockFn.mockResolvedValue({
      reviews: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      aggregateRating: null,
    });
    render(<ApartmentReviews propertyId="apt-1" />);
    await waitForElementToBeRemoved(() => screen.queryByText("loading"));
    expect(screen.getByText("noReviews")).toBeInTheDocument();
  });

  it("shows reviews when data is returned", async () => {
    mockFn.mockResolvedValue({
      reviews: [
        {
          id: "r1",
          apartmentId: "apt-1",
          userId: "u1",
          userName: "Emeka Obi",
          rating: 5,
          content: "Great apartment!",
          date: "2024-12-01",
          verifiedStay: true,
          isHidden: false,
          isReported: false,
          helpfulCount: 12,
        },
      ],
      total: 1,
      totalPages: 1,
      aggregateRating: 5.0,
    });
    render(<ApartmentReviews propertyId="apt-1" />);
    await waitForElementToBeRemoved(() => screen.queryByText("loading"));
    expect(screen.getByText("Emeka Obi")).toBeInTheDocument();
    expect(screen.getByText("Great apartment!")).toBeInTheDocument();
  });

  it("shows aggregate rating when reviews exist", async () => {
    mockFn.mockResolvedValue({
      reviews: [
        {
          id: "r1",
          apartmentId: "apt-1",
          userId: "u1",
          userName: "Test",
          rating: 4,
          content: "Good",
          date: "2024-12-01",
          verifiedStay: false,
          isHidden: false,
          isReported: false,
          helpfulCount: 0,
        },
      ],
      total: 5,
      totalPages: 1,
      aggregateRating: 4.2,
    });
    render(<ApartmentReviews propertyId="apt-1" />);
    await waitForElementToBeRemoved(() => screen.queryByText("loading"));
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("5 reviews")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockFn.mockRejectedValue(new Error("Network error"));
    render(<ApartmentReviews propertyId="apt-1" />);
    await waitForElementToBeRemoved(() => screen.queryByText("loading"));
    expect(screen.getAllByText("errorTitle").length).toBeGreaterThanOrEqual(1);
  });

  it("hides aggregate rating when no reviews", async () => {
    mockFn.mockResolvedValue({
      reviews: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      aggregateRating: null,
    });
    render(<ApartmentReviews propertyId="apt-1" />);
    await waitForElementToBeRemoved(() => screen.queryByText("loading"));
    expect(screen.getByText("noReviews")).toBeInTheDocument();
    expect(screen.queryByText("reviews")).not.toBeInTheDocument();
  });
});
