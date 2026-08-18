import { AlertCircle, CalendarDays } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'

import 'react-day-picker/style.css'

import { interactionTheme } from '../../app/theme/brandTheme'
import { FinanceiroService } from '../../features/financeiro/services/FinanceiroService'
import type {
  FinanceiroDistributionKpisResponse,
  FinanceiroStageKey,
  FinanceiroTemplateCostsResponse,
  FinanceiroTopKpisResponse
} from '../../features/financeiro/types/financeiro.types'

const defaultFinanceTopSummary: FinanceiroTopKpisResponse = {
  receitaPrevista: 0,
  receitaFaturada: 0,
  receitaPerdida: 0,
  ticketMedio: 0,
  taxaConversao: 0,
  negociosEmAberto: 0
}

const defaultTemplateCosts: FinanceiroTemplateCostsResponse = {
  totalTemplates: 0,
  totalCost: 0,
  types: [
    { type: 'MARKETING', label: 'Marketing', quantity: 0, unitCost: 0.3, totalCost: 0 },
    { type: 'UTILITY', label: 'Utilitário', quantity: 0, unitCost: 0.04, totalCost: 0 },
    { type: 'UNKNOWN', label: 'Não identificado', quantity: 0, unitCost: 0, totalCost: 0 }
  ]
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const formatCount = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0
  }).format(value)
}

const formatPercent = (value: number): string => {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
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
      hideContent: false
    },
    {
      title: 'Receita Faturada',
      value: formatCurrency(summary.receitaFaturada),
      valueColor: '#16a34a',
      tooltipText: "Valor calculado sobre negócios 'Ganho'",
      statusSummary: null,
      hideContent: false
    },
    {
      title: 'Receita Perdida',
      value: formatCurrency(summary.receitaPerdida),
      valueColor: '#dc2626',
      tooltipText: "Valor calculado sobre negócios 'Perdido'",
      statusSummary: null,
      hideContent: false
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
        tooltipText: "Media de valor dos negócios 'Ganho'"
      }
    },
    {
      title: 'Taxa de Conversão',
      value: formatPercent(summary.taxaConversao),
      valueColor: '#f59e0b',
      tooltipText: "Valor calculado sobre negócios 'Ganhos' e 'Perdidos'",
      statusSummary: null,
      hideContent: false
    }
  ]
}

const defaultFinanceDistributionKpis: FinanceiroDistributionKpisResponse = {
  temperatura: {
    hot: 0,
    warm: 0,
    cold: 0,
    none: 0
  },
  status: {
    open: 0,
    won: 0,
    lost: 0
  },
  origem: {
    whatsapp: 0,
    metaads: 0,
    googleads: 0,
    indicacao: 0,
    other: 0
  },
  etapas: [
    { stage: 'NEW', count: 0, totalValue: 0 },
    { stage: 'CONTACTED', count: 0, totalValue: 0 },
    { stage: 'QUALIFIED', count: 0, totalValue: 0 },
    { stage: 'PROPOSAL_SENT', count: 0, totalValue: 0 },
    { stage: 'NEGOTIATION', count: 0, totalValue: 0 },
    { stage: 'WON', count: 0, totalValue: 0 },
    { stage: 'LOST', count: 0, totalValue: 0 }
  ]
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
    background: 'linear-gradient(90deg, #dbeafe 0%, #dbeafe 100%)'
  },
  {
    stageKey: 'CONTACTED',
    stageLabel: 'Contatado',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #e0ecff 0%, #e0ecff 100%)'
  },
  {
    stageKey: 'QUALIFIED',
    stageLabel: 'Qualificado',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #e9f2ff 0%, #e9f2ff 100%)'
  },
  {
    stageKey: 'PROPOSAL_SENT',
    stageLabel: 'Proposta Enviada',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)'
  },
  {
    stageKey: 'NEGOTIATION',
    stageLabel: 'Negociação',
    textColor: '#0f172a',
    amountColor: '#0f172a',
    background: 'linear-gradient(90deg, #fffbeb 0%, #fefce8 100%)'
  },
  {
    stageKey: 'WON',
    stageLabel: 'Ganho',
    textColor: '#15803d',
    amountColor: '#16a34a',
    background: 'linear-gradient(90deg, #dcfce7 0%, #ecfdf5 100%)'
  },
  {
    stageKey: 'LOST',
    stageLabel: 'Perdido',
    textColor: '#dc2626',
    amountColor: '#dc2626',
    background: 'linear-gradient(90deg, #fee2e2 0%, #fef2f2 100%)'
  }
]

