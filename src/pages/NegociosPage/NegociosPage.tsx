import {
  ChevronDown,
  Flame,
  ListFilter,
  Plus,
  Snowflake,
  Sun,
  Trash2
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { getApiDateTimestamp } from '../../core/utils/dateTime'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import type {
  CreateNegotiationPayload,
  LeadStage,
  NegotiationTemperature,
  NegotiationType,
  NegotiationResponse
} from '../../features/webhook/types/webhook.types'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import LeadPage from '../LeadPage'

type NegociosLocationState = {
  initialLeadTab?: 'negocios'
  initialBusinessId?: string
  initialBusinessTab?: 'informacoes' | 'followups'
}

type BusinessCreateDraft = {
  leadId: string
  negotiationType: '' | NegotiationType
  title: string
  stage: LeadStage
  temperature: '' | NegotiationTemperature
  value: string
  notes: string
}

type TagPresentation = {
  label: string
  textColor: string
  icon?: ReactNode
}

type BusinessSortKey = 'createdAt' | 'title' | 'lead' | 'type' | 'stage' | 'status' | 'temperature' | 'value'
type BusinessSortDirection = 'asc' | 'desc'
type BusinessTypeSortFocus = 'serviceFirst' | 'productFirst' | 'noneFirst'
type BusinessStageSortFocus = LeadStage | null
type BusinessStatusSortFocus = 'open' | 'won' | 'lost' | null
type BusinessTemperatureSortFocus = 'hot' | 'warm' | 'cold' | 'none' | null
type BusinessFilterSection = 'type' | 'stage' | 'status' | 'temperature'
type BusinessTypeFilterValue = 'service' | 'product' | 'none'
type BusinessStatusFilterValue = 'open' | 'won' | 'lost'
type BusinessTemperatureFilterValue = 'hot' | 'warm' | 'cold' | 'none'

const NEGOCIOS_TABLE_ROW_HEIGHT_PX = 60

const leadStageLabelMap: Record<LeadStage, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  PROPOSAL_SENT: 'Proposta enviada',
  NEGOTIATION: 'Negociação',
  WON: 'Ganho',
  LOST: 'Perdido'
}

const getLeadStageLabel = (stage?: string | null): string => {
  if (!stage) {
    return 'Novo'
  }

  return leadStageLabelMap[stage as LeadStage] ?? stage
}

const getTemperatureTagPresentation = (temperature?: string | null): TagPresentation => {
  const normalizedTemperature = (temperature ?? '').trim().toLowerCase()

  if (normalizedTemperature === 'hot') {
    return {
      label: 'Quente',
      textColor: '#dc2626',
      icon: <Flame size={12} />
    }
  }

  if (normalizedTemperature === 'cold') {
    return {
      label: 'Frio',
      textColor: '#0ea5e9',
      icon: <Snowflake size={12} />
    }
  }

  if (normalizedTemperature === 'warm') {
    return {
      label: 'Morno',
      textColor: '#ea580c',
      icon: <Sun size={12} />
    }
  }

  return {
    label: '-',
    textColor: '#6b7280'
  }
}

const getBusinessLifecycleTagPresentation = (
  stage?: LeadStage | string | null,
  closedAt?: string | null
): { label: string; textColor: string; background: string } => {
  const isClosed = Boolean(closedAt)

  if (stage === 'WON' && isClosed) {
    return {
      label: 'Faturado',
      textColor: '#166534',
      background: '#dcfce7'
    }
  }

  if (stage === 'LOST' && isClosed) {
    return {
      label: 'Perdido',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  return {
    label: 'Em Aberto',
    textColor: '#1d4ed8',
    background: '#dbeafe'
  }
}

const normalizeNegotiationTypeValue = (value?: string | null): 'service' | 'product' | 'none' => {
  const normalizedValue = (value ?? '').trim().toLowerCase()

  if (normalizedValue === 'service') {
    return 'service'
  }

  if (normalizedValue === 'product') {
    return 'product'
  }

  return 'none'
}

const getBusinessTypeFilterLabel = (value: BusinessTypeFilterValue): string => {
  if (value === 'service') return 'Serviço'
  if (value === 'product') return 'Produto'
  return 'Sem tipo'
}

const getBusinessStageFilterLabel = (value: LeadStage): string => getLeadStageLabel(value)

const getBusinessStatusFilterLabel = (value: BusinessStatusFilterValue): string => {
  if (value === 'won') return 'Ganho'
  if (value === 'lost') return 'Perdido'
  return 'Em aberto'
}

const getBusinessTemperatureFilterLabel = (value: BusinessTemperatureFilterValue): string => {
  if (value === 'hot') return 'Quente'
  if (value === 'warm') return 'Morno'
  if (value === 'cold') return 'Frio'
  return 'Sem temperatura'
}

const rotateValues = <T extends string>(values: T[], focus: T | null): T[] => {
  if (values.length <= 1) {
    return values
  }

  const focusIndex = focus ? values.indexOf(focus) : -1

  if (focusIndex <= 0) {
    return values
  }

  return [...values.slice(focusIndex), ...values.slice(0, focusIndex)]
}

const getBusinessTypeSortRank = (
  type: string | null | undefined,
  focus: BusinessTypeSortFocus
): number => {
  const normalizedType = normalizeNegotiationTypeValue(type)

  const ranksByFocus: Record<BusinessTypeSortFocus, Record<'service' | 'product' | 'none', number>> = {
    serviceFirst: {
      service: 0,
      product: 1,
      none: 2
    },
    productFirst: {
      product: 0,
      service: 1,
      none: 2
    },
    noneFirst: {
      none: 0,
      service: 1,
      product: 2
    }
  }

  return ranksByFocus[focus][normalizedType]
}

const getBusinessStatusValue = (
  stage: LeadStage | string | null | undefined,
  closedAt: string | null | undefined
): 'open' | 'won' | 'lost' => {
  const isClosed = Boolean(closedAt)

  if (stage === 'WON' && isClosed) {
    return 'won'
  }

  if (stage === 'LOST' && isClosed) {
    return 'lost'
  }

  return 'open'
}

const normalizeStageValue = (value: string | null | undefined): LeadStage | null => {
  const normalizedValue = (value ?? '').trim().toUpperCase()

  if (
    normalizedValue === 'NEW' ||
    normalizedValue === 'CONTACTED' ||
    normalizedValue === 'QUALIFIED' ||
    normalizedValue === 'PROPOSAL_SENT' ||
    normalizedValue === 'NEGOTIATION' ||
    normalizedValue === 'WON' ||
    normalizedValue === 'LOST'
  ) {
    return normalizedValue
  }

  return null
}

const normalizeTemperatureValue = (value: string | null | undefined): 'hot' | 'warm' | 'cold' | 'none' => {
  const normalizedValue = (value ?? '').trim().toLowerCase()

  if (normalizedValue === 'hot') {
    return 'hot'
  }

  if (normalizedValue === 'warm') {
    return 'warm'
  }

  if (normalizedValue === 'cold') {
    return 'cold'
  }

  return 'none'
}

const getBusinessTemperatureValue = (value: string | null | undefined): 'hot' | 'warm' | 'cold' | 'none' => {
  return normalizeTemperatureValue(value)
}

const getFilterOptionStyle = (isSelected: boolean) => ({
  width: '100%',
  border: '1px solid transparent',
  background: isSelected ? interactionTheme.sidebarItemActiveBackground : 'transparent',
  color: isSelected ? interactionTheme.sidebarItemActiveColor : '#111827',
  fontSize: 39 / 3,
  fontWeight: 700,
  lineHeight: 1.05,
  padding: '7px 10px',
  borderRadius: 8,
  textAlign: 'left' as const,
  cursor: 'pointer'
})

const getFilterGroupButtonStyle = (isSelected: boolean) => ({
  width: '100%',
  border: '1px solid transparent',
  background: isSelected ? interactionTheme.sidebarItemActiveBackground : 'transparent',
  color: isSelected ? interactionTheme.sidebarItemActiveColor : '#111827',
  fontSize: 39 / 3,
  fontWeight: 700,
  lineHeight: 1.05,
  padding: '7px 10px',
  borderRadius: 8,
  textAlign: 'left' as const,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8
})

const toSortableNumber = (value?: string | null): number => {
  if (typeof value !== 'string') {
    return Number.POSITIVE_INFINITY
  }

  const normalizedValue = value.replace(',', '.').trim()

  if (!normalizedValue) {
    return Number.POSITIVE_INFINITY
  }

  const parsed = Number(normalizedValue)

  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY
  }

  return parsed
}

const formatLeadValue = (value?: string | null): string => {
  if (typeof value === 'undefined' || value === null) {
    return '-'
  }

  const normalizedValue = value.replace(',', '.').trim()
  if (!normalizedValue) {
    return '-'
  }

  const parsed = Number(normalizedValue)
  if (!Number.isFinite(parsed)) {
    return '-'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parsed)
}

const tagContentStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 1,
  verticalAlign: 'middle' as const
}

const tagIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginRight: 4,
  lineHeight: 0,
  verticalAlign: 'middle' as const
}

const initialBusinessCreateDraft: BusinessCreateDraft = {
  leadId: '',
  negotiationType: '',
  title: '',
  stage: 'NEW',
  temperature: '',
  value: '0,00',
  notes: ''
}

const sanitizeLeadValueInput = (value: string): string => {
  const compact = value.replace(/\s+/g, '')
  let hasComma = false
  let sanitized = ''

  for (const character of compact) {
    if (/\d/.test(character)) {
      sanitized += character
      continue
    }

    if (character === ',' && !hasComma) {
      sanitized += character
      hasComma = true
    }
  }

  return sanitized
}

const parseLeadValueInput = (value: string): string | null => {
  const normalizedInput = sanitizeLeadValueInput(value)
  if (!normalizedInput) {
    return null
  }

  const [rawIntegerPart, rawFractionPart = ''] = normalizedInput.split(',')
  const integerDigits = rawIntegerPart.replace(/\D/g, '')

  if (!integerDigits && !rawFractionPart) {
    return null
  }

  if (!rawFractionPart) {
    return String(Number(integerDigits || '0'))
  }

  const centsDigits = rawFractionPart.replace(/\D/g, '').slice(0, 2).padEnd(2, '0')

  if (centsDigits === '00') {
    return String(Number(integerDigits || '0'))
  }

  return `${Number(integerDigits || '0')}.${centsDigits}`
}

