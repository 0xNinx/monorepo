import { render, screen, fireEvent, act } from "@testing-library/react";
import MessagesPage from "./page";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import * as messagingApi from "@/lib/api/messaging";

vi.mock("@/store/useAuthStore", () => ({
  default: () => ({
    isAuthenticated: true,
    user: { id: "test-user" },
  }),
}));

vi.mock("@/lib/api/messaging", () => ({
  fetchConversations: vi.fn().mockResolvedValue([
    {
      id: "conv-1",
      subjectType: null,
      subjectId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      participants: [
        { userId: "test-user", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
        { userId: "user-1", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
      ],
      lastMessage: { text: "Hey there!", senderId: "user-1", createdAt: "2024-01-01T00:00:00Z" },
      unreadCount: 0,
    },
    {
      id: "conv-2",
      subjectType: null,
      subjectId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      participants: [
        { userId: "test-user", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
        { userId: "user-2", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
      ],
      lastMessage: null,
      unreadCount: 2,
    },
  ]),
  fetchMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue({
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "test-user",
    body: "Hello!",
    createdAt: "2024-01-01T01:00:00Z",
    editedAt: null,
    deletedAt: null,
    attachment: null,
  }),
  markConversationRead: vi.fn().mockResolvedValue(undefined),
  requestAttachmentUploadUrl: vi.fn(),
  uploadAttachmentToPresignedUrl: vi.fn(),
  validateFileForUpload: vi.fn().mockReturnValue({ valid: true }),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const baseConversations = [
  {
    id: "conv-1",
    subjectType: null,
    subjectId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    participants: [
      { userId: "test-user", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
      { userId: "user-1", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
    ],
    lastMessage: { text: "Hey there!", senderId: "user-1", createdAt: "2024-01-01T00:00:00Z" },
    unreadCount: 0,
  },
  {
    id: "conv-2",
    subjectType: null,
    subjectId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    participants: [
      { userId: "test-user", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
      { userId: "user-2", role: "member", lastReadAt: null, joinedAt: "2024-01-01T00:00:00Z" },
    ],
    lastMessage: null,
    unreadCount: 2,
  },
];

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(messagingApi.fetchConversations).mockResolvedValue(
      structuredClone(baseConversations),
    );
    vi.mocked(messagingApi.fetchMessages).mockResolvedValue([]);
    vi.mocked(messagingApi.sendMessage).mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "test-user",
      body: "Hello!",
      createdAt: "2024-01-01T01:00:00Z",
      editedAt: null,
      deletedAt: null,
      attachment: null,
    });
    vi.mocked(messagingApi.markConversationRead).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves draft text when switching between conversations", async () => {
    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const input = screen.getByPlaceholderText(/type your message/i);

    fireEvent.change(input, { target: { value: "Draft for conversation 1" } });
    expect(input).toHaveValue("Draft for conversation 1");

    const conv2 = screen.getByLabelText(/Select conversation with user-2/i);
    fireEvent.click(conv2);

    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Draft for conversation 2" } });
    expect(input).toHaveValue("Draft for conversation 2");

    const conv1 = screen.getByLabelText(/Select conversation with user-1/i);
    fireEvent.click(conv1);

    expect(input).toHaveValue("Draft for conversation 1");
  });

  it("handles mobile navigation correctly by clearing selection on back button click", async () => {
    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByLabelText(/back to conversations/i));

    expect(screen.getByText(/choose a conversation/i)).toBeInTheDocument();
  });

  it("shows sending state then sent state after message is sent", async () => {
    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const conv1 = screen.getByLabelText(/Select conversation with user-1/i);
    fireEvent.click(conv1);

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: "Hello!" } });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    await act(async () => {
      await Promise.resolve();
    });

    expect(messagingApi.sendMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Hey there!")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hello!").length).toBeGreaterThan(0);
  });

  it("has accessible message thread region", async () => {
    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const log = screen.getByRole("log");
    expect(log).toBeInTheDocument();
    expect(log).toHaveAttribute("aria-live", "polite");
  });

  it("sanitizes message text", async () => {
    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    const maliciousText = "<script>alert('xss')</script>Hello";
    fireEvent.change(input, { target: { value: maliciousText } });

    expect(screen.getByPlaceholderText(/type your message/i)).toHaveValue(maliciousText);
  });

  it("prevents duplicate sends", async () => {
    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const conv1 = screen.getByLabelText(/Select conversation with user-1/i);
    fireEvent.click(conv1);

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: "Test message" } });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    expect(sendBtn).toBeDisabled();
  });

  it("shows a visible composer error when sending fails", async () => {
    vi.mocked(messagingApi.sendMessage).mockRejectedValueOnce(
      new Error("Failed to fetch"),
    );

    render(<MessagesPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const conv1 = screen.getByLabelText(/Select conversation with user-1/i);
    fireEvent.click(conv1);

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: "Hello!" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    await act(async () => {
      await Promise.resolve();
    });

    expect(messagingApi.sendMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/you appear to be offline/i)).toBeInTheDocument();
  });
});
