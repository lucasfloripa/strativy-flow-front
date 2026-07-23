export type ChatMessageApi = {
  id: string
  content: string | null
  direction: string
  type?: 'text' | 'image' | 'audio' | 'video' | 'document' | null
  mediaUrl?: string | null
  mimeType?: string | null
  mediaSize?: number | null
  fileName?: string | null
  createdAt?: string
}

export type ChatMessageDirection = 'inbound' | 'outbound'

export type ChatMessageType = 'text' | 'image' | 'audio' | 'video' | 'document'

export type ChatMessage = {
  id: string
  content: string | null
  direction: ChatMessageDirection
  type: ChatMessageType
  mediaUrl?: string | null
  mimeType?: string | null
  mediaSize?: number | null
  fileName?: string | null
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
  location?: string | null
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
  location?: string
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
  location?: string
  socialLinks?: LeadSocialLinks | null
  leadQualification?: 'qualify' | 'not qualify' | null
}

export type LeadFollowUpStatus = 'pending' | 'done' | 'canceled' | 'skipped'
export type FollowUpSortFocus = 'overdue' | 'today' | 'scheduled' | 'completed'
export type FollowUpDateSortOrder = 'asc' | 'desc'

export type FollowUpTemplateResponse = {
  id: string
  name: string
  description?: string | null
  variables?: Array<{
    key: string
    label: string
    required: boolean
  }> | null
}

export type MessageTemplateResponse = {
  id: string
  name: string
  description?: string | null
  variables?: Array<{
    key: string
    label: string
    required: boolean
  }> | null
  createdAt?: string
  updatedAt?: string
}

export type LeadFollowUpResponse = {
  id: string
  leadId: string
  title: string
  templateId?: string | null
  template?: FollowUpTemplateResponse | null
  templateVariables?: Record<string, unknown> | null
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
  title: string
  templateId?: string | null
  template?: FollowUpTemplateResponse | null
  templateVariables?: Record<string, unknown> | null
  dueAt: string
  status: LeadFollowUpStatus
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreateNegotiationFollowUpPayload = {
  negotiationId: string
  title: string
  templateId?: string | null
  templateVariables?: Record<string, unknown>
  dueAt: string
}

export type NegotiationAttachmentResponse = {
  id: string
  originalName: string
  mimeType: string
  extension: string
  size: number
  createdAt: string
  uploadedByUserId: string
}

export type NegotiationAttachmentDownloadUrlResponse = {
  url: string
  expiresIn: number
}
