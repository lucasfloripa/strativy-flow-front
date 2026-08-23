import { ChevronDown, ListFilter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { DelayedTooltip } from '../../core/components/DelayedTooltip'
import { DesktopTableSkeleton } from '../../core/components/DesktopTableSkeleton'
import { MobileListSkeleton } from '../../core/components/MobileListSkeleton'
import { TotalCount } from '../../core/components/TotalCount'
import { getLeadSourceTagPresentation } from '../../core/components/leadSourceTagPresentation'
import { formatDateTime, parseApiDateToBrowserDate } from '../../core/utils/dateTime'
import { HomeService } from '../../features/home/services/HomeService'
import type {
  DashboardConversation,
  DashboardConversationFilter,
  DashboardConversationStatus
} from '../../features/home/types/home.types'
import LeadPage from '../LeadPage'

const conversationFilters: Array<{
  key: DashboardConversationFilter
  label: string
}> = [
  { key: 'all', label: 'Todas' },
  { key: 'new', label: 'Novos' },
  { key: 'today', label: 'Para hoje' },
  { key: 'noResponse24h', label: 'Sem respostas 24h+' }
]

type ConversationSortKey = 'lead' | 'dateTime' | 'runtimeMode' | 'status' | 'source'
type ConversationSortDirection = 'asc' | 'desc'
type ConversationStatusSortValue = DashboardConversationStatus | 'none'
type ConversationFilterSection = 'runtimeMode' | 'status' | 'source'

const rotateValues = <T extends string>(values: T[], focus: T | null): T[] => {
  const focusIndex = focus ? values.indexOf(focus) : -1

  if (focusIndex <= 0) {
    return values
  }

  return [...values.slice(focusIndex), ...values.slice(0, focusIndex)]
}

const getConversationStatusSortValue = (
  status: DashboardConversationStatus | null
): ConversationStatusSortValue => status ?? 'none'

const getConversationSourceSortValue = (source?: string | null): string => {
  const normalizedSource = (source ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '')

  if (normalizedSource === 'instagram' || normalizedSource === 'instagramdirect') {
    return 'direct'
  }

  return normalizedSource || 'none'
}

const getRuntimeModeLabel = (value: DashboardConversation['runtimeMode']): string =>
  value === 'HUMAN' ? 'Humano' : 'Automação'

const getConversationStatusLabel = (value: ConversationStatusSortValue): string => {
  if (value === 'new') return 'Novo'
  if (value === 'last72h') return '72h'
  if (value === 'today') return 'Para Hoje'
  if (value === 'noResponse24h') return '24h+'
  return 'Sem status'
}

const parseConversationFilter = (
  value: string | null
): DashboardConversationFilter => {
  if (
    value === 'new' ||
    value === 'today' ||
    value === 'noResponse24h'
  ) {
    return value
  }

  return 'all'
}

const normalizeSearchValue = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const getLastMessageLabel = (conversation: DashboardConversation): string => {
  const content = conversation.lastMessage?.trim() || 'Mensagem sem texto'
  return conversation.lastMessageDirection === 'INBOUND'
    ? `Lead: ${content}`
    : conversation.lastMessageDirection === 'AUTOMATIC'
      ? `Sistema: ${content}`
      : `Você: ${content}`
}

const getFilterOptionStyle = (isSelected: boolean) => ({
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
  WebkitTapHighlightColor: 'transparent'
})

const getFilterGroupButtonStyle = (isSelected: boolean) => ({
  ...getFilterOptionStyle(isSelected),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8
})

const SourceTag = ({ source }: { source?: string | null }) => {
  const presentation = getLeadSourceTagPresentation(source, 'Não informada')

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: presentation.textColor,
        whiteSpace: 'nowrap',
        background: presentation.backgroundColor,
        border: `1px solid ${presentation.borderColor}`,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px 12px',
        lineHeight: 1.1,
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {presentation.icon ? (
        <span style={{ display: 'inline-flex', marginRight: 4, lineHeight: 0 }}>
          {presentation.icon}
        </span>
      ) : null}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {presentation.label}
      </span>
    </span>
  )
}

