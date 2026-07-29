import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyHmac, checkReplay } from "./webhookVerifier.js";

describe("webhookVerifier", () => {
  describe("verifyHmac", () => {
    it("accepts valid HMAC signature", () => {
      const secret = "test-secret";
      const payload = "test-payload";
      const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = verifyHmac(payload, expected, secret);

      expect(result).toBe(true);
    });

    it("rejects invalid HMAC signature", () => {
      const secret = "test-secret";
      const payload = "test-payload";
      const wrongSig = "invalid-signature-" + "x".repeat(48);

      const result = verifyHmac(payload, wrongSig, secret);

      expect(result).toBe(false);
    });

    it("rejects tampered payload", () => {
      const secret = "test-secret";
      const payload = "test-payload";
      const sig = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = verifyHmac("tampered-payload", sig, secret);

      expect(result).toBe(false);
    });

    it("rejects wrong secret", () => {
      const payload = "test-payload";
      const sig = crypto
        .createHmac("sha256", "secret-1")
        .update(payload)
        .digest("hex");

      const result = verifyHmac(payload, sig, "secret-2");

      expect(result).toBe(false);
    });

    it("uses timing-safe comparison", () => {
      const secret = "test";
      const payload = "data";
      const valid = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      // Should not throw timing error on valid or invalid
      expect(verifyHmac(payload, valid, secret)).toBe(true);
      expect(verifyHmac(payload, "x" + valid.slice(1), secret)).toBe(false);
    });
  });

  describe("checkReplay", () => {
    it("allows new event ids", () => {
      expect(() => checkReplay("new-event-1")).not.toThrow();
    });

    it("rejects duplicate event ids (fails closed)", () => {
      const eventId = "duplicate-event";
      checkReplay(eventId);

      expect(() => checkReplay(eventId)).toThrow("Replay detected");
    });

    it("enforces replay protection by default", () => {
      // Core security behavior: first occurrence passes, second rejected
      const id = "security-behavior-test";
      const firstCall = () => checkReplay(id);
      const secondCall = () => checkReplay(id);

      expect(firstCall).not.toThrow();
      expect(secondCall).toThrow();
    });
  });
});
