/**
 * Lease Agreement API Client
 */

import { apiGet, apiPost } from "./apiClient";

export interface LeaseAgreement {
  leaseId: string;
  dealId: string;
  documentKey: string;
  documentHash: string;
  documentVersion: string;
  status:
    | "draft"
    | "pending_tenant_signature"
    | "pending_landlord_signature"
    | "fully_signed"
    | "voided";
  tenantSignedAt?: string;
  landlordSignedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastModified: string;
}

export interface DocumentIntegrity {
  documentHash: string;
  documentVersion: string;
  lastModified: string;
}

export interface SigningUrlResponse {
  url: string;
  expiresAt: string;
  signerRole: "tenant" | "landlord";
}

export interface SignatureRequest {
  signerName: string;
  signDate: string;
  acknowledged: boolean;
}

export interface SignatureResponse {
  success: boolean;
  leaseId: string;
  signedAt: string;
  documentHash: string;
}

export async function generateLease(
  dealId: string,
): Promise<{ success: boolean; data: { leaseId: string; documentKey: string; documentHash: string; status: string } }> {
  return apiPost(`/api/deals/${dealId}/lease/generate`, {});
}

export async function sendLeaseForSigning(
  dealId: string,
): Promise<{ success: boolean; data: { message: string } }> {
  return apiPost(`/api/deals/${dealId}/lease/send`, {});
}

export async function getLeaseSignUrl(
  dealId: string,
): Promise<{ success: boolean; data: SigningUrlResponse }> {
  return apiGet(`/api/deals/${dealId}/lease/sign-url`);
}

export async function getLease(
  dealId: string,
): Promise<{ success: boolean; data: LeaseAgreement }> {
  return apiGet(`/api/deals/${dealId}/lease`);
}

export async function getDocumentIntegrity(
  dealId: string,
): Promise<{ success: boolean; data: DocumentIntegrity }> {
  return apiGet(`/api/deals/${dealId}/lease/integrity`);
}

export async function submitSignature(
  dealId: string,
  signature: SignatureRequest,
): Promise<{ success: boolean; data: SignatureResponse }> {
  return apiPost(`/api/deals/${dealId}/lease/sign`, signature);
}

export async function voidLease(
  dealId: string,
): Promise<{ success: boolean; data: { message: string } }> {
  return apiPost(`/api/deals/${dealId}/lease/void`, {});
}