const StatusTag = ({ status }: { status: DashboardConversationStatus | null }) => {
  const presentation = status === 'new'
    ? { label: 'Novo', color: '#eab308', background: '#fef3c7' }
    : status === 'last72h'
      ? { label: '72h', color: '#047857', background: '#d1fae5' }
      : status === 'today'
        ? { label: 'Para Hoje', color: '#b45309', background: '#fef3c7' }
        : status === 'noResponse24h'
          ? { label: '24h+', color: '#b91c1c', background: '#fee2e2' }
          : { label: '-', color: '#6b7280', background: '#f3f4f6' }

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: presentation.color,
        whiteSpace: 'nowrap',
        background: presentation.background,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px 12px',
        lineHeight: 1
      }}
    >
      {presentation.label}
    </span>
  )
}

const LastContactTag = ({ value }: { value: string | Date | null }) => {
  const parsedDate = parseApiDateToBrowserDate(value)
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
  const presentation = !parsedDate
    ? { color: '#6b7280', background: '#f3f4f6' }
    : parsedDate.getTime() < twentyFourHoursAgo
      ? { color: '#b91c1c', background: '#fee2e2' }
      : { color: '#166534', background: '#dcfce7' }

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: presentation.color,
        whiteSpace: 'nowrap',
        background: presentation.background,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px 12px',
        lineHeight: 1.1
      }}
    >
      {parsedDate ? formatDateTime(parsedDate) : '-'}
    </span>
  )
}

const RuntimeModeTag = ({ runtimeMode }: { runtimeMode: 'HUMAN' | 'AUTOMATION' }) => {
  const isHuman = runtimeMode === 'HUMAN'

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: isHuman ? '#166534' : '#475569',
        whiteSpace: 'nowrap',
        background: isHuman ? '#dcfce7' : '#e2e8f0',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px 12px',
        lineHeight: 1
      }}
    >
      {isHuman ? 'Humano' : 'Automação'}
    </span>
  )
}

