import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

class MockDisputePool {
  disputes: Row[] = [];
  private idCounter = 0;

  async query(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: Row[]; rowCount: number }> {
    const t = text.trim();

    if (t.includes("INSERT INTO payment_disputes")) {
      const [userId, data] = params as [string, Record<string, unknown>];
      const row: Row = {
        id: `dispute-${++this.idCounter}`,
        user_id: userId,
        payment_id: data.paymentId,
        reason: data.reason,
        status: "open",
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.disputes.push(row);
      return { rows: [row], rowCount: 1 };
    }

    if (t.includes("WHERE id = $1")) {
      const [id] = params as [string];
      const dispute = this.disputes.find((d) => d.id === id);
      return { rows: dispute ? [dispute] : [], rowCount: dispute ? 1 : 0 };
    }

    if (t.includes("WHERE payment_id = $1")) {
      const [paymentId] = params as [string];
      const disputes = this.disputes.filter((d) => d.payment_id === paymentId);
      return { rows: disputes, rowCount: disputes.length };
    }

    if (t.includes("WHERE user_id = $1")) {
      const [userId] = params as [string];
      const disputes = this.disputes.filter((d) => d.user_id === userId);
      return { rows: disputes, rowCount: disputes.length };
    }

    if (t.includes("UPDATE payment_disputes SET status")) {
      const [id, status] = params as [string, string];
      const dispute = this.disputes.find((d) => d.id === id);
      if (dispute) {
        dispute.status = status;
        dispute.updated_at = new Date();
      }
      return { rows: [], rowCount: dispute ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }
}

const fakePool = new MockDisputePool();

vi.mock("../db.js", () => ({
  getPool: vi.fn(async () => fakePool),
  setPool: vi.fn(),
  getPoolMetrics: vi.fn(() => null),
}));

describe("PaymentDisputeRepository", () => {
  beforeEach(() => {
    fakePool.disputes = [];
  });

  async function getRepo() {
    const mod = await import("./PaymentDisputeRepository.js");
    return new mod.PaymentDisputeRepository();
  }

  it("creates dispute", async () => {
    const repo = await getRepo();
    const data = { paymentId: "pay-1", reason: "Unauthorized charge" };

    const dispute = await repo.create("user-1", data);

    expect(dispute.id).toBeDefined();
    expect(dispute.user_id).toBe("user-1");
    expect(dispute.status).toBe("open");
  });

  it("finds dispute by id", async () => {
    const repo = await getRepo();
    const created = await repo.create("user-1", {
      paymentId: "pay-1",
      reason: "Duplicate",
    });

    const found = await repo.findById(created.id);

    expect(found?.id).toBe(created.id);
  });

  it("finds disputes by payment id", async () => {
    const repo = await getRepo();
    const paymentId = "pay-1";

    await repo.create("user-1", { paymentId, reason: "Reason 1" });
    await repo.create("user-2", { paymentId, reason: "Reason 2" });

    const disputes = await repo.findByPaymentId(paymentId);

    expect(disputes).toHaveLength(2);
  });

  it("finds disputes by user id", async () => {
    const repo = await getRepo();
    const userId = "user-1";

    await repo.create(userId, { paymentId: "pay-1", reason: "Reason 1" });
    await repo.create(userId, { paymentId: "pay-2", reason: "Reason 2" });

    const disputes = await repo.findByUserId(userId);

    expect(disputes).toHaveLength(2);
  });

  it("updates status", async () => {
    const repo = await getRepo();
    const dispute = await repo.create("user-1", {
      paymentId: "pay-1",
      reason: "Test",
    });

    const updated = await repo.updateStatus(
      dispute.id,
      "resolved",
      "Resolution text",
      "admin-1",
    );

    expect(updated.status).toBe("resolved");
  });

  it("returns null for missing dispute", async () => {
    const repo = await getRepo();

    const found = await repo.findById("nonexistent");

    expect(found).toBeNull();
  });
});
