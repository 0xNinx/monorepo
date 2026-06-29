"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NIGERIAN_CITIES,
  PROPERTY_AMENITIES,
  PROPERTY_AMENITY_LABELS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  type PropertyAmenity,
  type PropertyType,
} from "@/lib/amenities";
import {
  computeMarginPreview,
  MIN_OUTRIGHT_MARGIN_PERCENT,
  type LandlordPropertyRecord,
  type PropertyListingPayload,
} from "@/lib/landlordPropertiesApi";
import { cn } from "@/lib/utils";
import { PhotoGalleryEditor } from "@/components/landlord/PhotoGalleryEditor";
import { debounce } from "@/lib/utils";

// Zod validation schema matching backend PropertyListingPayload
export const ValidationSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(200, "Title must not exceed 200 characters"),
    address: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    area: z.string().optional().default(""),
    propertyType: z
      .enum([...PROPERTY_TYPES, ""] as const, {
        errorMap: () => ({ message: "Property type is required" }),
      })
      .refine((v) => v !== "", "Property type is required"),
    bedrooms: z.coerce
      .number()
      .int("Bedrooms must be a whole number")
      .min(1, "Bedrooms must be at least 1")
      .max(20, "Bedrooms must not exceed 20"),
    bathrooms: z.coerce
      .number()
      .int("Bathrooms must be a whole number")
      .min(1, "Bathrooms must be at least 1")
      .max(20, "Bathrooms must not exceed 20"),
    sqm: z
      .union([
        z
          .string()
          .max(0, "")
          .transform(() => undefined),
        z.coerce.number().positive("Floor area must be a positive number"),
      ])
      .optional(),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional()
      .default(""),
    amenities: z.array(z.enum(PROPERTY_AMENITIES)).optional().default([]),
    photos: z
      .array(
        z.object({
          id: z.string(),
          preview: z.string(),
          file: z.instanceof(File).optional(),
        }),
      )
      .min(3, "At least 3 photos are required")
      .max(20, "Maximum 20 photos allowed"),
    primaryPhotoId: z.string().nullable().optional(),
    negotiatedLandlordRateNgn: z.coerce
      .number()
      .positive("Negotiated rate must be a positive number"),
    outrightPriceNgn: z.coerce
      .number()
      .positive("Outright price must be a positive number"),
    installmentBasePriceNgn: z.coerce
      .number()
      .positive("Installment base price must be a positive number"),
    videoUrl: z
      .union([
        z.string().url("Video URL must be a valid URL"),
        z
          .string()
          .max(0, "")
          .transform(() => undefined),
      ])
      .optional(),
  })
  .refine(
    (data) => {
      // Outright price must not exceed installment base price
      return data.outrightPriceNgn <= data.installmentBasePriceNgn;
    },
    {
      message: "Outright price must not exceed installment base price",
      path: ["outrightPriceNgn"],
    },
  )
  .refine(
    (data) => {
      // Outright margin >= 5%
      if (data.negotiatedLandlordRateNgn <= 0) return false;
      const margin =
        (data.outrightPriceNgn - data.negotiatedLandlordRateNgn) /
        data.negotiatedLandlordRateNgn;
      return margin >= MIN_OUTRIGHT_MARGIN_PERCENT;
    },
    {
      message: `Outright margin must be at least ${MIN_OUTRIGHT_MARGIN_PERCENT * 100}%`,
      path: ["outrightPriceNgn"],
    },
  );

export interface ListingPhoto {
  id: string;
  preview: string;
  file?: File;
}

export interface PropertyListingFormValues {
  title: string;
  address: string;
  city: string;
  area: string;
  propertyType: PropertyType | "";
  bedrooms: string;
  bathrooms: string;
  sqm: string;
  description: string;
  amenities: PropertyAmenity[];
  photos: ListingPhoto[];
  primaryPhotoId: string | null;
  negotiatedLandlordRateNgn: string;
  outrightPriceNgn: string;
  installmentBasePriceNgn: string;
  videoUrl: string;
}

const STEP_LABELS = [
  "Property Details",
  "Amenities",
  "Media",
  "Pricing",
  "Review & Submit",
];

