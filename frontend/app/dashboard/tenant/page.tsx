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
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TenantRewardsSummaryCard } from "@/components/tenant-rewards-summary-card";
import { useFeatureFlag } from "@/lib/featureFlags";
import { getTenantPaymentStatusPresentation } from "@/lib/tenantPaymentStatus";
import { apiFetch } from "@/lib/api";
import {
  getTenantCurrentLease,
  getPaymentSchedule,
  getPaymentHistory,
  type TenantCurrentLease,
  type PaymentScheduleItem,
  type PaymentHistoryItem,
} from "@/lib/tenantApi";
import { fetchSavedListingIds } from "@/lib/savedPropertiesApi";
import { listPublicListings, type PublicListing } from "@/lib/propertiesApi";

type PaymentItem =
  | PaymentScheduleItem
  | (PaymentHistoryItem & { month: string });

export default function TenantDashboard() {
  const isStakingEnabled = useFeatureFlag("STAKING_ENABLED");
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "saved">(
    "overview",
  );

  const [currentLease, setCurrentLease] = useState<TenantCurrentLease | null>(
    null,
  );
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>(
    [],
  );
  const [pastPayments, setPastPayments] = useState<PaymentHistoryItem[]>([]);
  const [savedProperties, setSavedProperties] = useState<PublicListing[]>([]);

  const [leaseLoading, setLeaseLoading] = useState(true);
  const [leaseError, setLeaseError] = useState<string | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);

  const [onboardingStatus, setOnboardingStatus] = useState<{
    completedSteps: string[];
    currentStep: string;
    submitted: boolean;
  } | null>(null);

  useEffect(() => {
    apiFetch<{
      completedSteps: string[];
      currentStep: string;
      submitted: boolean;
    }>("/api/onboarding/status")
      .then(setOnboardingStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLeaseLoading(true);
    getTenantCurrentLease()
      .then((res) => {
        setCurrentLease(res.data);
        setLeaseError(null);
      })
      .catch((err) => {
        console.error("Failed to load lease:", err);
        setLeaseError(
          err instanceof Error ? err.message : "Failed to load lease",
        );
      })
      .finally(() => setLeaseLoading(false));
  }, []);

  useEffect(() => {
    setPaymentsLoading(true);
    Promise.all([getPaymentSchedule(), getPaymentHistory({ limit: 10 })])
      .then(([scheduleRes, historyRes]) => {
        setPaymentSchedule(scheduleRes.data.schedule || []);
        setPastPayments(historyRes.data.payments || []);
        setPaymentsError(null);
      })
      .catch((err) => {
        console.error("Failed to load payments:", err);
        setPaymentsError(
          err instanceof Error ? err.message : "Failed to load payments",
        );
      })
      .finally(() => setPaymentsLoading(false));
  }, []);

  useEffect(() => {
    setSavedLoading(true);
    fetchSavedListingIds()
      .then((ids) => {
        if (ids.length === 0) {
          setSavedProperties([]);
          return;
        }
        return listPublicListings({ listingIds: ids }).then((listings) => {
          setSavedProperties(listings.data);
        });
      })
      .catch((err) => {
        console.error("Failed to load saved properties:", err);
        setSavedError(
          err instanceof Error
            ? err.message
            : "Failed to load saved properties",
        );
      })
      .finally(() => setSavedLoading(false));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentHistoryPresentation = (payment: PaymentItem) => {
    const status = "status" in payment ? payment.status : "paid";
    const statusPresentation = getTenantPaymentStatusPresentation(status);

    let detailText = "";
    if ("paidDate" in payment && payment.paidDate) {
      detailText = `Paid on ${new Date(payment.paidDate).toLocaleDateString()}`;
    } else if ("dueDate" in payment) {
      detailText = `Due ${new Date(payment.dueDate).toLocaleDateString()}`;
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

  const allPayments: PaymentItem[] = [
    ...pastPayments.map((p) => ({
      ...p,
      month: new Date(p.transactionDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      }),
    })),
    ...paymentSchedule,
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

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
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {onboardingComplete && (
        <div className="border-b-3 border-foreground bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm font-semibold text-blue-900">
              Assessment in progress — we will notify you once your profile is
              reviewed.
            </p>
          </div>
        </div>
      )}

      <DashboardSidebar
        role="tenant"
        userInfo={{ name: "Ngozi Adekunle", roleLabel: "Tenant" }}
      />

      <main className="min-h-screen pt-20 lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Welcome back, Ngozi!
            </h1>
            {leaseLoading ? (
              <div className="mt-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading lease info...
                </span>
              </div>
            ) : currentLease ? (
              <p className="mt-2 text-sm text-muted-foreground md:text-base lg:text-lg">
                Your next payment of{" "}
                {formatCurrency(currentLease.monthlyPayment)} is due on{" "}
                {new Date(currentLease.nextPaymentDate).toLocaleDateString()}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground md:text-base lg:text-lg">
                You have no active lease at the moment
              </p>
            )}
          </div>

          {leaseError && (
            <Card className="mb-6 border-3 border-foreground bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-bold">Failed to load lease information</p>
                  <p className="text-sm text-muted-foreground">{leaseError}</p>
                </div>
              </div>
            </Card>
          )}

          {currentLease && !leaseError && (
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
                      {new Date(currentLease.leaseEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

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

          {activeTab === "overview" && (
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {leaseLoading ? (
                <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                </Card>
              ) : currentLease ? (
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
                      <p className="font-bold">
                        {currentLease.landlord?.name || "Landlord"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your Landlord
                      </p>
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
              ) : (
                <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="font-bold">No active lease</p>
                  <p className="text-sm text-muted-foreground">
                    You don't have an active lease at the moment. Browse
                    properties to get started.
                  </p>
                </Card>
              )}

              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Payment Progress</h3>

                {currentLease && (
                  <>
                    <div className="mb-6">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-bold">
                          {currentLease.progress}%
                        </span>
                      </div>
                      <div className="h-6 border-3 border-foreground bg-muted">
                        <div
                          className="h-full bg-secondary transition-all"
                          style={{ width: `${currentLease.progress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                        <span>
                          {formatCurrency(currentLease.totalPaid)} paid
                        </span>
                        <span>
                          {formatCurrency(currentLease.totalOwed)} total
                        </span>
                      </div>
                    </div>

                    <h4 className="mb-3 font-bold">Upcoming Payments</h4>
                    {paymentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : paymentSchedule.length > 0 ? (
                      <div className="space-y-2">
                        {paymentSchedule.slice(0, 3).map((payment) => (
                          <div
                            key={`${payment.period}-${payment.dueDate}`}
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
                                  payment.status === "upcoming"
                                    ? "font-bold"
                                    : ""
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
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No upcoming payments
                      </p>
                    )}
                  </>
                )}

                <Button className="mt-4 w-full border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                  Make Payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>

              {isStakingEnabled && <TenantRewardsSummaryCard />}
            </div>
          )}

          {activeTab === "payments" && (
            <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <h3 className="mb-6 text-lg font-bold">Payment History</h3>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : paymentsError ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-bold">Failed to load payments</p>
                    <p className="text-sm text-muted-foreground">
                      {paymentsError}
                    </p>
                  </div>
                </div>
              ) : allPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment history yet
                </p>
              ) : (
                <div className="space-y-3">
                  {allPayments.map((payment) => {
                    const presentation = getPaymentHistoryPresentation(payment);
                    const paymentId =
                      "id" in payment
                        ? payment.id
                        : `${payment.period}-${payment.dueDate}`;

                    return (
                      <div
                        key={paymentId}
                        className="flex items-center justify-between border-b-2 border-foreground/10 pb-3 last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center border-2 border-foreground ${
                              presentation.statusPresentation
                                .iconContainerClassName
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
                            className={
                              presentation.statusPresentation.className
                            }
                          >
                            {presentation.statusPresentation.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {activeTab === "saved" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card
                    key={i}
                    className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                  >
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  </Card>
                ))
              ) : savedError ? (
                <Card className="border-3 border-foreground bg-destructive/10 p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] col-span-full">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="font-bold">
                        Failed to load saved properties
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {savedError}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : savedProperties.length > 0 ? (
                <>
                  {savedProperties.map((property) => (
                    <PropertyCard
                      key={property.listingId}
                      property={property}
                      isFavorited
                      href={`/properties/${property.listingId}`}
                    />
                  ))}
                  <Card className="flex items-center justify-center border-3 border-dashed border-foreground p-8">
                    <Link href="/properties" className="text-center">
                      <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 font-bold">Browse More Properties</p>
                      <p className="text-sm text-muted-foreground">
                        Find your next home
                      </p>
                    </Link>
                  </Card>
                </>
              ) : (
                <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] col-span-full">
                  <p className="font-bold">No saved properties</p>
                  <p className="text-sm text-muted-foreground">
                    Browse properties and save your favorites here
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
