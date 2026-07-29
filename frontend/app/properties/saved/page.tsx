"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Heart, ArrowLeft, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PropertyCard } from "@/components/property-card";
import { PropertyCardSkeleton } from "@/components/property-card-skeleton";
import useAuthStore from "@/store/useAuthStore";
import {
  fetchSavedListingIds,
  setListingSaved,
} from "@/lib/savedPropertiesApi";
import { getProperty, type PropertyListing } from "@/lib/propertiesApi";
import { showErrorToast } from "@/lib/toast";

interface SavedProperty {
  listing: PropertyListing;
  removed?: boolean;
}

export default function SavedPropertiesPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSaved() {
      setIsLoading(true);
      setError(null);
      try {
        const ids = await fetchSavedListingIds();
        if (cancelled) return;

        if (ids.length === 0) {
          setProperties([]);
          setIsLoading(false);
          return;
        }

        const results = await Promise.allSettled(
          ids.map((id) => getProperty(id)),
        );

        if (cancelled) return;

        const loaded: SavedProperty[] = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === "fulfilled" && result.value?.data) {
            loaded.push({ listing: result.value.data });
          }
          // Silently skip listings that no longer exist (delisted / deleted)
        }

        setProperties(loaded);
      } catch (err) {
        if (!cancelled) {
          setError("Could not load your saved properties. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSaved();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleUnsave = useCallback(
    async (listingId: string) => {
      // Optimistic removal
      setProperties((prev) =>
        prev.map((p) =>
          p.listing.listingId === listingId ? { ...p, removed: true } : p,
        ),
      );

      try {
        await setListingSaved(listingId, false);
        // Confirm removal after API success
        setProperties((prev) =>
          prev.filter((p) => p.listing.listingId !== listingId),
        );
      } catch (error) {
        // Rollback on failure
        setProperties((prev) =>
          prev.map((p) =>
            p.listing.listingId === listingId ? { ...p, removed: false } : p,
          ),
        );
        showErrorToast(error, "Could not remove saved property");
      }
    },
    [],
  );

  const visibleProperties = properties.filter((p) => !p.removed);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardSidebar
        role="tenant"
        userInfo={{ name: "Tenant", roleLabel: "Tenant" }}
      />

      <main className="min-h-screen pt-20 lg:ml-64">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/properties"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 fill-destructive text-destructive" />
              <div>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                  Saved Properties
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading..."
                    : `${visibleProperties.length} saved ${visibleProperties.length === 1 ? "property" : "properties"}`}
                </p>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <Card className="border-3 border-foreground p-8 text-center shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="mt-4 text-lg font-bold">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4 border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
              >
                Try Again
              </Button>
            </Card>
          )}

          {/* Empty state */}
          {!isLoading && !error && visibleProperties.length === 0 && (
            <Card className="border-3 border-dashed border-foreground p-12 text-center shadow-none">
              <Heart className="mx-auto h-16 w-16 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-bold">No saved properties yet</h2>
              <p className="mt-2 text-muted-foreground">
                Browse properties and tap the heart icon to save your favorites here.
              </p>
              <Link href="/properties" className="mt-6 inline-block">
                <Button className="border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                  <Search className="mr-2 h-4 w-4" />
                  Browse Properties
                </Button>
              </Link>
            </Card>
          )}

          {/* Property grid */}
          {!isLoading && !error && visibleProperties.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProperties.map(({ listing }) => (
                  <PropertyCard
                    key={listing.listingId}
                    property={{
                      listingId: listing.listingId,
                      address: listing.address,
                      city: listing.city,
                      area: listing.area,
                      bedrooms: listing.bedrooms,
                      bathrooms: listing.bathrooms,
                      annualRentNgn: listing.annualRentNgn,
                      outrightPriceNgn: listing.outrightPriceNgn,
                      installmentBasePriceNgn: listing.installmentBasePriceNgn,
                      photos: listing.photos,
                      hasApprovedInspection: listing.hasApprovedInspection,
                    }}
                    isFavorited
                    onFavoriteChange={(saved) => {
                      if (!saved) {
                        handleUnsave(listing.listingId);
                      }
                    }}
                    href={`/properties/${listing.listingId}`}
                  />
                ))}
              </div>

              {/* Compare link */}
              {visibleProperties.length >= 2 && (
                <div className="mt-8 text-center">
                  <Link href="/properties/compare">
                    <Button
                      variant="outline"
                      className="border-3 border-foreground bg-card font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                    >
                      Compare {visibleProperties.length} Properties
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
