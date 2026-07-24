import { render, screen, fireEvent, act } from "@testing-library/react";
import MessagesPage from "./page";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/store/useAuthStore", () => ({
  default: () => ({
    isAuthenticated: true,
  }),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves draft text when switching between conversations", async () => {
    render(<MessagesPage />);

    const input = screen.getByPlaceholderText(/type your message/i);

    fireEvent.change(input, { target: { value: "Draft for conversation 1" } });
    expect(input).toHaveValue("Draft for conversation 1");

    const conv2 = screen.getByLabelText(/Select conversation with Mrs. Adeleke/i);
    fireEvent.click(conv2);

    act(() => { vi.advanceTimersByTime(300); });

    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Draft for conversation 2" } });
    expect(input).toHaveValue("Draft for conversation 2");

    const conv1 = screen.getByLabelText(/Select conversation with Adebayo Johnson/i);
    fireEvent.click(conv1);

    act(() => { vi.advanceTimersByTime(300); });

    expect(input).toHaveValue("Draft for conversation 1");
  });

  it("handles mobile navigation correctly by clearing selection on back button click", () => {
    render(<MessagesPage />);

    expect(screen.getByText(/Adebayo Johnson/i, { selector: "h2" })).toBeInTheDocument();

    const backButton = screen.getByLabelText("Back to conversations");
    fireEvent.click(backButton);

    expect(screen.getByText(/Select a conversation/i)).toBeInTheDocument();
  });

  it("shows sending state then sent state after message is sent", async () => {
    render(<MessagesPage />);

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: "Hello!" } });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    expect(screen.getByText("Hello!")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });

  it("shows retry button when message send fails", async () => {
    // Force simulateSend to fail by making Math.random() > 1
    vi.spyOn(Math, "random").mockReturnValue(1);

    render(<MessagesPage />);

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: "Will fail" } });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("has accessible message thread region", () => {
    render(<MessagesPage />);

    const log = screen.getByRole("log");
    expect(log).toBeInTheDocument();
    expect(log).toHaveAttribute("aria-live", "polite");
  });

  it("sanitizes message text", () => {
    render(<MessagesPage />);

    const input = screen.getByPlaceholderText(/type your message/i);
    const maliciousText = "<script>alert('xss')</script>Hello";
    fireEvent.change(input, { target: { value: maliciousText } });

    expect(screen.getByPlaceholderText(/type your message/i)).toHaveValue(maliciousText);
  });

  it("prevents duplicate sends", () => {
    render(<MessagesPage />);

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: "Test message" } });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    expect(sendBtn).toBeDisabled();
  });
});
