export type Lead = {
  id: string
  name?: string
  phone?: string
  email?: string
  source?: string
  state?: string
  leadQualification?: 'qualify' | 'not qualify' | null
  runtimeMode?: 'HUMAN' | 'AUTOMATION'
  isFavorite?: boolean
  createdAt?: string | Date
  lastMessageAt?: string | Date | null
  nextFollowUpDueAt?: string | Date | null
  nextFollowUpNegotiationId?: string | null
  topFollowUpStatus?: 'overdue' | 'today' | 'scheduled' | 'completed' | null
  hasFollowUpOverdue?: boolean
  hasFollowUpToday?: boolean
  hasFollowUpScheduled?: boolean
  hasAnyFollowUp?: boolean
}

export type LeadsBootstrapData = {
  leads: Lead[]
}
