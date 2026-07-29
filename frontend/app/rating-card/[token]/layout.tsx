import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tenant Rating Card — Shelterflex",
  description:
    "View this tenant's verified reputation score, payment history, and landlord ratings on Shelterflex.",
  openGraph: {
    title: "Tenant Rating Card — Shelterflex",
    description:
      "Verified tenant reputation: payment history, property care, and communication scores from past landlords.",
    siteName: "Shelterflex",
    type: "profile",
  },
  twitter: {
    card: "summary",
    title: "Tenant Rating Card — Shelterflex",
    description:
      "Verified tenant reputation score on Shelterflex.",
  },
};

export default function RatingCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
