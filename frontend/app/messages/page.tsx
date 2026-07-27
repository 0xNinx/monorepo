"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Building2,
  CheckCheck,
  Clock,
  ImageIcon,
  File,
  ChevronLeft,
  MessageSquareOff,
  MessageCircle,
  Lock,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Upload,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { conversations, messageThreads } from "@/lib/mockData";
import useAuthStore from "@/store/useAuthStore";
import { sanitizeText } from "@/lib/sanitize";
import {
  validateFileForUpload,
  uploadAttachment,
  uploadAttachmentToPresignedUrl,
  requestAttachmentUploadUrl,
} from "@/lib/api/messaging";
import type { AttachmentUploadResult } from "@/lib/types/messaging";

type Message = {
  id: number;
  senderId: "me" | "other";
  text: string;
  timestamp: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  attachment?: { type: "image" | "document"; name: string };
};

type UploadState = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  result?: AttachmentUploadResult;
};

export default function MessagesPage() {
  const { isAuthenticated } = useAuthStore();
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  
  const newMessage = selectedConversationId !== null ? drafts[selectedConversationId] || "" : "";
  const setNewMessage = (val: string) => {
    if (selectedConversationId !== null) {
      setDrafts(prev => ({ ...prev, [selectedConversationId]: val }));
    }
  };

  const [messages, setMessages] = useState<Message[]>(messageThreads[1] ?? []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectConversation = useCallback((id: number) => {
    setSelectedConversationId(id);
    setIsLoadingThread(true);
    setMessages([]);
    setTimeout(() => {
      setMessages(messageThreads[id] || []);
      setIsLoadingThread(false);
    }, 300);
  }, []);

  const simulateSend = useCallback(async (text: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));
    if (Math.random() > 0.15) return true;
    throw new Error("Send failed");
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileForUpload(file);
    if (!validation.valid) {
      setUploadState({
        file,
        progress: 0,
        status: "error",
        error: validation.error,
      });
      return;
    }

    setUploadState({
      file,
      progress: 0,
      status: "pending",
    });

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const { uploadUrl, storageKey } = await requestAttachmentUploadUrl(
        file.type,
        file.size,
        file.name,
      );

      setUploadState(prev =>
        prev && prev.file === file ? { ...prev, status: "uploading", progress: 0 } : prev,
      );

      let lastProgress = 0;
      await uploadAttachmentToPresignedUrl(uploadUrl, file, (percent) => {
        lastProgress = percent;
        setUploadState(prev =>
          prev && prev.file === file ? { ...prev, progress: percent } : prev,
        );
      }, controller.signal);

      const fileType: "image" | "document" = file.type.startsWith("image/") ? "image" : "document";
      setUploadState({
        file,
        progress: 100,
        status: "done",
        result: {
          storageKey,
          contentType: file.type,
          sizeBytes: file.size,
          type: fileType,
          name: file.name,
          url: uploadUrl.split("?")[0],
        },
      });
    } catch (err) {
      if ((err as Error).message === "Upload cancelled") {
        setUploadState(null);
        return;
      }
      setUploadState(prev =>
        prev && prev.file === file
          ? { ...prev, status: "error", error: (err as Error).message || "Upload failed" }
          : prev,
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleCancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setUploadState(null);
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setUploadState(null);
  }, []);

  const getFileSizeDisplay = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSendMessage = useCallback(async () => {
    const text = sanitizeText(newMessage).trim();
    if ((!text && !uploadState) || isSending) return;

    let attachment: { type: "image" | "document"; name: string } | undefined;
    if (uploadState?.status === "done" && uploadState.result) {
      attachment = {
        type: uploadState.result.type,
        name: uploadState.result.name,
      };
    }

    const optimisticMsg: Message = {
      id: Date.now(),
      senderId: "me",
      text: text || (attachment ? `Sent a ${attachment.type}` : ""),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sending",
      attachment,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    setUploadState(null);
    setIsSending(true);

    try {
      await simulateSend(text || "sent");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: "sent" } : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: "failed" } : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isSending, simulateSend, uploadState]);

  const handleRetry = useCallback(async (failedMsg: Message) => {
    if (isSending) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === failedMsg.id ? { ...m, status: "sending" } : m,
      ),
    );
    setIsSending(true);

    try {
      await simulateSend(failedMsg.text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id ? { ...m, status: "sent" } : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id ? { ...m, status: "failed" } : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }, [isSending, simulateSend]);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.property.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedConv = conversations.find(
    (c) => c.id === selectedConversationId,
  );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-20">
        <div className="mx-auto max-w-md border-3 border-foreground bg-card p-8 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-3 border-foreground bg-muted">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="font-mono text-2xl font-black mb-3">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to access your messages and connect with
            landlords and residents.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/login">
              <Button className="w-full border-3 border-foreground bg-primary py-6 font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                variant="outline"
                className="w-full border-3 border-foreground bg-transparent py-6 font-bold shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-background pt-20">
      {/* Conversations List */}
      <aside
        className={`w-full border-r-3 border-foreground bg-card md:w-80 lg:w-96 ${selectedConversationId ? "hidden md:block" : "block"}`}
      >
        <div className="border-b-3 border-foreground p-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Messages</h1>
            <Link href="/dashboard/landlord">
              <Button
                variant="outline"
                size="icon"
                className="border-3 border-foreground bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-3 border-foreground pl-10 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
            />
          </div>
        </div>

        <div className="h-[calc(100vh-180px)] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center border-3 border-foreground bg-muted">
                <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-bold">No conversations found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Your messages will appear here"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                aria-label={`Select conversation with ${conv.participant.name}`}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full border-b-3 border-foreground p-4 text-left transition-colors ${
                  selectedConversationId === conv.id
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center border-3 border-foreground bg-accent font-bold">
                      {conv.participant.avatar}
                    </div>
                    {conv.participant.online && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 border-2 border-foreground bg-secondary" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{conv.participant.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {conv.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conv.participant.role}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.property}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-sm">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="flex h-6 w-6 items-center justify-center border-2 border-foreground bg-primary text-xs font-bold">
                      {conv.unread}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      {selectedConv ? (
        <main
          className={`flex flex-1 flex-col ${selectedConversationId ? "block" : "hidden md:block"}`}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b-3 border-foreground bg-card p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setSelectedConversationId(null)}
                aria-label="Back to conversations"
                className="flex h-10 w-10 items-center justify-center border-3 border-foreground bg-muted md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center border-3 border-foreground bg-accent text-sm font-bold md:h-12 md:w-12 md:text-base">
                  {selectedConv.participant.avatar}
                </div>
                {selectedConv.participant.online && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 border-2 border-foreground bg-secondary md:h-4 md:w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold md:text-base">
                  {selectedConv.participant.name}
                </h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground md:gap-2 md:text-sm">
                  <span className="hidden sm:inline">
                    {selectedConv.participant.role}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{selectedConv.property}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden border-3 border-foreground bg-transparent shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] sm:flex"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden border-3 border-foreground bg-transparent shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] sm:flex"
              >
                <Video className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-3 border-foreground bg-transparent shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-3 border-foreground">
                  <DropdownMenuItem>View Property</DropdownMenuItem>
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>Block User</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto bg-muted/30 p-6"
            role="log"
            aria-live="polite"
            aria-label="Message thread"
          >
            <div className="mx-auto max-w-3xl space-y-4">
              {/* Property Context Card */}
              <Card className="mx-auto mb-6 max-w-md border-3 border-foreground p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center border-2 border-foreground bg-muted">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Conversation about
                    </p>
                    <p className="font-bold">{selectedConv.property}</p>
                  </div>
                  <Link href={`/properties/1`} className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-foreground bg-transparent text-xs font-bold"
                    >
                      View
                    </Button>
                  </Link>
                </div>
              </Card>

              {isLoadingThread ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-bold">No messages yet</p>
                  <p className="text-sm text-muted-foreground">
                    Send a message to start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === "me" ? "justify-end" : "justify-start"}`}
                    aria-label={`Message from ${message.senderId === "me" ? "you" : "other"}: ${sanitizeText(message.text).slice(0, 50)}`}
                  >
                    <div
                      className={`max-w-md border-3 border-foreground p-4 ${
                        message.senderId === "me"
                          ? "bg-primary shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                          : "bg-card shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
                      }`}
                    >
                      <p className="text-sm break-words">
                        {sanitizeText(message.text)}
                      </p>
                      {message.attachment && (
                        <div className="mt-2 flex items-center gap-2 border-2 border-foreground bg-muted/50 p-2">
                          {message.attachment.type === "image" ? (
                            <ImageIcon className="h-4 w-4 shrink-0" />
                          ) : (
                            <File className="h-4 w-4 shrink-0" />
                          )}
                          <span className="text-xs truncate">
                            {message.attachment.name}
                          </span>
                          {message.attachment.type === "image" && (
                            <Download className="h-3 w-3 shrink-0 ml-auto text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp}
                        </span>
                        {message.senderId === "me" && (
                          <>
                            {message.status === "sending" && (
                              <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />
                            )}
                            {message.status === "sent" && (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            )}
                            {message.status === "delivered" && (
                              <CheckCheck className="h-3 w-3 text-muted-foreground" />
                            )}
                            {message.status === "read" && (
                              <CheckCheck className="h-3 w-3 text-secondary" />
                            )}
                            {message.status === "failed" && (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                          </>
                        )}
                      </div>
                      {message.status === "failed" && message.senderId === "me" && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(message)}
                            disabled={isSending}
                            className="border-2 border-destructive text-destructive text-xs font-bold"
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Attachment Preview */}
          {uploadState && (
            <div className="border-t-3 border-foreground bg-card px-3 md:px-4 py-2">
              <div className="mx-auto flex max-w-3xl items-center gap-3 border-2 border-foreground bg-muted/30 p-2">
                {uploadState.status === "error" ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                ) : uploadState.status === "done" ? (
                  uploadState.result?.type === "image" ? (
                    <ImageIcon className="h-5 w-5 shrink-0 text-secondary" />
                  ) : (
                    <File className="h-5 w-5 shrink-0 text-secondary" />
                  )
                ) : (
                  <Upload className="h-5 w-5 shrink-0 text-muted-foreground animate-pulse" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{uploadState.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadState.status === "uploading" && `Uploading... ${uploadState.progress}%`}
                    {uploadState.status === "pending" && "Ready to upload"}
                    {uploadState.status === "done" && `${getFileSizeDisplay(uploadState.file.size)} - Ready to send`}
                    {uploadState.status === "error" && (uploadState.error || "Upload failed")}
                  </p>
                  {uploadState.status === "uploading" && (
                    <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all duration-200 rounded-full"
                        style={{ width: `${uploadState.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {uploadState.status === "uploading" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCancelUpload}
                      className="h-7 w-7 border-2 border-foreground"
                      aria-label="Cancel upload"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {uploadState.status === "error" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveAttachment}
                      className="h-7 w-7 border-2 border-foreground"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {uploadState.status === "done" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveAttachment}
                      className="h-7 w-7 border-2 border-foreground"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t-3 border-foreground bg-card p-3 md:p-4">
            <div className="mx-auto flex max-w-3xl gap-2 md:gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Attach file"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState?.status === "uploading"}
                className="hidden border-3 border-foreground bg-transparent shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] sm:flex"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
                className="flex-1 border-3 border-foreground py-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] md:py-6"
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !uploadState) || isSending}
                aria-label={isSending ? "Sending message" : "Send message"}
                className="border-3 border-foreground bg-primary px-4 font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] disabled:opacity-50 md:px-6"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex flex-1 items-center justify-center bg-muted/30">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center border-3 border-foreground bg-muted">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">Select a conversation</h2>
            <p className="mt-2 text-muted-foreground">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
