import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const pushMock = vi.fn();
const searchParamsMock = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock,
}));

vi.mock("@/components/wallet/StellarWalletConnect", () => ({
  StellarWalletConnect: () => <div>wallet-connect</div>,
}));

vi.mock("@/lib/authApi", () => ({
  requestOtp: vi.fn(),
}));

import { requestOtp } from "@/lib/authApi";

type MockRequestOtp = Mock<typeof requestOtp>;

function pendingPromise() {
  return new Promise(() => undefined);
}

describe("Login form validation consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows validation errors on submit/blur and focuses the first invalid field", async () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email Address");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(emailInput).toHaveFocus();
    });
  });

  it("maps server field errors back to form fields", async () => {
    const mockRequestOtp = requestOtp as MockRequestOtp;
    const error = new Error("Validation failed") as Error & { details?: unknown };
    error.details = { fieldErrors: { email: ["Email is not registered"] } };
    mockRequestOtp.mockRejectedValue(error);

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email Address"), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Email is not registered")).toBeInTheDocument();
    });
  });

  it("prevents double-submit while request is in-flight", async () => {
    const mockRequestOtp = requestOtp as MockRequestOtp;
    mockRequestOtp.mockReturnValue(pendingPromise() as ReturnType<typeof requestOtp>);

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email Address"), "test@example.com");
    const submitButton = screen.getByRole("button", { name: "Continue" });

    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(mockRequestOtp).toHaveBeenCalledTimes(1);
    });
  });
});
