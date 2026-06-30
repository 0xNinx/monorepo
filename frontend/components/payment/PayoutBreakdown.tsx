"use client";

import { CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PayoutBreakdown as PayoutBreakdownType } from "@/lib/paymentApi";
import { formatMoney, type SupportedCurrency } from "@/lib/currency";
import { useLocale, useTranslations } from "next-intl";

interface LineItemProps {
  label: string;
  amount: number;
  sublabel?: string;
  bold?: boolean;
  currency: SupportedCurrency;
  locale: string;
}

function LineItem({ label, amount, sublabel, bold, currency, locale }: LineItemProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2", bold && "font-bold")}>
      <div>
        <p className={cn("text-sm", bold ? "font-bold" : "text-muted-foreground")}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <span className={cn("font-mono text-sm shrink-0", bold && "text-base")}>
        {formatMoney(amount, currency, { locale })}
      </span>
    </div>
  );
}

interface PayoutBreakdownProps {
  breakdown: PayoutBreakdownType;
  /** When true, shows a "confirmed" badge — used on the receipt screen */
  confirmed?: boolean;
  className?: string;
}

/**
 * Renders a transparent line-item breakdown of how a full payment is distributed.
 * Works in both preview (pre-confirmation) and receipt (post-payment) modes.
 */
export function PayoutBreakdown({ breakdown, confirmed, className }: PayoutBreakdownProps) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const { totalAmount, platformShare, reporterShare, landlordAmount } = breakdown;
  const currency: SupportedCurrency = breakdown.currency === "USDC" ? "USDC" : "NGN";

  return (
    <div
      className={cn(
        "border-3 border-foreground bg-card p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
        className
      )}
    >
      {confirmed && (
        <div className="mb-3 flex items-center gap-2 border-2 border-secondary bg-secondary/20 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />
          <span className="text-sm font-bold">{t("paymentConfirmed")}</span>
        </div>
      )}

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t("rewardDistribution")}
      </p>

      <LineItem
        label={t("platformFee")}
        sublabel={t("platformFeeSubLabel")}
        amount={platformShare}
        currency={currency}
        locale={locale}
      />

      {reporterShare !== null ? (
        <LineItem
          label={t("reporterReward")}
          sublabel={t("reporterRewardSubLabel")}
          amount={reporterShare}
          currency={currency}
          locale={locale}
        />
      ) : (
        <div className="flex items-start justify-between gap-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground">{t("reporterReward")}</p>
            <p className="text-xs text-muted-foreground">{t("noReporter")}</p>
          </div>
          <span className="font-mono text-sm text-muted-foreground shrink-0">—</span>
        </div>
      )}

      <LineItem label={t("landlordPayout")} amount={landlordAmount} currency={currency} locale={locale} />

      <Separator className="my-3 border-foreground/20" />

      <LineItem label={t("totalCharged")} amount={totalAmount} bold currency={currency} locale={locale} />
    </div>
  );
}
