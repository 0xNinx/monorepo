import { AuthGuard } from "@/components/auth-guard";
import { DashboardA11yEnhancer } from "@/components/dashboard/DashboardA11yEnhancer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <DashboardA11yEnhancer />
      {children}
    </AuthGuard>
  );
}
