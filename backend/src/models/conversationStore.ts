import { randomUUID } from 'node:crypto'
import {
  Conversation,
  ConversationWithLastMessage,
  Message,
  CreateConversationInput,
  SendMessageInput,
  ConversationFilter,
  ParticipantRole,
  MessageAttachment,
} from './conversation.js'
import { getPool, type PgPoolLike } from '../db.js'

interface ConversationStorePort {
  createConversation(input: CreateConversationInput): Promise<Conversation>
  findOrCreateConversation(input: CreateConversationInput): Promise<Conversation>
  getConversation(id: string, userId: string): Promise<Conversation | null>
  listConversations(userId: string, filter?: ConversationFilter): Promise<ConversationWithLastMessage[]>
  getUnreadCount(userId: string): Promise<number>
  sendMessage(input: SendMessageInput): Promise<Message>
  getMessages(conversationId: string, userId: string, cursor?: string, limit?: number): Promise<Message[]>
  markRead(conversationId: string, userId: string): Promise<void>
  isParticipant(conversationId: string, userId: string): Promise<boolean>
  clear(): Promise<void>
}

class InMemoryConversationStore implements ConversationStorePort {
  private conversations = new Map<string, Conversation>()
  private messagesMap = new Map<string, Message[]>()

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const id = randomUUID()
    const now = new Date().toISOString()
    const conv: Conversation = {
      id,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
      createdAt: now,
      updatedAt: now,
      participants: input.participantIds.map(pid => ({
        userId: pid,
        role: ParticipantRole.MEMBER,
        lastReadAt: null,
        joinedAt: now,
      })),
    }
    this.conversations.set(id, conv)
    this.messagesMap.set(id, [])
    return conv
  }

  async findOrCreateConversation(input: CreateConversationInput): Promise<Conversation> {
    const sortedIds = [...input.participantIds].sort()
    for (const conv of this.conversations.values()) {
      if (conv.subjectType !== (input.subjectType ?? null)) continue
      if (conv.subjectId !== (input.subjectId ?? null)) continue
      const convParticipantIds = conv.participants.map(p => p.userId).sort()
      if (convParticipantIds.length === sortedIds.length &&
          convParticipantIds.every((id, i) => id === sortedIds[i])) {
        return conv
      }
    }
    return this.createConversation(input)
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    const conv = this.conversations.get(id)
    if (!conv) return null
    const isMember = conv.participants.some(p => p.userId === userId)
    if (!isMember) return null
    return conv
  }

  async listConversations(userId: string, filter?: ConversationFilter): Promise<ConversationWithLastMessage[]> {
    const result: ConversationWithLastMessage[] = []
    const limit = filter?.limit ?? 50

    for (const conv of this.conversations.values()) {
      if (!conv.participants.some(p => p.userId === userId)) continue
      const messages = this.messagesMap.get(conv.id) ?? []
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null
      const participant = conv.participants.find(p => p.userId === userId)
      const unreadCount = messages.filter(
        m => m.senderId !== userId && (participant?.lastReadAt ? new Date(m.createdAt) > new Date(participant.lastReadAt) : true)
      ).length

      result.push({
        ...conv,
        lastMessage: lastMsg ? { text: lastMsg.body, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt } : null,
        unreadCount,
      })
    }

    result.sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt))
    return result.slice(0, limit)
  }

  async getUnreadCount(userId: string): Promise<number> {
    let total = 0
    for (const conv of this.conversations.values()) {
      if (!conv.participants.some(p => p.userId === userId)) continue
      const messages = this.messagesMap.get(conv.id) ?? []
      const participant = conv.participants.find(p => p.userId === userId)
      total += messages.filter(
        m => m.senderId !== userId && (participant?.lastReadAt ? new Date(m.createdAt) > new Date(participant.lastReadAt) : true)
      ).length
    }
    return total
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const msg: Message = {
      id: randomUUID(),
      conversationId: input.conversationId,
      senderId: input.senderId,
      body: input.body,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      attachment: input.attachment ?? null,
    }
    const messages = this.messagesMap.get(input.conversationId) ?? []
    messages.push(msg)
    this.messagesMap.set(input.conversationId, messages)
    const conv = this.conversations.get(input.conversationId)
    if (conv) {
      conv.updatedAt = msg.createdAt
    }
    return msg
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 50): Promise<Message[]> {
    const conv = this.conversations.get(conversationId)
    if (!conv) return []
    if (!conv.participants.some(p => p.userId === userId)) return []
    const messages = this.messagesMap.get(conversationId) ?? []
    let filtered = [...messages].reverse()
    if (cursor) {
      const cursorIdx = filtered.findIndex(m => m.id === cursor)
      if (cursorIdx >= 0) {
        filtered = filtered.slice(cursorIdx + 1)
      }
    }
    return filtered.slice(0, limit)
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    const conv = this.conversations.get(conversationId)
    if (!conv) return
    const participant = conv.participants.find(p => p.userId === userId)
    if (participant) {
      participant.lastReadAt = new Date().toISOString()
    }
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const conv = this.conversations.get(conversationId)
    if (!conv) return false
    return conv.participants.some(p => p.userId === userId)
  }

  async clear(): Promise<void> {
    this.conversations.clear()
    this.messagesMap.clear()
  }
}

class HybridConversationStore implements ConversationStorePort {
  private inner: ConversationStorePort

  constructor() {
    this.inner = new InMemoryConversationStore()
  }

  private async usePostgres(): Promise<boolean> {
    try {
      const pool = await getPool()
      return pool !== null
    } catch {
      return false
    }
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    return this.inner.createConversation(input)
  }

  async findOrCreateConversation(input: CreateConversationInput): Promise<Conversation> {
    return this.inner.findOrCreateConversation(input)
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    return this.inner.getConversation(id, userId)
  }

  async listConversations(userId: string, filter?: ConversationFilter): Promise<ConversationWithLastMessage[]> {
    return this.inner.listConversations(userId, filter)
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.inner.getUnreadCount(userId)
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    return this.inner.sendMessage(input)
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit?: number): Promise<Message[]> {
    return this.inner.getMessages(conversationId, userId, cursor, limit)
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    return this.inner.markRead(conversationId, userId)
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    return this.inner.isParticipant(conversationId, userId)
  }

  async clear(): Promise<void> {
    return this.inner.clear()
  }
}

export const conversationStore: ConversationStorePort = new HybridConversationStore()
