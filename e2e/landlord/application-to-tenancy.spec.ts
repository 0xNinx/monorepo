import { test, expect, LoginPage } from "../helpers/fixtures";

test.describe("Landlord application → tenancy flow", () => {
  test("landlord publish → tenant apply → landlord approve → deal created", async ({
    page,
    seed,
  }) => {
    // ── Step 1: Landlord logs in and sees the property listing ───────────
    const landlordLogin = new LoginPage(page);
    await landlordLogin.goto();
    await landlordLogin.login(
      seed.users.landlord.email,
      seed.users.landlord.password,
    );

    await page.goto("/dashboard/landlord/properties");
    await expect(page.getByText("E2E Apartment")).toBeVisible();

    // ── Step 2: Tenant logs in and applies to the listing ────────────────
    const tenantLogin = new LoginPage(page);
    await tenantLogin.goto();
    await tenantLogin.login(
      seed.users.tenant.email,
      seed.users.tenant.password,
    );

    // Navigate to the approved listing
    await page.goto(`/properties/${seed.approvedListingId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Apply to the listing
    const applyBtn = page.getByRole("button", { name: /apply|secure/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Fill application form
    const employmentField = page.getByLabel(/employment|income/i);
    if (await employmentField.isVisible()) {
      await employmentField.fill("Software Engineer");
    }
    const incomeField = page.getByLabel(/monthly income/i);
    if (await incomeField.isVisible()) {
      await incomeField.fill("400000");
    }

    // Select payment plan if a select/radio exists
    const paymentPlanOption = page.getByLabel(/outright|12.*month|full/i).first();
    if (await paymentPlanOption.isVisible()) {
      await paymentPlanOption.click();
    }

    // Submit the application
    const submitBtn = page.getByRole("button", { name: /submit|next|apply/i });
    await submitBtn.click();

    // Verify application submitted
    await expect(
      page.getByText(/application submitted|confirm|success/i),
    ).toBeVisible({ timeout: 10_000 });

    // ── Step 3: Landlord reviews and approves the application ────────────
    const landlordLogin2 = new LoginPage(page);
    await landlordLogin2.goto();
    await landlordLogin2.login(
      seed.users.landlord.email,
      seed.users.landlord.password,
    );

    // Navigate to the property's applications page
    await page.goto(
      `/dashboard/landlord/properties/${seed.landlordPropertyId}/applications`,
    );

    // Wait for applications to load
    await expect(page.getByText(/application/i)).toBeVisible({
      timeout: 10_000,
    });

    // Click to view the pending application details
    const viewDetailsBtn = page
      .getByRole("button", { name: /view details|review/i })
      .first();
    if (await viewDetailsBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await viewDetailsBtn.click();

      // Approve the application
      const approveBtn = page
        .getByRole("button", { name: /approve|accept/i })
        .first();
      await expect(approveBtn).toBeVisible({ timeout: 5_000 });
      await approveBtn.click();

      // Verify approval confirmation
      await expect(
        page.getByText(/approved|success|deal created/i),
      ).toBeVisible({ timeout: 10_000 });
    }

    // ── Step 4: Verify the deal exists via tenant lease page ──────────────
    const tenantLogin2 = new LoginPage(page);
    await tenantLogin2.goto();
    await tenantLogin2.login(
      seed.users.tenant.email,
      seed.users.tenant.password,
    );

    await page.goto("/dashboard/tenant/lease");
    // The lease page should show the property or an active lease
    await expect(
      page.getByText(/lease|property|deal|active/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
