import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

class MockReferralPool {
  codes: Row[] = [];
  conversions: Row[] = [];
  private idCounter = 0;

  async query(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: Row[]; rowCount: number }> {
    const t = text.trim();

    if (t.includes("INSERT INTO referral_codes")) {
      const [tenantId, code] = params as [string, string];
      const row: Row = {
        id: `code-${++this.idCounter}`,
        tenant_id: tenantId,
        code,
        created_at: new Date(),
      };
      this.codes.push(row);
      return { rows: [row], rowCount: 1 };
    }

    if (t.includes("INSERT INTO referral_conversions")) {
      const [codeId, referrerId, referredId, amount] = params as [
        string,
        string,
        string,
        number,
      ];
      const row: Row = {
        id: `conv-${++this.idCounter}`,
        referral_code_id: codeId,
        referrer_tenant_id: referrerId,
        referred_tenant_id: referredId,
        reward_amount_ngn: amount,
        status: "completed",
        created_at: new Date(),
      };
      this.conversions.push(row);
      return { rows: [row], rowCount: 1 };
    }

    if (t.includes("WHERE tenant_id = $1") && t.includes("referral_codes")) {
      const [tenantId] = params as [string];
      const code = this.codes.find((c) => c.tenant_id === tenantId);
      return { rows: code ? [code] : [], rowCount: code ? 1 : 0 };
    }

    if (t.includes("WHERE code = $1")) {
      const [code] = params as [string];
      const row = this.codes.find((c) => c.code === code);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    if (t.includes("WHERE referrer_tenant_id = $1")) {
      const [referrerId] = params as [string];
      const convs = this.conversions.filter(
        (c) => c.referrer_tenant_id === referrerId,
      );
      return { rows: convs, rowCount: convs.length };
    }

    if (t.includes("WHERE referred_tenant_id = $1")) {
      const [referredId] = params as [string];
      const conv = this.conversions.find(
        (c) => c.referred_tenant_id === referredId,
      );
      return { rows: conv ? [conv] : [], rowCount: conv ? 1 : 0 };
    }

    if (t.includes("SELECT * FROM referral_conversions")) {
      return { rows: this.conversions, rowCount: this.conversions.length };
    }

    if (t.includes("UPDATE referral_conversions SET status")) {
      const [convId, status] = params as [string, string];
      const conv = this.conversions.find((c) => c.id === convId);
      if (conv) conv.status = status;
      return { rows: [], rowCount: conv ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }
}

const fakePool = new MockReferralPool();

vi.mock("../db.js", () => ({
  getPool: vi.fn(async () => fakePool),
  setPool: vi.fn(),
  getPoolMetrics: vi.fn(() => null),
}));

describe("ReferralRepository", () => {
  beforeEach(() => {
    fakePool.codes = [];
    fakePool.conversions = [];
  });

  async function getRepo() {
    const mod = await import("./ReferralRepository.js");
    return new mod.ReferralRepository();
  }

  it("creates referral code", async () => {
    const repo = await getRepo();

    const code = await repo.createReferralCode("tenant-1", "REF-ABC123");

    expect(code.id).toBeDefined();
    expect(code.code).toBe("REF-ABC123");
    expect(code.tenant_id).toBe("tenant-1");
  });

  it("gets code by tenant id", async () => {
    const repo = await getRepo();
    const tenantId = "tenant-1";

    await repo.createReferralCode(tenantId, "REF-XYZ789");
    const found = await repo.getReferralCodeByTenantId(tenantId);

    expect(found?.code).toBe("REF-XYZ789");
  });

  it("gets code by code string", async () => {
    const repo = await getRepo();
    const codeStr = "REF-QWE456";

    await repo.createReferralCode("tenant-1", codeStr);
    const found = await repo.getReferralCodeByCode(codeStr);

    expect(found?.code).toBe(codeStr);
  });

  it("creates conversion", async () => {
    const repo = await getRepo();
    const code = await repo.createReferralCode("referrer-1", "REF-CODE");

    const conv = await repo.createConversion(
      code.id,
      "referrer-1",
      "referred-1",
      10000,
    );

    expect(conv.id).toBeDefined();
    expect(conv.referrer_tenant_id).toBe("referrer-1");
    expect(conv.referred_tenant_id).toBe("referred-1");
    expect(conv.reward_amount_ngn).toBe(10000);
  });

  it("gets conversion by id", async () => {
    const repo = await getRepo();
    const code = await repo.createReferralCode("referrer-1", "REF");
    const conv = await repo.createConversion(
      code.id,
      "referrer-1",
      "referred-1",
      5000,
    );

    const found = await repo.getConversionById(conv.id);

    expect(found?.id).toBe(conv.id);
  });

  it("gets conversions by referrer", async () => {
    const repo = await getRepo();
    const referrerId = "referrer-1";
    const code = await repo.createReferralCode(referrerId, "REF");

    await repo.createConversion(code.id, referrerId, "referred-1", 5000);
    await repo.createConversion(code.id, referrerId, "referred-2", 3000);

    const convs = await repo.getConversionsByReferrer(referrerId);

    expect(convs).toHaveLength(2);
  });

  it("gets conversion by referred tenant", async () => {
    const repo = await getRepo();
    const referred = "referred-1";
    const code = await repo.createReferralCode("referrer-1", "REF");

    await repo.createConversion(code.id, "referrer-1", referred, 5000);
    const found = await repo.getConversionByReferredTenant(referred);

    expect(found?.referred_tenant_id).toBe(referred);
  });

  it("updates conversion status", async () => {
    const repo = await getRepo();
    const code = await repo.createReferralCode("referrer-1", "REF");
    const conv = await repo.createConversion(
      code.id,
      "referrer-1",
      "referred-1",
      5000,
    );

    const updated = await repo.updateConversionStatus(conv.id, "paid");

    expect(updated?.status).toBe("paid");
  });

  it("gets all conversions", async () => {
    const repo = await getRepo();
    const code = await repo.createReferralCode("referrer-1", "REF");

    await repo.createConversion(code.id, "referrer-1", "referred-1", 5000);
    await repo.createConversion(code.id, "referrer-1", "referred-2", 3000);

    const all = await repo.getAllConversions();

    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
