import { apiFetch } from "./api";

export interface PlatformStatsResponse {
  // Homepage stats
  happyTenants: string;
  rentFinanced: string;
  partnerLandlords: string;
  citiesCovered: string;
  // Landlords page stats
  totalPaidToLandlords: string;
  avgPaymentTime: string;
  landlordDefaultRate: string;
}

export type LandlordPublicStats = Pick<
  PlatformStatsResponse,
  "totalPaidToLandlords" | "partnerLandlords" | "avgPaymentTime" | "landlordDefaultRate"
>;

export type HomePageStats = Pick<
  PlatformStatsResponse,
  "happyTenants" | "rentFinanced" | "partnerLandlords" | "citiesCovered"
>;

export async function getPublicLandlordStats(): Promise<LandlordPublicStats> {
  const result = await apiFetch<{ success: boolean; data: PlatformStatsResponse }>(
    "/public/stats",
  );
  return result.data;
}

export async function getHomePageStats(): Promise<HomePageStats> {
  const result = await apiFetch<{ success: boolean; data: PlatformStatsResponse }>(
    "/public/stats",
  );
  return result.data;
}
