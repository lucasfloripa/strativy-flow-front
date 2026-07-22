import { appApiClient } from '../../../core/api/appApiClient'
import type {
  DashboardSummary,
  HomeHighlightedLead,
  UserNotification
} from '../types/home.types'

export const HomeService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await appApiClient.get<DashboardSummary>('/leads/dashboard/summary')
    return data
  },

  async getHighlightedLeads(): Promise<HomeHighlightedLead[]> {
    const { data } = await appApiClient.get<HomeHighlightedLead[]>('/leads')

    return data.filter((lead) => lead.isFavorite)
  },

  async getNotifications(): Promise<UserNotification[]> {
    const { data } = await appApiClient.get<UserNotification[]>('/notifications')

    return data
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await appApiClient.patch(`/notifications/${notificationId}/read`)
  },

  async markAllNotificationsAsRead(): Promise<void> {
    await appApiClient.patch('/notifications/read-all')
  },

  async markAllMessageNotificationsAsRead(referenceId: string): Promise<void> {
    await appApiClient.patch('/notifications/read-all', undefined, {
      params: {
        type: 'MESSAGE_RECEIVED',
        referenceId
      }
    })
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await appApiClient.delete(`/notifications/${notificationId}`)
  },

  async deleteAllMessageNotifications(referenceId: string): Promise<void> {
    await appApiClient.delete('/notifications', {
      params: {
        type: 'MESSAGE_RECEIVED',
        referenceId
      }
    })
  }
}
