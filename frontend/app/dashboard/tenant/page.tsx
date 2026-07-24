"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MapPin,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TenantRewardsSummaryCard } from "@/components/tenant-rewards-summary-card";
import {
  tenantCurrentLease as currentLease,
  tenantDashboardPaymentSchedule as paymentSchedule,
  tenantDashboardPastPayments as pastPayments,
  tenantSavedProperties as savedProperties,
} from "@/lib/mockData";
import { useFeatureFlag } from "@/lib/featureFlags";
import { getTenantPaymentStatusPresentation } from "@/lib/tenantPaymentStatus";
import { apiFetch } from "@/lib/api";

// Wallet balance - checked first before auto-deduction
type PaymentItem =
  | {
      month: string;
      amount: number;
      status: "upcoming" | "pending";
      dueDate: string;
    }
  | {
      month: string;
      amount: number;
      status: "paid";
      paidDate: string;
    };

export default function TenantDashboard() {
  const isStakingEnabled = useFeatureFlag("STAKING_ENABLED");
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "saved">(
    "overview",
  );
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completedSteps: string[];
    currentStep: string;
    submitted: boolean;
  } | null>(null);

  useEffect(() => {
    apiFetch<{ completedSteps: string[]; currentStep: string; submitted: boolean }>(
      "/api/onboarding/status"
    )
      .then(setOnboardingStatus)
      .catch(() => {});
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentHistoryPresentation = (payment: PaymentItem) => {
    const statusPresentation = getTenantPaymentStatusPresentation(payment.status);

    let detailText = "";
    if (payment.status === "paid") {
      detailText = `Paid on ${payment.paidDate}`;
    } else {
      detailText = `Due ${payment.dueDate}`;
    }

    return {
      detailText,
      statusPresentation,
    };
  };

  const onboardingComplete = onboardingStatus?.submitted || false;
  const onboardingProgress = onboardingStatus
    ? Math.round((onboardingStatus.completedSteps.length / 5) * 100)
    : 0;
  const showOnboardingBanner = onboardingStatus && !onboardingStatus.submitted;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div className="border-b-3 border-foreground bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Complete your profile to apply for properties
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-32 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${onboardingProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-amber-700">
                    {onboardingStatus.completedSteps.length} / 5 steps
                  </span>
                </div>
              </div>
            </div>
            <Link href="/onboarding">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none">
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Assessment in progress banner */}
      {onboardingComplete && (
        <div className="border-b-3 border-foreground bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm font-semibold text-blue-900">
              Assessment in progress — we will notify you once your profile is reviewed.
            </p>
          </div>
        </div>
      )}

      <DashboardSidebar
        role="tenant"
        userInfo={{ name: "Ngozi Adekunle", roleLabel: "Tenant" }}
      />

      {/* Main Content */}
      <main className="min-h-screen pt-20 lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Welcome back, Ngozi!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base lg:text-lg">
              Your next payment of {formatCurrency(currentLease.monthlyPayment)}{" "}
              is due on {currentLease.nextPaymentDate}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-4 md:gap-4">
            <Card className="border-3 border-foreground p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-3 border-foreground bg-primary md:h-12 md:w-12">
                  <CreditCard className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground md:text-sm">
                    Next Payment
                  </p>
                  <p className="truncate text-base font-bold md:text-xl">
                    {formatCurrency(currentLease.monthlyPayment)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="border-3 border-foreground p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-3 border-foreground bg-secondary md:h-12 md:w-12">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground md:text-sm">
                    Total Paid
                  </p>
                  <p className="truncate text-base font-bold md:text-xl">
                    {formatCurrency(currentLease.totalPaid)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="border-3 border-foreground p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-3 border-foreground bg-accent md:h-12 md:w-12">
                  <Clock className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground md:text-sm">
                    Remaining
                  </p>
                  <p className="truncate text-base font-bold md:text-xl">
                    {formatCurrency(
                      currentLease.totalOwed - currentLease.totalPaid,
                    )}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="border-3 border-foreground p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-3 border-foreground bg-muted md:h-12 md:w-12">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground md:text-sm">
                    Lease Ends
                  </p>
                  <p className="truncate text-base font-bold md:text-xl">
                    {currentLease.leaseEnd}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex flex-wrap gap-2 md:gap-4">
            {[
              { id: "overview", label: "Overview" },
              { id: "payments", label: "Payments" },
              { id: "saved", label: "Saved" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`border-3 border-foreground px-3 py-2 text-sm font-bold transition-all md:px-6 md:py-3 md:text-base ${
                  activeTab === tab.id
                    ? "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                    : "bg-card hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {/* Current Property */}
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Your Current Home</h3>
                <div className="mb-4 border-3 border-foreground bg-muted p-4">
                  <div className="flex items-center justify-center py-8">
                    <Building2 className="h-16 w-16 text-muted-foreground" />
                  </div>
                </div>
                <h4 className="text-xl font-bold">{currentLease.property}</h4>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {currentLease.location}
                </p>

                <div className="mt-4 flex items-center gap-3 border-t-2 border-foreground pt-4">
                  <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-primary font-bold">
                    {currentLease.landlord?.name?.charAt(0) || "L"}
                  </div>
                  <div>
                    <p className="font-bold">{currentLease.landlord?.name || "Landlord"}</p>
                    <p className="text-sm text-muted-foreground">Your Landlord</p>
                  </div>
                  <Link href="/messages" className="ml-auto">
                    <Button
                      size="sm"
                      className="border-2 border-foreground bg-secondary font-bold"
                    >
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Message
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Payment Progress */}
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Payment Progress</h3>

                <div className="mb-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold">{currentLease.progress}%</span>
                  </div>
                  <div className="h-6 border-3 border-foreground bg-muted">
                    <div
                      className="h-full bg-secondary transition-all"
                      style={{ width: `${currentLease.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(currentLease.totalPaid)} paid</span>
                    <span>{formatCurrency(currentLease.totalOwed)} total</span>
                  </div>
                </div>

                <h4 className="mb-3 font-bold">Upcoming Payments</h4>
                <div className="space-y-2">
                  {paymentSchedule.slice(0, 3).map((payment) => (
                    <div
                      key={payment.month}
                      className="flex items-center justify-between border-b border-foreground/10 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        {payment.status === "upcoming" ? (
                          <AlertCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={
                            payment.status === "upcoming" ? "font-bold" : ""
                          }
                        >
                          {payment.month}
                        </span>
                      </div>
                      <span className="font-mono font-bold">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                  <Button className="mt-4 w-full border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                    Make Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>

                {isStakingEnabled && (
                  <TenantRewardsSummaryCard />
                )}
              </div>
            )}

          {/* Payment History Tab */}
          {activeTab === "payments" && (
            <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <h3 className="mb-6 text-lg font-bold">Payment History</h3>

              <div className="space-y-3">
                {[...pastPayments, ...paymentSchedule].map((payment) => (
                  (() => {
                    const presentation = getPaymentHistoryPresentation(payment);

                    return (
                  <div
                    key={`${payment.month}-${payment.amount}-${payment.status}-${"dueDate" in payment ? payment.dueDate : payment.paidDate}`}
                    className="flex items-center justify-between border-b-2 border-foreground/10 pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center border-2 border-foreground ${
                          presentation.statusPresentation.iconContainerClassName
                        }`}
                      >
                        {payment.status === "paid" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{payment.month}</p>
                        <p className="text-sm text-muted-foreground">
                          {presentation.detailText}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">
                        {formatCurrency(payment.amount)}
                      </p>
                      <Badge
                        variant={presentation.statusPresentation.variant}
                        className={presentation.statusPresentation.className}
                      >
                        {presentation.statusPresentation.label}
                      </Badge>
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            </Card>
          )}

          {/* Saved Properties Tab */}
          {activeTab === "saved" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedProperties.map((property) => {
                const locationParts = property.location
                  .split(",")
                  .map((part) => part.trim());
                const area = locationParts[0];
                const city = locationParts[1];

                return (
                  <PropertyCard
                    key={property.id}
                    property={{
                      listingId: String(property.id),
                      address: property.title,
                      city,
                      area,
                      bedrooms: property.beds,
                      bathrooms: property.baths,
                      annualRentNgn: property.price,
                      photos: property.photos,
                      hasApprovedInspection: property.hasApprovedInspection,
                      paymentType: property.paymentType,
                    }}
                    isFavorited
                    href={`/properties/${property.id}`}
                  />
                );
              })}
              <Card className="flex items-center justify-center border-3 border-dashed border-foreground p-8">
                <Link href="/properties" className="text-center">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 font-bold">Browse More Properties</p>
                  <p className="text-sm text-muted-foreground">
                    Find your next home
                  </p>
                </Link>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
