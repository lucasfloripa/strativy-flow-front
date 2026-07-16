export type ChatMessageApi = {
  id: string
  content: string
  direction: string
  createdAt?: string
}

export type ChatMessageDirection = 'inbound' | 'outbound'

export type ChatMessage = {
  id: string
  content: string
  direction: ChatMessageDirection
}

export type LeadRuntimeMode = 'HUMAN' | 'AUTOMATION'
export type LeadSocialLinkKey = 'instagram' | 'url'
export type LeadSocialLinks = Partial<Record<LeadSocialLinkKey, string>>

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'

export type LeadResponse = {
  id: string
  name?: string | null
  isFavorite?: boolean | null
  phone?: string | null
  email?: string | null
  state?: 'active' | 'archived' | null
  leadQualification?: 'qualify' | 'not qualify' | null
  leadStage?: LeadStage | null
  value?: string | null
  source?: string | null
  socialLinks?: LeadSocialLinks | null
  initialContext?: string | null
  createdAt?: string | null
  closedAt?: string | null
  leadStageClosedAt?: string | null
  lastMessageAt?: string | null
  totalMessages?: number | null
  lastActivityAt?: string | null
  runtimeMode: LeadRuntimeMode
}

export type UpdateLeadPayload = {
  name?: string
  phone?: string
  email?: string
  source?: string
  socialLinks?: LeadSocialLinks | null
  leadQualification?: 'qualify' | 'not qualify' | null
  initialContext?: string
  value?: string | null
  leadStage?: LeadStage
}

export type CreateLeadPayload = {
  name: string
  phone: string
  email?: string
  source?: string
  socialLinks?: LeadSocialLinks | null
  leadQualification?: 'qualify' | 'not qualify' | null
}

export type LeadFollowUpStatus = 'pending' | 'done' | 'canceled'
export type FollowUpSortFocus = 'overdue' | 'today' | 'scheduled' | 'completed'
export type FollowUpDateSortOrder = 'asc' | 'desc'

export type LeadFollowUpResponse = {
  id: string
  leadId: string
  value: string
  dueAt: string
  status: LeadFollowUpStatus
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type PaginatedResponse<TItem> = {
  items: TItem[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export type NegotiationType = 'service' | 'product'
export type NegotiationTemperature = 'hot' | 'warm' | 'cold'

export type NegotiationNote = {
  title: string
  description: string
  createdAt?: string
}

export type NegotiationResponse = {
  id: string
  leadId: string
  title?: string | null
  stage: LeadStage
  temperature?: NegotiationTemperature | null
  negotiationType?: NegotiationType | null
  value?: string | null
  notes?: NegotiationNote[] | null
  closedAt?: string | null
  stageUpdatedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type CreateNegotiationPayload = {
  leadId: string
  title?: string
  stage?: LeadStage
  temperature?: NegotiationTemperature
  negotiationType?: NegotiationType
  value?: string
  notes?: NegotiationNote[]
  closedAt?: string | null
  stageUpdatedAt?: string | null
}

export type UpdateNegotiationPayload = {
  leadId?: string
  title?: string
  stage?: LeadStage
  temperature?: NegotiationTemperature | null
  negotiationType?: NegotiationType | null
  value?: string | null
  notes?: NegotiationNote[] | null
  closedAt?: string | null
  stageUpdatedAt?: string | null
}

export type NegotiationFollowUpResponse = {
  id: string
  negotiationId: string
  value: string
  dueAt: string
  status: LeadFollowUpStatus
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreateNegotiationFollowUpPayload = {
  negotiationId: string
  value: string
  dueAt: string
}
