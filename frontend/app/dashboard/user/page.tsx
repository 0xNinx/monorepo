"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  Wallet,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPropertyCard } from "@/components/user-dashboard/UserPropertyCard";
import { ApplicationsTable } from "@/components/user-dashboard/ApplicationsTable";
import { WalletLedgerTable } from "@/components/user-dashboard/WalletLedgerTable";
import { getNgnBalance, getNgnLedger } from "@/lib/walletApi";
import { listTenantApplications } from "@/lib/tenantApi";
import { fetchSavedListingIds } from "@/lib/savedPropertiesApi";
import { listPublicListings } from "@/lib/propertiesApi";
import type {
  WalletBalance,
  UserRentalApplication,
  UserSavedProperty,
  WalletLedgerEntry,
} from "@/lib/types/dashboard";

function formatNgn(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function UserDashboardPage() {
  type TabValue = "my-properties" | "applications" | "wallet";

  const [activeTab, setActiveTab] = useState<TabValue>("my-properties");

  const [savedProperties, setSavedProperties] = useState<UserSavedProperty[]>(
    [],
  );
  const [applications, setApplications] = useState<UserRentalApplication[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(
    null,
  );
  const [ledgerEntries, setLedgerEntries] = useState<WalletLedgerEntry[]>([]);

  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    setSavedLoading(true);
    fetchSavedListingIds()
      .then((ids) => {
        if (ids.length === 0) {
          setSavedProperties([]);
          return;
        }
        return listPublicListings({ listingIds: ids }).then((listings) => {
          const props: UserSavedProperty[] = listings.data.map((l) => ({
            id: parseInt(l.listingId, 10),
            title: l.address,
            location: [l.area, l.city].filter(Boolean).join(", "),
            priceNgnPerYear: l.annualRentNgn,
          }));
          setSavedProperties(props);
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

  useEffect(() => {
    setAppsLoading(true);
    listTenantApplications()
      .then((res) => {
        const apps: UserRentalApplication[] = res.data.map((app) => ({
          id: app.applicationId,
          property: {
            title: app.propertyTitle || "Property",
            location: app.propertyLocation || "Location",
            priceNgnPerYear: app.annualRent,
          },
          status: app.status as UserRentalApplication["status"],
          submittedAt: app.createdAt,
        }));
        setApplications(apps);
        setAppsError(null);
      })
      .catch((err) => {
        console.error("Failed to load applications:", err);
        setAppsError(
          err instanceof Error ? err.message : "Failed to load applications",
        );
      })
      .finally(() => setAppsLoading(false));
  }, []);

  useEffect(() => {
    setWalletLoading(true);
    Promise.all([getNgnBalance(), getNgnLedger({ limit: 20 })])
      .then(([balanceRes, ledgerRes]) => {
        const balance: WalletBalance = {
          availableNgn: balanceRes.availableNgn,
          heldNgn: balanceRes.heldNgn,
          totalNgn: balanceRes.totalNgn,
          availableUsdc: "0.00",
          heldUsdc: "0.00",
          totalUsdc: "0.00",
        };
        setWalletBalance(balance);

        const entries: WalletLedgerEntry[] = ledgerRes.entries.map((e) => ({
          id: e.id,
          type: e.type as WalletLedgerEntry["type"],
          amountNgn: e.amountNgn,
          amountUsdc: e.amountUsdc,
          status: e.status,
          timestamp: e.timestamp,
          reference: e.reference || null,
        }));
        setLedgerEntries(entries);
        setWalletError(null);
      })
      .catch((err) => {
        console.error("Failed to load wallet:", err);
        setWalletError(
          err instanceof Error ? err.message : "Failed to load wallet",
        );
      })
      .finally(() => setWalletLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="min-h-screen pt-20">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-2 md:mb-8">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Manage your saved properties, applications, and wallet.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
          >
            <TabsList className="w-full md:w-fit">
              <TabsTrigger
                value="my-properties"
                className="flex-1 md:flex-none"
              >
                <Building2 className="h-4 w-4" />
                My Properties
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex-1 md:flex-none">
                <CreditCard className="h-4 w-4" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex-1 md:flex-none">
                <Wallet className="h-4 w-4" />
                Wallet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-properties" className="mt-4">
              {savedLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : savedError ? (
                <Card className="border-3 border-foreground bg-destructive/10 p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
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
              ) : savedProperties.length === 0 ? (
                <Empty className="border-2 border-foreground/20 bg-card">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Building2 />
                    </EmptyMedia>
                    <EmptyTitle>No saved properties yet</EmptyTitle>
                    <EmptyDescription>
                      Shortlist properties to see them here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent />
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {savedProperties.map((p) => (
                    <UserPropertyCard key={p.id} property={p} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="applications" className="mt-4">
              {appsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : appsError ? (
                <Card className="border-3 border-foreground bg-destructive/10 p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="font-bold">Failed to load applications</p>
                      <p className="text-sm text-muted-foreground">
                        {appsError}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : applications.length === 0 ? (
                <Empty className="border-2 border-foreground/20 bg-card">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CreditCard />
                    </EmptyMedia>
                    <EmptyTitle>No applications yet</EmptyTitle>
                    <EmptyDescription>
                      When you submit rental applications, they will appear
                      here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent />
                </Empty>
              ) : (
                <Card className="border-2 border-foreground/20">
                  <CardHeader>
                    <CardTitle>Submitted applications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ApplicationsTable applications={applications} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="wallet" className="mt-4">
              {walletLoading ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : walletError ? (
                <Card className="border-3 border-foreground bg-destructive/10 p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="font-bold">Failed to load wallet</p>
                      <p className="text-sm text-muted-foreground">
                        {walletError}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : walletBalance ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-2 border-foreground/20">
                      <CardHeader>
                        <CardTitle>NGN Available</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-mono text-2xl font-black text-primary">
                          {formatNgn(walletBalance.availableNgn)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Held: {formatNgn(walletBalance.heldNgn)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-foreground/20">
                      <CardHeader>
                        <CardTitle>USDC Available</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-mono text-2xl font-black text-primary">
                          {walletBalance.availableUsdc} USDC
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Held: {walletBalance.heldUsdc} USDC
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-foreground/20">
                      <CardHeader>
                        <CardTitle>Total</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">NGN</div>
                        <div className="font-mono font-black text-foreground">
                          {formatNgn(walletBalance.totalNgn)}
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                          USDC
                        </div>
                        <div className="font-mono font-black text-foreground">
                          {walletBalance.totalUsdc} USDC
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {ledgerEntries.length === 0 ? (
                    <Empty className="border-2 border-foreground/20 bg-card">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Wallet />
                        </EmptyMedia>
                        <EmptyTitle>No transactions yet</EmptyTitle>
                        <EmptyDescription>
                          Your wallet ledger entries will appear here.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent />
                    </Empty>
                  ) : (
                    <Card className="border-2 border-foreground/20">
                      <CardHeader>
                        <CardTitle>Transaction history</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <WalletLedgerTable entries={ledgerEntries} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
