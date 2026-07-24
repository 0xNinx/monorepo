import { describe, expect, it } from "vitest";
import { formatMoney, formatNgn, formatUsdc, roundCurrencyAmount } from "@/lib/currency";

describe("currency formatting", () => {
  it("rounds NGN half-up to two decimals at positive boundaries", () => {
    expect(roundCurrencyAmount(156_799.504, "NGN")).toBe(156_799.5);
    expect(roundCurrencyAmount(156_799.505, "NGN")).toBe(156_799.51);
    expect(formatNgn(156_799.505, "en-NG")).toBe("₦156,799.51");
  });

  it("rounds negative ties away from zero", () => {
    expect(roundCurrencyAmount(-1.005, "NGN")).toBe(-1.01);
    expect(formatNgn(-1.005, "en-NG")).toBe("-₦1.01");
  });

  it("formats zero and invalid amounts as zero", () => {
    expect(formatNgn(0, "en-NG")).toBe("₦0.00");
    expect(formatUsdc("not-a-number", "en-US")).toBe("0.00 USDC");
  });

  it("formats large values with locale-aware grouping", () => {
    expect(formatNgn(1_234_567_890.125, "en-NG")).toBe("₦1,234,567,890.13");
  });

  it("keeps USDC precision consistent", () => {
    expect(formatMoney(42.345, "USDC", { locale: "en-US" })).toBe("42.35 USDC");
  });

  it("uses locale-specific symbol placement through Intl", () => {
    expect(formatNgn(1234.5, "fr-FR")).toMatch(/1[\s\u202f]234,50/);
    expect(formatNgn(1234.5, "fr-FR")).toContain("NGN");
  });
});
