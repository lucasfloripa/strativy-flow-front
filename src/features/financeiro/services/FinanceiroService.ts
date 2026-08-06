import { appApiClient } from '../../../core/api/appApiClient'
import type {
  FinanceiroDistributionKpisResponse,
  FinanceiroTopKpisResponse
} from '../types/financeiro.types'

type LoadTopKpisParams = {
  createdAtFrom?: string
  createdAtTo?: string
}

export const FinanceiroService = {
  async loadTopKpis(params?: LoadTopKpisParams): Promise<FinanceiroTopKpisResponse> {
    const { data } = await appApiClient.get<FinanceiroTopKpisResponse>('/financeiro/kpis-topo', {
      params
    })
    return data
  },

  async loadDistributionKpis(
    params?: LoadTopKpisParams
  ): Promise<FinanceiroDistributionKpisResponse> {
    const { data } = await appApiClient.get<FinanceiroDistributionKpisResponse>(
      '/financeiro/kpis-distribuicao',
      {
        params
      }
    )

    return data
  }
}
