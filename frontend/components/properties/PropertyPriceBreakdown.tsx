"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNgn } from "@/lib/currency";

interface PriceBreakdownProps {
  outrightPriceNgn?: number | null;
  installmentBasePriceNgn?: number | null;
  annualRentNgn: number;
  depositPercentage?: number;
  paymentMonths?: number;
}

export default function PropertyPriceBreakdown({
  outrightPriceNgn,
  installmentBasePriceNgn,
  annualRentNgn,
  depositPercentage = 20,
  paymentMonths = 12,
}: PriceBreakdownProps) {
  const effectiveInstallment = installmentBasePriceNgn ?? annualRentNgn;
  const effectiveOutright = outrightPriceNgn ?? annualRentNgn;
  const depositAmount = effectiveInstallment * (depositPercentage / 100);
  const financedAmount = effectiveInstallment - depositAmount;
  const monthlyPayment = Math.round(financedAmount / paymentMonths);
  const showBoth = outrightPriceNgn != null && installmentBasePriceNgn != null;

  return (
    <div className="border-3 border-foreground bg-card p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-mono text-lg font-bold">Price Breakdown</h3>
        {showBoth && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center border border-foreground rounded-full"
                  aria-label="Why is installment price higher?"
                >
                  <Info className="h-3 w-3" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent className="border-2 border-foreground bg-background p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] max-w-xs">
                <p className="text-xs font-medium">
                  The installment price reflects the cost of financing your rent
                  over time. The outright (cash) price is lower because it does
                  not include financing costs. Choose installment to spread
                  payments, or outright to save on the total.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-foreground/30 pb-3">
          <span className="text-sm text-muted-foreground">
            {showBoth ? "Installment Base Price" : "Annual Rent"}
          </span>
          <span className="font-mono font-bold">
            {formatNgn(effectiveInstallment)}
          </span>
        </div>

        {showBoth && (
          <div className="flex items-center justify-between border-b-2 border-dashed border-foreground/30 pb-3">
            <span className="text-sm text-muted-foreground">
              Outright Price (cash discount)
            </span>
            <span className="font-mono font-bold text-secondary">
              {formatNgn(effectiveOutright)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-b-2 border-dashed border-foreground/30 pb-3">
          <span className="text-sm text-muted-foreground">
            Deposit ({depositPercentage}%)
          </span>
          <span className="font-mono font-bold">
            {formatNgn(depositAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between border-b-2 border-foreground pb-3">
          <span className="text-sm font-bold">Amount to Finance</span>
          <span className="font-mono text-lg font-black">
            {formatNgn(financedAmount)}
          </span>
        </div>
      </div>

      <div className="mt-4 border-3 border-primary bg-primary/10 p-4">
        <p className="mb-1 text-xs text-muted-foreground">
          Monthly Payment ({paymentMonths} months)
        </p>
        <p className="font-mono text-2xl font-black text-primary">
          {formatNgn(monthlyPayment)}
        </p>
      </div>
    </div>
  );
}
