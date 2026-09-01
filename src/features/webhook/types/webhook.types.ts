export type ChatMessageApi = {
  id: string
  content: string | null
  direction: string
  type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'contact' | null
  mediaUrl?: string | null
  mimeType?: string | null
  mediaSize?: number | null
  fileName?: string | null
  source?: 'normal' | 'template'
  metadata?: Record<string, unknown> | null
  createdAt?: string
}

export type ChatMessageDirection = 'inbound' | 'outbound'

export type ChatMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'contact'

export type ChatMessageSource = 'normal' | 'template'

export type ChatMessage = {
  id: string
  content: string | null
  direction: ChatMessageDirection
  type: ChatMessageType
  mediaUrl?: string | null
  mimeType?: string | null
  mediaSize?: number | null
  fileName?: string | null
  source: ChatMessageSource
  metadata?: Record<string, unknown> | null
  createdAt?: string
}

export type LeadRuntimeMode = 'HUMAN' | 'AUTOMATION'
export type LeadSocialLinkKey = 'instagram' | 'facebook' | 'url'
export type LeadSocialLinks = Partial<Record<LeadSocialLinkKey, string>>

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'

export type NegotiationStatus = 'OPEN' | 'WON' | 'LOST'

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
  metaTemplateName: string
  metaTemplateId?: string | null
  language: string
  category?: string | null
  userInformationsId?: string | null
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

export type NegotiationCostType =
  | 'PRODUCT'
  | 'SERVICE'
  | 'COMMISSION'
  | 'TAX'
  | 'FREIGHT'
  | 'FEE'
  | 'OTHER'

export type NegotiationCostResponse = {
  id: string
  negotiationFinancialId: string
  description: string
  type: NegotiationCostType
  amount: string
  createdAt: string
  updatedAt: string
}

export type CreateNegotiationCostPayload = {
  description: string
  type: NegotiationCostType
  amount: string
}

export type UpdateNegotiationCostPayload = Partial<CreateNegotiationCostPayload>

export type NegotiationPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELED'

export type NegotiationPaymentMethod =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'OTHER'

export type NegotiationPaymentResponse = {
  id: string
  negotiationFinancialId: string
  amount: string
  paymentMethod: NegotiationPaymentMethod
  dueDate: string
  paidAt?: string | null
  status: NegotiationPaymentStatus
  proofAttachmentId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateNegotiationPaymentPayload = {
  amount: string
  paymentMethod: NegotiationPaymentMethod
  dueDate: string
  paidAt?: string | null
  status: NegotiationPaymentStatus
  proofAttachmentId?: string | null
}

export type UpdateNegotiationPaymentPayload =
  Partial<CreateNegotiationPaymentPayload>

export type CreateNegotiationPaymentInstallmentsPayload = {
  amount: string
  paymentMethod: NegotiationPaymentMethod
  dueDate: string
  installmentCount: number
}

export type NegotiationFinancialResponse = {
  id: string
  negotiationId: string
  saleAmount: string
  discountAmount?: string | null
  costs?: NegotiationCostResponse[]
  payments?: NegotiationPaymentResponse[]
  createdAt?: string
  updatedAt?: string
}

export type NegotiationResponse = {
  id: string
  leadId: string
  title?: string | null
  stage: LeadStage
  status: NegotiationStatus
  temperature?: NegotiationTemperature | null
  negotiationType?: NegotiationType | null
  financial?: NegotiationFinancialResponse | null
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
  status?: NegotiationStatus
  temperature?: NegotiationTemperature
  negotiationType?: NegotiationType
  notes?: NegotiationNote[]
  closedAt?: string | null
  stageUpdatedAt?: string | null
}

export type UpdateNegotiationPayload = {
  leadId?: string
  title?: string
  stage?: LeadStage
  status?: NegotiationStatus
  temperature?: NegotiationTemperature | null
  negotiationType?: NegotiationType | null
  notes?: NegotiationNote[] | null
  closedAt?: string | null
  stageUpdatedAt?: string | null
}

export type CreateNegotiationFinancialPayload = {
  saleAmount: string
  discountAmount?: string
}

export type UpdateNegotiationFinancialPayload =
  Partial<CreateNegotiationFinancialPayload>

export type NegotiationFollowUpResponse = {
  id: string
  negotiationId: string
  title: string
  actions: FollowUpActionResponse[]
  dueAt: string
  status: LeadFollowUpStatus
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type FollowUpActionType = 'send_message' | 'send_email'
export type FollowUpMessageChannel =
  | 'whatsapp'
  | 'messenger'
  | 'instagram'
  | 'Agenda'
export type FollowUpActionStatus =
  | 'scheduled'
  | 'awaiting_reply'
  | 'executed'
  | 'failed'
  | 'skipped'
  | 'manual_required'

export type FollowUpActionPayload = {
  type: FollowUpActionType
  channel?: FollowUpMessageChannel
  payload: Record<string, unknown>
}

export type FollowUpActionResponse = FollowUpActionPayload & {
  id: string
  channel: FollowUpMessageChannel | null
  status: FollowUpActionStatus
  executedAt: string | null
  failureReason: string | null
  replyMessageId: string | null
  replyContent: string | null
  replyType: string | null
  repliedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateNegotiationFollowUpPayload = {
  negotiationId: string
  title: string
  actions: FollowUpActionPayload[]
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

export type NegotiationAttachmentListItemResponse =
  NegotiationAttachmentResponse & {
    negotiationId: string
    leadId: string
  }

export type NegotiationAttachmentDownloadUrlResponse = {
  url: string
  expiresIn: number
}
