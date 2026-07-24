"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import SkipLink from "@/components/SkipLink";

export const DASHBOARD_MAIN_ID = "dashboard-main-content";

export function DashboardA11yEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    main.id = DASHBOARD_MAIN_ID;
    main.setAttribute("tabindex", "-1");
  }, [pathname]);

  return <SkipLink href={`#${DASHBOARD_MAIN_ID}`} />;
}
