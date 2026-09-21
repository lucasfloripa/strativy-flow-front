import { appApiClient } from '../../../core/api/appApiClient'
import type {
  FinanceiroBusinessSummaryResponse,
  FinanceiroPaymentListResponse,
  FinanceiroPaymentStatus,
  FinanceiroPaymentsResponse,
  FinanceiroRevenueResponse,
  FinanceiroTemplateCostsResponse,
} from '../types/financeiro.types'

type LoadFinanceiroParams = {
  createdAtFrom?: string
  createdAtTo?: string
  leadId?: string
}

type LoadFinanceiroPaymentsParams = {
  dueDateFrom?: string
  dueDateTo?: string
}

export const FinanceiroService = {
  async loadBusinessSummary(
    params?: LoadFinanceiroParams,
  ): Promise<FinanceiroBusinessSummaryResponse> {
    const { data } = await appApiClient.get<FinanceiroBusinessSummaryResponse>(
      '/financeiro/negocios/resumo',
      { params },
    )

    return data
  },

  async loadRevenue(
    params?: LoadFinanceiroParams,
  ): Promise<FinanceiroRevenueResponse> {
    const { data } = await appApiClient.get<FinanceiroRevenueResponse>(
      '/financeiro/negocios/receita',
      { params },
    )

    return data
  },

  async loadPayments(
    params?: LoadFinanceiroParams,
  ): Promise<FinanceiroPaymentsResponse> {
    const { data } = await appApiClient.get<FinanceiroPaymentsResponse>(
      '/financeiro/negocios/pagamentos',
      { params },
    )

    return data
  },

  async loadPaymentList(
    params?: LoadFinanceiroPaymentsParams,
  ): Promise<FinanceiroPaymentListResponse> {
    const { data } = await appApiClient.get<FinanceiroPaymentListResponse>(
      '/financeiro/pagamentos',
      { params },
    )

    return data
  },

  async updatePaymentStatus(
    negotiationId: string,
    paymentId: string,
    status: Extract<FinanceiroPaymentStatus, 'PAID' | 'CANCELED'>,
  ): Promise<void> {
    await appApiClient.patch(
      `/negotiations/${negotiationId}/financial/payments/${paymentId}`,
      {
        status,
        paidAt: status === 'PAID' ? new Date().toISOString() : null,
      },
    )
  },

  async loadTemplateCosts(
    params?: LoadFinanceiroParams,
  ): Promise<FinanceiroTemplateCostsResponse> {
    const { data } = await appApiClient.get<FinanceiroTemplateCostsResponse>(
      '/financeiro/custos-templates',
      {
        params,
      },
    )

    return data
  },
}
