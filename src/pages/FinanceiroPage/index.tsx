import {
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ListFilter,
  Tag,
  TriangleAlert,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'

import 'react-day-picker/style.css'

import { interactionTheme } from '../../app/theme/brandTheme'
import { DesktopTableSkeleton } from '../../core/components/DesktopTableSkeleton'
import { MobileListSkeleton } from '../../core/components/MobileListSkeleton'
import { TotalCount } from '../../core/components/TotalCount'
import { formatDate } from '../../core/utils/dateTime'
import { FinanceiroService } from '../../features/financeiro/services/FinanceiroService'
import type {
  FinanceiroBusinessSummaryResponse,
  FinanceiroDistributionKpisResponse,
  FinanceiroPaymentListItem,
  FinanceiroPaymentMethod,
  FinanceiroPaymentsResponse,
  FinanceiroPaymentStatus,
  FinanceiroRevenueResponse,
  FinanceiroStageKey,
  FinanceiroTemplateCostsResponse,
  FinanceiroTopKpisResponse,
} from '../../features/financeiro/types/financeiro.types'

const defaultFinanceTopSummary: FinanceiroTopKpisResponse = {
  receitaPrevista: 0,
  receitaFaturada: 0,
  receitaPerdida: 0,
  ticketMedio: 0,
  taxaConversao: 0,
  negociosEmAberto: 0,
}

const defaultTemplateCosts: FinanceiroTemplateCostsResponse = {
  totalTemplates: 0,
  totalCost: 0,
  types: [
    {
      type: 'MARKETING',
      label: 'Marketing',
      quantity: 0,
      unitCost: 0.3,
      totalCost: 0,
    },
    {
      type: 'UTILITY',
      label: 'Utilitário',
      quantity: 0,
      unitCost: 0.04,
      totalCost: 0,
    },
    {
      type: 'UNKNOWN',
      label: 'Não identificado',
      quantity: 0,
      unitCost: 0,
      totalCost: 0,
    },
  ],
}

type FinanceBusinessMetric = {
  label: string
  value: string
  description?: string
  color: string
  iconBackground: string
  icon: LucideIcon
}

const defaultBusinessSummary: FinanceiroBusinessSummaryResponse = {
  netRevenue: 0,
  totalCosts: 0,
  netResult: 0,
  profitMargin: 0,
}

const defaultRevenue: FinanceiroRevenueResponse = {
  grossRevenue: 0,
  totalDiscounts: 0,
  netRevenue: 0,
}

const defaultPayments: FinanceiroPaymentsResponse = {
  receivedAmount: 0,
  receivedCount: 0,
  pendingAmount: 0,
  pendingCount: 0,
  overdueAmount: 0,
  overdueCount: 0,
}

const paymentMethodLabels: Record<FinanceiroPaymentMethod, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  OTHER: 'Outro',
}

const paymentStatusPresentation: Record<
  FinanceiroPaymentStatus,
  { label: string; color: string; background: string }
> = {
  PENDING: { label: 'Pendente', color: '#b45309', background: '#fef3c7' },
  PAID: { label: 'Pago', color: '#166534', background: '#dcfce7' },
  OVERDUE: { label: 'Atrasado', color: '#b91c1c', background: '#fee2e2' },
  CANCELED: { label: 'Cancelado', color: '#475569', background: '#e2e8f0' },
}

type PaymentSortKey =
  | 'leadName'
  | 'negotiationTitle'
  | 'paymentMethod'
  | 'dueDate'
  | 'amount'
  | 'status'
type PaymentSortDirection = 'asc' | 'desc'
type PaymentFilterSection = 'status' | 'paymentMethod'

const paymentMethodSortOrder: FinanceiroPaymentMethod[] = [
  'PIX',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'OTHER',
]

const paymentStatusSortOrder: FinanceiroPaymentStatus[] = [
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELED',
]

const paymentTableColumns: Array<{
  label: string
  width: string
  sortKey?: PaymentSortKey
  align?: 'left' | 'right'
}> = [
  { label: 'Lead', width: '19%', sortKey: 'leadName' },
  { label: 'Negócio', width: '21%', sortKey: 'negotiationTitle' },
  { label: 'Tipo', width: '15%', sortKey: 'paymentMethod' },
  { label: 'Parcela', width: '10%' },
  { label: 'Vencimento', width: '13%', sortKey: 'dueDate' },
  { label: 'Valor', width: '12%', sortKey: 'amount', align: 'right' },
  { label: 'Status', width: '10%', sortKey: 'status', align: 'right' },
]

const getPaymentFilterOptionStyle = (isSelected: boolean) => ({
  width: '100%',
  border: '1px solid transparent',
  background: isSelected ? '#f3f4f6' : 'transparent',
  color: '#111827',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.05,
  padding: '7px 10px',
  borderRadius: 8,
  textAlign: 'left' as const,
  cursor: 'pointer',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
})

const getPaymentFilterGroupButtonStyle = (isSelected: boolean) => ({
  ...getPaymentFilterOptionStyle(isSelected),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
})

type EditablePaymentStatus = Extract<
  FinanceiroPaymentStatus,
  'PAID' | 'CANCELED'
>

const PaymentStatusTag = ({
  disabled,
  onChange,
  status,
}: {
  disabled: boolean
  onChange: (status: EditablePaymentStatus) => void
  status: FinanceiroPaymentStatus
}) => {
  const presentation = paymentStatusPresentation[status]
  const availableStatuses: FinanceiroPaymentStatus[] = [
    status,
    ...(['PAID', 'CANCELED'] as const).filter(
      (availableStatus) => availableStatus !== status,
    ),
  ]

  return (
    <span
      style={{
        position: 'relative',
        minWidth: 78,
        padding: '7px 12px',
        border: `1px solid ${presentation.color}`,
        borderRadius: 6,
        background: presentation.background,
        color: presentation.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        boxSizing: 'border-box',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <span aria-hidden="true">{presentation.label}</span>
      <select
        aria-label="Alterar status do pagamento"
        value={status}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as EditablePaymentStatus)
        }
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'wait' : 'pointer',
          appearance: 'none',
          opacity: 0,
        }}
      >
        {availableStatuses.map((availableStatus) => (
          <option key={availableStatus} value={availableStatus}>
            {paymentStatusPresentation[availableStatus].label}
          </option>
        ))}
      </select>
    </span>
  )
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatCount = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPaymentCount = (
  count: number,
  singularStatus: string,
  pluralStatus: string,
): string => {
  return count === 1
    ? `${formatCount(count)} pagamento ${singularStatus}`
    : `${formatCount(count)} pagamentos ${pluralStatus}`
}

