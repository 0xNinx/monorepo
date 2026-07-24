export const conversations = [
  {
    id: 1,
    participant: {
      name: "Adebayo Johnson",
      role: "Whistleblower",
      avatar: "AJ",
      online: true,
    },
    property: "Modern 3 Bedroom Flat",
    lastMessage: "Great property! You'll love the neighborhood",
    timestamp: "2 min ago",
    unread: 2,
  },
  {
    id: 2,
    participant: {
      name: "Mrs. Adeleke",
      role: "Landlord",
      avatar: "MA",
      online: false,
    },
    property: "Modern 2 Bedroom Flat",
    lastMessage: "The maintenance has been completed",
    timestamp: "1 hour ago",
    unread: 0,
  },
  {
    id: 3,
    participant: {
      name: "Emeka Nwosu",
      role: "Whistleblower",
      avatar: "EN",
      online: true,
    },
    property: "Spacious 4 Bedroom Duplex",
    lastMessage: "Thanks for asking! Happy to answer any questions",
    timestamp: "3 hours ago",
    unread: 1,
  },
  {
    id: 4,
    participant: {
      name: "Funmi Oladipo",
      role: "Tenant",
      avatar: "FO",
      online: false,
    },
    property: "Modern 3 Bedroom Flat",
    lastMessage: "When can I make the first payment?",
    timestamp: "Yesterday",
    unread: 0,
  },
  {
    id: 5,
    participant: {
      name: "Chief Okonkwo",
      role: "Landlord",
      avatar: "CO",
      online: false,
    },
    property: "Spacious 4 Bedroom Duplex",
    lastMessage: "Please send me the tenant verification documents",
    timestamp: "2 days ago",
    unread: 0,
  },
];

export const messageThreads: Record<
  number,
  Array<{
    id: number;
    senderId: "me" | "other";
    text: string;
    timestamp: string;
    status: "sending" | "sent" | "delivered" | "read" | "failed";
    attachment?: { type: "image" | "document"; name: string };
  }>
> = {
  1: [
    {
      id: 1,
      senderId: "me",
      text: "Hi Adebayo, is the apartment still available?",
      timestamp: "2:30 PM",
      status: "read",
    },
    {
      id: 2,
      senderId: "other",
      text:
        "Yes! It's still available. Would you like to schedule a viewing?",
      timestamp: "2:32 PM",
      status: "read",
    },
    {
      id: 3,
      senderId: "me",
      text: "How's the neighborhood? Are there good schools nearby?",
      timestamp: "2:35 PM",
      status: "read",
    },
    {
      id: 4,
      senderId: "other",
      text: "Great property! You'll love the neighborhood",
      timestamp: "2:37 PM",
      status: "delivered",
    },
  ],
  2: [
    {
      id: 1,
      senderId: "other",
      text: "Hi, just confirming your lease details",
      timestamp: "11:00 AM",
      status: "read",
    },
    {
      id: 2,
      senderId: "me",
      text: "Yes, everything looks good",
      timestamp: "11:15 AM",
      status: "read",
    },
  ],
};
