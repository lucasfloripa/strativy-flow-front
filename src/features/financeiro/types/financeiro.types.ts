export type FinanceiroTopKpisResponse = {
  receitaPrevista: number
  receitaFaturada: number
  receitaPerdida: number
  ticketMedio: number
  taxaConversao: number
  negociosEmAberto: number
}

export type FinanceiroBusinessSummaryResponse = {
  netRevenue: number
  totalCosts: number
  netResult: number
  profitMargin: number
}

export type FinanceiroRevenueResponse = {
  grossRevenue: number
  totalDiscounts: number
  netRevenue: number
}

export type FinanceiroPaymentsResponse = {
  receivedAmount: number
  receivedCount: number
  pendingAmount: number
  pendingCount: number
  overdueAmount: number
  overdueCount: number
}

export type FinanceiroPaymentMethod =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'OTHER'

export type FinanceiroPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELED'

export type FinanceiroPaymentListItem = {
  id: string
  leadId: string
  leadName: string
  negotiationId: string
  negotiationTitle: string
  paymentMethod: FinanceiroPaymentMethod
  installmentNumber: number
  totalInstallments: number
  dueDate: string
  amount: number
  status: FinanceiroPaymentStatus
}

export type FinanceiroPaymentListResponse = {
  items: FinanceiroPaymentListItem[]
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
