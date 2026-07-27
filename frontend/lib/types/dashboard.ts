/**
 * Shared dashboard types
 */

export type UserSavedProperty = {
  id: number;
  title: string;
  location: string;
  priceNgnPerYear: number;
};

export type UserRentalApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export type UserRentalApplication = {
  id: string;
  property: {
    title: string;
    location: string;
    priceNgnPerYear: number;
  };
  status: UserRentalApplicationStatus;
  submittedAt: string;
};

export type WalletBalance = {
  availableNgn: number;
  heldNgn: number;
  totalNgn: number;
  availableUsdc: string;
  heldUsdc: string;
  totalUsdc: string;
};

export type WalletLedgerEntryStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "confirmed"
  | "failed"
  | "reversed";

export type WalletLedgerEntryType =
  | "top_up"
  | "topup_pending"
  | "topup_confirmed"
  | "top_up_reversed"
  | "topup_reversed"
  | "withdrawal"
  | "stake"
  | "stake_reserve"
  | "stake_release"
  | "unstake"
  | "reward"
  | "conversion_debit";

export type WalletLedgerEntry = {
  id: string;
  type: WalletLedgerEntryType;
  amountNgn: number;
  amountUsdc?: string;
  status: WalletLedgerEntryStatus;
  timestamp: string;
  reference: string | null;
};