function defaultValues(
  initial?: LandlordPropertyRecord,
): PropertyListingFormValues {
  if (!initial) {
    return {
      title: "",
      address: "",
      city: "",
      area: "",
      propertyType: "",
      bedrooms: "",
      bathrooms: "",
      sqm: "",
      description: "",
      amenities: [],
      photos: [],
      primaryPhotoId: null,
      negotiatedLandlordRateNgn: "",
      outrightPriceNgn: "",
      installmentBasePriceNgn: "",
      videoUrl: "",
    };
  }

  return {
    title: initial.title,
    address: initial.address,
    city: initial.city ?? "",
    area: initial.area ?? "",
    propertyType: initial.propertyType ?? "",
    bedrooms: String(initial.bedrooms),
    bathrooms: String(initial.bathrooms),
    sqm: initial.sqm != null ? String(initial.sqm) : "",
    description: initial.description ?? "",
    amenities: initial.amenities ?? [],
    photos: initial.photos.map((url, index) => ({
      id: `existing-${index}`,
      preview: url,
    })),
    primaryPhotoId:
      initial.photos.length > 0
        ? `existing-${initial.primaryPhotoIndex ?? 0}`
        : null,
    negotiatedLandlordRateNgn: String(
      initial.negotiatedLandlordRateNgn ?? initial.annualRentNgn,
    ),
    outrightPriceNgn: String(initial.outrightPriceNgn ?? ""),
    installmentBasePriceNgn: String(
      initial.installmentBasePriceNgn ?? initial.annualRentNgn,
    ),
    videoUrl: initial.videoUrl ?? "",
  };
}