export default function ConversasPage() {
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120
  const { isMobile } = useViewportBreakpoint()
  const navigate = useNavigate()
  const { leadId } = useParams<{ leadId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [selectedFilter, setSelectedFilter] = useState<DashboardConversationFilter>(() =>
    parseConversationFilter(searchParams.get('filter'))
  )
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isSearchInputFocused, setIsSearchInputFocused] = useState<boolean>(false)
  const [isFiltersButtonHovered, setIsFiltersButtonHovered] = useState<boolean>(false)
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState<boolean>(false)
  const [expandedFilterSection, setExpandedFilterSection] = useState<ConversationFilterSection | null>(null)
  const [hoveredFilterOption, setHoveredFilterOption] = useState<ConversationFilterSection | null>(null)
  const [selectedRuntimeModeFilters, setSelectedRuntimeModeFilters] = useState<DashboardConversation['runtimeMode'][]>([])
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<ConversationStatusSortValue[]>([])
  const [selectedSourceFilters, setSelectedSourceFilters] = useState<string[]>([])
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null)
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [reloadVersion, setReloadVersion] = useState<number>(0)
  const [sortKey, setSortKey] = useState<ConversationSortKey>('dateTime')
  const [sortDirection, setSortDirection] = useState<ConversationSortDirection>('desc')
  const [statusSortFocus, setStatusSortFocus] = useState<ConversationStatusSortValue | null>(null)
  const [sourceSortFocus, setSourceSortFocus] = useState<string | null>(null)
  const isLeadSelected = Boolean(leadId)

  useEffect(() => {
    const routeFilter = parseConversationFilter(searchParams.get('filter'))
    setSelectedFilter((currentFilter) =>
      currentFilter === routeFilter ? currentFilter : routeFilter
    )
  }, [searchParams])

  useEffect(() => {
    if (!isLeadSelected) {
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
  }, [isLeadSelected])

  useEffect(() => {
    let isActive = true

    const loadConversations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await HomeService.getDashboardConversations(selectedFilter)
        if (isActive) {
          setConversations(response.items)
        }
      } catch {
        if (isActive) {
          setConversations([])
          setError('Não foi possível carregar as conversas.')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadConversations()
    return () => {
      isActive = false
    }
  }, [reloadVersion, selectedFilter])

  const normalizedSearchTerm = normalizeSearchValue(searchTerm)
  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch = !normalizedSearchTerm ||
      normalizeSearchValue(conversation.leadName).includes(normalizedSearchTerm)
    const matchesRuntimeMode = selectedRuntimeModeFilters.length === 0 ||
      selectedRuntimeModeFilters.includes(conversation.runtimeMode)
    const matchesStatus = selectedStatusFilters.length === 0 ||
      selectedStatusFilters.includes(getConversationStatusSortValue(conversation.status))
    const matchesSource = selectedSourceFilters.length === 0 ||
      selectedSourceFilters.includes(getConversationSourceSortValue(conversation.source))

    return matchesSearch && matchesRuntimeMode && matchesStatus && matchesSource
  })
  const orderedStatusValues: ConversationStatusSortValue[] = [
    'new',
    'last72h',
    'today',
    'noResponse24h',
    'none'
  ]
  const availableStatusSortValues = orderedStatusValues.filter((status) =>
    conversations.some(
      (conversation) => getConversationStatusSortValue(conversation.status) === status
    )
  )
  const availableSourceSortValues = [...new Set(
    conversations.map((conversation) =>
      getConversationSourceSortValue(conversation.source)
    )
  )].sort((first, second) => first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }))
  const availableRuntimeModeFilterValues: DashboardConversation['runtimeMode'][] = [
    'HUMAN',
    'AUTOMATION'
  ].filter((runtimeMode): runtimeMode is DashboardConversation['runtimeMode'] =>
    conversations.some((conversation) => conversation.runtimeMode === runtimeMode)
  )
  const availableSourceFilterOptions = availableSourceSortValues.map((value) => {
    const source = conversations.find(
      (conversation) => getConversationSourceSortValue(conversation.source) === value
    )?.source

    return {
      value,
      label: getLeadSourceTagPresentation(source, 'Não informada').label
    }
  })
  const statusSortRank = new Map(
    rotateValues(availableStatusSortValues, statusSortFocus).map((status, index) => [status, index])
  )
  const sourceSortRank = new Map(
    rotateValues(availableSourceSortValues, sourceSortFocus).map((source, index) => [source, index])
  )
  const sortedConversations = [...filteredConversations].sort((first, second) => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1
    let comparison = 0

    if (sortKey === 'lead') {
      comparison = first.leadName.localeCompare(second.leadName, 'pt-BR', { sensitivity: 'base' })
    } else if (sortKey === 'dateTime') {
      const firstDate = parseApiDateToBrowserDate(first.lastInboundAt)?.getTime() ?? 0
      const secondDate = parseApiDateToBrowserDate(second.lastInboundAt)?.getTime() ?? 0
      comparison = firstDate - secondDate
    } else if (sortKey === 'runtimeMode') {
      comparison = first.runtimeMode.localeCompare(second.runtimeMode)
    } else if (sortKey === 'status') {
      comparison =
        (statusSortRank.get(getConversationStatusSortValue(first.status)) ?? Number.MAX_SAFE_INTEGER) -
        (statusSortRank.get(getConversationStatusSortValue(second.status)) ?? Number.MAX_SAFE_INTEGER)
    } else {
      comparison =
        (sourceSortRank.get(getConversationSourceSortValue(first.source)) ?? Number.MAX_SAFE_INTEGER) -
        (sourceSortRank.get(getConversationSourceSortValue(second.source)) ?? Number.MAX_SAFE_INTEGER)
    }

    if (comparison !== 0) {
      return comparison * directionFactor
    }

    return first.leadName.localeCompare(second.leadName, 'pt-BR', { sensitivity: 'base' })
  })
  const selectedFilterLabel = conversationFilters.find(
    (filterOption) => filterOption.key === selectedFilter
  )?.label

  const openConversation = (leadId: string) => {
    navigate(`/conversas/${leadId}`, { state: { initialLeadTab: 'chat' } })
  }

  const handleSortToggle = (nextSortKey: ConversationSortKey) => {
    if (nextSortKey === 'status' || nextSortKey === 'source') {
      const availableValues = nextSortKey === 'status'
        ? availableStatusSortValues
        : availableSourceSortValues
      const currentFocus = sortKey === nextSortKey
        ? nextSortKey === 'status' ? statusSortFocus : sourceSortFocus
        : null
      const currentIndex = currentFocus ? availableValues.indexOf(currentFocus) : -1
      const nextFocus = availableValues[(currentIndex + 1) % availableValues.length] ?? null

      setSortKey(nextSortKey)
      setSortDirection('asc')
      if (nextSortKey === 'status') {
        setStatusSortFocus(nextFocus as ConversationStatusSortValue | null)
      } else {
        setSourceSortFocus(nextFocus)
      }
      return
    }

    if (sortKey === nextSortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  const getSortIndicator = (targetSortKey: ConversationSortKey): string => {
    if (sortKey !== targetSortKey) {
      return '↕'
    }

    if (targetSortKey === 'status' || targetSortKey === 'source') {
      return '↓'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getHeaderSortButtonStyle = (
    targetSortKey: ConversationSortKey,
    align: 'left' | 'center' = 'left'
  ) => ({
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: '#4b5563',
    fontSize: 13,
    fontWeight: sortKey === targetSortKey ? 700 : 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: align === 'center' ? 'center' : 'flex-start',
    gap: 6
  })

  const applyFilter = (filter: DashboardConversationFilter) => {
    setSelectedFilter(filter)
    setIsFiltersPanelOpen(false)

    if (filter === 'all') {
      setSearchParams({})
      return
    }

    setSearchParams({ filter })
  }

  const toggleMultiFilterValue = <T extends string>(
    currentValues: T[],
    value: T,
    setValues: (nextValues: T[]) => void
  ) => {
    setValues(
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value]
    )
  }

  const activeFiltersCount =
    Number(selectedRuntimeModeFilters.length > 0) +
    Number(selectedStatusFilters.length > 0) +
    Number(selectedSourceFilters.length > 0)

  const renderStatus = () => {
    if (isLoading) {
      return <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Carregando conversas...</div>
    }

    if (error) {
      return <div style={{ color: '#b91c1c', fontSize: 14, padding: 16, textAlign: 'center' }}>{error}</div>
    }

    if (filteredConversations.length === 0) {
      return <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Nenhuma conversa encontrada.</div>
    }

    return null
  }

  const filterPanel = isFiltersPanelOpen ? (
    <>
      <button
        type="button"
        aria-label="Fechar painel de filtros"
        onClick={() => {
          setIsFiltersPanelOpen(false)
          setExpandedFilterSection(null)
          setHoveredFilterOption(null)
        }}
        style={{ position: 'absolute', inset: 0, border: 'none', background: 'transparent', zIndex: 35, cursor: 'default' }}
      />
      <section
        style={{
          position: 'absolute',
          top: isMobile ? 150 : 68,
          right: isMobile ? 16 : 20,
          width: isMobile ? 'min(250px, calc(100vw - 32px))' : 250,
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
          {([
            { key: 'runtimeMode' as const, label: 'Atendimento' },
            { key: 'status' as const, label: 'Status' },
            { key: 'source' as const, label: 'Origem' }
          ]).map((section) => {
            const isSelected = section.key === 'runtimeMode'
              ? selectedRuntimeModeFilters.length > 0
              : section.key === 'status'
                ? selectedStatusFilters.length > 0
                : selectedSourceFilters.length > 0
            const isExpanded = expandedFilterSection === section.key

            return (
              <div key={section.key} style={{ display: 'grid', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setExpandedFilterSection((current) =>
                    current === section.key ? null : section.key
                  )}
                  onMouseEnter={() => setHoveredFilterOption(section.key)}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterGroupButtonStyle(
                    isSelected || isExpanded || hoveredFilterOption === section.key
                  )}
                >
                  <span>{section.label}</span>
                  <ChevronDown size={14} />
                </button>

                {isExpanded ? (
                  <div style={{ display: 'grid', gap: 4, paddingLeft: 8 }}>
                    {section.key === 'runtimeMode'
                      ? availableRuntimeModeFilterValues.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleMultiFilterValue(
                              selectedRuntimeModeFilters,
                              value,
                              setSelectedRuntimeModeFilters
                            )}
                            style={getFilterOptionStyle(selectedRuntimeModeFilters.includes(value))}
                          >
                            {getRuntimeModeLabel(value)}
                          </button>
                        ))
                      : section.key === 'status'
                        ? availableStatusSortValues.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleMultiFilterValue(
                                selectedStatusFilters,
                                value,
                                setSelectedStatusFilters
                              )}
                              style={getFilterOptionStyle(selectedStatusFilters.includes(value))}
                            >
                              {getConversationStatusLabel(value)}
                            </button>
                          ))
                        : availableSourceFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleMultiFilterValue(
                                selectedSourceFilters,
                                option.value,
                                setSelectedSourceFilters
                              )}
                              style={getFilterOptionStyle(selectedSourceFilters.includes(option.value))}
                            >
                              {option.label}
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
  ) : null

  const activeFilterTags = [
    ...(selectedFilter !== 'all' && selectedFilterLabel ? [{
      key: `route-${selectedFilter}`,
      label: selectedFilterLabel,
      textColor: '#166534',
      background: '#dcfce7',
      onRemove: () => applyFilter('all')
    }] : []),
    ...selectedRuntimeModeFilters.map((value) => ({
      key: `runtime-${value}`,
      label: `Atendimento: ${getRuntimeModeLabel(value)}`,
      textColor: '#475569',
      background: '#e2e8f0',
      onRemove: () => setSelectedRuntimeModeFilters((current) =>
        current.filter((item) => item !== value)
      )
    })),
    ...selectedStatusFilters.map((value) => ({
      key: `status-${value}`,
      label: `Status: ${getConversationStatusLabel(value)}`,
      textColor: '#b45309',
      background: '#fef3c7',
      onRemove: () => setSelectedStatusFilters((current) =>
        current.filter((item) => item !== value)
      )
    })),
    ...selectedSourceFilters.map((value) => ({
      key: `source-${value}`,
      label: `Origem: ${availableSourceFilterOptions.find((option) => option.value === value)?.label ?? value}`,
      textColor: '#4338ca',
      background: '#e0e7ff',
      onRemove: () => setSelectedSourceFilters((current) =>
        current.filter((item) => item !== value)
      )
    }))
  ]
  const activeFilterTag = activeFilterTags.length > 0 ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: isMobile ? 0 : 10, padding: isMobile ? 0 : '0 2px' }}>
      {activeFilterTags.map((tag) => (
        <span key={tag.key} style={{ fontSize: 12, fontWeight: 700, color: tag.textColor, background: tag.background, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', lineHeight: 1 }}>
          <span>{tag.label}</span>
          <button type="button" aria-label={`Remover filtro ${tag.label}`} onClick={tag.onRemove} style={{ border: 'none', background: 'transparent', color: tag.textColor, padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>
            X
          </button>
        </span>
      ))}
    </div>
  ) : null

  const searchInput = (
    <input
      type="search"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      onFocus={() => setIsSearchInputFocused(true)}
      onBlur={() => setIsSearchInputFocused(false)}
      placeholder="Buscar Lead"
      aria-label="Buscar Lead"
      style={{
        width: isMobile ? '100%' : 220,
        height: isMobile ? 52 : 38,
        border: `1px solid ${isSearchInputFocused ? interactionTheme.inputFocusBorderColor : '#d1d5db'}`,
        borderRadius: isMobile ? 14 : 8,
        padding: isMobile ? '0 16px' : '0 12px',
        background: '#ffffff',
        color: '#111827',
        boxShadow: isSearchInputFocused ? interactionTheme.inputFocusBoxShadow : 'none',
        outline: 'none',
        fontSize: isMobile ? 16 : undefined,
        boxSizing: 'border-box'
      }}
    />
  )

  const filterButton = (
    <button
      type="button"
      onClick={() => setIsFiltersPanelOpen((current) => !current)}
      onMouseEnter={() => setIsFiltersButtonHovered(true)}
      onMouseLeave={() => setIsFiltersButtonHovered(false)}
      aria-label="Abrir filtros"
      style={{
        height: isMobile ? 52 : 38,
        width: isMobile ? 52 : 38,
        border: '1px solid #d1d5db',
        borderRadius: isMobile ? 14 : 8,
        background: isFiltersPanelOpen || isFiltersButtonHovered || selectedFilter !== 'all' || activeFiltersCount > 0
          ? interactionTheme.clickableCardHoverBackground
          : '#ffffff',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <ListFilter size={isMobile ? 20 : 16} color="#111827" />
    </button>
  )

  if (isMobile) {
    return (
      <section style={{ height: '100%', padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 18, background: '#fafbfd', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }}>Conversas</h1>
          <span style={{ width: 52, color: '#6b7280', fontSize: 13, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
            <TotalCount isLoading={isLoading} total={filteredConversations.length} />
          </span>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 52px', gap: 12 }}>
          {searchInput}
          {filterButton}
        </div>
        {filterPanel}
        {activeFilterTag}
        <div style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }}>
          {isLoading ? <MobileListSkeleton /> : null}
          {!isLoading && sortedConversations.map((conversation) => (
            <article
              key={conversation.leadId}
              onClick={() => openConversation(conversation.leadId)}
              onMouseEnter={() => setHoveredConversationId(conversation.leadId)}
              onMouseLeave={() => setHoveredConversationId(null)}
              style={{
                background: hoveredConversationId === conversation.leadId ? interactionTheme.clickableCardHoverBackground : '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: 18,
                boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                padding: 16,
                display: 'grid',
                gap: 16,
                cursor: 'pointer',
                transition: 'background 120ms ease'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 12 }}>
                  <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conversation.leadName}
                  </h2>
                  <StatusTag status={conversation.status} />
                </div>
                <span style={{ display: 'block', marginTop: 12, color: '#4b5563', fontSize: 13, fontWeight: 700 }}>Última mensagem</span>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {getLastMessageLabel(conversation)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ color: '#4b5563', fontSize: 13, fontWeight: 700 }}>Último contato</span>
                  <div style={{ marginTop: 6 }}>
                    <LastContactTag value={conversation.lastInboundAt} />
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <SourceTag source={conversation.source} />
                </div>
              </div>
            </article>
          ))}
          {!isLoading ? renderStatus() : null}
        </div>
        {isLeadSelected ? (
          <aside
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              background: '#ffffff',
              overflow: 'hidden',
              transform: isLeadPanelEntering ? 'translateX(0)' : 'translateX(100%)',
              transition: `transform ${leadPanelTransitionMs}ms ease`
            }}
          >
            <LeadPage onLeadUpdated={() => setReloadVersion((version) => version + 1)} />
          </aside>
        ) : null}
      </section>
    )
  }

  return (
    <section style={{ height: '100vh', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#f3f4f6', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '4px 2px' }}>
        <h1 style={{ margin: 0, color: '#111827', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Conversas</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {searchInput}
          {filterButton}
        </div>
      </header>
      {filterPanel}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeFilterTag}
        <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, overflowY: 'auto', maxHeight: '100%', minHeight: 0, boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button type="button" onClick={() => handleSortToggle('lead')} style={getHeaderSortButtonStyle('lead')}>
                    Lead <span>{getSortIndicator('lead')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Última Mensagem
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('dateTime')} style={getHeaderSortButtonStyle('dateTime', 'center')}>
                    Último contato <span>{getSortIndicator('dateTime')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('runtimeMode')} style={getHeaderSortButtonStyle('runtimeMode', 'center')}>
                    Atendimento <span>{getSortIndicator('runtimeMode')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('status')} style={getHeaderSortButtonStyle('status', 'center')}>
                    Status <span>{getSortIndicator('status')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button type="button" onClick={() => handleSortToggle('source')} style={getHeaderSortButtonStyle('source', 'center')}>
                    Origem <span>{getSortIndicator('source')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <DesktopTableSkeleton
                  columns={[
                    { width: '68%' },
                    { width: '84%' },
                    { width: '68%', align: 'center' },
                    { width: '72%', align: 'center' },
                    { width: '68%', align: 'center' },
                    { width: '66%', align: 'center' }
                  ]}
                />
              ) : null}
              {!isLoading && sortedConversations.map((conversation) => (
                <tr
                  key={conversation.leadId}
                  onClick={() => openConversation(conversation.leadId)}
                  onMouseEnter={() => setHoveredConversationId(conversation.leadId)}
                  onMouseLeave={() => setHoveredConversationId(null)}
                  style={{ borderBottom: '1px solid #f3f4f6', background: hoveredConversationId === conversation.leadId ? interactionTheme.clickableCardHoverBackground : '#ffffff', cursor: 'pointer', transition: 'background 120ms ease' }}
                >
                  <td style={{ padding: '14px 12px', color: '#111827', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <DelayedTooltip content={conversation.leadName}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.leadName}</span>
                    </DelayedTooltip>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#64748b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <DelayedTooltip content={getLastMessageLabel(conversation)}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLastMessageLabel(conversation)}</span>
                    </DelayedTooltip>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><LastContactTag value={conversation.lastInboundAt} /></td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><RuntimeModeTag runtimeMode={conversation.runtimeMode} /></td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><StatusTag status={conversation.status} /></td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><SourceTag source={conversation.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading ? renderStatus() : null}
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
          <TotalCount isLoading={isLoading} total={filteredConversations.length} />
        </div>
      </div>
      {isLeadSelected ? (
        <button
          type="button"
          aria-label="Fechar conversa aberta"
          onClick={() => navigate('/conversas')}
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
      {isLeadSelected ? (
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
          <LeadPage onLeadUpdated={() => setReloadVersion((version) => version + 1)} />
        </aside>
      ) : null}
    </section>
  )
}