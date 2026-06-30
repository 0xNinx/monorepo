import { describe, it, expect } from "vitest";
import {
  computeBuffer,
  stroopsToXlm,
  formatFee,
  estimateNgnEquivalent,
} from "../gas-estimation";

describe("computeBuffer", () => {
  it("adds a 3x buffer for low confidence", () => {
    expect(computeBuffer("1000000", "low")).toBe("3000000");
  });

  it("adds a 2x buffer for medium confidence", () => {
    expect(computeBuffer("1000000", "medium")).toBe("2000000");
  });

  it("adds a 1.3x buffer for high confidence", () => {
    expect(computeBuffer("1000000", "high")).toBe("1300000");
  });
});

describe("stroopsToXlm", () => {
  it("converts stroops to XLM", () => {
    expect(stroopsToXlm("10000000")).toBe(1);
    expect(stroopsToXlm("5000000")).toBe(0.5);
    expect(stroopsToXlm("0")).toBe(0);
  });
});

describe("formatFee", () => {
  it("formats XLM with 4 decimal places", () => {
    expect(formatFee("10000000")).toBe("1.0000 XLM");
    expect(formatFee("1")).toBe("0.0000 XLM");
  });
});

describe("estimateNgnEquivalent", () => {
  it("converts XLM to NGN at default rate", () => {
    const result = estimateNgnEquivalent(1);
    expect(result).toContain("₦");
    expect(result).toContain("850");
  });

  it("accepts custom XLM price", () => {
    const result = estimateNgnEquivalent(2, 1000);
    expect(result).toContain("₦");
    expect(result).toContain("2,000");
  });
});
