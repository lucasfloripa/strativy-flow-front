export type DashboardSummary = {
  activeLeads: number
  newToday: number
  withoutConversation24h: number
  followUps: {
    overdue: number
    today: number
    scheduled: number
  }
}

export type DashboardConversationFilter =
  | 'all'
  | 'new'
  | 'today'
  | 'noResponse24h'

export type DashboardConversationStatus =
  | 'new'
  | 'today'
  | 'noResponse24h'

export type DashboardConversation = {
  leadId: string
  leadName: string
  source: string | null
  leadCreatedAt: string | Date
  lastMessageAt: string | Date
  lastMessage: string | null
  lastMessageDirection: 'INBOUND' | 'OUTBOUND'
  lastMessageType: string
  isNew: boolean
  status: DashboardConversationStatus | null
  runtimeMode: 'HUMAN' | 'AUTOMATION'
}

export type DashboardConversationsResponse = {
  filter: DashboardConversationFilter
  counts: Record<DashboardConversationFilter, number>
  items: DashboardConversation[]
}

export type UserNotification = {
  id: string
  organizationId: string | null
  userId: string
  type: 'LEAD_CREATED' | 'MESSAGE_RECEIVED' | 'FOLLOW_UP_REMINDER_1H' | 'CONVERSATION_EXPIRING_1H' | 'CONVERSATION_EXPIRED'
  title: string
  description: string
  referenceType: 'LEAD' | 'MESSAGE' | 'FOLLOW_UP'
  referenceId: string
  isRead: boolean
  readAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

export type HomeHighlightedLead = {
  id: string
  name?: string
  phone?: string
  state?: string
  lastMessageAt?: string | Date | null
  lastActivityAt?: string | Date | null
  createdAt?: string | Date
  isFavorite?: boolean
  nextFollowUpDueAt?: string | Date | null
  nextFollowUpNegotiationId?: string | null
  topFollowUpStatus?: 'overdue' | 'today' | 'scheduled' | 'completed' | null
  hasFollowUpOverdue?: boolean
  hasFollowUpToday?: boolean
  hasFollowUpScheduled?: boolean
}
