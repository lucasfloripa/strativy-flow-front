import { appApiClient } from '../../../core/api/appApiClient'
import axios from 'axios'
import type {
  ChatMessage,
  ChatMessageApi,
  CreateLeadPayload,
  CreateNegotiationCostPayload,
  CreateNegotiationFollowUpPayload,
  CreateNegotiationFinancialPayload,
  CreateNegotiationPayload,
  CreateNegotiationPaymentPayload,
  CreateNegotiationPaymentInstallmentsPayload,
  FollowUpDateSortOrder,
  FollowUpActionPayload,
  FollowUpSortFocus,
  PaginatedResponse,
  LeadFollowUpResponse,
  LeadFollowUpStatus,
  LeadResponse,
  LeadRuntimeMode,
  MessageTemplateResponse,
  NegotiationCostResponse,
  NegotiationAttachmentDownloadUrlResponse,
  NegotiationAttachmentListItemResponse,
  NegotiationAttachmentResponse,
  NegotiationFollowUpResponse,
  NegotiationPaymentResponse,
  NegotiationResponse,
  UpdateNegotiationPayload,
  UpdateNegotiationCostPayload,
  UpdateNegotiationFinancialPayload,
  UpdateNegotiationPaymentPayload,
  UpdateLeadPayload,
} from '../types/webhook.types'

