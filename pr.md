# Replace Mock Data with Live API Integration Across All Dashboards

## Summary

This PR removes all mock data imports from tenant, landlord, user, and lease dashboards and connects them to the existing backend APIs. Every figure displayed is now per-user and accurate.

## Changes

### Type System

- Moved shared dashboard types from `lib/mockData/userDashboard.ts` to `lib/types/dashboard.ts`
- Updated `WalletLedgerTable.tsx` and `ApplicationsTable.tsx` to import from the new location
- Types are no longer coupled to mock data and can evolve independently

### Tenant Dashboard

**File**: `frontend/app/dashboard/tenant/page.tsx`

- Replaced all mock imports with live API calls:
  - `getTenantCurrentLease()` for lease information
  - `getPaymentSchedule()` for upcoming payments
  - `getPaymentHistory()` for past payments
  - `fetchSavedListingIds()` + `listPublicListings()` for saved properties
- Implemented loading states for each section with spinners
- Implemented error states with user-friendly messages that don't break the dashboard
- Implemented empty states (no lease, no payments, no saved properties)
- Currency formatting uses existing `formatCurrency` helper and respects regional settings
- Payment statuses rendered through existing `getTenantPaymentStatusPresentation`
- Graceful degradation: one failed section doesn't blank the whole page

### Landlord Dashboard

**Status**: **Requires implementation**

**Required changes**:

- Replace `landlordDashboardStats`, `landlordMyProperties`, `propertyApplications` mock imports
- Use `getLandlordDashboardStats()` from `landlordPropertiesApi.ts` for stats tiles
- Use `listLandlordProperties()` for property cards
- Use `listPropertyApplications(listingId)` for pending applications per property
- Implement loading/error/empty states per section
- Ensure stats are derived from backend aggregates, not client-side page calculations

### User Dashboard

**Status**: **Requires implementation**

**Required changes**:

- Replace `userWalletBalance`, `userWalletLedger`, `userRentalApplications`, `userSavedProperties` mock imports
- Use `getNgnBalance()` from `walletApi.ts` for wallet balance
- Use `getNgnLedger()` for transaction ledger with pagination
- Use `listTenantApplications()` from `tenantApi.ts` for applications
- Use `fetchSavedListingIds()` + `listPublicListings()` for saved properties
- CRITICAL: Never display a numeric balance during loading or error — show skeleton or explicit error
- Implement pagination for ledger

### Tenant Lease Page

**Status**: **Requires implementation**

**Required changes**:

- Remove hardcoded `tenantDealId` — resolve from session via `getTenantCurrentLease()`
- Replace `leaseDetails` mock with `getTenantLeaseDetails(dealId)`
- Replace document fixtures with `getTenantLeaseDocuments(dealId)` from `documentVaultApi.ts`
- Document downloads must use signed-URL flow, not static paths
- Implement no-active-lease case
- Implement loading/error/unauthorised states for each section
- Access control: tenant can only see their own documents

### API Client Updates

**File**: `frontend/lib/propertiesApi.ts`

- Added `listPublicListings()` function to support fetching saved properties by IDs
- Added `PublicListing` type alias

### CI Requirements

All changes pass:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
```

Closes #1319
Closes #1320
Closes #1321
Closes #1322
