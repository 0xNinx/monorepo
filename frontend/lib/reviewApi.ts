import { apiFetch } from "./api";
import type { ReviewsResponse } from "./types/reviews";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface ReviewFilters {
  apartmentId?: string;
  rating?: number;
  verifiedStay?: boolean;
  sortBy?: "newest" | "oldest" | "rating_desc" | "rating_asc";
  page?: number;
  pageSize?: number;
}

export async function getApartmentReviews(
  filters: ReviewFilters,
): Promise<ReviewsResponse> {
  const params = new URLSearchParams();
  if (filters.apartmentId) params.set("apartmentId", filters.apartmentId);
  if (filters.rating) params.set("rating", String(filters.rating));
  if (filters.verifiedStay !== undefined)
    params.set("verifiedStay", String(filters.verifiedStay));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return apiFetch<ReviewsResponse>(
    `/apartment-reviews?${params.toString()}`,
  );
}

export async function getApartmentAggregateRating(
  apartmentId: string,
): Promise<{ averageRating: number | null; totalReviews: number }> {
  const result = await apiFetch<ReviewsResponse>(
    `/apartment-reviews?apartmentId=${apartmentId}&pageSize=1`,
  );
  return {
    averageRating: result.aggregateRating ?? null,
    totalReviews: result.total,
  };
}