export const WebhookService = {
  mapMessageFromApi(message: ChatMessageApi): ChatMessage {
    return {
      id: message.id,
      content: message.content ?? null,
      direction: ['OUTBOUND', 'AUTOMATIC'].includes(
        String(message.direction ?? '')
          .trim()
          .toUpperCase(),
      )
        ? 'outbound'
        : 'inbound',
      type:
        message.type === 'image' ||
        message.type === 'audio' ||
        message.type === 'video' ||
        message.type === 'document' ||
        message.type === 'contact'
          ? message.type
          : 'text',
      mediaUrl: message.mediaUrl ?? null,
      mimeType: message.mimeType ?? null,
      mediaSize: message.mediaSize ?? null,
      fileName: message.fileName ?? null,
      source: message.source ?? 'normal',
      metadata: message.metadata ?? null,
      createdAt: message.createdAt,
    }
  },

  async loadMessages(leadId: string): Promise<ChatMessage[]> {
    const { data } = await appApiClient.get<ChatMessageApi[]>(
      `/leads/${leadId}/messages`,
    )

    return (data ?? []).map((message) => this.mapMessageFromApi(message))
  },

  async loadLead(leadId: string): Promise<LeadResponse> {
    const { data } = await appApiClient.get<LeadResponse>(`/leads/${leadId}`)
    return data
  },

  async createLead(payload: CreateLeadPayload): Promise<LeadResponse> {
    try {
      const { data } = await appApiClient.post<LeadResponse>('/leads', payload)
      return data
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        throw new Error(error.response?.data?.message || 'Falha ao criar lead.')
      }
      throw error
    }
  },

  async updateLead(
    leadId: string,
    payload: UpdateLeadPayload,
  ): Promise<LeadResponse> {
    const { data } = await appApiClient.patch<LeadResponse>(
      `/leads/${leadId}`,
      payload,
    )
    return data
  },

  async deleteLead(leadId: string): Promise<void> {
    await appApiClient.delete(`/leads/${leadId}`)
  },

  async setLeadArchiveState(
    leadId: string,
    state: 'active' | 'archived',
  ): Promise<void> {
    await appApiClient.patch(`/leads/${leadId}/archive`, { state })
  },

  async toggleFavoriteLead(leadId: string, isFavorite: boolean): Promise<void> {
    await appApiClient.patch(`/leads/${leadId}/favorite`, { isFavorite })
  },

  async loadLeadRuntimeMode(leadId: string): Promise<LeadRuntimeMode | null> {
    const lead = await this.loadLead(leadId)
    return lead.runtimeMode ?? null
  },

  async loadLeadFollowUps(
    leadId: string,
    page: number = 1,
    limit: number = 13,
    statusFocus: FollowUpSortFocus = 'overdue',
    dateOrder: FollowUpDateSortOrder = 'asc',
  ): Promise<PaginatedResponse<LeadFollowUpResponse>> {
    const { data } = await appApiClient.get<
      PaginatedResponse<LeadFollowUpResponse>
    >(`/leads/${leadId}/followups`, {
      params: { page, limit, statusFocus, dateOrder },
    })
    return (
      data ?? {
        items: [],
        page,
        limit,
        totalItems: 0,
        totalPages: 1,
      }
    )
  },

  async createLeadFollowUp(
    leadId: string,
    title: string,
    dueAt: string,
  ): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.post<LeadFollowUpResponse>(
      '/lead-followups',
      {
        leadId,
        title,
        dueAt,
      },
    )

    return data
  },

  async completeLeadFollowUp(
    followUpId: string,
  ): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.patch<LeadFollowUpResponse>(
      `/lead-followups/${followUpId}/complete`,
    )
    return data
  },

  async deleteLeadFollowUp(followUpId: string): Promise<void> {
    await appApiClient.delete(`/lead-followups/${followUpId}`)
  },

  async updateLeadFollowUp(
    followUpId: string,
    title: string,
    dueAt: string,
  ): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.patch<LeadFollowUpResponse>(
      `/lead-followups/${followUpId}`,
      {
        title,
        dueAt,
      },
    )
    return data
  },

  async updateLeadFollowUpStatus(
    followUpId: string,
    status: LeadFollowUpStatus,
  ): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.patch<LeadFollowUpResponse>(
      `/lead-followups/${followUpId}`,
      {
        status,
      },
    )
    return data
  },

  async sendMessage(
    leadId: string,
    content: string,
    source?: 'normal' | 'template',
    channel?: 'whatsapp' | 'messenger' | 'instagram',
  ): Promise<ChatMessage> {
    const { data } = await appApiClient.post<{
      success: boolean
      message: ChatMessageApi
    }>(`/leads/${leadId}/messages`, { content, source, channel })

    return this.mapMessageFromApi(data.message)
  },

  async sendContacts(
    leadId: string,
    contactIds: string[],
  ): Promise<ChatMessage> {
    const { data } = await appApiClient.post<{
      success: boolean
      message: ChatMessageApi
    }>(`/leads/${leadId}/messages/contacts`, { contactIds })

    return this.mapMessageFromApi(data.message)
  },

  async sendMediaMessage(
    leadId: string,
    payload: {
      file: File
      type: 'audio' | 'image' | 'video' | 'document'
      caption?: string
      metadata?: Record<string, unknown>
      channel?: 'messenger' | 'instagram'
      signal?: AbortSignal
    },
  ): Promise<ChatMessage> {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('type', payload.type)

    if (payload.channel) {
      formData.append('channel', payload.channel)
    }

    if (payload.caption?.trim()) {
      formData.append('caption', payload.caption.trim())
    }

    if (payload.metadata) {
      formData.append('metadata', JSON.stringify(payload.metadata))
    }

    const { data } = await appApiClient.post<{
      success: boolean
      message: ChatMessageApi
    }>(`/leads/${leadId}/messages/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: payload.signal,
    })

    return this.mapMessageFromApi(data.message)
  },

  async updateLeadRuntimeMode(
    leadId: string,
    runtimeMode: LeadRuntimeMode,
  ): Promise<LeadRuntimeMode> {
    const { data } = await appApiClient.patch<LeadResponse>(
      `/leads/${leadId}/runtime-mode`,
      { runtimeMode },
    )
    return data.runtimeMode
  },

  async loadNegotiations(leadId?: string): Promise<NegotiationResponse[]> {
    const { data } = await appApiClient.get<NegotiationResponse[]>(
      '/negotiations',
      {
        params: leadId ? { leadId } : undefined,
      },
    )
    return data ?? []
  },

  async createNegotiation(
    payload: CreateNegotiationPayload,
  ): Promise<NegotiationResponse> {
    const { data } = await appApiClient.post<NegotiationResponse>(
      '/negotiations',
      payload,
    )
    return data
  },

  async updateNegotiation(
    negotiationId: string,
    payload: UpdateNegotiationPayload,
  ): Promise<NegotiationResponse> {
    const { data } = await appApiClient.patch<NegotiationResponse>(
      `/negotiations/${negotiationId}`,
      payload,
    )
    return data
  },

  async createNegotiationFinancial(
    negotiationId: string,
    payload: CreateNegotiationFinancialPayload,
  ): Promise<NegotiationResponse['financial']> {
    const { data } = await appApiClient.post<NegotiationResponse['financial']>(
      `/negotiations/${negotiationId}/financial`,
      payload,
    )
    return data
  },

  async updateNegotiationFinancial(
    negotiationId: string,
    payload: UpdateNegotiationFinancialPayload,
  ): Promise<NegotiationResponse['financial']> {
    const { data } = await appApiClient.patch<NegotiationResponse['financial']>(
      `/negotiations/${negotiationId}/financial`,
      payload,
    )
    return data
  },

  async deleteNegotiationFinancial(negotiationId: string): Promise<void> {
    await appApiClient.delete(`/negotiations/${negotiationId}/financial`)
  },

  async loadNegotiationCosts(
    negotiationId: string,
  ): Promise<NegotiationCostResponse[]> {
    const { data } = await appApiClient.get<NegotiationCostResponse[]>(
      `/negotiations/${negotiationId}/financial/costs`,
    )
    return data ?? []
  },

  async createNegotiationCost(
    negotiationId: string,
    payload: CreateNegotiationCostPayload,
  ): Promise<NegotiationCostResponse> {
    const { data } = await appApiClient.post<NegotiationCostResponse>(
      `/negotiations/${negotiationId}/financial/costs`,
      payload,
    )
    return data
  },

  async updateNegotiationCost(
    negotiationId: string,
    costId: string,
    payload: UpdateNegotiationCostPayload,
  ): Promise<NegotiationCostResponse> {
    const { data } = await appApiClient.patch<NegotiationCostResponse>(
      `/negotiations/${negotiationId}/financial/costs/${costId}`,
      payload,
    )
    return data
  },

  async deleteNegotiationCost(
    negotiationId: string,
    costId: string,
  ): Promise<void> {
    await appApiClient.delete(
      `/negotiations/${negotiationId}/financial/costs/${costId}`,
    )
  },

  async loadNegotiationPayments(
    negotiationId: string,
  ): Promise<NegotiationPaymentResponse[]> {
    const { data } = await appApiClient.get<NegotiationPaymentResponse[]>(
      `/negotiations/${negotiationId}/financial/payments`,
    )
    return data ?? []
  },

  async createNegotiationPayment(
    negotiationId: string,
    payload: CreateNegotiationPaymentPayload,
  ): Promise<NegotiationPaymentResponse> {
    const { data } = await appApiClient.post<NegotiationPaymentResponse>(
      `/negotiations/${negotiationId}/financial/payments`,
      payload,
    )
    return data
  },

  async createNegotiationPaymentInstallments(
    negotiationId: string,
    payload: CreateNegotiationPaymentInstallmentsPayload,
  ): Promise<NegotiationPaymentResponse[]> {
    const { data } = await appApiClient.post<NegotiationPaymentResponse[]>(
      `/negotiations/${negotiationId}/financial/payments/installments`,
      payload,
    )
    return data ?? []
  },

  async updateNegotiationPayment(
    negotiationId: string,
    paymentId: string,
    payload: UpdateNegotiationPaymentPayload,
  ): Promise<NegotiationPaymentResponse> {
    const { data } = await appApiClient.patch<NegotiationPaymentResponse>(
      `/negotiations/${negotiationId}/financial/payments/${paymentId}`,
      payload,
    )
    return data
  },

  async deleteNegotiationPayment(
    negotiationId: string,
    paymentId: string,
  ): Promise<void> {
    await appApiClient.delete(
      `/negotiations/${negotiationId}/financial/payments/${paymentId}`,
    )
  },

  async deleteNegotiation(negotiationId: string): Promise<void> {
    await appApiClient.delete(`/negotiations/${negotiationId}`)
  },

  async loadNegotiationFollowUps(): Promise<NegotiationFollowUpResponse[]> {
    const { data } =
      await appApiClient.get<NegotiationFollowUpResponse[]>('/followups')
    return data ?? []
  },

  async loadMessageTemplates(): Promise<MessageTemplateResponse[]> {
    const { data } =
      await appApiClient.get<MessageTemplateResponse[]>('/message-templates')
    return data ?? []
  },

  async sendTemplate(
    leadId: string,
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{ success: boolean; message: ChatMessageApi }> {
    const { data } = await appApiClient.post<{
      success: boolean
      message: ChatMessageApi
    }>(`/leads/${leadId}/messages/template`, {
      templateId,
      variables,
    })
    return data
  },

  async createNegotiationFollowUp(
    payload: CreateNegotiationFollowUpPayload,
  ): Promise<NegotiationFollowUpResponse> {
    const { data } = await appApiClient.post<NegotiationFollowUpResponse>(
      '/followups',
      payload,
    )
    return data
  },

  async updateNegotiationFollowUp(
    followUpId: string,
    payload: {
      title?: string
      templateId?: string | null
      templateVariables?: Record<string, unknown>
      dueAt?: string
      status?: LeadFollowUpStatus
      completedAt?: string | null
      actions?: FollowUpActionPayload[]
    },
  ): Promise<NegotiationFollowUpResponse> {
    const { data } = await appApiClient.patch<NegotiationFollowUpResponse>(
      `/followups/${followUpId}`,
      payload,
    )
    return data
  },

  async deleteNegotiationFollowUp(followUpId: string): Promise<void> {
    await appApiClient.delete(`/followups/${followUpId}`)
  },

  async loadNegotiationAttachments(
    negotiationId: string,
  ): Promise<NegotiationAttachmentResponse[]> {
    const { data } = await appApiClient.get<NegotiationAttachmentResponse[]>(
      `/negotiations/${negotiationId}/attachments`,
    )

    return data ?? []
  },

  async loadAllNegotiationAttachments(): Promise<
    NegotiationAttachmentListItemResponse[]
  > {
    const { data } = await appApiClient.get<
      NegotiationAttachmentListItemResponse[]
    >('/negotiation-attachments')

    return data ?? []
  },

  async uploadNegotiationAttachment(
    negotiationId: string,
    file: File,
  ): Promise<NegotiationAttachmentResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await appApiClient.post<NegotiationAttachmentResponse>(
      `/negotiations/${negotiationId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )

    return data
  },

  async getNegotiationAttachmentDownloadUrl(
    attachmentId: string,
  ): Promise<NegotiationAttachmentDownloadUrlResponse> {
    const { data } =
      await appApiClient.get<NegotiationAttachmentDownloadUrlResponse>(
        `/negotiations/attachments/${attachmentId}/download`,
      )

    return data
  },

  async deleteNegotiationAttachment(attachmentId: string): Promise<void> {
    await appApiClient.delete(`/negotiations/attachments/${attachmentId}`)
  },
}
