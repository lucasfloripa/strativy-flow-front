export type FinanceiroTopKpisResponse = {
  receitaPrevista: number
  receitaFaturada: number
  receitaPerdida: number
  ticketMedio: number
  taxaConversao: number
  negociosEmAberto: number
}

export type FinanceiroTemplateCostType = 'MARKETING' | 'UTILITY' | 'UNKNOWN'

export type FinanceiroTemplateCostsResponse = {
  totalTemplates: number
  totalCost: number
  types: Array<{
    type: FinanceiroTemplateCostType
    label: string
    quantity: number
    unitCost: number
    totalCost: number
  }>
}

export type FinanceiroStageKey =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'

export type FinanceiroDistributionKpisResponse = {
  temperatura: {
    hot: number
    warm: number
    cold: number
    none: number
  }
  status: {
    open: number
    won: number
    lost: number
  }
  origem: {
    whatsapp: number
    metaads: number
    googleads: number
    indicacao: number
    other: number
  }
  etapas: Array<{
    stage: FinanceiroStageKey
    count: number
    totalValue: number
  }>
}
