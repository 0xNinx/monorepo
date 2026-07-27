/**
 * QuoteDisplay component
 * Displays quote information and handles user confirmation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Quote } from '@/lib/ngnStakingApi';
import { formatConversionRate, formatDecimal, formatNgn } from '@/lib/currency';

export interface QuoteDisplayProps {
  quote: Quote;
  onConfirm: (quote: Quote) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function QuoteDisplay({
  quote,
  onConfirm,
  onCancel,
  isLoading = false,
}: QuoteDisplayProps) {
  const formattedRateTime = new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(quote.createdAt));

  const formattedExpiry = new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(quote.expiresAt));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Details</CardTitle>
        <CardDescription>
          Review your conversion details before proceeding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quote Details */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">NGN Amount</span>
            <span className="font-medium">{formatNgn(quote.ngnAmount)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Converted amount (estimated)</span>
            <span className="font-medium">
              {formatDecimal(quote.usdcAmount, { locale: 'en-US', minimumFractionDigits: 6, maximumFractionDigits: 6 })} USDC
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Exchange Rate</span>
            <span className="font-medium">1 USDC = {formatConversionRate(quote.fxRate, 'NGN', 'en-NG')}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rate timestamp</span>
            <time dateTime={quote.createdAt}>{formattedRateTime}</time>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Quote valid until</span>
            <time dateTime={quote.expiresAt}>{formattedExpiry}</time>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Conversion Fee</span>
              <span>{formatNgn(quote.fees.conversionFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>{formatNgn(quote.fees.platformFee)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Fees</span>
              <span>{formatNgn(quote.fees.total)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Settlement currency: NGN. Conversion preview does not change the NGN amount charged.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => onConfirm(quote)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Processing...' : 'Confirm Quote'}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
