import { apiFetch } from "./api";

export interface LandlordPublicStats {
  totalPaidToLandlords: string;
  partnerLandlords: string;
  avgPaymentTime: string;
  landlordDefaultRate: string;
}

export async function getPublicLandlordStats(): Promise<LandlordPublicStats> {
  const result = await apiFetch<{ success: boolean; data: LandlordPublicStats }>(
    "/public/stats",
  );
  return result.data;
}