const formatPercent = (value: number): string => {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`
}

const buildFinanceSummaryCards = (summary: FinanceiroTopKpisResponse) => {
  return [
    {
      title: 'Receita Prevista',
      value: formatCurrency(summary.receitaPrevista),
      valueColor: '#2563eb',
      tooltipText: "Valor calculado sobre negócios 'Em Aberto'",
      statusSummary: null,
      hideContent: false,
    },
    {
      title: 'Receita Faturada',
      value: formatCurrency(summary.receitaFaturada),
      valueColor: '#16a34a',
      tooltipText: "Valor calculado sobre negócios 'Ganho'",
      statusSummary: null,
      hideContent: false,
    },
    {
      title: 'Receita Perdida',
      value: formatCurrency(summary.receitaPerdida),
      valueColor: '#dc2626',
      tooltipText: "Valor calculado sobre negócios 'Perdido'",
      statusSummary: null,
      hideContent: false,
    },
    {
      title: 'Negócios em aberto',
      value: formatCount(summary.negociosEmAberto),
      valueColor: '#eab308',
      statusSummary: null,
      hideContent: false,
      metricSummary: {
        title: 'Ticket Médio',
        value: formatCurrency(summary.ticketMedio),
        valueColor: '#16a34a',
        tooltipText: "Media de valor dos negócios 'Ganho'",
      },
    },
    {
      title: 'Taxa de Conversão',
      value: formatPercent(summary.taxaConversao),
      valueColor: '#f59e0b',
      tooltipText: "Valor calculado sobre negócios 'Ganhos' e 'Perdidos'",
      statusSummary: null,
      hideContent: false,
    },
  ]
}

const defaultFinanceDistributionKpis: FinanceiroDistributionKpisResponse = {
  temperatura: {
    hot: 0,
    warm: 0,
    cold: 0,
    none: 0,
  },
  status: {
    open: 0,
    won: 0,
    lost: 0,
  },
  origem: {
    whatsapp: 0,
    metaads: 0,
    googleads: 0,
    indicacao: 0,
    other: 0,
  },
  etapas: [
    { stage: 'NEW', count: 0, totalValue: 0 },
    { stage: 'CONTACTED', count: 0, totalValue: 0 },
    { stage: 'QUALIFIED', count: 0, totalValue: 0 },
    { stage: 'PROPOSAL_SENT', count: 0, totalValue: 0 },
    { stage: 'NEGOTIATION', count: 0, totalValue: 0 },
    { stage: 'WON', count: 0, totalValue: 0 },
    { stage: 'LOST', count: 0, totalValue: 0 },
  ],
}

const stagePresentationOrder: Array<{
  stageKey: FinanceiroStageKey
  stageLabel: string
  textColor: string
  amountColor: string
  background: string
}> = [
  {
    stageKey: 'NEW',
    stageLabel: 'Novo',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #dbeafe 0%, #dbeafe 100%)',
  },
  {
    stageKey: 'CONTACTED',
    stageLabel: 'Contatado',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #e0ecff 0%, #e0ecff 100%)',
  },
  {
    stageKey: 'QUALIFIED',
    stageLabel: 'Qualificado',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #e9f2ff 0%, #e9f2ff 100%)',
  },
  {
    stageKey: 'PROPOSAL_SENT',
    stageLabel: 'Proposta Enviada',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)',
  },
  {
    stageKey: 'NEGOTIATION',
    stageLabel: 'Negociação',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #fffbeb 0%, #fefce8 100%)',
  },
  {
    stageKey: 'WON',
    stageLabel: 'Ganho',
    textColor: '#15803d',
    amountColor: '#16a34a',
    background: 'linear-gradient(90deg, #dcfce7 0%, #ecfdf5 100%)',
  },
  {
    stageKey: 'LOST',
    stageLabel: 'Perdido',
    textColor: '#dc2626',
    amountColor: '#dc2626',
    background: 'linear-gradient(90deg, #fee2e2 0%, #fef2f2 100%)',
  },
]

const funnelStageToFilterValue: Record<
  string,
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
> = {
  Novo: 'NEW',
  Contatado: 'CONTACTED',
  Qualificado: 'QUALIFIED',
  'Proposta Enviada': 'PROPOSAL_SENT',
  Negociação: 'NEGOTIATION',
  Ganho: 'WON',
  Perdido: 'LOST',
}

const buildTemperatureChartData = (
  distribution: FinanceiroDistributionKpisResponse,
) => {
  return [
    { label: 'Quente', value: distribution.temperatura.hot, color: '#dc2626' },
    { label: 'Morno', value: distribution.temperatura.warm, color: '#eab308' },
    { label: 'Frio', value: distribution.temperatura.cold, color: '#2563eb' },
    {
      label: 'Sem temperatura',
      value: distribution.temperatura.none,
      color: '#94a3b8',
    },
  ]
}

const temperatureLabelToFilterValue: Record<
  string,
  'hot' | 'warm' | 'cold' | 'none'
> = {
  Quente: 'hot',
  Morno: 'warm',
  Frio: 'cold',
  'Sem temperatura': 'none',
}

const buildBusinessStatusChartData = (
  distribution: FinanceiroDistributionKpisResponse,
) => {
  return [
    { label: 'Ganhos', value: distribution.status.won, color: '#16a34a' },
    { label: 'Perdidos', value: distribution.status.lost, color: '#dc2626' },
    { label: 'Em aberto', value: distribution.status.open, color: '#eab308' },
  ]
}

const statusLabelToFilterValue: Record<string, 'won' | 'lost' | 'open'> = {
  Ganhos: 'won',
  Perdidos: 'lost',
  'Em aberto': 'open',
}

const buildFunnelRows = (distribution: FinanceiroDistributionKpisResponse) => {
  const stageCountMap = new Map(
    distribution.etapas.map((item) => [item.stage, item]),
  )
  const maxCount = Math.max(...distribution.etapas.map((item) => item.count), 1)

  return stagePresentationOrder.map((stagePresentation) => {
    const stageKpi = stageCountMap.get(stagePresentation.stageKey)
    const count = stageKpi?.count ?? 0
    const totalValue = stageKpi?.totalValue ?? 0
    const widthValue = 50 + Math.round((count / maxCount) * 50)

    return {
      stage: stagePresentation.stageLabel,
      count: formatCount(count),
      value: formatCurrency(totalValue),
      width: `${widthValue}%`,
      textColor: stagePresentation.textColor,
      amountColor: stagePresentation.amountColor,
      background: stagePresentation.background,
    }
  })
}

const formatDateFilterLabel = (value: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value)
}

const formatDateToApi = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const formatRangeFilterLabel = (range: DateRange | undefined): string => {
  if (!range?.from && !range?.to) {
    return 'Selecionar periodo'
  }

  if (range.from && !range.to) {
    return `${formatDateFilterLabel(range.from)} - ...`
  }

  if (range.from && range.to) {
    return `${formatDateFilterLabel(range.from)} - ${formatDateFilterLabel(range.to)}`
  }

  return 'Selecionar periodo'
}

const createDefaultDateRange = (): DateRange => {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)

  return { from, to }
}

export default function FinanceiroPage() {
  const navigate = useNavigate()
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(
    () => createDefaultDateRange(),
  )
  const financeTopSummary = defaultFinanceTopSummary
  const financeDistributionKpis = defaultFinanceDistributionKpis
  const [templateCosts, setTemplateCosts] =
    useState<FinanceiroTemplateCostsResponse>(defaultTemplateCosts)
  const [businessSummary, setBusinessSummary] =
    useState<FinanceiroBusinessSummaryResponse>(defaultBusinessSummary)
  const [revenue, setRevenue] =
    useState<FinanceiroRevenueResponse>(defaultRevenue)
  const [payments, setPayments] =
    useState<FinanceiroPaymentsResponse>(defaultPayments)
  const [paymentItems, setPaymentItems] = useState<FinanceiroPaymentListItem[]>(
    [],
  )
  const [paymentSortKey, setPaymentSortKey] =
    useState<PaymentSortKey>('dueDate')
  const [paymentSortDirection, setPaymentSortDirection] =
    useState<PaymentSortDirection>('asc')
  const [paymentMethodSortFocus, setPaymentMethodSortFocus] =
    useState<FinanceiroPaymentMethod>('PIX')
  const [paymentStatusSortFocus, setPaymentStatusSortFocus] =
    useState<FinanceiroPaymentStatus>('PENDING')
  const [selectedPaymentStatusFilters, setSelectedPaymentStatusFilters] =
    useState<FinanceiroPaymentStatus[]>([])
  const [selectedPaymentMethodFilters, setSelectedPaymentMethodFilters] =
    useState<FinanceiroPaymentMethod[]>([])
  const [isPaymentFiltersPanelOpen, setIsPaymentFiltersPanelOpen] =
    useState(false)
  const [expandedPaymentFilterSection, setExpandedPaymentFilterSection] =
    useState<PaymentFilterSection | null>(null)
  const [hoveredPaymentFilterOption, setHoveredPaymentFilterOption] =
    useState<PaymentFilterSection | null>(null)
  const [isPaymentListLoading, setIsPaymentListLoading] = useState(false)
  const [updatingPaymentStatusId, setUpdatingPaymentStatusId] = useState<
    string | null
  >(null)
  const [paymentStatusUpdateError, setPaymentStatusUpdateError] = useState<
    string | null
  >(null)
  const [paymentListError, setPaymentListError] = useState<string | null>(null)
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] =
    useState<boolean>(false)
  const [activeDesktopView, setActiveDesktopView] = useState<
    'general' | 'businesses' | 'costs' | 'payments'
  >('general')
  const [visibleSummaryTooltip, setVisibleSummaryTooltip] = useState<
    string | null
  >(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  )
  const [hoveredSummaryCardTitle, setHoveredSummaryCardTitle] = useState<
    string | null
  >(null)
  const [hoveredTemperatureLegendItem, setHoveredTemperatureLegendItem] =
    useState<string | null>(null)
  const [hoveredStatusLegendItem, setHoveredStatusLegendItem] = useState<
    string | null
  >(null)
  const [hoveredFunnelStage, setHoveredFunnelStage] = useState<string | null>(
    null,
  )
  const dateRangePickerRef = useRef<HTMLDivElement | null>(null)
  const paymentFiltersRef = useRef<HTMLDivElement | null>(null)
  const createdAtFrom = dateRangeFilter?.from
    ? formatDateToApi(dateRangeFilter.from)
    : undefined
  const createdAtTo = dateRangeFilter?.to
    ? formatDateToApi(dateRangeFilter.to)
    : undefined

  useEffect(() => {
    if (isMobile || activeDesktopView !== 'general') {
      return
    }

    let isMounted = true
    const params = { createdAtFrom, createdAtTo }

    void Promise.all([
      FinanceiroService.loadBusinessSummary(params),
      FinanceiroService.loadRevenue(params),
      FinanceiroService.loadPayments(params),
    ])
      .then(([nextBusinessSummary, nextRevenue, nextPayments]) => {
        if (!isMounted) return

        setBusinessSummary(nextBusinessSummary)
        setRevenue(nextRevenue)
        setPayments(nextPayments)
      })
      .catch(() => {
        if (!isMounted) return

        setBusinessSummary(defaultBusinessSummary)
        setRevenue(defaultRevenue)
        setPayments(defaultPayments)
      })

    return () => {
      isMounted = false
    }
  }, [activeDesktopView, createdAtFrom, createdAtTo, isMobile])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isPaymentFiltersPanelOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (paymentFiltersRef.current?.contains(event.target as Node)) return

      setIsPaymentFiltersPanelOpen(false)
      setExpandedPaymentFilterSection(null)
      setHoveredPaymentFilterOption(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isPaymentFiltersPanelOpen])

  useEffect(() => {
    if (activeDesktopView === 'payments') return

    setIsPaymentFiltersPanelOpen(false)
    setExpandedPaymentFilterSection(null)
  }, [activeDesktopView])

  useEffect(() => {
    if (
      isMobile ||
      (activeDesktopView !== 'general' && activeDesktopView !== 'costs')
    ) {
      return
    }

    let isMounted = true

    void FinanceiroService.loadTemplateCosts({
      createdAtFrom,
      createdAtTo,
    })
      .then((costs) => {
        if (isMounted) setTemplateCosts(costs)
      })
      .catch(() => {
        if (isMounted) setTemplateCosts(defaultTemplateCosts)
      })

    return () => {
      isMounted = false
    }
  }, [activeDesktopView, createdAtFrom, createdAtTo, isMobile])

  useEffect(() => {
    if (activeDesktopView !== 'payments') {
      return
    }

    let isMounted = true
    setIsPaymentListLoading(true)
    setPaymentListError(null)

    void FinanceiroService.loadPaymentList({
      dueDateFrom: createdAtFrom,
      dueDateTo: createdAtTo,
    })
      .then((response) => {
        if (isMounted) {
          setPaymentItems(response.items)
        }
      })
      .catch(() => {
        if (isMounted) {
          setPaymentItems([])
          setPaymentListError('Não foi possível carregar os pagamentos.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsPaymentListLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeDesktopView, createdAtFrom, createdAtTo])

  const businessSummaryMetrics: FinanceBusinessMetric[] = [
    {
      label: 'Vendido',
      value: formatCurrency(businessSummary.netRevenue),
      description: 'Valor final das vendas',
      color: '#159447',
      iconBackground: '#e8f6ed',
      icon: Banknote,
    },
    {
      label: 'Recebido',
      value: formatCurrency(payments.receivedAmount),
      description: formatPaymentCount(
        payments.receivedCount,
        'recebido',
        'recebidos',
      ),
      color: '#159447',
      iconBackground: '#e8f6ed',
      icon: CheckCircle2,
    },
    {
      label: 'A Receber',
      value: formatCurrency(payments.pendingAmount),
      description: formatPaymentCount(
        payments.pendingCount,
        'pendente',
        'pendentes',
      ),
      color: '#1783f2',
      iconBackground: '#eaf3ff',
      icon: Clock3,
    },
  ]

  const businessSections: Array<{
    title: string
    color: string
    icon: LucideIcon
    metrics: FinanceBusinessMetric[]
  }> = [
    {
      title: 'Receita',
      color: '#16834b',
      icon: BadgeDollarSign,
      metrics: [
        {
          label: 'Receita Bruta',
          value: formatCurrency(revenue.grossRevenue),
          description: 'Valor total de todos os negócios',
          color: '#1783f2',
          iconBackground: '#eaf3ff',
          icon: WalletCards,
        },
        {
          label: 'Descontos',
          value: `-${formatCurrency(revenue.totalDiscounts)}`,
          description: 'Total de descontos concedidos',
          color: '#ef3434',
          iconBackground: '#fff0f0',
          icon: Tag,
        },
        {
          label: 'Receita Líquida',
          value: formatCurrency(revenue.netRevenue),
          description: 'Valor final das vendas',
          color: '#159447',
          iconBackground: '#e8f6ed',
          icon: Banknote,
        },
      ],
    },
    {
      title: 'Pagamentos',
      color: '#7545b8',
      icon: WalletCards,
      metrics: [
        {
          label: 'Recebidos',
          value: formatCurrency(payments.receivedAmount),
          description: formatPaymentCount(
            payments.receivedCount,
            'recebido',
            'recebidos',
          ),
          color: '#159447',
          iconBackground: '#e8f6ed',
          icon: CheckCircle2,
        },
        {
          label: 'Pendentes',
          value: formatCurrency(payments.pendingAmount),
          description: formatPaymentCount(
            payments.pendingCount,
            'pendente',
            'pendentes',
          ),
          color: '#1783f2',
          iconBackground: '#eaf3ff',
          icon: Clock3,
        },
        {
          label: 'Atrasados',
          value: formatCurrency(payments.overdueAmount),
          description: formatPaymentCount(
            payments.overdueCount,
            'atrasado',
            'atrasados',
          ),
          color: '#ef3434',
          iconBackground: '#fff0f0',
          icon: TriangleAlert,
        },
      ],
    },
    {
      title: 'Custos',
      color: '#ef3434',
      icon: WalletCards,
      metrics: [
        {
          label: 'Custos dos negócios',
          value: formatCurrency(businessSummary.totalCosts),
          description: 'Custos cadastrados em todos os negócios',
          color: '#ef3434',
          iconBackground: '#fff0f0',
          icon: WalletCards,
        },
        {
          label: 'Custos do app',
          value: formatCurrency(templateCosts.totalCost),
          description:
            templateCosts.totalTemplates === 1
              ? '1 mensagem enviada'
              : `${formatCount(templateCosts.totalTemplates)} mensagens enviadas`,
          color: '#ef3434',
          iconBackground: '#fff0f0',
          icon: BadgeDollarSign,
        },
      ],
    },
  ]

  const financeSummaryCards = buildFinanceSummaryCards(financeTopSummary)
  const temperatureChartData = buildTemperatureChartData(
    financeDistributionKpis,
  )
  const temperatureChartTotal = temperatureChartData.reduce(
    (total, item) => total + item.value,
    0,
  )
  const businessStatusChartData = buildBusinessStatusChartData(
    financeDistributionKpis,
  )
  const businessStatusChartTotal = businessStatusChartData.reduce(
    (total, item) => total + item.value,
    0,
  )
  const funnelRows = buildFunnelRows(financeDistributionKpis)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dateRangePickerRef.current) {
        return
      }

      if (dateRangePickerRef.current.contains(event.target as Node)) {
        return
      }

      setIsDateRangePickerOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const isSummaryCardInteractive = (title: string): boolean => {
    return (
      title === 'Receita Prevista' ||
      title === 'Receita Faturada' ||
      title === 'Receita Perdida'
    )
  }

  const filteredPaymentItems = paymentItems.filter((payment) => {
    const matchesStatus =
      selectedPaymentStatusFilters.length === 0 ||
      selectedPaymentStatusFilters.includes(payment.status)
    const matchesMethod =
      selectedPaymentMethodFilters.length === 0 ||
      selectedPaymentMethodFilters.includes(payment.paymentMethod)

    return matchesStatus && matchesMethod
  })

  const sortedPaymentItems = [...filteredPaymentItems].sort(
    (firstPayment, secondPayment) => {
      let comparison = 0

      if (paymentSortKey === 'amount') {
        comparison = firstPayment.amount - secondPayment.amount
      } else if (paymentSortKey === 'dueDate') {
        comparison =
          new Date(firstPayment.dueDate).getTime() -
          new Date(secondPayment.dueDate).getTime()
      } else if (paymentSortKey === 'paymentMethod') {
        const focusedMethodIndex = paymentMethodSortOrder.indexOf(
          paymentMethodSortFocus,
        )
        const firstMethodRank =
          (paymentMethodSortOrder.indexOf(firstPayment.paymentMethod) -
            focusedMethodIndex +
            paymentMethodSortOrder.length) %
          paymentMethodSortOrder.length
        const secondMethodRank =
          (paymentMethodSortOrder.indexOf(secondPayment.paymentMethod) -
            focusedMethodIndex +
            paymentMethodSortOrder.length) %
          paymentMethodSortOrder.length

        comparison = firstMethodRank - secondMethodRank
      } else if (paymentSortKey === 'status') {
        const focusedStatusIndex = paymentStatusSortOrder.indexOf(
          paymentStatusSortFocus,
        )
        const firstStatusRank =
          (paymentStatusSortOrder.indexOf(firstPayment.status) -
            focusedStatusIndex +
            paymentStatusSortOrder.length) %
          paymentStatusSortOrder.length
        const secondStatusRank =
          (paymentStatusSortOrder.indexOf(secondPayment.status) -
            focusedStatusIndex +
            paymentStatusSortOrder.length) %
          paymentStatusSortOrder.length

        comparison = firstStatusRank - secondStatusRank
      } else {
        comparison = firstPayment[paymentSortKey].localeCompare(
          secondPayment[paymentSortKey],
          'pt-BR',
          { sensitivity: 'base' },
        )
      }

      return paymentSortDirection === 'asc' ? comparison : -comparison
    },
  )

  const handlePaymentSortToggle = (nextSortKey: PaymentSortKey) => {
    if (nextSortKey === 'paymentMethod') {
      if (paymentSortKey !== 'paymentMethod') {
        setPaymentSortKey('paymentMethod')
        setPaymentMethodSortFocus('PIX')
        return
      }

      setPaymentMethodSortFocus((currentMethod) => {
        const currentIndex = paymentMethodSortOrder.indexOf(currentMethod)
        return paymentMethodSortOrder[
          (currentIndex + 1) % paymentMethodSortOrder.length
        ]
      })
      return
    }

    if (nextSortKey === 'status') {
      if (paymentSortKey !== 'status') {
        setPaymentSortKey('status')
        setPaymentStatusSortFocus('PENDING')
        return
      }

      setPaymentStatusSortFocus((currentStatus) => {
        const currentIndex = paymentStatusSortOrder.indexOf(currentStatus)
        return paymentStatusSortOrder[
          (currentIndex + 1) % paymentStatusSortOrder.length
        ]
      })
      return
    }

    if (paymentSortKey === nextSortKey) {
      setPaymentSortDirection((currentDirection) =>
        currentDirection === 'asc' ? 'desc' : 'asc',
      )
      return
    }

    setPaymentSortKey(nextSortKey)
    setPaymentSortDirection('asc')
  }

  const getPaymentSortIndicator = (targetSortKey: PaymentSortKey): string => {
    if (paymentSortKey !== targetSortKey) {
      return '↕'
    }

    if (targetSortKey === 'paymentMethod') {
      return paymentMethodLabels[paymentMethodSortFocus]
    }

    if (targetSortKey === 'status') {
      return paymentStatusPresentation[paymentStatusSortFocus].label
    }

    return paymentSortDirection === 'asc' ? '↑' : '↓'
  }

  const handlePaymentStatusChange = async (
    payment: FinanceiroPaymentListItem,
    status: EditablePaymentStatus,
  ) => {
    if (payment.status === status) return

    setUpdatingPaymentStatusId(payment.id)
    setPaymentStatusUpdateError(null)

    try {
      await FinanceiroService.updatePaymentStatus(
        payment.negotiationId,
        payment.id,
        status,
      )
      setPaymentItems((currentPayments) =>
        currentPayments.map((currentPayment) =>
          currentPayment.id === payment.id
            ? { ...currentPayment, status }
            : currentPayment,
        ),
      )
    } catch {
      setPaymentStatusUpdateError(
        'Não foi possível atualizar o status do pagamento.',
      )
    } finally {
      setUpdatingPaymentStatusId(null)
    }
  }

  const togglePaymentFilter = <Value extends string>(
    value: Value,
    setValues: React.Dispatch<React.SetStateAction<Value[]>>,
  ) => {
    setValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    )
  }

  const activePaymentFiltersCount =
    Number(selectedPaymentStatusFilters.length > 0) +
    Number(selectedPaymentMethodFilters.length > 0)

  const activePaymentFilterTags = [
    ...selectedPaymentStatusFilters.map((status) => ({
      key: `status-${status}`,
      label: paymentStatusPresentation[status].label,
      color: paymentStatusPresentation[status].color,
      background: paymentStatusPresentation[status].background,
      onRemove: () =>
        setSelectedPaymentStatusFilters((currentStatuses) =>
          currentStatuses.filter((currentStatus) => currentStatus !== status),
        ),
    })),
    ...selectedPaymentMethodFilters.map((method) => ({
      key: `method-${method}`,
      label: `Tipo: ${paymentMethodLabels[method]}`,
      color: '#475569',
      background: '#e2e8f0',
      onRemove: () =>
        setSelectedPaymentMethodFilters((currentMethods) =>
          currentMethods.filter((currentMethod) => currentMethod !== method),
        ),
    })),
  ]

  return (
    <section
      style={{
        height: '100%',
        minHeight: 0,
        padding: isMobile ? '24px 16px 16px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 18 : 8,
        background: '#fafbfd',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          gap: 16,
          position: 'relative',
          zIndex: 1,
          background: '#fafbfd',
          paddingBottom: 4,
        }}
      >
        <h1
          style={{
            margin: 0,
            color: '#111827',
            fontSize: isMobile ? 32 : 24,
            fontWeight: isMobile ? 800 : 700,
            lineHeight: isMobile ? 1.1 : 1.2,
          }}
        >
          Financeiro
        </h1>

        {!isMobile ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {activeDesktopView === 'payments' ? (
              <div
                ref={paymentFiltersRef}
                style={{ position: 'relative', order: 1 }}
              >
                <button
                  type="button"
                  aria-label="Abrir filtros de pagamentos"
                  onClick={() =>
                    setIsPaymentFiltersPanelOpen((current) => !current)
                  }
                  style={{
                    width: 40,
                    height: 40,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background:
                      isPaymentFiltersPanelOpen || activePaymentFiltersCount > 0
                        ? interactionTheme.clickableCardHoverBackground
                        : '#ffffff',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#111827',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <ListFilter size={16} color="#111827" />
                </button>

                {isPaymentFiltersPanelOpen ? (
                  <section
                    style={{
                      position: 'absolute',
                      top: 48,
                      right: 0,
                      width: 250,
                      background: '#fcfdff',
                      border: `1px solid ${interactionTheme.sidebarItemActiveBackground}`,
                      borderRadius: 18,
                      zIndex: 36,
                      padding: '14px 16px 12px',
                      boxSizing: 'border-box',
                      boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      {[
                        { key: 'status' as const, label: 'Status' },
                        { key: 'paymentMethod' as const, label: 'Tipo' },
                      ].map((section) => {
                        const selectedValues =
                          section.key === 'status'
                            ? selectedPaymentStatusFilters
                            : selectedPaymentMethodFilters
                        const isExpanded =
                          expandedPaymentFilterSection === section.key

                        return (
                          <div
                            key={section.key}
                            style={{ display: 'grid', gap: 6 }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPaymentFilterSection((current) =>
                                  current === section.key ? null : section.key,
                                )
                              }
                              onMouseEnter={() =>
                                setHoveredPaymentFilterOption(section.key)
                              }
                              onMouseLeave={() =>
                                setHoveredPaymentFilterOption(null)
                              }
                              style={getPaymentFilterGroupButtonStyle(
                                selectedValues.length > 0 ||
                                  isExpanded ||
                                  hoveredPaymentFilterOption === section.key,
                              )}
                            >
                              <span>{section.label}</span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <ChevronDown size={14} />
                              </span>
                            </button>

                            {isExpanded ? (
                              <div
                                style={{
                                  display: 'grid',
                                  gap: 4,
                                  paddingLeft: 8,
                                }}
                              >
                                {(section.key === 'status'
                                  ? paymentStatusSortOrder.map((status) => ({
                                      value: status,
                                      label:
                                        paymentStatusPresentation[status].label,
                                    }))
                                  : paymentMethodSortOrder.map((method) => ({
                                      value: method,
                                      label: paymentMethodLabels[method],
                                    }))
                                ).map((option) => {
                                  const isSelected = selectedValues.includes(
                                    option.value as never,
                                  )

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        if (section.key === 'status') {
                                          togglePaymentFilter(
                                            option.value as FinanceiroPaymentStatus,
                                            setSelectedPaymentStatusFilters,
                                          )
                                        } else {
                                          togglePaymentFilter(
                                            option.value as FinanceiroPaymentMethod,
                                            setSelectedPaymentMethodFilters,
                                          )
                                        }
                                      }}
                                      style={getPaymentFilterOptionStyle(
                                        isSelected,
                                      )}
                                    >
                                      {option.label}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
            <div
              ref={dateRangePickerRef}
              style={{
                width: 300,
                maxWidth: 300,
                height: 40,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                boxSizing: 'border-box',
                position: 'relative',
                order: 2,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#6b7280',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={16} />
              </span>

              <input
                type="text"
                readOnly
                value={formatRangeFilterLabel(dateRangeFilter)}
                onClick={() => setIsDateRangePickerOpen((current) => !current)}
                onFocus={() => setIsDateRangePickerOpen(true)}
                aria-label="Selecionar periodo"
                style={{
                  width: '100%',
                  border: '1px solid #f4f6fa',
                  outline: 'none',
                  background: '#fcfdff',
                  borderRadius: 6,
                  padding: '6px 8px',
                  color: dateRangeFilter?.from ? '#111827' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={() => setDateRangeFilter(undefined)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0,
                  opacity: dateRangeFilter?.from ? 1 : 0.45,
                }}
                disabled={!dateRangeFilter?.from}
              >
                Limpar
              </button>

              {isDateRangePickerOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    background: '#ffffff',
                    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
                    padding: 12,
                    zIndex: 30,
                  }}
                >
                  <DayPicker
                    mode="range"
                    selected={dateRangeFilter}
                    onSelect={setDateRangeFilter}
                    locale={undefined}
                    weekStartsOn={1}
                    showOutsideDays
                  />
                </div>
              ) : null}
            </div>

            {(
              [
                { key: 'general', label: 'Geral' },
                { key: 'businesses', label: 'Negócios' },
                { key: 'costs', label: 'App' },
                { key: 'payments', label: 'Pagamentos' },
              ] as const
            ).map((view) => {
              const isSelected = activeDesktopView === view.key

              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setActiveDesktopView(view.key)}
                  aria-pressed={isSelected}
                  style={{
                    height: 40,
                    minWidth: 82,
                    padding: '0 16px',
                    border: `1px solid ${isSelected ? interactionTheme.primaryButtonBackground : '#d1d5db'}`,
                    borderRadius: 8,
                    background: isSelected
                      ? interactionTheme.primaryButtonBackground
                      : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {view.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </header>

      {isMobile ? (
        <div
          ref={dateRangePickerRef}
          style={{
            width: '100%',
            maxWidth: '100%',
            height: 52,
            border: '1px solid #d1d5db',
            borderRadius: 14,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#6b7280',
              flexShrink: 0,
            }}
          >
            <CalendarDays size={18} />
          </span>

          <input
            type="text"
            readOnly
            value={formatRangeFilterLabel(dateRangeFilter)}
            onClick={() => setIsDateRangePickerOpen((current) => !current)}
            onFocus={() => setIsDateRangePickerOpen(true)}
            aria-label="Selecionar periodo"
            style={{
              width: '100%',
              border: '1px solid #f4f6fa',
              outline: 'none',
              background: '#fcfdff',
              borderRadius: 10,
              padding: '10px 10px',
              color: dateRangeFilter?.from ? '#111827' : '#6b7280',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="button"
            onClick={() => setDateRangeFilter(undefined)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
              opacity: dateRangeFilter?.from ? 1 : 0.45,
            }}
            disabled={!dateRangeFilter?.from}
          >
            Limpar
          </button>

          {isDateRangePickerOpen ? (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                background: '#ffffff',
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
                padding: 12,
                zIndex: 30,
              }}
            >
              <DayPicker
                mode="range"
                selected={dateRangeFilter}
                onSelect={setDateRangeFilter}
                locale={undefined}
                weekStartsOn={1}
                showOutsideDays
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <style>
        {`@media (max-width: 768px) {
          .financeiro-scroll-body {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .financeiro-scroll-body::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
        }`}
      </style>

      <div
        className="financeiro-scroll-body"
        style={{
          minHeight: 0,
          flex: 1,
          display: 'none',
          flexDirection: 'column',
          gap: 8,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'minmax(0, 1fr)'
              : 'repeat(5, minmax(0, 1fr))',
            gap: 8,
            width: '100%',
          }}
        >
          {financeSummaryCards.map((item) => (
            <article
              key={item.title}
              onMouseEnter={() => {
                if (!isSummaryCardInteractive(item.title)) {
                  return
                }

                setHoveredSummaryCardTitle(item.title)
              }}
              onMouseLeave={() => setHoveredSummaryCardTitle(null)}
              onClick={() => {
                if (item.title === 'Receita Prevista') {
                  navigate('/negocios?status=open')
                  return
                }

                if (item.title === 'Receita Faturada') {
                  navigate('/negocios?status=won')
                  return
                }

                if (item.title === 'Receita Perdida') {
                  navigate('/negocios?status=lost')
                }
              }}
              style={{
                background:
                  !isMobile &&
                  isSummaryCardInteractive(item.title) &&
                  hoveredSummaryCardTitle === item.title
                    ? interactionTheme.clickableCardHoverBackground
                    : '#fcfdff',
                border: '1px solid #f4f6fa',
                borderRadius: 12,
                boxShadow:
                  '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
                minHeight: 96,
                height: 96,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                gap: 8,
                cursor:
                  !isMobile && isSummaryCardInteractive(item.title)
                    ? 'pointer'
                    : 'default',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s ease',
              }}
            >
              {item.hideContent ? null : item.metricSummary ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: '#64748b',
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.metricSummary.title}
                    </p>

                    {item.metricSummary.tooltipText ? (
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          onMouseEnter={() =>
                            setVisibleSummaryTooltip(item.metricSummary.title)
                          }
                          onMouseLeave={() =>
                            setVisibleSummaryTooltip((current) =>
                              current === item.metricSummary.title
                                ? null
                                : current,
                            )
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: 'help',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          aria-label={`Informação sobre ${item.metricSummary.title}`}
                        ></button>

                        {visibleSummaryTooltip === item.metricSummary.title ? (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: 8,
                              background: '#1f2937',
                              color: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: 'normal',
                              maxWidth: 220,
                              zIndex: 5000,
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            {item.metricSummary.tooltipText}
                            <div
                              style={{
                                position: 'absolute',
                                left: 'auto',
                                right: 10,
                                transform: 'none',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                bottom: '100%',
                                borderBottom: '6px solid #1f2937',
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <strong
                    style={{
                      marginTop: 'auto',
                      color: item.metricSummary.valueColor,
                      fontSize: 24,
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    {item.metricSummary.value}
                  </strong>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: '#64748b',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {item.title}
                    </p>

                    {item.tooltipText ? (
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          onMouseEnter={() =>
                            setVisibleSummaryTooltip(item.title)
                          }
                          onMouseLeave={() =>
                            setVisibleSummaryTooltip((current) =>
                              current === item.title ? null : current,
                            )
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: 'help',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          aria-label={`Informação sobre ${item.title}`}
                        ></button>

                        {visibleSummaryTooltip === item.title ? (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: 8,
                              background: '#1f2937',
                              color: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: 'normal',
                              maxWidth: 220,
                              zIndex: 5000,
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            {item.tooltipText}
                            <div
                              style={{
                                position: 'absolute',
                                left: 'auto',
                                right: 10,
                                transform: 'none',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                bottom: '100%',
                                borderBottom: '6px solid #1f2937',
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <strong
                    style={{
                      marginTop: 'auto',
                      color: item.valueColor,
                      fontSize: 24,
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    {item.value}
                  </strong>
                </>
              )}
            </article>
          ))}
        </div>

        <div
          style={{
            display: isMobile ? 'grid' : 'none',
            gridTemplateColumns: isMobile
              ? 'minmax(0, 1fr)'
              : 'minmax(0, 6fr) minmax(0, 4fr)',
            gap: 8,
            width: '100%',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 0,
              height: '100%',
              order: isMobile ? 2 : 1,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'minmax(0, 1fr)'
                  : 'repeat(2, minmax(0, 1fr))',
                gap: 8,
                minHeight: 0,
                height: '100%',
              }}
            >
              <article
                style={{
                  background: '#fcfdff',
                  border: '1px solid #f4f6fa',
                  borderRadius: 12,
                  boxShadow:
                    '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
                  minHeight: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px 16px 14px',
                  boxSizing: 'border-box',
                  minWidth: 0,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 32 / 2,
                    fontWeight: 700,
                  }}
                >
                  Negócios por Temperatura
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, 0.9fr)',
                    alignItems: 'center',
                    gap: 20,
                    minHeight: 0,
                    flex: 1,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      minWidth: 0,
                      height: '100%',
                      minHeight: 250,
                      position: 'relative',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={temperatureChartData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {temperatureChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span
                          style={{
                            color: '#64748b',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Total
                        </span>
                        <strong
                          style={{
                            color: '#0f172a',
                            fontSize: 24,
                            lineHeight: 1,
                            fontWeight: 800,
                          }}
                        >
                          {temperatureChartTotal}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {temperatureChartData.map((item) => (
                      <div
                        key={item.label}
                        onMouseEnter={() =>
                          setHoveredTemperatureLegendItem(item.label)
                        }
                        onMouseLeave={() =>
                          setHoveredTemperatureLegendItem(null)
                        }
                        onClick={() => {
                          const temperatureFilterValue =
                            temperatureLabelToFilterValue[item.label]
                          navigate(
                            `/negocios?temperature=${temperatureFilterValue}`,
                          )
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          alignSelf: 'flex-start',
                          width: 'fit-content',
                          borderRadius: 8,
                          padding: '4px 6px',
                          cursor: isMobile ? 'default' : 'pointer',
                          background:
                            !isMobile &&
                            hoveredTemperatureLegendItem === item.label
                              ? interactionTheme.clickableCardHoverBackground
                              : 'transparent',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#0f172a',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: item.color,
                              flexShrink: 0,
                            }}
                          />
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          <span
                            style={{
                              color: '#0f172a',
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            {item.label}
                          </span>
                          <strong
                            style={{
                              color: '#334155',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {item.value} (
                            {Math.round(
                              (item.value / temperatureChartTotal) * 100,
                            )}
                            %)
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article
                style={{
                  background: '#fcfdff',
                  border: '1px solid #f4f6fa',
                  borderRadius: 12,
                  boxShadow:
                    '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
                  minHeight: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  boxSizing: 'border-box',
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 32 / 2,
                    fontWeight: 700,
                  }}
                >
                  Negócios por Status
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, 0.9fr)',
                    alignItems: 'center',
                    gap: 20,
                    minHeight: 0,
                    flex: 1,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      minWidth: 0,
                      height: '100%',
                      minHeight: 250,
                      position: 'relative',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={businessStatusChartData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {businessStatusChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span
                          style={{
                            color: '#64748b',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Total
                        </span>
                        <strong
                          style={{
                            color: '#0f172a',
                            fontSize: 24,
                            lineHeight: 1,
                            fontWeight: 800,
                          }}
                        >
                          {businessStatusChartTotal}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {businessStatusChartData.map((item) => (
                      <div
                        key={item.label}
                        onMouseEnter={() =>
                          setHoveredStatusLegendItem(item.label)
                        }
                        onMouseLeave={() => setHoveredStatusLegendItem(null)}
                        onClick={() => {
                          const statusFilterValue =
                            statusLabelToFilterValue[item.label]
                          navigate(`/negocios?status=${statusFilterValue}`)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          alignSelf: 'flex-start',
                          width: 'fit-content',
                          borderRadius: 8,
                          padding: '4px 6px',
                          cursor: isMobile ? 'default' : 'pointer',
                          background:
                            !isMobile && hoveredStatusLegendItem === item.label
                              ? interactionTheme.clickableCardHoverBackground
                              : 'transparent',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#0f172a',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: item.color,
                              flexShrink: 0,
                            }}
                          />
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          <span
                            style={{
                              color: '#0f172a',
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            {item.label}
                          </span>
                          <strong
                            style={{
                              color: '#334155',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {item.value} (
                            {Math.round(
                              (item.value / businessStatusChartTotal) * 100,
                            )}
                            %)
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
          <article
            style={{
              background: '#fcfdff',
              border: '1px solid #f4f6fa',
              borderRadius: 12,
              boxShadow:
                '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
              minHeight: 0,
              height: 'fit-content',
              padding: '16px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              gap: 10,
              order: isMobile ? 1 : 2,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 32 / 2,
                fontWeight: 700,
              }}
            >
              Negócios por Etapa
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: 0,
                flex: 1,
              }}
            >
              {funnelRows.map((item) => (
                <div
                  key={item.stage}
                  onMouseEnter={() => setHoveredFunnelStage(item.stage)}
                  onMouseLeave={() => setHoveredFunnelStage(null)}
                  onClick={() => {
                    const stageFilterValue =
                      funnelStageToFilterValue[item.stage]
                    navigate(`/negocios?stage=${stageFilterValue}`)
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 28px 86px',
                    gap: 8,
                    alignItems: 'center',
                    borderRadius: 8,
                    padding: '4px 6px',
                    cursor: isMobile ? 'default' : 'pointer',
                    background:
                      !isMobile && hoveredFunnelStage === item.stage
                        ? interactionTheme.clickableCardHoverBackground
                        : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: item.width,
                      borderRadius: 8,
                      padding: '6px 8px',
                      background: item.background,
                      color: item.textColor,
                      fontSize: 14,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      boxSizing: 'border-box',
                    }}
                  >
                    {item.stage}
                  </div>
                  <span
                    style={{
                      color: item.textColor,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'right',
                    }}
                  >
                    {item.count}
                  </span>
                  <span
                    style={{
                      color: item.amountColor,
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      {!isMobile && activeDesktopView === 'general' ? (
        <div
          className="financeiro-scroll-body"
          style={{
            minHeight: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          <section
            style={{
              border: '1px solid #edf0f3',
              borderRadius: 8,
              background: '#ffffff',
              boxShadow: '0 5px 16px rgba(15, 23, 42, 0.035)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                minHeight: 46,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 14px',
                borderBottom: '1px solid #edf0f3',
                color: '#172033',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              <BadgeDollarSign size={16} color="#16834b" />
              Valores
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                padding: '14px 0',
              }}
            >
              {businessSummaryMetrics.map((metric, index) => {
                const MetricIcon = metric.icon

                return (
                  <div
                    key={metric.label}
                    style={{
                      minHeight: 84,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 42px',
                      alignItems: 'center',
                      gap: 16,
                      padding: '4px 22px',
                      borderLeft: index === 0 ? 'none' : '1px solid #e5e7eb',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {metric.label}
                      </span>
                      <strong
                        style={{
                          display: 'block',
                          marginTop: 7,
                          color: metric.color,
                          fontSize: 20,
                          lineHeight: 1,
                        }}
                      >
                        {metric.value}
                      </strong>
                      {metric.description ? (
                        <span
                          style={{
                            display: 'block',
                            marginTop: 8,
                            color: '#64748b',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {metric.description}
                        </span>
                      ) : null}
                    </div>
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        color: metric.color,
                        background: metric.iconBackground,
                      }}
                    >
                      <MetricIcon size={22} strokeWidth={2} />
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {businessSections.map((section) => {
            const SectionIcon = section.icon

            return (
              <section
                key={section.title}
                style={{
                  width:
                    section.metrics.length === 2
                      ? 'calc(66.666667% - 4px)'
                      : '100%',
                  border: '1px solid #edf0f3',
                  borderRadius: 8,
                  background: '#ffffff',
                  boxShadow: '0 5px 16px rgba(15, 23, 42, 0.035)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 14px',
                    borderBottom: '1px solid #edf0f3',
                    color: '#172033',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  <SectionIcon size={16} color={section.color} />
                  {section.title}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${section.metrics.length}, minmax(0, 1fr))`,
                    padding: '14px 0',
                  }}
                >
                  {section.metrics.map((metric, index) => {
                    const MetricIcon = metric.icon

                    return (
                      <div
                        key={metric.label}
                        style={{
                          minHeight: 84,
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 42px',
                          alignItems: 'center',
                          gap: 16,
                          padding: '4px 22px',
                          borderLeft:
                            index === 0 ? 'none' : '1px solid #e5e7eb',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              color: '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {metric.label}
                          </span>
                          <strong
                            style={{
                              display: 'block',
                              marginTop: 8,
                              color: metric.color,
                              fontSize: 18,
                              lineHeight: 1,
                            }}
                          >
                            {metric.value}
                          </strong>
                          <span
                            style={{
                              display: 'block',
                              marginTop: 9,
                              color: '#64748b',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {metric.description}
                          </span>
                        </div>
                        <span
                          style={{
                            width: 42,
                            height: 42,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            color: metric.color,
                            background: metric.iconBackground,
                          }}
                        >
                          <MetricIcon size={22} strokeWidth={2} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}

      {!isMobile && activeDesktopView === 'businesses' ? (
        <div
          style={{
            minHeight: 0,
            flex: 1,
          }}
        />
      ) : null}

      {activeDesktopView === 'payments' ? (
        <div
          className="financeiro-scroll-body"
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: isMobile ? 'auto' : 'hidden',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activePaymentFilterTags.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 10,
                padding: '0 2px',
              }}
            >
              {activePaymentFilterTags.map((tag) => (
                <span
                  key={tag.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: tag.background,
                    color: tag.color,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  <span>{tag.label}</span>
                  <button
                    type="button"
                    aria-label={`Remover filtro ${tag.label}`}
                    onClick={tag.onRemove}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: tag.color,
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    X
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {isMobile ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {isPaymentListLoading ? <MobileListSkeleton /> : null}
              {!isPaymentListLoading && paymentListError ? (
                <div
                  style={{
                    padding: 16,
                    color: '#b91c1c',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  {paymentListError}
                </div>
              ) : null}
              {!isPaymentListLoading &&
                !paymentListError &&
                sortedPaymentItems.map((payment) => (
                  <article
                    key={payment.id}
                    style={{
                      padding: 16,
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      display: 'grid',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: 'block',
                            color: '#111827',
                            fontSize: 16,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {payment.leadName}
                        </strong>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 4,
                            color: '#64748b',
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {payment.negotiationTitle}
                        </span>
                      </div>
                      <PaymentStatusTag
                        status={payment.status}
                        disabled={updatingPaymentStatusId === payment.id}
                        onChange={(status) =>
                          void handlePaymentStatusChange(payment, status)
                        }
                      />
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 12,
                      }}
                    >
                      {[
                        {
                          label: 'Tipo',
                          value: paymentMethodLabels[payment.paymentMethod],
                        },
                        {
                          label: 'Parcela',
                          value: `${payment.installmentNumber}/${payment.totalInstallments}`,
                        },
                        {
                          label: 'Vencimento',
                          value: formatDate(payment.dueDate),
                        },
                        {
                          label: 'Valor',
                          value: formatCurrency(payment.amount),
                        },
                      ].map((detail) => (
                        <div key={detail.label} style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              color: '#64748b',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {detail.label}
                          </span>
                          <strong
                            style={{
                              display: 'block',
                              marginTop: 4,
                              color: '#334155',
                              fontSize: 13,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {detail.value}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
            </div>
          ) : (
            <div
              style={{
                minHeight: 0,
                maxHeight: '100%',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#ffffff',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr
                    style={{
                      height: 44,
                      background: '#f8fafc',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {paymentTableColumns.map((column) => (
                      <th
                        key={column.label}
                        style={{
                          width: column.width,
                          padding: '0 12px',
                          color: '#64748b',
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: column.align ?? 'left',
                        }}
                      >
                        {column.sortKey ? (
                          <button
                            type="button"
                            aria-label={`Ordenar por ${column.label}`}
                            onClick={() =>
                              handlePaymentSortToggle(column.sortKey!)
                            }
                            style={{
                              width: '100%',
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              color: '#64748b',
                              fontSize: 12,
                              fontWeight:
                                paymentSortKey === column.sortKey ? 700 : 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent:
                                column.align === 'right'
                                  ? 'flex-end'
                                  : 'flex-start',
                              gap: 6,
                            }}
                          >
                            {column.label}
                            <span style={{ fontSize: 11 }}>
                              {getPaymentSortIndicator(column.sortKey)}
                            </span>
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isPaymentListLoading ? (
                    <DesktopTableSkeleton
                      columns={[
                        { width: '72%' },
                        { width: '78%' },
                        { width: '68%' },
                        { width: '48%' },
                        { width: '66%' },
                        { width: '68%', align: 'right' },
                        { width: '72%', align: 'right' },
                      ]}
                    />
                  ) : null}
                  {!isPaymentListLoading &&
                    !paymentListError &&
                    sortedPaymentItems.map((payment) => (
                      <tr
                        key={payment.id}
                        style={{
                          height: 60,
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <td
                          style={{
                            padding: '0 12px',
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {payment.leadName}
                        </td>
                        <td
                          style={{
                            padding: '0 12px',
                            color: '#475569',
                            fontSize: 14,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {payment.negotiationTitle}
                        </td>
                        <td
                          style={{
                            padding: '0 12px',
                            color: '#475569',
                            fontSize: 14,
                          }}
                        >
                          {paymentMethodLabels[payment.paymentMethod]}
                        </td>
                        <td
                          style={{
                            padding: '0 12px',
                            color: '#475569',
                            fontSize: 14,
                          }}
                        >
                          {payment.installmentNumber}/
                          {payment.totalInstallments}
                        </td>
                        <td
                          style={{
                            padding: '0 12px',
                            color: '#475569',
                            fontSize: 14,
                          }}
                        >
                          {formatDate(payment.dueDate)}
                        </td>
                        <td
                          style={{
                            padding: '0 12px',
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 700,
                            textAlign: 'right',
                          }}
                        >
                          {formatCurrency(payment.amount)}
                        </td>
                        <td style={{ padding: '0 12px', textAlign: 'right' }}>
                          <PaymentStatusTag
                            status={payment.status}
                            disabled={updatingPaymentStatusId === payment.id}
                            onChange={(status) =>
                              void handlePaymentStatusChange(payment, status)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!isPaymentListLoading && paymentListError ? (
                <div
                  style={{
                    padding: 20,
                    color: '#b91c1c',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  {paymentListError}
                </div>
              ) : null}
              {!isPaymentListLoading &&
              !paymentListError &&
              sortedPaymentItems.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    color: '#64748b',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  Nenhum pagamento encontrado no período selecionado.
                </div>
              ) : null}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 10,
              color: '#6b7280',
              fontSize: 13,
              padding: '0 8px',
            }}
          >
            <TotalCount
              isLoading={isPaymentListLoading}
              total={sortedPaymentItems.length}
            />
          </div>
          {paymentStatusUpdateError ? (
            <span
              role="alert"
              style={{
                padding: '0 8px',
                color: '#b91c1c',
                fontSize: 12,
              }}
            >
              {paymentStatusUpdateError}
            </span>
          ) : null}
        </div>
      ) : null}

      {!isMobile && activeDesktopView === 'costs' ? (
        <div
          className="financeiro-scroll-body"
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {[
              {
                label: 'Templates enviados',
                value: formatCount(templateCosts.totalTemplates),
                color: '#2563eb',
              },
              {
                label: 'Custo total',
                value: formatCurrency(templateCosts.totalCost),
                color: '#dc2626',
              },
            ].map((summary) => (
              <article
                key={summary.label}
                style={{
                  minHeight: 112,
                  padding: '18px 20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}
                >
                  {summary.label}
                </span>
                <strong
                  style={{
                    color: summary.color,
                    fontSize: 28,
                    lineHeight: 1.1,
                  }}
                >
                  {summary.value}
                </strong>
              </article>
            ))}
          </div>

          <section
            style={{
              width: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: '#0f172a',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Custos por tipo de template
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
                Valores calculados para o período selecionado.
              </p>
            </div>

            <div
              style={{
                minHeight: 44,
                padding: '0 20px',
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 1fr) 140px 160px 160px',
                alignItems: 'center',
                gap: 16,
                color: '#64748b',
                background: '#f8fafc',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>Tipo</span>
              <span style={{ textAlign: 'right' }}>Quantidade</span>
              <span style={{ textAlign: 'right' }}>Valor unitário</span>
              <span style={{ textAlign: 'right' }}>Subtotal</span>
            </div>

            {templateCosts.types.map((templateType) => (
              <div
                key={templateType.type}
                style={{
                  minHeight: 62,
                  padding: '0 20px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1fr) 140px 160px 160px',
                  alignItems: 'center',
                  gap: 16,
                  color: '#334155',
                  fontSize: 14,
                }}
              >
                <strong style={{ color: '#0f172a' }}>
                  {templateType.label}
                </strong>
                <span style={{ textAlign: 'right' }}>
                  {formatCount(templateType.quantity)}
                </span>
                <span style={{ textAlign: 'right' }}>
                  {formatCurrency(templateType.unitCost)}
                </span>
                <strong style={{ textAlign: 'right', color: '#0f172a' }}>
                  {formatCurrency(templateType.totalCost)}
                </strong>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </section>
  )
}
