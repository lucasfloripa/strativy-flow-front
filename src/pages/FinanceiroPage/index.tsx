import {
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Tag,
  TrendingUp,
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
import { FinanceiroService } from '../../features/financeiro/services/FinanceiroService'
import type {
  FinanceiroBusinessSummaryResponse,
  FinanceiroDistributionKpisResponse,
  FinanceiroPaymentsResponse,
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
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] =
    useState<boolean>(false)
  const [activeDesktopView, setActiveDesktopView] = useState<
    'businesses' | 'costs'
  >('costs')
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
  const createdAtFrom = dateRangeFilter?.from
    ? formatDateToApi(dateRangeFilter.from)
    : undefined
  const createdAtTo = dateRangeFilter?.to
    ? formatDateToApi(dateRangeFilter.to)
    : undefined

  useEffect(() => {
    if (isMobile || activeDesktopView !== 'businesses') {
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
    if (isMobile || activeDesktopView !== 'costs') {
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

  const businessSummaryMetrics: FinanceBusinessMetric[] = [
    {
      label: 'Receita Líquida',
      value: formatCurrency(businessSummary.netRevenue),
      description: 'Valor final das vendas',
      color: '#159447',
      iconBackground: '#e8f6ed',
      icon: Banknote,
    },
    {
      label: 'Custos Totais',
      value: formatCurrency(businessSummary.totalCosts),
      description: 'Total de custos cadastrados',
      color: '#f26a16',
      iconBackground: '#fff1e7',
      icon: WalletCards,
    },
    {
      label: 'Resultado Líquido',
      value: formatCurrency(businessSummary.netResult),
      description: `Lucro sobre receita líquida: ${formatPercent(businessSummary.profitMargin)}`,
      color: '#159447',
      iconBackground: '#e8f6ed',
      icon: TrendingUp,
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
          description: `${formatCount(payments.receivedCount)} pagamentos recebidos`,
          color: '#159447',
          iconBackground: '#e8f6ed',
          icon: CheckCircle2,
        },
        {
          label: 'Pendentes',
          value: formatCurrency(payments.pendingAmount),
          description: `${formatCount(payments.pendingCount)} pagamentos pendentes`,
          color: '#1783f2',
          iconBackground: '#eaf3ff',
          icon: Clock3,
        },
        {
          label: 'Atrasados',
          value: formatCurrency(payments.overdueAmount),
          description: `${formatCount(payments.overdueCount)} pagamentos atrasados`,
          color: '#ef3434',
          iconBackground: '#fff0f0',
          icon: TriangleAlert,
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
                { key: 'businesses', label: 'Negócios' },
                { key: 'costs', label: 'App' },
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

      {!isMobile && activeDesktopView === 'businesses' ? (
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {businessSummaryMetrics.map((metric) => {
              const MetricIcon = metric.icon

              return (
                <article
                  key={metric.label}
                  style={{
                    minHeight: 116,
                    display: 'grid',
                    gridTemplateColumns: '42px minmax(0, 1fr)',
                    alignItems: 'center',
                    gap: 16,
                    padding: '18px 20px',
                    border: '1px solid #edf0f3',
                    borderRadius: 8,
                    background: '#ffffff',
                    boxShadow: '0 5px 16px rgba(15, 23, 42, 0.035)',
                    boxSizing: 'border-box',
                  }}
                >
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
                        fontSize: 20,
                        lineHeight: 1,
                      }}
                    >
                      {metric.value}
                    </strong>
                    {metric.description ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '3px 12px',
                          marginTop: 10,
                          color: '#64748b',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {metric.description.split('  |  ').map((detail) => (
                          <span key={detail}>{detail}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>

          {businessSections.map((section) => {
            const SectionIcon = section.icon

            return (
              <section
                key={section.title}
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

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#718096',
              fontSize: 11,
              fontWeight: 600,
              paddingBottom: 4,
            }}
          >
            Os valores apresentados consideram o período selecionado.
          </span>
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
