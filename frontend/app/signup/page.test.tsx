import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
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

describe("Signup form validation consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates on submit and focuses first invalid field", async () => {
    render(<SignupPage />);

    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Full name must be at least 2 characters")).toBeInTheDocument();
      expect(screen.getByLabelText("Full Name")).toHaveFocus();
    });
  });

  it("maps server-side field errors to matching inputs", async () => {
    const mockRequestOtp = requestOtp as MockRequestOtp;
    const error = new Error("Validation failed") as Error & { details?: unknown };
    error.details = { fieldErrors: { email: ["Email is already in use"] } };
    mockRequestOtp.mockRejectedValue(error);

    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Full Name"), "Valid User");
    await userEvent.type(screen.getByLabelText("Email Address"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Phone Number"), "08012345678");
    await userEvent.type(screen.getByLabelText("Password"), "Password1");
    await userEvent.click(screen.getByLabelText(/I agree to the/i));

    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Email is already in use")).toBeInTheDocument();
    });
  });

  it("prevents duplicate submission while waiting for response", async () => {
    const mockRequestOtp = requestOtp as MockRequestOtp;
    mockRequestOtp.mockReturnValue(pendingPromise() as ReturnType<typeof requestOtp>);

    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Full Name"), "Valid User");
    await userEvent.type(screen.getByLabelText("Email Address"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Phone Number"), "08012345678");
    await userEvent.type(screen.getByLabelText("Password"), "Password1");
    await userEvent.click(screen.getByLabelText(/I agree to the/i));

    const submitButton = screen.getByRole("button", { name: "Create Account" });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(mockRequestOtp).toHaveBeenCalledTimes(1);
    });
  });
});
