import { appApiClient } from '../../../core/api/appApiClient'
import type {
  ChatMessage,
  ChatMessageApi,
  CreateLeadPayload,
  CreateNegotiationFollowUpPayload,
  CreateNegotiationPayload,
  FollowUpDateSortOrder,
  FollowUpSortFocus,
  PaginatedResponse,
  LeadFollowUpResponse,
  LeadFollowUpStatus,
  LeadResponse,
  LeadRuntimeMode,
  NegotiationAttachmentDownloadUrlResponse,
  NegotiationAttachmentResponse,
  NegotiationFollowUpResponse,
  NegotiationResponse,
  UpdateNegotiationPayload,
  UpdateLeadPayload
} from '../types/webhook.types'

export const WebhookService = {
  async loadMessages(leadId: string): Promise<ChatMessage[]> {
    const { data } = await appApiClient.get<ChatMessageApi[]>(`/leads/${leadId}/messages`)

    return (data ?? []).map((message) => ({
      id: message.id,
      content: message.content,
      direction:
        String(message.direction ?? '')
          .trim()
          .toUpperCase() === 'OUTBOUND'
          ? 'outbound'
          : 'inbound'
    }))
  },

  async loadLead(leadId: string): Promise<LeadResponse> {
    const { data } = await appApiClient.get<LeadResponse>(`/leads/${leadId}`)
    return data
  },

  async createLead(payload: CreateLeadPayload): Promise<LeadResponse> {
    const { data } = await appApiClient.post<LeadResponse>('/leads', payload)
    return data
  },

  async updateLead(leadId: string, payload: UpdateLeadPayload): Promise<LeadResponse> {
    const { data } = await appApiClient.patch<LeadResponse>(`/leads/${leadId}`, payload)
    return data
  },

  async deleteLead(leadId: string): Promise<void> {
    await appApiClient.delete(`/leads/${leadId}`)
  },

  async setLeadArchiveState(
    leadId: string,
    state: 'active' | 'archived'
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
    dateOrder: FollowUpDateSortOrder = 'asc'
  ): Promise<PaginatedResponse<LeadFollowUpResponse>> {
    const { data } = await appApiClient.get<PaginatedResponse<LeadFollowUpResponse>>(
      `/leads/${leadId}/followups`,
      {
        params: { page, limit, statusFocus, dateOrder }
      }
    )
    return (
      data ?? {
        items: [],
        page,
        limit,
        totalItems: 0,
        totalPages: 1
      }
    )
  },

  async createLeadFollowUp(leadId: string, value: string, dueAt: string): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.post<LeadFollowUpResponse>('/lead-followups', {
      leadId,
      value,
      dueAt
    })

    return data
  },

  async completeLeadFollowUp(followUpId: string): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.patch<LeadFollowUpResponse>(
      `/lead-followups/${followUpId}/complete`
    )
    return data
  },

  async deleteLeadFollowUp(followUpId: string): Promise<void> {
    await appApiClient.delete(`/lead-followups/${followUpId}`)
  },

  async updateLeadFollowUp(
    followUpId: string,
    value: string,
    dueAt: string
  ): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.patch<LeadFollowUpResponse>(`/lead-followups/${followUpId}`, {
      value,
      dueAt
    })
    return data
  },

  async updateLeadFollowUpStatus(
    followUpId: string,
    status: LeadFollowUpStatus
  ): Promise<LeadFollowUpResponse> {
    const { data } = await appApiClient.patch<LeadFollowUpResponse>(`/lead-followups/${followUpId}`, {
      status
    })
    return data
  },

  async sendMessage(leadId: string, content: string): Promise<void> {
    await appApiClient.post(`/leads/${leadId}/messages`, { content })
  },

  async updateLeadRuntimeMode(
    leadId: string,
    runtimeMode: LeadRuntimeMode
  ): Promise<LeadRuntimeMode> {
    const { data } = await appApiClient.patch<LeadResponse>(
      `/leads/${leadId}/runtime-mode`,
      { runtimeMode }
    )
    return data.runtimeMode
  },

  async loadNegotiations(): Promise<NegotiationResponse[]> {
    const { data } = await appApiClient.get<NegotiationResponse[]>('/negotiations')
    return data ?? []
  },

  async createNegotiation(payload: CreateNegotiationPayload): Promise<NegotiationResponse> {
    const { data } = await appApiClient.post<NegotiationResponse>('/negotiations', payload)
    return data
  },

  async updateNegotiation(
    negotiationId: string,
    payload: UpdateNegotiationPayload
  ): Promise<NegotiationResponse> {
    const { data } = await appApiClient.patch<NegotiationResponse>(
      `/negotiations/${negotiationId}`,
      payload
    )
    return data
  },

  async deleteNegotiation(negotiationId: string): Promise<void> {
    await appApiClient.delete(`/negotiations/${negotiationId}`)
  },

  async loadNegotiationFollowUps(): Promise<NegotiationFollowUpResponse[]> {
    const { data } = await appApiClient.get<NegotiationFollowUpResponse[]>('/followups')
    return data ?? []
  },

  async createNegotiationFollowUp(
    payload: CreateNegotiationFollowUpPayload
  ): Promise<NegotiationFollowUpResponse> {
    const { data } = await appApiClient.post<NegotiationFollowUpResponse>('/followups', payload)
    return data
  },

  async updateNegotiationFollowUp(
    followUpId: string,
    payload: {
      value?: string
      dueAt?: string
      status?: LeadFollowUpStatus
      completedAt?: string | null
    }
  ): Promise<NegotiationFollowUpResponse> {
    const { data } = await appApiClient.patch<NegotiationFollowUpResponse>(
      `/followups/${followUpId}`,
      payload
    )
    return data
  },

  async deleteNegotiationFollowUp(followUpId: string): Promise<void> {
    await appApiClient.delete(`/followups/${followUpId}`)
  },

  async loadNegotiationAttachments(
    negotiationId: string
  ): Promise<NegotiationAttachmentResponse[]> {
    const { data } = await appApiClient.get<NegotiationAttachmentResponse[]>(
      `/negotiations/${negotiationId}/attachments`
    )

    return data ?? []
  },

  async uploadNegotiationAttachment(
    negotiationId: string,
    file: File
  ): Promise<NegotiationAttachmentResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await appApiClient.post<NegotiationAttachmentResponse>(
      `/negotiations/${negotiationId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    return data
  },

  async getNegotiationAttachmentDownloadUrl(
    attachmentId: string
  ): Promise<NegotiationAttachmentDownloadUrlResponse> {
    const { data } = await appApiClient.get<NegotiationAttachmentDownloadUrlResponse>(
      `/negotiations/attachments/${attachmentId}/download`
    )

    return data
  },

  async deleteNegotiationAttachment(attachmentId: string): Promise<void> {
    await appApiClient.delete(`/negotiations/attachments/${attachmentId}`)
  }
}
