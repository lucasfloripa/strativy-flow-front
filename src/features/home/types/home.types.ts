export type DashboardSummary = {
  activeLeads: number
  newToday: number
  withoutConversation24h: number
  followUps: {
    overdue: number
    today: number
    scheduled: number
  }
  revenue: number
}

export type DashboardIncome = {
  income: number
}

export type UserNotification = {
  id: string
  organizationId: string | null
  userId: string
  type: 'LEAD_CREATED' | 'MESSAGE_RECEIVED' | 'FOLLOW_UP_REMINDER_1H'
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