const funnelStageToFilterValue: Record<string, 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'WON' | 'LOST'> = {
  Novo: 'NEW',
  Contatado: 'CONTACTED',
  Qualificado: 'QUALIFIED',
  'Proposta Enviada': 'PROPOSAL_SENT',
  Negociação: 'NEGOTIATION',
  Ganho: 'WON',
  Perdido: 'LOST'
}

const buildTemperatureChartData = (distribution: FinanceiroDistributionKpisResponse) => {
  return [
    { label: 'Quente', value: distribution.temperatura.hot, color: '#dc2626' },
    { label: 'Morno', value: distribution.temperatura.warm, color: '#eab308' },
    { label: 'Frio', value: distribution.temperatura.cold, color: '#2563eb' },
    { label: 'Sem temperatura', value: distribution.temperatura.none, color: '#94a3b8' }
  ]
}

const temperatureLabelToFilterValue: Record<string, 'hot' | 'warm' | 'cold' | 'none'> = {
  Quente: 'hot',
  Morno: 'warm',
  Frio: 'cold',
  'Sem temperatura': 'none'
}

const buildBusinessStatusChartData = (distribution: FinanceiroDistributionKpisResponse) => {
  return [
    { label: 'Ganhos', value: distribution.status.won, color: '#16a34a' },
    { label: 'Perdidos', value: distribution.status.lost, color: '#dc2626' },
    { label: 'Em aberto', value: distribution.status.open, color: '#eab308' }
  ]
}

const statusLabelToFilterValue: Record<string, 'won' | 'lost' | 'open'> = {
  Ganhos: 'won',
  Perdidos: 'lost',
  'Em aberto': 'open'
}

const buildLeadSourceDistribution = (distribution: FinanceiroDistributionKpisResponse) => {
  return [
    { key: 'whatsapp', label: 'WhatsApp', value: distribution.origem.whatsapp, color: '#16a34a' },
    { key: 'metaads', label: 'Meta Ads', value: distribution.origem.metaads, color: '#2563eb' },
    { key: 'googleads', label: 'Google Ads', value: distribution.origem.googleads, color: '#f59e0b' },
    { key: 'indicacao', label: 'Indicação', value: distribution.origem.indicacao, color: '#7c3aed' },
    { key: 'other', label: 'Outros', value: distribution.origem.other, color: '#64748b' }
  ]
}

const buildFunnelRows = (distribution: FinanceiroDistributionKpisResponse) => {
  const stageCountMap = new Map(distribution.etapas.map((item) => [item.stage, item]))
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
      background: stagePresentation.background
    }
  })
}

