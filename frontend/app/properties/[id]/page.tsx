import type { Metadata } from "next";
import { getProperty } from "@/lib/propertiesApi";
import PropertyDetailClient from "./PropertyDetailClient";

type PropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const defaultTitle = "Property Details | ShelterFlex";
const defaultDescription =
  "Explore verified property details, amenities, and neighborhood context on ShelterFlex.";

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const result = await getProperty(id);
    const listing = result.data;

    const title = `${listing.address} | ShelterFlex`;
    const locationParts = [listing.city, listing.area].filter(Boolean).join(", ");
    const description = listing.description
      || `Discover this property in ${locationParts || "Nigeria"}, including ${listing.bedrooms} bedrooms, ${listing.bathrooms} bathrooms, and pricing details.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDescription,
    };
  }
}

export default async function PropertyDetailPage({ params }: PropertyPageProps) {
  const { id } = await params;

  return <PropertyDetailClient propertyId={id} />;
}