async function photosToPayload(
  photos: ListingPhoto[],
  primaryPhotoId: string | null,
): Promise<{ photos: string[]; primaryPhotoIndex: number }> {
  const ordered = [...photos];
  const primaryIdx = primaryPhotoId
    ? ordered.findIndex((p) => p.id === primaryPhotoId)
    : 0;
  if (primaryIdx > 0) {
    const [primary] = ordered.splice(primaryIdx, 1);
    ordered.unshift(primary);
  }

  const urls: string[] = [];
  for (const photo of ordered) {
    if (photo.file) {
      const dataUrl = await readFileAsDataUrl(photo.file);
      urls.push(dataUrl);
    } else {
      urls.push(photo.preview);
    }
  }

  return { photos: urls, primaryPhotoIndex: 0 };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function buildListingPayload(
  values: PropertyListingFormValues,
  photoUrls: string[],
): PropertyListingPayload {
  return {
    title: values.title.trim(),
    address: values.address.trim(),
    city: values.city || undefined,
    area: values.area || undefined,
    propertyType: values.propertyType || undefined,
    bedrooms: parseInt(values.bedrooms, 10),
    bathrooms: parseInt(values.bathrooms, 10),
    sqm: values.sqm ? parseFloat(values.sqm) : undefined,
    description: values.description || undefined,
    amenities: values.amenities,
    photos: photoUrls,
    primaryPhotoIndex: 0,
    photoOrder: photoUrls,
    negotiatedLandlordRateNgn: parseFloat(values.negotiatedLandlordRateNgn),
    outrightPriceNgn: parseFloat(values.outrightPriceNgn),
    installmentBasePriceNgn: parseFloat(values.installmentBasePriceNgn),
    videoUrl: values.videoUrl.trim() || undefined,
  };
}

interface PropertyListingFormProps {
  mode: "create" | "edit";
  initialProperty?: LandlordPropertyRecord;
  onSubmit: (payload: PropertyListingPayload) => Promise<void>;
  submitLabel?: string;
}

export function PropertyListingForm({
  mode,
  initialProperty,
  onSubmit,
  submitLabel,
}: PropertyListingFormProps) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<PropertyListingFormValues>(() =>
    defaultValues(initialProperty),
  );
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldServerErrors, setFieldServerErrors] = useState<
    Record<string, string>
  >({});
  const firstErrorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  const propertyId = initialProperty?.id;
  const draftKey = `property-listing-draft-${propertyId || "new"}`;

  // Draft autosave with debounce (2s)
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
    } catch (err) {
      console.error("Failed to save draft:", err);
    }
  }, [values, draftKey]);

  const debouncedSaveDraft = useMemo(
    () => debounce(saveDraft, 2000),
    [saveDraft],
  );

  useEffect(() => {
    debouncedSaveDraft();
  }, [values, debouncedSaveDraft]);

  // Load draft on mount if exists
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Check if draft is stale (compare with props)
        if (draft.title !== defaultValues(initialProperty).title) {
          const shouldRestore = window.confirm(
            "A draft was found. Would you like to restore it?",
          );
          if (shouldRestore) {
            setValues(draft);
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch (err) {
        console.error("Failed to load draft:", err);
        localStorage.removeItem(draftKey);
      }
    }
  }, [propertyId, draftKey, initialProperty]);

  // Clear draft on successful submit
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
  }, [draftKey]);

  // Warn on navigate if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentDefaults = defaultValues(initialProperty);
      const hasChanges =
        JSON.stringify(values) !== JSON.stringify(currentDefaults);
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [values, initialProperty]);

  const margin = useMemo(() => {
    const negotiated = parseFloat(values.negotiatedLandlordRateNgn) || 0;
    const outright = parseFloat(values.outrightPriceNgn) || 0;
    const installment = parseFloat(values.installmentBasePriceNgn) || 0;
    if (!negotiated || !outright || !installment) return null;
    return computeMarginPreview(negotiated, outright, installment);
  }, [
    values.negotiatedLandlordRateNgn,
    values.outrightPriceNgn,
    values.installmentBasePriceNgn,
  ]);

  const toggleAmenity = (amenity: PropertyAmenity) => {
    setValues((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const canProceedFromMedia =
    values.photos.length >= 3 && values.photos.length <= 20;

  // Map common server errors to field-specific errors
  const mapServerErrors = (error: Error | unknown) => {
    const fieldErrors: Record<string, string> = {};
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("title") && errorMessage.includes("exists")) {
      fieldErrors.title = "This title is already in use";
    } else if (errorMessage.includes("photo")) {
      if (errorMessage.includes("403")) {
        fieldErrors.photos = "Permission denied to upload photos";
      } else if (errorMessage.includes("413")) {
        fieldErrors.photos = "Photos are too large to upload";
      } else {
        fieldErrors.photos = "Failed to upload photos";
      }
    }

    return fieldErrors;
  };

  // Focus first field with error
  const focusFirstError = () => {
    if (firstErrorRef.current) {
      firstErrorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      firstErrorRef.current.focus();
    }
  };

  const handleSubmit = async () => {
    if (!canProceedFromMedia) return;

    setServerError(null);
    setFieldServerErrors({});
    firstErrorRef.current = null;

    try {
      const { photos } = await photosToPayload(
        values.photos,
        values.primaryPhotoId,
      );
      const payload = buildListingPayload(values, photos);
      setSubmitting(true);
      await onSubmit(payload);
      clearDraft();
    } catch (error) {
      const mappedErrors = mapServerErrors(error);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldServerErrors(mappedErrors);
        focusFirstError();
      } else {
        const message =
          error instanceof Error ? error.message : "Failed to submit listing";
        setServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {serverError && (
        <Card className="border-3 border-destructive bg-destructive/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
            <div>
              <p className="font-bold text-destructive">
                Error submitting listing
              </p>
              <p className="text-sm">{serverError}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {STEP_LABELS.map((label, index) => {
          const n = index + 1;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(n)}
              className={cn(
                "border-2 border-foreground px-3 py-2 text-sm font-bold",
                step === n ? "bg-primary" : "bg-card",
              )}
            >
              {n}. {label}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="mb-4 text-xl font-bold">Property Details</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                ref={(el) => {
                  if (el && !firstErrorRef.current) firstErrorRef.current = el;
                }}
                id="title"
                value={values.title}
                onChange={(e) =>
                  setValues({ ...values, title: e.target.value })
                }
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.title && "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.title ? "field-error-title" : undefined
                }
              />
              {fieldServerErrors.title && (
                <p
                  id="field-error-title"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.title}
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="propertyType">Property type</Label>
                <Select
                  value={values.propertyType}
                  onValueChange={(v) =>
                    setValues({ ...values, propertyType: v as PropertyType })
                  }
                >
                  <SelectTrigger
                    id="propertyType"
                    className={cn(
                      "border-2 border-foreground",
                      fieldServerErrors.propertyType && "border-red-400",
                    )}
                    aria-describedby={
                      fieldServerErrors.propertyType
                        ? "field-error-propertyType"
                        : undefined
                    }
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROPERTY_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldServerErrors.propertyType && (
                  <p
                    id="field-error-propertyType"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldServerErrors.propertyType}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Select
                  value={values.city}
                  onValueChange={(v) => setValues({ ...values, city: v })}
                >
                  <SelectTrigger
                    id="city"
                    className={cn(
                      "border-2 border-foreground",
                      fieldServerErrors.city && "border-red-400",
                    )}
                    aria-describedby={
                      fieldServerErrors.city ? "field-error-city" : undefined
                    }
                  >
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldServerErrors.city && (
                  <p
                    id="field-error-city"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldServerErrors.city}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="area">Neighbourhood / area</Label>
              <Input
                id="area"
                value={values.area}
                onChange={(e) => setValues({ ...values, area: e.target.value })}
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.area && "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.area ? "field-error-area" : undefined
                }
              />
              {fieldServerErrors.area && (
                <p
                  id="field-error-area"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.area}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="address">Full address</Label>
              <Input
                id="address"
                value={values.address}
                onChange={(e) =>
                  setValues({ ...values, address: e.target.value })
                }
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.address && "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.address ? "field-error-address" : undefined
                }
              />
              {fieldServerErrors.address && (
                <p
                  id="field-error-address"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.address}
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="beds">Bedrooms</Label>
                <Input
                  id="beds"
                  type="number"
                  min={1}
                  max={20}
                  value={values.bedrooms}
                  onChange={(e) =>
                    setValues({ ...values, bedrooms: e.target.value })
                  }
                  className={cn(
                    "border-2 border-foreground",
                    fieldServerErrors.bedrooms && "border-red-400",
                  )}
                  aria-describedby={
                    fieldServerErrors.bedrooms
                      ? "field-error-bedrooms"
                      : undefined
                  }
                />
                {fieldServerErrors.bedrooms && (
                  <p
                    id="field-error-bedrooms"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldServerErrors.bedrooms}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="baths">Bathrooms</Label>
                <Input
                  id="baths"
                  type="number"
                  min={1}
                  max={20}
                  value={values.bathrooms}
                  onChange={(e) =>
                    setValues({ ...values, bathrooms: e.target.value })
                  }
                  className={cn(
                    "border-2 border-foreground",
                    fieldServerErrors.bathrooms && "border-red-400",
                  )}
                  aria-describedby={
                    fieldServerErrors.bathrooms
                      ? "field-error-bathrooms"
                      : undefined
                  }
                />
                {fieldServerErrors.bathrooms && (
                  <p
                    id="field-error-bathrooms"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldServerErrors.bathrooms}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="sqm">Floor area (sqm)</Label>
                <Input
                  id="sqm"
                  type="number"
                  min={0}
                  value={values.sqm}
                  onChange={(e) =>
                    setValues({ ...values, sqm: e.target.value })
                  }
                  className={cn(
                    "border-2 border-foreground",
                    fieldServerErrors.sqm && "border-red-400",
                  )}
                  aria-describedby={
                    fieldServerErrors.sqm ? "field-error-sqm" : undefined
                  }
                />
                {fieldServerErrors.sqm && (
                  <p
                    id="field-error-sqm"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldServerErrors.sqm}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={values.description}
                onChange={(e) =>
                  setValues({ ...values, description: e.target.value })
                }
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.description && "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.description
                    ? "field-error-description"
                    : undefined
                }
              />
              {fieldServerErrors.description && (
                <p
                  id="field-error-description"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="mb-4 text-xl font-bold">Amenities</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {PROPERTY_AMENITIES.map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={cn(
                  "border-2 border-foreground p-3 text-left text-sm font-medium",
                  values.amenities.includes(amenity)
                    ? "bg-secondary"
                    : "bg-card",
                )}
              >
                {PROPERTY_AMENITY_LABELS[amenity]}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="mb-2 text-xl font-bold">Media</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload 3–20 photos. Drag to reorder; star your primary photo.
          </p>
          <PhotoGalleryEditor
            propertyId={initialProperty?.id}
            photos={values.photos}
            primaryPhotoId={values.primaryPhotoId}
            onChange={(photos, primaryPhotoId) =>
              setValues({ ...values, photos, primaryPhotoId })
            }
          />
          <p
            className={cn(
              "text-sm font-medium",
              !canProceedFromMedia && "text-destructive",
            )}
          >
            {values.photos.length} / 20 photos (minimum 3 required)
          </p>
          {fieldServerErrors.photos && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {fieldServerErrors.photos}
            </p>
          )}
          <div className="mt-4">
            <Label htmlFor="videoUrl">Video URL (optional)</Label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://..."
              value={values.videoUrl}
              onChange={(e) =>
                setValues({ ...values, videoUrl: e.target.value })
              }
              className={cn(
                "border-2 border-foreground",
                fieldServerErrors.videoUrl && "border-red-400",
              )}
              aria-describedby={
                fieldServerErrors.videoUrl ? "field-error-videoUrl" : undefined
              }
            />
            {fieldServerErrors.videoUrl && (
              <p
                id="field-error-videoUrl"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {fieldServerErrors.videoUrl}
              </p>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setStep(4)}
              disabled={!canProceedFromMedia}
            >
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="mb-4 text-xl font-bold">Pricing</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="negotiated">Negotiated landlord rate (₦)</Label>
              <Input
                id="negotiated"
                type="number"
                min={0}
                value={values.negotiatedLandlordRateNgn}
                onChange={(e) =>
                  setValues({
                    ...values,
                    negotiatedLandlordRateNgn: e.target.value,
                  })
                }
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.negotiatedLandlordRateNgn &&
                    "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.negotiatedLandlordRateNgn
                    ? "field-error-negotiatedLandlordRateNgn"
                    : undefined
                }
              />
              {fieldServerErrors.negotiatedLandlordRateNgn && (
                <p
                  id="field-error-negotiatedLandlordRateNgn"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.negotiatedLandlordRateNgn}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="outright">Outright (cash) price (₦)</Label>
              <Input
                id="outright"
                type="number"
                min={0}
                value={values.outrightPriceNgn}
                onChange={(e) =>
                  setValues({ ...values, outrightPriceNgn: e.target.value })
                }
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.outrightPriceNgn && "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.outrightPriceNgn
                    ? "field-error-outrightPriceNgn"
                    : undefined
                }
              />
              {fieldServerErrors.outrightPriceNgn && (
                <p
                  id="field-error-outrightPriceNgn"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.outrightPriceNgn}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="installment">Installment base price (₦)</Label>
              <Input
                id="installment"
                type="number"
                min={0}
                value={values.installmentBasePriceNgn}
                onChange={(e) =>
                  setValues({
                    ...values,
                    installmentBasePriceNgn: e.target.value,
                  })
                }
                className={cn(
                  "border-2 border-foreground",
                  fieldServerErrors.installmentBasePriceNgn && "border-red-400",
                )}
                aria-describedby={
                  fieldServerErrors.installmentBasePriceNgn
                    ? "field-error-installmentBasePriceNgn"
                    : undefined
                }
              />
              {fieldServerErrors.installmentBasePriceNgn && (
                <p
                  id="field-error-installmentBasePriceNgn"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldServerErrors.installmentBasePriceNgn}
                </p>
              )}
            </div>
          </div>
          {margin && (
            <div
              className={cn(
                "mt-4 border-2 border-foreground p-4",
                margin.belowRecommended || margin.orderInvalid
                  ? "bg-destructive/10"
                  : "bg-muted",
              )}
            >
              <p className="font-bold">Margin preview</p>
              <p className="text-sm">
                Outright margin: {margin.outrightMarginPercent.toFixed(1)}%
                (recommended ≥ {MIN_OUTRIGHT_MARGIN_PERCENT * 100}%)
              </p>
              <p className="text-sm">
                Installment headroom:{" "}
                {margin.installmentMarginPercent.toFixed(1)}%
              </p>
              {margin.orderInvalid && (
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Outright price must not exceed installment base price.
                </p>
              )}
              {margin.belowRecommended && !margin.orderInvalid && (
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Outright margin is below the recommended threshold.
                </p>
              )}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setStep(5)}
              disabled={margin?.orderInvalid}
            >
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="mb-4 text-xl font-bold">Review & Submit</h2>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="font-bold">Title</dt>
              <dd>{values.title}</dd>
            </div>
            <div>
              <dt className="font-bold">Location</dt>
              <dd>
                {[values.area, values.city].filter(Boolean).join(", ")} —{" "}
                {values.address}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Beds / baths / sqm</dt>
              <dd>
                {values.bedrooms} / {values.bathrooms}
                {values.sqm ? ` / ${values.sqm} sqm` : ""}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Amenities</dt>
              <dd>
                {values.amenities.length
                  ? values.amenities
                      .map((a) => PROPERTY_AMENITY_LABELS[a])
                      .join(", ")
                  : "None"}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Photos</dt>
              <dd>{values.photos.length} uploaded</dd>
            </div>
            <div>
              <dt className="font-bold">Pricing</dt>
              <dd>
                Rate ₦{values.negotiatedLandlordRateNgn} · Outright ₦
                {values.outrightPriceNgn} · Installment ₦
                {values.installmentBasePriceNgn}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canProceedFromMedia}
            >
              {submitting
                ? "Submitting..."
                : (submitLabel ??
                  (mode === "edit" ? "Save changes" : "Submit listing"))}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
