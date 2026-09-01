import { appApiClient } from '../../../core/api/appApiClient'
import type {
  FinanceiroBusinessSummaryResponse,
  FinanceiroPaymentsResponse,
  FinanceiroRevenueResponse,
  FinanceiroTemplateCostsResponse,
} from '../types/financeiro.types'

type LoadFinanceiroParams = {
  createdAtFrom?: string
  createdAtTo?: string
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