const formatDateFilterLabel = (value: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(() => createDefaultDateRange())
  const [financeTopSummary, setFinanceTopSummary] = useState<FinanceiroTopKpisResponse>(defaultFinanceTopSummary)
  const [financeDistributionKpis, setFinanceDistributionKpis] = useState<FinanceiroDistributionKpisResponse>(defaultFinanceDistributionKpis)
  const [templateCosts, setTemplateCosts] = useState<FinanceiroTemplateCostsResponse>(defaultTemplateCosts)
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState<boolean>(false)
  const [activeDesktopView, setActiveDesktopView] = useState<'general' | 'costs'>('general')
  const [visibleSummaryTooltip, setVisibleSummaryTooltip] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))
  const [hoveredSummaryCardTitle, setHoveredSummaryCardTitle] = useState<string | null>(null)
  const [hoveredTemperatureLegendItem, setHoveredTemperatureLegendItem] = useState<string | null>(null)
  const [hoveredStatusLegendItem, setHoveredStatusLegendItem] = useState<string | null>(null)
  const [hoveredSourceLegendItem, setHoveredSourceLegendItem] = useState<string | null>(null)
  const [hoveredFunnelStage, setHoveredFunnelStage] = useState<string | null>(null)
  const dateRangePickerRef = useRef<HTMLDivElement | null>(null)
  const createdAtFrom = dateRangeFilter?.from ? formatDateToApi(dateRangeFilter.from) : undefined
  const createdAtTo = dateRangeFilter?.to ? formatDateToApi(dateRangeFilter.to) : undefined

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
    let isMounted = true

    const loadFinanceiroKpis = async () => {
      try {
        const [summary, distribution] = await Promise.all([
          FinanceiroService.loadTopKpis({
            createdAtFrom,
            createdAtTo
          }),
          FinanceiroService.loadDistributionKpis({
            createdAtFrom,
            createdAtTo
          })
        ])

        if (isMounted) {
          setFinanceTopSummary(summary)
          setFinanceDistributionKpis(distribution)
        }
      } catch {
        if (isMounted) {
          setFinanceTopSummary(defaultFinanceTopSummary)
          setFinanceDistributionKpis(defaultFinanceDistributionKpis)
        }
      }
    }

    void loadFinanceiroKpis()

    return () => {
      isMounted = false
    }
  }, [createdAtFrom, createdAtTo])

  useEffect(() => {
    if (isMobile || activeDesktopView !== 'costs') {
      return
    }

    let isMounted = true

    void FinanceiroService.loadTemplateCosts({
      createdAtFrom,
      createdAtTo
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

  const financeSummaryCards = buildFinanceSummaryCards(financeTopSummary)
  const temperatureChartData = buildTemperatureChartData(financeDistributionKpis)
  const temperatureChartTotal = temperatureChartData.reduce((total, item) => total + item.value, 0)
  const businessStatusChartData = buildBusinessStatusChartData(financeDistributionKpis)
  const businessStatusChartTotal = businessStatusChartData.reduce((total, item) => total + item.value, 0)
  const leadSourceDistribution = buildLeadSourceDistribution(financeDistributionKpis)
  const leadSourceTotal = leadSourceDistribution.reduce((total, item) => total + item.value, 0)
  const leadSourceBarData = [
    leadSourceDistribution.reduce<Record<string, number | string>>(
      (accumulator, source) => {
        accumulator[source.key] = source.value
        return accumulator
      },
      { category: 'Origens' }
    )
  ]
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
    return title === 'Receita Prevista' || title === 'Receita Faturada' || title === 'Receita Perdida'
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
        overflow: 'hidden'
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
          paddingBottom: 4
        }}
      >
        <h1 style={{ margin: 0, color: '#111827', fontSize: isMobile ? 32 : 24, fontWeight: isMobile ? 800 : 700, lineHeight: isMobile ? 1.1 : 1.2 }}>
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
                order: 2
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', color: '#6b7280', flexShrink: 0 }}>
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
                  boxSizing: 'border-box'
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
                  opacity: dateRangeFilter?.from ? 1 : 0.45
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
                    zIndex: 30
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

            {(['general', 'costs'] as const).map((view) => {
              const isSelected = activeDesktopView === view

              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveDesktopView(view)}
                  aria-pressed={isSelected}
                  style={{
                    height: 40,
                    minWidth: 82,
                    padding: '0 16px',
                    border: `1px solid ${isSelected ? '#1f46ad' : '#d1d5db'}`,
                    borderRadius: 8,
                    background: isSelected ? '#1f46ad' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {view === 'general' ? 'Geral' : 'Custos'}
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
            position: 'relative'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', color: '#6b7280', flexShrink: 0 }}>
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
              boxSizing: 'border-box'
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
              opacity: dateRangeFilter?.from ? 1 : 0.45
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
                zIndex: 30
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
          display: activeDesktopView === 'general' || isMobile ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 8,
          overflowX: 'hidden',
          overflowY: 'auto'
        }}
      >

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(5, minmax(0, 1fr))',
          gap: 8,
          width: '100%'
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
              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
              minHeight: 96,
              height: 96,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              gap: 8,
              cursor: !isMobile && isSummaryCardInteractive(item.title) ? 'pointer' : 'default',
              boxSizing: 'border-box',
              transition: 'background-color 0.2s ease'
            }}
          >
            {item.hideContent ? null : item.metricSummary ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                    {item.metricSummary.title}
                  </p>

                  {item.metricSummary.tooltipText ? (
                    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                      <button
                        type="button"
                        onMouseEnter={() => setVisibleSummaryTooltip(item.metricSummary.title)}
                        onMouseLeave={() =>
                          setVisibleSummaryTooltip((current) =>
                            current === item.metricSummary.title ? null : current
                          )
                        }
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'help',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        aria-label={`Informação sobre ${item.metricSummary.title}`}
                      >
                        <AlertCircle size={14} color="#6b7280" />
                      </button>

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
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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
                              borderBottom: '6px solid #1f2937'
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
                    fontWeight: 700
                  }}
                >
                  {item.metricSummary.value}
                </strong>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 14, fontWeight: 600 }}>{item.title}</p>

                  {item.tooltipText ? (
                    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                      <button
                        type="button"
                        onMouseEnter={() => setVisibleSummaryTooltip(item.title)}
                        onMouseLeave={() => setVisibleSummaryTooltip((current) => (current === item.title ? null : current))}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'help',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        aria-label={`Informação sobre ${item.title}`}
                      >
                        <AlertCircle size={14} color="#6b7280" />
                      </button>

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
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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
                              borderBottom: '6px solid #1f2937'
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
                    fontWeight: 700
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
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 6fr) minmax(0, 4fr)',
          gap: 8,
          width: '100%',
          alignItems: 'stretch'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 0,
            height: '100%',
            order: isMobile ? 2 : 1
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
              gap: 8,
              minHeight: 0,
              height: '100%'
            }}
          >
            <article
              style={{
                background: '#fcfdff',
                border: '1px solid #f4f6fa',
                borderRadius: 12,
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
                minHeight: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 16px 14px',
                boxSizing: 'border-box',
                minWidth: 0
              }}
            >
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: 32 / 2, fontWeight: 700 }}>Negócios por Temperatura</h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, 0.9fr)',
                  alignItems: 'center',
                  gap: 20,
                  minHeight: 0,
                  flex: 1,
                  marginTop: 8
                }}
              >
                <div style={{ width: '100%', minWidth: 0, height: '100%', minHeight: 250, position: 'relative' }}>
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
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Total</span>
                      <strong style={{ color: '#0f172a', fontSize: 24, lineHeight: 1, fontWeight: 800 }}>{temperatureChartTotal}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {temperatureChartData.map((item) => (
                    <div
                      key={item.label}
                      onMouseEnter={() => setHoveredTemperatureLegendItem(item.label)}
                      onMouseLeave={() => setHoveredTemperatureLegendItem(null)}
                      onClick={() => {
                        const temperatureFilterValue = temperatureLabelToFilterValue[item.label]
                        navigate(`/negocios?temperature=${temperatureFilterValue}`)
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
                        background: !isMobile && hoveredTemperatureLegendItem === item.label ? interactionTheme.clickableCardHoverBackground : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 14, fontWeight: 600 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                        <strong style={{ color: '#334155', fontSize: 13, fontWeight: 700 }}>
                          {item.value} ({Math.round((item.value / temperatureChartTotal) * 100)}%)
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
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
                minHeight: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                boxSizing: 'border-box',
                gap: 8,
                minWidth: 0
              }}
            >
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: 32 / 2, fontWeight: 700 }}>Negócios por Status</h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, 0.9fr)',
                  alignItems: 'center',
                  gap: 20,
                  minHeight: 0,
                  flex: 1,
                  marginTop: 8
                }}
              >
                <div style={{ width: '100%', minWidth: 0, height: '100%', minHeight: 250, position: 'relative' }}>
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
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Total</span>
                      <strong style={{ color: '#0f172a', fontSize: 24, lineHeight: 1, fontWeight: 800 }}>{businessStatusChartTotal}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {businessStatusChartData.map((item) => (
                    <div
                      key={item.label}
                      onMouseEnter={() => setHoveredStatusLegendItem(item.label)}
                      onMouseLeave={() => setHoveredStatusLegendItem(null)}
                      onClick={() => {
                        const statusFilterValue = statusLabelToFilterValue[item.label]
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
                        background: !isMobile && hoveredStatusLegendItem === item.label ? interactionTheme.clickableCardHoverBackground : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 14, fontWeight: 600 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                        <strong style={{ color: '#334155', fontSize: 13, fontWeight: 700 }}>
                          {item.value} ({Math.round((item.value / businessStatusChartTotal) * 100)}%)
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <article
            style={{
              background: '#fcfdff',
              border: '1px solid #f4f6fa',
              borderRadius: 12,
              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
              minHeight: isMobile ? 360 : 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 16px 14px',
              boxSizing: 'border-box',
              gap: 8,
              minWidth: 0
            }}
          >
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: 32 / 2, fontWeight: 700 }}>Origem dos negócios</h3>

            {isMobile ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, 0.9fr)',
                  alignItems: 'center',
                  gap: 20,
                  minHeight: 0,
                  flex: 1,
                  marginTop: 8
                }}
              >
                <div style={{ width: '100%', minWidth: 0, height: '100%', minHeight: 250, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadSourceDistribution}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {leadSourceDistribution.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
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
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Total</span>
                      <strong style={{ color: '#0f172a', fontSize: 24, lineHeight: 1, fontWeight: 800 }}>{leadSourceTotal}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {leadSourceDistribution.map((source) => (
                    <div
                      key={source.key}
                      onMouseEnter={() => setHoveredSourceLegendItem(source.key)}
                      onMouseLeave={() => setHoveredSourceLegendItem(null)}
                      onClick={() => {
                        navigate(`/negocios?source=${source.key}`)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        alignSelf: 'flex-start',
                        width: 'fit-content',
                        borderRadius: 8,
                        padding: '4px 6px',
                        cursor: 'default',
                        background: 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: source.color, flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{source.label}</span>
                        <strong style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>
                          {source.value} ({Math.round((source.value / leadSourceTotal) * 100)}%)
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={{ width: '100%', height: 64 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadSourceBarData} layout="vertical" margin={{ top: 6, right: 0, left: 0, bottom: 6 }}>
                      <XAxis type="number" hide domain={[0, leadSourceTotal]} />
                      <YAxis type="category" hide dataKey="category" />
                      {leadSourceDistribution.map((source, index) => (
                        <Bar
                          key={source.key}
                          dataKey={source.key}
                          stackId="origens"
                          fill={source.color}
                          radius={
                            index === 0
                              ? [8, 0, 0, 8]
                              : index === leadSourceDistribution.length - 1
                                ? [0, 8, 8, 0]
                                : [0, 0, 0, 0]
                          }
                          barSize={24}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                  {leadSourceDistribution.map((source) => (
                    <div
                      key={source.key}
                      onMouseEnter={() => setHoveredSourceLegendItem(source.key)}
                      onMouseLeave={() => setHoveredSourceLegendItem(null)}
                      onClick={() => {
                        navigate(`/negocios?source=${source.key}`)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        gap: 8,
                        alignSelf: 'flex-start',
                        width: 'fit-content',
                        borderRadius: 8,
                        padding: '4px 6px',
                        cursor: 'pointer',
                        background: hoveredSourceLegendItem === source.key ? interactionTheme.clickableCardHoverBackground : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: source.color, flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{source.label}</span>
                        <strong style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>
                          {source.value} ({Math.round((source.value / leadSourceTotal) * 100)}%)
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        </div>
        <article
          style={{
            background: '#fcfdff',
            border: '1px solid #f4f6fa',
            borderRadius: 12,
            boxShadow: '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)',
            minHeight: 0,
            height: 'fit-content',
            padding: '16px 16px 14px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            gap: 10,
            order: isMobile ? 1 : 2
          }}
        >
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 32 / 2, fontWeight: 700 }}>Negócios por Etapa</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: 1 }}>
            {funnelRows.map((item) => (
              <div
                key={item.stage}
                onMouseEnter={() => setHoveredFunnelStage(item.stage)}
                onMouseLeave={() => setHoveredFunnelStage(null)}
                onClick={() => {
                  const stageFilterValue = funnelStageToFilterValue[item.stage]
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
                  background: !isMobile && hoveredFunnelStage === item.stage ? interactionTheme.clickableCardHoverBackground : 'transparent',
                  transition: 'background-color 0.2s ease'
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
                    boxSizing: 'border-box'
                  }}
                >
                  {item.stage}
                </div>
                <span style={{ color: item.textColor, fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{item.count}</span>
                <span style={{ color: item.amountColor, fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      </div>

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
            gap: 16
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12
            }}
          >
            {[
              {
                label: 'Templates enviados',
                value: formatCount(templateCosts.totalTemplates),
                color: '#2563eb'
              },
              {
                label: 'Custo total',
                value: formatCurrency(templateCosts.totalCost),
                color: '#dc2626'
              }
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
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>
                  {summary.label}
                </span>
                <strong style={{ color: summary.color, fontSize: 28, lineHeight: 1.1 }}>
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
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 700 }}>
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
                fontWeight: 700
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
                  fontSize: 14
                }}
              >
                <strong style={{ color: '#0f172a' }}>{templateType.label}</strong>
                <span style={{ textAlign: 'right' }}>{formatCount(templateType.quantity)}</span>
                <span style={{ textAlign: 'right' }}>{formatCurrency(templateType.unitCost)}</span>
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