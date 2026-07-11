import { appApiClient } from '../../../core/api/appApiClient'
import type { Lead } from '../types/leads.types'

export const LeadsService = {
  async getLeads(): Promise<Lead[]> {
    const { data } = await appApiClient.get<Lead[]>('/leads')
    return data
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

  async deleteLead(leadId: string): Promise<void> {
    await appApiClient.delete(`/leads/${leadId}`)
  }
}