export default function NegociosPage() {
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120
  const { isMobile } = useViewportBreakpoint()

  const navigate = useNavigate()
  const location = useLocation()
  const { leadId } = useParams<{ leadId?: string }>()

  const { data: leadsData, isLoading: isLeadsLoading, error: leadsError } = useLeadsBootstrap()
  const [negocios, setNegocios] = useState<NegotiationResponse[]>([])
  const [isLoadingNegocios, setIsLoadingNegocios] = useState<boolean>(true)
  const [negociosError, setNegociosError] = useState<string | null>(null)

  const [isSearchInputFocused, setIsSearchInputFocused] = useState<boolean>(false)
  const [isFiltersButtonHovered, setIsFiltersButtonHovered] = useState<boolean>(false)
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState<boolean>(false)
  const [hoveredFilterOption, setHoveredFilterOption] = useState<BusinessFilterSection | null>(null)
  const [expandedFilterSection, setExpandedFilterSection] = useState<BusinessFilterSection | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<BusinessTypeFilterValue[]>([])
  const [selectedStageFilters, setSelectedStageFilters] = useState<LeadStage[]>([])
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<BusinessStatusFilterValue[]>([])
  const [selectedTemperatureFilters, setSelectedTemperatureFilters] = useState<BusinessTemperatureFilterValue[]>([])

  const [sortKey, setSortKey] = useState<BusinessSortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<BusinessSortDirection>('desc')
  const [typeSortFocus, setTypeSortFocus] = useState<BusinessTypeSortFocus>('serviceFirst')
  const [stageSortFocus, setStageSortFocus] = useState<BusinessStageSortFocus>(null)
  const [statusSortFocus, setStatusSortFocus] = useState<BusinessStatusSortFocus>(null)
  const [temperatureSortFocus, setTemperatureSortFocus] = useState<BusinessTemperatureSortFocus>(null)
  const [hoveredNegocioId, setHoveredNegocioId] = useState<string | null>(null)
  const [confirmingDeleteNegocioId, setConfirmingDeleteNegocioId] = useState<string | null>(null)
  const [wrappedBusinessLeadNames, setWrappedBusinessLeadNames] = useState<Record<string, boolean>>({})
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [shouldRefreshOnLeadClose, setShouldRefreshOnLeadClose] = useState<boolean>(false)
  const [negociosReloadVersion, setNegociosReloadVersion] = useState<number>(0)
  const previousIsBusinessPanelOpenRef = useRef<boolean>(false)
  const businessLeadNameRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const [businessCreateDraft, setBusinessCreateDraft] = useState<BusinessCreateDraft>(
    initialBusinessCreateDraft
  )
  const [businessCreateError, setBusinessCreateError] = useState<string | null>(null)

  const isCreateBusinessMode = location.pathname === '/negocios/new' || leadId === 'new'
  const selectedBusinessId = isCreateBusinessMode
    ? null
    : ((location.state as NegociosLocationState | null)?.initialBusinessId ?? null)
  const isBusinessPanelOpen = isCreateBusinessMode || Boolean(selectedBusinessId)  

  const activeLeads = useMemo(
    () =>
      (leadsData.leads ?? []).filter(
        (lead) => (lead.state ?? 'active').trim().toLowerCase() !== 'archived'
      ),
    [leadsData.leads]
  )

  const userLeadIdSet = useMemo(
    () => new Set((leadsData.leads ?? []).map((lead) => lead.id)),
    [leadsData.leads]
  )

  const leadNameById = useMemo(
    () =>
      new Map(
        (leadsData.leads ?? []).map((lead, index) => [
          lead.id,
          lead.name?.trim() || `Lead ${index + 1}`
        ])
      ),
    [leadsData.leads]
  )

  useEffect(() => {
    if (!isCreateBusinessMode) {
      return
    }

    setBusinessCreateError(null)
    setBusinessCreateDraft((current) => {
      const defaultLeadId = activeLeads[0]?.id ?? ''
      const hasSelectedLead = activeLeads.some((lead) => lead.id === current.leadId)
      const nextLeadId = hasSelectedLead ? current.leadId : defaultLeadId

      if (
        current.leadId === nextLeadId &&
        current.negotiationType === initialBusinessCreateDraft.negotiationType &&
        current.title === initialBusinessCreateDraft.title &&
        current.stage === initialBusinessCreateDraft.stage &&
        current.temperature === initialBusinessCreateDraft.temperature &&
        current.value === initialBusinessCreateDraft.value &&
        current.notes === initialBusinessCreateDraft.notes
      ) {
        return {
          ...current,
          leadId: nextLeadId
        }
      }

      return {
        ...initialBusinessCreateDraft,
        leadId: nextLeadId
      }
    })
  }, [activeLeads, isCreateBusinessMode])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoadingNegocios(true)
        setNegociosError(null)

        const loadedNegocios = await WebhookService.loadNegotiations()

        if (!isMounted) {
          return
        }

        setNegocios(loadedNegocios)
      } catch (exception: unknown) {
        if (!isMounted) {
          return
        }

        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao carregar negócios.'

        setNegociosError(message)
        setNegocios([])
      } finally {
        if (isMounted) {
          setIsLoadingNegocios(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [negociosReloadVersion])

  const handleLeadUpdated = () => {
    setShouldRefreshOnLeadClose(true)
  }

  useEffect(() => {
    const wasBusinessPanelOpen = previousIsBusinessPanelOpenRef.current

    if (wasBusinessPanelOpen && !isBusinessPanelOpen && shouldRefreshOnLeadClose) {
      setNegociosReloadVersion((current) => current + 1)
      setShouldRefreshOnLeadClose(false)
    }

    previousIsBusinessPanelOpenRef.current = isBusinessPanelOpen
  }, [isBusinessPanelOpen, shouldRefreshOnLeadClose])

  useEffect(() => {
    const bodyStyle = document.body.style
    const htmlStyle = document.documentElement.style
    const scrollY = window.scrollY
    const previousBodyOverflow = bodyStyle.overflow
    const previousBodyPosition = bodyStyle.position
    const previousBodyTop = bodyStyle.top
    const previousBodyWidth = bodyStyle.width
    const previousHtmlOverflow = htmlStyle.overflow

    bodyStyle.overflow = 'hidden'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.width = '100%'
    htmlStyle.overflow = 'hidden'

    return () => {
      bodyStyle.overflow = previousBodyOverflow
      bodyStyle.position = previousBodyPosition
      bodyStyle.top = previousBodyTop
      bodyStyle.width = previousBodyWidth
      htmlStyle.overflow = previousHtmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  const negociosByUser = useMemo(
    () => negocios.filter((negocio) => userLeadIdSet.has(negocio.leadId)),
    [negocios, userLeadIdSet]
  )

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const activeFiltersCount =
    Number(selectedTypeFilters.length > 0) +
    Number(selectedStageFilters.length > 0) +
    Number(selectedStatusFilters.length > 0) +
    Number(selectedTemperatureFilters.length > 0)

  const activeFilterTags = [
    ...selectedTypeFilters.map((value) => ({
      key: `type-${value}`,
      label: `Tipo: ${getBusinessTypeFilterLabel(value)}`,
      textColor: '#7c3aed',
      background: '#ede9fe',
      onRemove: () => setSelectedTypeFilters((current) => current.filter((item) => item !== value))
    })),
    ...selectedStageFilters.map((value) => ({
      key: `stage-${value}`,
      label: `Etapa: ${getBusinessStageFilterLabel(value)}`,
      textColor: '#1d4ed8',
      background: '#dbeafe',
      onRemove: () => setSelectedStageFilters((current) => current.filter((item) => item !== value))
    })),
    ...selectedStatusFilters.map((value) => ({
      key: `status-${value}`,
      label: `Status: ${getBusinessStatusFilterLabel(value)}`,
      textColor: '#b45309',
      background: '#fef3c7',
      onRemove: () => setSelectedStatusFilters((current) => current.filter((item) => item !== value))
    })),
    ...selectedTemperatureFilters.map((value) => ({
      key: `temperature-${value}`,
      label: `Temperatura: ${getBusinessTemperatureFilterLabel(value)}`,
      textColor: '#0f766e',
      background: '#ccfbf1',
      onRemove: () => setSelectedTemperatureFilters((current) => current.filter((item) => item !== value))
    }))
  ]

  const filteredNegocios = useMemo(
    () =>
      negociosByUser.filter((negocio) => {
        const matchesSearch = !normalizedSearchTerm
          ? true
          : (negocio.title ?? '').trim().toLowerCase().includes(normalizedSearchTerm)

        const negotiationType = normalizeNegotiationTypeValue(negocio.negotiationType)
        const matchesType =
          selectedTypeFilters.length === 0 || selectedTypeFilters.includes(negotiationType)

        const stageValue = normalizeStageValue(negocio.stage)
        const matchesStage =
          selectedStageFilters.length === 0 || (stageValue ? selectedStageFilters.includes(stageValue) : false)

        const statusValue = getBusinessStatusValue(negocio.stage, negocio.closedAt ?? null)
        const matchesStatus =
          selectedStatusFilters.length === 0 || selectedStatusFilters.includes(statusValue)

        const temperatureValue = getBusinessTemperatureValue(negocio.temperature)
        const matchesTemperature =
          selectedTemperatureFilters.length === 0 || selectedTemperatureFilters.includes(temperatureValue)

        return matchesSearch && matchesType && matchesStage && matchesStatus && matchesTemperature
      }),
    [
      negociosByUser,
      normalizedSearchTerm,
      selectedStageFilters,
      selectedStatusFilters,
      selectedTemperatureFilters,
      selectedTypeFilters
    ]
  )

  const availableStageSortValues = useMemo(() => {
    const orderedStages: LeadStage[] = [
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'PROPOSAL_SENT',
      'NEGOTIATION',
      'WON',
      'LOST'
    ]

    return orderedStages.filter((stage) =>
      filteredNegocios.some((negocio) => (negocio.stage ?? '').trim().toUpperCase() === stage)
    )
  }, [filteredNegocios])

  const availableStatusSortValues = useMemo(() => {
    const orderedStatuses: Array<'open' | 'won' | 'lost'> = ['open', 'won', 'lost']

    return orderedStatuses.filter((status) =>
      filteredNegocios.some((negocio) => getBusinessStatusValue(negocio.stage, negocio.closedAt ?? null) === status)
    )
  }, [filteredNegocios])

  const availableTemperatureSortValues = useMemo(() => {
    const orderedTemperatures: Array<'hot' | 'warm' | 'cold' | 'none'> = ['hot', 'warm', 'cold', 'none']

    return orderedTemperatures.filter((temperature) =>
      filteredNegocios.some((negocio) => getBusinessTemperatureValue(negocio.temperature) === temperature)
    )
  }, [filteredNegocios])

  const stageSortRankMap = useMemo(
    () => new Map(rotateValues(availableStageSortValues, stageSortFocus).map((value, index) => [value, index])),
    [availableStageSortValues, stageSortFocus]
  )

  const statusSortRankMap = useMemo(
    () => new Map(rotateValues(availableStatusSortValues, statusSortFocus).map((value, index) => [value, index])),
    [availableStatusSortValues, statusSortFocus]
  )

  const temperatureSortRankMap = useMemo(
    () => new Map(rotateValues(availableTemperatureSortValues, temperatureSortFocus).map((value, index) => [value, index])),
    [availableTemperatureSortValues, temperatureSortFocus]
  )

  const sortedNegocios = useMemo(
    () =>
      [...filteredNegocios].sort((first, second) => {
        const directionFactor = sortDirection === 'asc' ? 1 : -1

        if (sortKey === 'createdAt') {
          const firstCreatedAt = getApiDateTimestamp(first.createdAt)
          const secondCreatedAt = getApiDateTimestamp(second.createdAt)

          return (firstCreatedAt - secondCreatedAt) * directionFactor
        }

        if (sortKey === 'title') {
          return (first.title ?? '').localeCompare(second.title ?? '', 'pt-BR', { sensitivity: 'base' }) * directionFactor
        }

        if (sortKey === 'lead') {
          return (leadNameById.get(first.leadId) ?? '').localeCompare(
            leadNameById.get(second.leadId) ?? '',
            'pt-BR',
            { sensitivity: 'base' }
          ) * directionFactor
        }

        if (sortKey === 'type') {
          const firstRank = getBusinessTypeSortRank(first.negotiationType, typeSortFocus)
          const secondRank = getBusinessTypeSortRank(second.negotiationType, typeSortFocus)
          return firstRank - secondRank
        }

        if (sortKey === 'stage') {
          const firstRank = stageSortRankMap.get((first.stage ?? '').trim().toUpperCase() as LeadStage) ?? Number.POSITIVE_INFINITY
          const secondRank = stageSortRankMap.get((second.stage ?? '').trim().toUpperCase() as LeadStage) ?? Number.POSITIVE_INFINITY
          return firstRank - secondRank
        }

        if (sortKey === 'status') {
          const firstRank = statusSortRankMap.get(getBusinessStatusValue(first.stage, first.closedAt ?? null)) ?? Number.POSITIVE_INFINITY
          const secondRank = statusSortRankMap.get(getBusinessStatusValue(second.stage, second.closedAt ?? null)) ?? Number.POSITIVE_INFINITY
          return firstRank - secondRank
        }

        if (sortKey === 'temperature') {
          const firstRank = temperatureSortRankMap.get(getBusinessTemperatureValue(first.temperature)) ?? Number.POSITIVE_INFINITY
          const secondRank = temperatureSortRankMap.get(getBusinessTemperatureValue(second.temperature)) ?? Number.POSITIVE_INFINITY
          return firstRank - secondRank
        }

        if (sortKey === 'value') {
          return (toSortableNumber(first.value) - toSortableNumber(second.value)) * directionFactor
        }

        return 0
      }),
    [
      filteredNegocios,
      leadNameById,
      sortDirection,
      sortKey,
      stageSortRankMap,
      statusSortRankMap,
      temperatureSortRankMap,
      typeSortFocus
    ]
  )

  const paginatedNegocios = sortedNegocios

  const setBusinessLeadNameRef = (negocioId: string, element: HTMLSpanElement | null) => {
    businessLeadNameRefs.current[negocioId] = element
  }

  useEffect(() => {
    if (isMobile) {
      return
    }

    const recalculateWrappedBusinessLeadNames = () => {
      const nextWrappedBusinessLeadNames: Record<string, boolean> = {}

      paginatedNegocios.forEach((negocio) => {
        const businessLeadNameElement = businessLeadNameRefs.current[negocio.id]

        if (!businessLeadNameElement) {
          nextWrappedBusinessLeadNames[negocio.id] = false
          return
        }

        const computedStyle = window.getComputedStyle(businessLeadNameElement)
        const lineHeight = Number.parseFloat(computedStyle.lineHeight)

        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
          nextWrappedBusinessLeadNames[negocio.id] = false
          return
        }

        const lineCount = Math.round(
          businessLeadNameElement.getBoundingClientRect().height / lineHeight
        )

        nextWrappedBusinessLeadNames[negocio.id] = lineCount > 1
      })

      setWrappedBusinessLeadNames((currentWrappedBusinessLeadNames) => {
        const currentKeys = Object.keys(currentWrappedBusinessLeadNames)
        const nextKeys = Object.keys(nextWrappedBusinessLeadNames)

        if (currentKeys.length !== nextKeys.length) {
          return nextWrappedBusinessLeadNames
        }

        const hasDifference = nextKeys.some(
          (key) => currentWrappedBusinessLeadNames[key] !== nextWrappedBusinessLeadNames[key]
        )

        return hasDifference
          ? nextWrappedBusinessLeadNames
          : currentWrappedBusinessLeadNames
      })
    }

    recalculateWrappedBusinessLeadNames()
    window.addEventListener('resize', recalculateWrappedBusinessLeadNames)

    return () => {
      window.removeEventListener('resize', recalculateWrappedBusinessLeadNames)
    }
  }, [isMobile, paginatedNegocios])

  useEffect(() => {
    if (!isBusinessPanelOpen) {
      setIsLeadPanelEntering(false)
      return
    }

    setIsLeadPanelEntering(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsLeadPanelEntering(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isBusinessPanelOpen, leadPanelTransitionMs])

  const isLoading = isLeadsLoading || isLoadingNegocios
  const error = leadsError || negociosError

  const toggleMultiFilterValue = <T extends string>(
    currentValues: T[],
    value: T,
    setValues: (nextValues: T[]) => void
  ) => {
    if (currentValues.includes(value)) {
      setValues(currentValues.filter((currentValue) => currentValue !== value))
      return
    }

    setValues([...currentValues, value])
  }

  const handleSortToggle = (nextSortKey: BusinessSortKey) => {
    if (nextSortKey === 'type') {
      if (sortKey !== 'type') {
        setSortKey('type')
        setSortDirection('asc')
        setTypeSortFocus('serviceFirst')
        return
      }

      setTypeSortFocus((currentFocus) => {
        if (currentFocus === 'serviceFirst') return 'productFirst'
        if (currentFocus === 'productFirst') return 'noneFirst'
        return 'serviceFirst'
      })
      return
    }

    if (nextSortKey === 'stage') {
      if (sortKey !== 'stage') {
        setSortKey('stage')
        setSortDirection('asc')
        setStageSortFocus(availableStageSortValues[0] ?? null)
        return
      }

      setStageSortFocus((currentFocus) => {
        if (availableStageSortValues.length <= 1) {
          return availableStageSortValues[0] ?? null
        }

        const currentIndex = currentFocus ? availableStageSortValues.indexOf(currentFocus) : -1
        if (currentIndex < 0) {
          return availableStageSortValues[0] ?? null
        }

        return availableStageSortValues[(currentIndex + 1) % availableStageSortValues.length] ?? null
      })
      return
    }

    if (nextSortKey === 'status') {
      if (sortKey !== 'status') {
        setSortKey('status')
        setSortDirection('asc')
        setStatusSortFocus(availableStatusSortValues[0] ?? null)
        return
      }

      setStatusSortFocus((currentFocus) => {
        if (availableStatusSortValues.length <= 1) {
          return availableStatusSortValues[0] ?? null
        }

        const currentIndex = currentFocus ? availableStatusSortValues.indexOf(currentFocus) : -1
        if (currentIndex < 0) {
          return availableStatusSortValues[0] ?? null
        }

        return availableStatusSortValues[(currentIndex + 1) % availableStatusSortValues.length] ?? null
      })
      return
    }

    if (nextSortKey === 'temperature') {
      if (sortKey !== 'temperature') {
        setSortKey('temperature')
        setSortDirection('asc')
        setTemperatureSortFocus(availableTemperatureSortValues[0] ?? null)
        return
      }

      setTemperatureSortFocus((currentFocus) => {
        if (availableTemperatureSortValues.length <= 1) {
          return availableTemperatureSortValues[0] ?? null
        }

        const currentIndex = currentFocus ? availableTemperatureSortValues.indexOf(currentFocus) : -1
        if (currentIndex < 0) {
          return availableTemperatureSortValues[0] ?? null
        }

        return availableTemperatureSortValues[(currentIndex + 1) % availableTemperatureSortValues.length] ?? null
      })
      return
    }

    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  const getSortIndicator = (targetSortKey: BusinessSortKey): string => {
    if (sortKey !== targetSortKey) {
      return '↕'
    }

    if (targetSortKey === 'type') {
      return typeSortFocus === 'serviceFirst' ? '↑' : '↓'
    }

    if (targetSortKey === 'stage') {
      return stageSortFocus === availableStageSortValues[0] ? '↑' : '↓'
    }

    if (targetSortKey === 'status') {
      return statusSortFocus === availableStatusSortValues[0] ? '↑' : '↓'
    }

    if (targetSortKey === 'temperature') {
      return temperatureSortFocus === availableTemperatureSortValues[0] ? '↑' : '↓'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getHeaderSortButtonStyle = (targetSortKey: BusinessSortKey, align: 'left' | 'center' = 'left') => ({
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: '#4b5563',
    fontSize: 13,
    fontWeight: sortKey === targetSortKey ? 700 : 600,
    cursor: 'pointer',
    width: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: align === 'center' ? 'center' : 'flex-start',
    gap: 6
  })

  const handleDeleteNegocio = async (negocioId: string) => {
    try {
      await WebhookService.deleteNegotiation(negocioId)
      setNegocios((current) => current.filter((negocio) => negocio.id !== negocioId))
      setConfirmingDeleteNegocioId(null)

      if (selectedBusinessId === negocioId) {
        navigate('/negocios')
      }
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao deletar negócio.'

      setNegociosError(message)
      setConfirmingDeleteNegocioId(null)
    }
  }

  const handleCreateBusiness = async () => {
    const trimmedTitle = businessCreateDraft.title.trim()
    const trimmedLeadId = businessCreateDraft.leadId.trim()

    if (!trimmedLeadId || !trimmedTitle) {
      setBusinessCreateError('Preencha lead e nome do negócio.')
      return
    }

    try {
      setBusinessCreateError(null)

      const payload: CreateNegotiationPayload = {
        leadId: trimmedLeadId,
        title: trimmedTitle,
        stage: businessCreateDraft.stage,
        temperature: businessCreateDraft.temperature || undefined,
        negotiationType: businessCreateDraft.negotiationType || undefined,
        value: parseLeadValueInput(businessCreateDraft.value) ?? undefined,
        notes: businessCreateDraft.notes.trim()
          ? [{
              title: 'Nota',
              description: businessCreateDraft.notes.trim(),
              createdAt: new Date().toISOString()
            }]
          : undefined
      }

      const createdBusiness = await WebhookService.createNegotiation(payload)

      setBusinessCreateDraft(initialBusinessCreateDraft)
      setNegociosReloadVersion((current) => current + 1)
      setShouldRefreshOnLeadClose(false)
      navigate(`/negocios/${createdBusiness.leadId}${location.search}`, {
        state: {
          initialLeadTab: 'negocios',
          initialBusinessId: createdBusiness.id,
          initialBusinessTab: 'informacoes'
        }
      })
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao criar negócio.'
      setBusinessCreateError(message)
    }
  }

  const canCreateBusiness = Boolean(
    businessCreateDraft.leadId.trim() && businessCreateDraft.title.trim()
  )

  const mobileCreateBusinessSheet = isCreateBusinessMode ? (
    <>
      <button
        type="button"
        aria-label="Fechar criação de negócio"
        onClick={() => navigate(`/negocios${location.search}`)}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(15, 23, 42, 0.18)',
          zIndex: 40,
          cursor: 'default'
        }}
      />

      <aside
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '86%',
          zIndex: 45,
          borderRadius: '22px 22px 0 0',
          background: '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)'
        }}
      >
        <section
          style={{
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            padding: '22px 18px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: '#ffffff',
            boxSizing: 'border-box'
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              Novo negócio
            </h2>
          </div>

          <button
            type="button"
            aria-label="Fechar criação de negócio"
            onClick={() => navigate(`/negocios${location.search}`)}
            style={{
              height: 28,
              minWidth: 28,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: '#6b7280',
              padding: '0 8px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1
            }}
          >
            X
          </button>
        </div>

        {businessCreateError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{businessCreateError}</p>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 14,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 2,
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Lead</label>
            <select
              value={businessCreateDraft.leadId}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({
                  ...current,
                  leadId: event.target.value
                }))
              }
              style={{
                width: '100%',
                height: 46,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: businessCreateDraft.leadId ? '#111827' : '#6b7280',
                fontSize: 17 / 1.2,
                fontWeight: 600,
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            >
              <option value="">Selecione</option>
              {activeLeads.map((lead, index) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name?.trim() || `Lead ${index + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Tipo</label>
            <select
              value={businessCreateDraft.negotiationType}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({
                  ...current,
                  negotiationType: event.target.value as '' | NegotiationType
                }))
              }
              style={{
                width: '100%',
                height: 46,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: businessCreateDraft.negotiationType ? '#111827' : '#6b7280',
                fontSize: 17 / 1.2,
                fontWeight: 600,
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            >
              <option value="">Selecione</option>
              <option value="service">Serviço</option>
              <option value="product">Produto</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Nome</label>
            <input
              type="text"
              placeholder="Nome"
              value={businessCreateDraft.title}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({ ...current, title: event.target.value }))
              }
              style={{
                height: 46,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: '#111827',
                fontSize: 17 / 1.2,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Etapa</label>
            <select
              value={businessCreateDraft.stage}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({
                  ...current,
                  stage: event.target.value as LeadStage
                }))
              }
              style={{
                width: '100%',
                height: 46,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: '#111827',
                fontSize: 17 / 1.2,
                fontWeight: 700,
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            >
              <option value="NEW">Novo</option>
              <option value="CONTACTED">Contatado</option>
              <option value="QUALIFIED">Qualificado</option>
              <option value="PROPOSAL_SENT">Proposta enviada</option>
              <option value="NEGOTIATION">Negociação</option>
              <option value="WON">Ganho</option>
              <option value="LOST">Perdido</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Temperatura</label>
            <select
              value={businessCreateDraft.temperature}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({
                  ...current,
                  temperature: event.target.value as '' | NegotiationTemperature
                }))
              }
              style={{
                width: '100%',
                height: 46,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: businessCreateDraft.temperature ? '#111827' : '#6b7280',
                fontSize: 17 / 1.2,
                fontWeight: 600,
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            >
              <option value="">Selecione</option>
              <option value="hot">Quente</option>
              <option value="warm">Morno</option>
              <option value="cold">Frio</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Valor (R$)</label>
            <input
              type="text"
              value={businessCreateDraft.value}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({
                  ...current,
                  value: sanitizeLeadValueInput(event.target.value)
                }))
              }
              inputMode="decimal"
              style={{
                height: 46,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: '#111827',
                fontSize: 17 / 1.2,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Notas</label>
            <textarea
              placeholder="Escreva uma observação..."
              value={businessCreateDraft.notes}
              onChange={(event) =>
                setBusinessCreateDraft((current) => ({ ...current, notes: event.target.value }))
              }
              style={{
                width: '100%',
                minHeight: 132,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#111827',
                fontSize: 17 / 1.2,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => {
                setBusinessCreateDraft(initialBusinessCreateDraft)
                setBusinessCreateError(null)
                navigate(`/negocios${location.search}`)
              }}
              style={{
                minWidth: 120,
                height: 42,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void handleCreateBusiness()
              }}
              disabled={!canCreateBusiness}
              style={{
                minWidth: 120,
                height: 42,
                border: 'none',
                borderRadius: 8,
                background: '#1f7a4d',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: canCreateBusiness ? 'pointer' : 'not-allowed'
              }}
            >
              Salvar
            </button>
          </div>
        </div>
        </section>
      </aside>
    </>
  ) : null

  if (isMobile) {
    return (
      <section
        style={{
          height: '100%',
          padding: '24px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          background: '#fafbfd',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }}>Negócios</h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 52px 52px', gap: 12 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar negócio"
            style={{
              width: '100%',
              height: 52,
              border: `1px solid ${
                isSearchInputFocused
                  ? interactionTheme.inputFocusBorderColor
                  : '#d1d5db'
              }`,
              borderRadius: 14,
              padding: '0 16px',
              background: '#ffffff',
              color: '#111827',
              boxShadow: isSearchInputFocused
                ? interactionTheme.inputFocusBoxShadow
                : 'none',
              outline: 'none',
              fontSize: 16,
              boxSizing: 'border-box'
            }}
          />

          <button
            type="button"
            onClick={() => setIsFiltersPanelOpen((current) => !current)}
            onMouseEnter={() => setIsFiltersButtonHovered(true)}
            onMouseLeave={() => setIsFiltersButtonHovered(false)}
            style={{
              height: 52,
              width: 52,
              border: '1px solid #d1d5db',
              borderRadius: 14,
              background:
                isFiltersPanelOpen || isFiltersButtonHovered || activeFiltersCount > 0
                  ? interactionTheme.clickableCardHoverBackground
                  : '#ffffff',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label="Abrir filtros"
          >
            <ListFilter size={20} />
          </button>

          <button
            type="button"
            aria-label="Adicionar negócio"
            onClick={() => navigate(`/negocios/new${location.search}`)}
            style={{
              height: 52,
              width: 52,
              border: 'none',
              borderRadius: 14,
              background: interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Plus size={26} />
          </button>
        </div>

        {isFiltersPanelOpen ? (
          <>
            <button
              type="button"
              aria-label="Fechar painel de filtros"
              onClick={() => {
                setIsFiltersPanelOpen(false)
                setExpandedFilterSection(null)
                setHoveredFilterOption(null)
              }}
              style={{
                position: 'absolute',
                inset: 0,
                border: 'none',
                background: 'transparent',
                zIndex: 35,
                cursor: 'default'
              }}
            />

            <section
              style={{
                position: 'absolute',
                top: 150,
                right: 16,
                width: 'min(250px, calc(100vw - 32px))',
                background: '#fcfdff',
                border: `1px solid ${interactionTheme.sidebarItemActiveBackground}`,
                borderRadius: 18,
                zIndex: 36,
                padding: '14px 16px 12px',
                boxSizing: 'border-box',
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)'
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { key: 'type' as const, label: 'Tipo' },
                  { key: 'stage' as const, label: 'Etapa' },
                  { key: 'status' as const, label: 'Status' },
                  { key: 'temperature' as const, label: 'Temperatura' }
                ].map((section) => {
                  const isSelected =
                    section.key === 'type'
                      ? selectedTypeFilters.length > 0
                      : section.key === 'stage'
                        ? selectedStageFilters.length > 0
                        : section.key === 'status'
                          ? selectedStatusFilters.length > 0
                          : selectedTemperatureFilters.length > 0
                  const isExpanded = expandedFilterSection === section.key

                  return (
                    <div key={section.key} style={{ display: 'grid', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFilterSection((current) => (current === section.key ? null : section.key))
                        }
                        onMouseEnter={() => setHoveredFilterOption(section.key)}
                        onMouseLeave={() => setHoveredFilterOption(null)}
                        style={getFilterGroupButtonStyle(isSelected || isExpanded || hoveredFilterOption === section.key)}
                      >
                        <span>{section.label}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <ChevronDown size={14} />
                        </span>
                      </button>

                      {isExpanded ? (
                        <div style={{ display: 'grid', gap: 4, paddingLeft: 8 }}>
                          {section.key === 'type'
                            ? ([
                                { value: 'service' as const, label: getBusinessTypeFilterLabel('service') },
                                { value: 'product' as const, label: getBusinessTypeFilterLabel('product') }
                              ]).map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    toggleMultiFilterValue(
                                      selectedTypeFilters,
                                      option.value,
                                      setSelectedTypeFilters
                                    )
                                  }}
                                  style={getFilterOptionStyle(selectedTypeFilters.includes(option.value))}
                                >
                                  {option.label}
                                </button>
                              ))
                            : section.key === 'stage'
                              ? availableStageSortValues.map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      toggleMultiFilterValue(
                                        selectedStageFilters,
                                        value,
                                        setSelectedStageFilters
                                      )
                                    }}
                                    style={getFilterOptionStyle(selectedStageFilters.includes(value))}
                                  >
                                    {getBusinessStageFilterLabel(value)}
                                  </button>
                                ))
                              : section.key === 'status'
                                ? availableStatusSortValues.map((value) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => {
                                        toggleMultiFilterValue(
                                          selectedStatusFilters,
                                          value,
                                          setSelectedStatusFilters
                                        )
                                      }}
                                      style={getFilterOptionStyle(selectedStatusFilters.includes(value))}
                                    >
                                      {getBusinessStatusFilterLabel(value)}
                                    </button>
                                  ))
                                : availableTemperatureSortValues.map((value) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => {
                                        toggleMultiFilterValue(
                                          selectedTemperatureFilters,
                                          value,
                                          setSelectedTemperatureFilters
                                        )
                                      }}
                                      style={getFilterOptionStyle(selectedTemperatureFilters.includes(value))}
                                    >
                                      {getBusinessTemperatureFilterLabel(value)}
                                    </button>
                                  ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        ) : null}

        {activeFilterTags.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {activeFilterTags.map((tag) => (
              <span
                key={tag.key}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tag.textColor,
                  background: tag.background,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  lineHeight: 1
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
                    color: tag.textColor,
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  X
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ maxHeight: '100%', minHeight: 0, overflowY: isCreateBusinessMode ? 'hidden' : 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }}>
          {paginatedNegocios.map((negocio) => {
            const isHovered = hoveredNegocioId === negocio.id
            const isSelected = selectedBusinessId === negocio.id
            const businessTypeLabel =
              negocio.negotiationType === 'service'
                ? 'Serviço'
                : negocio.negotiationType === 'product'
                  ? 'Produto'
                  : '-'
            const temperatureTagPresentation = getTemperatureTagPresentation(negocio.temperature)
            const businessLifecycleTagPresentation = getBusinessLifecycleTagPresentation(
              negocio.stage,
              negocio.closedAt ?? null
            )
            const leadName = leadNameById.get(negocio.leadId) ?? 'Lead sem nome'

            if (confirmingDeleteNegocioId === negocio.id) {
              return (
                <article
                  key={negocio.id}
                  style={{
                    background: interactionTheme.clickableCardHoverBackground,
                    border: '1px solid #e5e7eb',
                    borderRadius: 18,
                    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <strong style={{ color: '#111827', fontSize: 15 }}>Deletar Negócio?</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      aria-label="Cancelar exclusão de negócio"
                      onClick={() => setConfirmingDeleteNegocioId(null)}
                      style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      aria-label="Confirmar exclusão de negócio"
                      onClick={() => void handleDeleteNegocio(negocio.id)}
                      style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                    >
                      ✓
                    </button>
                  </div>
                </article>
              )
            }

            return (
              <article
                key={negocio.id}
                onClick={() => {
                  navigate(`/negocios/${negocio.leadId}${location.search}`, {
                    state: {
                      initialLeadTab: 'negocios',
                      initialBusinessId: negocio.id,
                      initialBusinessTab: 'informacoes'
                    }
                  })
                }}
                onMouseEnter={() => setHoveredNegocioId(negocio.id)}
                onMouseLeave={() => setHoveredNegocioId(null)}
                style={{
                  background: isHovered || isSelected ? interactionTheme.clickableCardHoverBackground : '#ffffff',
                  border: '1px solid #f1f5f9',
                  borderRadius: 18,
                  boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                  padding: 16,
                  display: 'grid',
                  gap: 18,
                  cursor: 'pointer',
                  transition: 'background 120ms ease'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {negocio.title ?? 'Negócio sem nome'}
                    </h2>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {leadName}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Excluir negócio"
                      onClick={() => setConfirmingDeleteNegocioId(negocio.id)}
                      style={{
                        height: 34,
                        width: 34,
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        background: '#ffffff',
                        color: '#4b5563',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {businessTypeLabel === '-' ? null : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap', background: '#ede9fe', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                      <span style={tagContentStyle}>{businessTypeLabel}</span>
                    </span>
                  )}

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap', background: '#dbeafe', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                    <span style={tagContentStyle}>{getLeadStageLabel(negocio.stage)}</span>
                  </span>

                  <span style={{ fontSize: 12, fontWeight: 700, color: businessLifecycleTagPresentation.textColor, whiteSpace: 'nowrap', background: businessLifecycleTagPresentation.background, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                    <span style={tagContentStyle}>{businessLifecycleTagPresentation.label}</span>
                  </span>

                  {temperatureTagPresentation.label === '-' ? null : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: temperatureTagPresentation.textColor, whiteSpace: 'nowrap', background: `${temperatureTagPresentation.textColor}44`, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                      {temperatureTagPresentation.icon ? (
                        <span style={tagIconStyle}>{temperatureTagPresentation.icon}</span>
                      ) : null}
                      <span style={tagContentStyle}>{temperatureTagPresentation.label}</span>
                    </span>
                  )}

                  {formatLeadValue(negocio.value) === '-' ? null : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', whiteSpace: 'nowrap', background: '#dcfce7', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                      <span style={tagContentStyle}>{formatLeadValue(negocio.value)}</span>
                    </span>
                  )}
                </div>
              </article>
            )
          })}

          {!isLoadingNegocios && !negociosError && sortedNegocios.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Nenhum negócio encontrado.</div>
          ) : null}
          {isLoadingNegocios ? (
            <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Carregando negócios...</div>
          ) : null}
          {negociosError ? (
            <div style={{ color: '#b91c1c', fontSize: 14, padding: 16, textAlign: 'center' }}>{negociosError}</div>
          ) : null}
        </div>

        {mobileCreateBusinessSheet}

        {!isCreateBusinessMode && isBusinessPanelOpen ? (
          <aside
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: '#ffffff',
              overflow: 'hidden'
            }}
          >
            <LeadPage onLeadUpdated={handleLeadUpdated} />
          </aside>
        ) : null}
      </section>
    )
  }

  return (
    <section
      style={{
        height: '100vh',
        padding: '16px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: '#f3f4f6',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '4px 2px'
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, color: '#111827', lineHeight: 1.2 }}>
          Negócios
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar Negócio"
            style={{
              width: 220,
              height: 38,
              border: `1px solid ${
                isSearchInputFocused
                  ? interactionTheme.inputFocusBorderColor
                  : '#d1d5db'
              }`,
              borderRadius: 8,
              padding: '0 12px',
              background: '#ffffff',
              color: '#111827',
              boxShadow: isSearchInputFocused
                ? interactionTheme.inputFocusBoxShadow
                : 'none',
              outline: 'none'
            }}
          />

          <button
            type="button"
            onClick={() => setIsFiltersPanelOpen((current) => !current)}
            onMouseEnter={() => setIsFiltersButtonHovered(true)}
            onMouseLeave={() => setIsFiltersButtonHovered(false)}
            style={{
              height: 38,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background:
                isFiltersPanelOpen || isFiltersButtonHovered || activeFiltersCount > 0
                  ? interactionTheme.clickableCardHoverBackground
                  : '#ffffff',
              width: 38,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label="Abrir filtros"
          >
            <ListFilter size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate(`/negocios/new${location.search}`)}
            style={{
              height: 38,
              border: 'none',
              borderRadius: 8,
              background: interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              padding: '0 16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Adicionar Negócio
          </button>
        </div>
      </header>

      {isFiltersPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar painel de filtros"
            onClick={() => {
              setIsFiltersPanelOpen(false)
              setExpandedFilterSection(null)
              setHoveredFilterOption(null)
            }}
            style={{
              position: 'absolute',
              inset: 0,
              border: 'none',
              background: 'transparent',
              zIndex: 35,
              cursor: 'default'
            }}
          />

          <section
            style={{
              position: 'absolute',
              top: 68,
              right: 20,
              width: 'min(250px, calc(100vw - 40px))',
              background: '#fcfdff',
              border: `1px solid ${interactionTheme.sidebarItemActiveBackground}`,
              borderRadius: 18,
              zIndex: 36,
              padding: '14px 16px 12px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { key: 'type' as const, label: 'Tipo' },
                { key: 'stage' as const, label: 'Etapa' },
                { key: 'status' as const, label: 'Status' },
                { key: 'temperature' as const, label: 'Temperatura' }
              ].map((section) => {
                const isSelected =
                  section.key === 'type'
                    ? selectedTypeFilters.length > 0
                    : section.key === 'stage'
                      ? selectedStageFilters.length > 0
                      : section.key === 'status'
                        ? selectedStatusFilters.length > 0
                        : selectedTemperatureFilters.length > 0
                const isExpanded = expandedFilterSection === section.key

                return (
                  <div key={section.key} style={{ display: 'grid', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFilterSection((current) => (current === section.key ? null : section.key))
                      }
                      onMouseEnter={() => setHoveredFilterOption(section.key)}
                      onMouseLeave={() => setHoveredFilterOption(null)}
                      style={getFilterGroupButtonStyle(isSelected || isExpanded || hoveredFilterOption === section.key)}
                    >
                      <span>{section.label}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <ChevronDown size={14} />
                      </span>
                    </button>

                    {isExpanded ? (
                      <div style={{ display: 'grid', gap: 4, paddingLeft: 8 }}>
                        {section.key === 'type'
                          ? ([
                              { value: 'service' as const, label: getBusinessTypeFilterLabel('service') },
                              { value: 'product' as const, label: getBusinessTypeFilterLabel('product') }
                            ]).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  toggleMultiFilterValue(
                                    selectedTypeFilters,
                                    option.value,
                                    setSelectedTypeFilters
                                  )
                                }}
                                style={getFilterOptionStyle(selectedTypeFilters.includes(option.value))}
                              >
                                {option.label}
                              </button>
                            ))
                          : section.key === 'stage'
                            ? availableStageSortValues.map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    toggleMultiFilterValue(
                                      selectedStageFilters,
                                      value,
                                      setSelectedStageFilters
                                    )
                                  }}
                                  style={getFilterOptionStyle(selectedStageFilters.includes(value))}
                                >
                                  {getBusinessStageFilterLabel(value)}
                                </button>
                              ))
                            : section.key === 'status'
                              ? availableStatusSortValues.map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      toggleMultiFilterValue(
                                        selectedStatusFilters,
                                        value,
                                        setSelectedStatusFilters
                                      )
                                    }}
                                    style={getFilterOptionStyle(selectedStatusFilters.includes(value))}
                                  >
                                    {getBusinessStatusFilterLabel(value)}
                                  </button>
                                ))
                              : availableTemperatureSortValues.map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      toggleMultiFilterValue(
                                        selectedTemperatureFilters,
                                        value,
                                        setSelectedTemperatureFilters
                                      )
                                    }}
                                    style={getFilterOptionStyle(selectedTemperatureFilters.includes(value))}
                                  >
                                    {getBusinessTemperatureFilterLabel(value)}
                                  </button>
                                ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {activeFilterTags.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 10,
              padding: '0 2px'
            }}
          >
            {activeFilterTags.map((tag) => (
              <span
                key={tag.key}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tag.textColor,
                  background: tag.background,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  lineHeight: 1
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
                    color: tag.textColor,
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  X
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div
          style={{
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            overflowY: 'auto',
            maxHeight: '100%',
            minHeight: 0,
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#ffffff',
              tableLayout: 'fixed'
            }}
          >
            <colgroup>
              <col style={{ width: '19%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button type="button" onClick={() => handleSortToggle('title')} style={getHeaderSortButtonStyle('title')}>
                    Negócio <span>{getSortIndicator('title')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button type="button" onClick={() => handleSortToggle('lead')} style={getHeaderSortButtonStyle('lead')}>
                    Lead <span>{getSortIndicator('lead')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('type')} style={getHeaderSortButtonStyle('type', 'center')}>
                    Tipo <span>{getSortIndicator('type')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('stage')} style={getHeaderSortButtonStyle('stage', 'center')}>
                    Etapa <span>{getSortIndicator('stage')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('status')} style={getHeaderSortButtonStyle('status', 'center')}>
                    Status <span>{getSortIndicator('status')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('temperature')} style={getHeaderSortButtonStyle('temperature', 'center')}>
                    Temperatura <span>{getSortIndicator('temperature')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('value')} style={getHeaderSortButtonStyle('value', 'center')}>
                    Valor <span>{getSortIndicator('value')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedNegocios.map((negocio) => {
                const isHovered = hoveredNegocioId === negocio.id
                const isSelected = selectedBusinessId === negocio.id
                const businessTypeLabel =
                  negocio.negotiationType === 'service'
                    ? 'Serviço'
                    : negocio.negotiationType === 'product'
                      ? 'Produto'
                      : '-'
                const temperatureTagPresentation =
                  getTemperatureTagPresentation(negocio.temperature)
                const businessLifecycleTagPresentation = getBusinessLifecycleTagPresentation(
                  negocio.stage,
                  negocio.closedAt ?? null
                )
                const leadName =
                  leadNameById.get(negocio.leadId) ?? 'Lead sem nome'

                if (confirmingDeleteNegocioId === negocio.id) {
                  return (
                    <tr
                      key={negocio.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: interactionTheme.clickableCardHoverBackground
                      }}
                      onMouseEnter={() => setHoveredNegocioId(negocio.id)}
                      onMouseLeave={() => setHoveredNegocioId(null)}
                    >
                      <td
                        colSpan={7}
                        style={{
                          padding: '14px 16px',
                          color: '#2f2f2f',
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        Deletar Negócio?
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#2f2f2f',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            aria-label="Cancelar exclusão de negócio"
                            onClick={(event) => {
                              event.stopPropagation()
                              setConfirmingDeleteNegocioId(null)
                            }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.background = interactionTheme.clickableCardHoverBackground
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.background = '#ffffff'
                            }}
                            style={{
                              height: 24,
                              width: 24,
                              border: '1px solid #e5e7eb',
                              borderRadius: 4,
                              background: '#ffffff',
                              color: '#4b5563',
                              padding: 0,
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            X
                          </button>
                          <button
                            type="button"
                            aria-label="Confirmar exclusão de negócio"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDeleteNegocio(negocio.id)
                            }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.background = interactionTheme.clickableCardHoverBackground
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.background = '#ffffff'
                            }}
                            style={{
                              height: 24,
                              width: 24,
                              border: '1px solid #e5e7eb',
                              borderRadius: 4,
                              background: '#ffffff',
                              color: '#4b5563',
                              padding: 0,
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={negocio.id}
                    onClick={() => {
                      navigate(`/negocios/${negocio.leadId}${location.search}`, {
                        state: {
                          initialLeadTab: 'negocios',
                          initialBusinessId: negocio.id,
                          initialBusinessTab: 'informacoes'
                        }
                      })
                    }}
                    style={{
                      height: NEGOCIOS_TABLE_ROW_HEIGHT_PX,
                      borderBottom: '1px solid #f3f4f6',
                      background:
                        isHovered || isSelected
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredNegocioId(negocio.id)}
                    onMouseLeave={() => setHoveredNegocioId(null)}
                  >
                    <td style={{ padding: '14px 16px', color: '#111827' }}>
                      {negocio.title ?? 'Negócio sem nome'}
                    </td>
                    <td
                      style={{
                        padding: wrappedBusinessLeadNames[negocio.id]
                          ? '6px 16px'
                          : '14px 16px',
                        color: '#111827'
                      }}
                    >
                      <span
                        ref={(element) => {
                          setBusinessLeadNameRef(negocio.id, element)
                        }}
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          lineHeight: 1.25,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word'
                        }}
                      >
                        {leadName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {businessTypeLabel === '-' ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#7c3aed',
                            whiteSpace: 'nowrap',
                            background: '#ede9fe',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1
                          }}
                        >
                          <span style={tagContentStyle}>{businessTypeLabel}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#2563eb',
                          whiteSpace: 'nowrap',
                          background: '#dbeafe',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1
                        }}
                      >
                        <span style={tagContentStyle}>{getLeadStageLabel(negocio.stage)}</span>
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: businessLifecycleTagPresentation.textColor,
                          whiteSpace: 'nowrap',
                          background: businessLifecycleTagPresentation.background,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1
                        }}
                      >
                        <span style={tagContentStyle}>{businessLifecycleTagPresentation.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {temperatureTagPresentation.label === '-' ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: temperatureTagPresentation.textColor,
                            whiteSpace: 'nowrap',
                            background: `${temperatureTagPresentation.textColor}44`,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1
                          }}
                        >
                          {temperatureTagPresentation.icon ? (
                            <span style={tagIconStyle}>{temperatureTagPresentation.icon}</span>
                          ) : null}
                          <span style={tagContentStyle}>{temperatureTagPresentation.label}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {formatLeadValue(negocio.value) === '-' ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#166534',
                            whiteSpace: 'nowrap',
                            background: '#dcfce7',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1
                          }}
                        >
                          <span style={tagContentStyle}>{formatLeadValue(negocio.value)}</span>
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#111827',
                        textAlign: 'left'
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Excluir negócio"
                          onClick={() => {
                            setConfirmingDeleteNegocioId(negocio.id)
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.background = interactionTheme.clickableCardHoverBackground
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.background = '#ffffff'
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            border: '1px solid #e5e7eb',
                            borderRadius: 4,
                            background: '#ffffff',
                            color: '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!isLoading && !error && sortedNegocios.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '14px 16px', color: '#6b7280' }}>
                    Nenhum negócio encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            color: '#6b7280',
            fontSize: 13,
            padding: '0 8px'
          }}
        >
          <span>
            {sortedNegocios.length} negócio{sortedNegocios.length === 1 ? '' : 's'}
          </span>
        </div>

        {isLoading ? <p style={{ margin: '12px 0 0', color: '#4b5563' }}>Carregando...</p> : null}
        {error ? <p style={{ margin: '12px 0 0', color: '#b91c1c' }}>{error}</p> : null}

        {isBusinessPanelOpen ? (
          <button
            type="button"
            aria-label={isCreateBusinessMode ? 'Fechar criação de negócio' : 'Fechar negócio aberto'}
            onClick={() => navigate('/negocios')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: leadPanelWidth,
              bottom: 0,
              zIndex: 20,
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              cursor: 'default'
            }}
          />
        ) : null}

        {isBusinessPanelOpen ? (
          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: leadPanelWidth,
              zIndex: 30,
              borderLeft: '2px solid #edf1f5',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform: isLeadPanelEntering ? 'translateX(0)' : 'translateX(100%)',
              transition: `transform ${leadPanelTransitionMs}ms ease`
            }}
          >
            {isCreateBusinessMode ? (
              <section
                style={{
                  height: '100%',
                  minHeight: 0,
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                      Novo negócio
                    </h2>
                  </div>

                  <button
                    type="button"
                    aria-label="Fechar criação de negócio"
                    onClick={() => navigate('/negocios')}
                    style={{
                      height: 28,
                      minWidth: 28,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#6b7280',
                      padding: '0 8px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1
                    }}
                  >
                    X
                  </button>
                </div>

                {businessCreateError ? (
                  <p style={{ margin: 0, color: '#b91c1c' }}>{businessCreateError}</p>
                ) : null}

                <article
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: 24,
                    background: '#ffffff',
                    display: 'grid',
                    gap: 18,
                    maxWidth: 760,
                    overflowY: 'auto'
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px minmax(0, 1fr)',
                      rowGap: 10,
                      columnGap: 16,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Lead</span>
                    <select
                      value={businessCreateDraft.leadId}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({
                          ...current,
                          leadId: event.target.value
                        }))
                      }
                      style={{
                        height: 36,
                        maxWidth: 360,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        fontSize: 14,
                        color: '#111827',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecione</option>
                      {activeLeads.map((lead, index) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name?.trim() || `Lead ${index + 1}`}
                        </option>
                      ))}
                    </select>

                    <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Tipo</span>
                    <select
                      value={businessCreateDraft.negotiationType}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({
                          ...current,
                          negotiationType: event.target.value as '' | NegotiationType
                        }))
                      }
                      style={{
                        height: 36,
                        maxWidth: 240,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        fontSize: 14,
                        color: '#111827',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecione</option>
                      <option value="service">Serviço</option>
                      <option value="product">Produto</option>
                    </select>

                    <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Nome</span>
                    <input
                      type="text"
                      placeholder="Nome"
                      value={businessCreateDraft.title}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({ ...current, title: event.target.value }))
                      }
                      style={{
                        height: 36,
                        maxWidth: 360,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        color: '#111827',
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />

                    <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Etapa</span>
                    <select
                      value={businessCreateDraft.stage}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({
                          ...current,
                          stage: event.target.value as LeadStage
                        }))
                      }
                      style={{
                        height: 36,
                        maxWidth: 240,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        fontSize: 14,
                        color: '#111827',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="NEW">Novo</option>
                      <option value="CONTACTED">Contatado</option>
                      <option value="QUALIFIED">Qualificado</option>
                      <option value="PROPOSAL_SENT">Proposta enviada</option>
                      <option value="NEGOTIATION">Negociação</option>
                      <option value="WON">Ganho</option>
                      <option value="LOST">Perdido</option>
                    </select>

                    <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Temperatura</span>
                    <select
                      value={businessCreateDraft.temperature}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({
                          ...current,
                          temperature: event.target.value as '' | NegotiationTemperature
                        }))
                      }
                      style={{
                        height: 36,
                        maxWidth: 240,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        fontSize: 14,
                        color: '#111827',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecione</option>
                      <option value="hot">Quente</option>
                      <option value="warm">Morno</option>
                      <option value="cold">Frio</option>
                    </select>

                    <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Valor (R$)</span>
                    <input
                      type="text"
                      value={businessCreateDraft.value}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({
                          ...current,
                          value: sanitizeLeadValueInput(event.target.value)
                        }))
                      }
                      inputMode="decimal"
                      style={{
                        height: 36,
                        maxWidth: 360,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        color: '#111827',
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Notas</label>
                    <textarea
                      placeholder="Escreva uma observação..."
                      value={businessCreateDraft.notes}
                      onChange={(event) =>
                        setBusinessCreateDraft((current) => ({ ...current, notes: event.target.value }))
                      }
                      style={{
                        width: '100%',
                        minHeight: 132,
                        border: '1px solid #d7dce4',
                        borderRadius: 10,
                        padding: '12px 14px',
                        color: '#111827',
                        fontSize: 17 / 1.2,
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setBusinessCreateDraft(initialBusinessCreateDraft)
                        setBusinessCreateError(null)
                        navigate('/negocios')
                      }}
                      style={{
                        minWidth: 120,
                        height: 42,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateBusiness()
                      }}
                      disabled={!canCreateBusiness}
                      style={{
                        minWidth: 120,
                        height: 42,
                        border: 'none',
                        borderRadius: 8,
                        background: '#1f7a4d',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: canCreateBusiness ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </article>
              </section>
            ) : (
              <LeadPage onLeadUpdated={handleLeadUpdated} />
            )}
          </aside>
        ) : null}
      </div>
    </section>
  )
}
