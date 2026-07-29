export type ReviewStatus = "visible" | "hidden" | "reported";

export interface Review {
  id: string;
  apartmentId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  content: string;
  date: string;
  verifiedStay: boolean;
  isHidden: boolean;
  isReported: boolean;
  helpfulCount: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  aggregateRating?: number | null;
}
