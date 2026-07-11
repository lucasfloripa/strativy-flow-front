import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ListFilter,
  Trash2
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { getApiDateTimestamp, parseApiDateToBrowserDate } from '../../core/utils/dateTime'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import type {
  NegotiationFollowUpResponse,
  NegotiationResponse
} from '../../features/webhook/types/webhook.types'
import LeadPage from '../LeadPage'

type AgendaLocationState = {
  initialLeadTab?: 'negocios'
  initialBusinessId?: string
}

type AgendaFollowUpFilter = 'all' | 'none' | 'scheduled' | 'today' | 'overdue'

type AgendaVisualStatus = 'overdue' | 'today' | 'scheduled' | 'completed'

type AgendaSortKey = 'value' | 'lead' | 'negotiation' | 'dateTime' | 'status'
type AgendaSortDirection = 'asc' | 'desc'
type AgendaDateSortFocus = 'recentFirst' | 'oldestFirst' | 'noDateFirst'
type AgendaStatusSortFocus = 'overdue' | 'today' | 'scheduled' | 'completed'

const rotateValues = <T,>(values: T[], startValue: T | null): T[] => {
  if (!values.length || startValue === null) {
    return values
  }

  const startIndex = values.indexOf(startValue)
  if (startIndex < 0) {
    return values
  }

  return [...values.slice(startIndex), ...values.slice(0, startIndex)]
}

type AgendaRow = {
  followUpId: string
  leadId: string
  negotiationId: string
  leadName: string
  negotiationTitle: string
  value: string
  dueAt: string
  status: 'pending' | 'done' | 'canceled'
  leadIsFavorite: boolean
  leadState: 'active' | 'archived'
  leadCreatedAt: string | Date | null
}

type TagPresentation = {
  label: string
  textColor: string
  icon?: ReactNode
}

type AgendaFollowUpDraft = {
  leadId: string
  negotiationId: string
  value: string
  dueAt: string
}

const initialAgendaFollowUpDraft: AgendaFollowUpDraft = {
  leadId: '',
  negotiationId: '',
  value: '',
  dueAt: ''
}

const getFilterOptionStyle = (isSelected: boolean) => ({
  width: '100%',
  border: '1px solid transparent',
  background: isSelected ? interactionTheme.sidebarItemActiveBackground : 'transparent',
  color: isSelected ? interactionTheme.sidebarItemActiveColor : '#111827',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.05,
  padding: '7px 10px',
  borderRadius: 8,
  textAlign: 'left' as const,
  cursor: 'pointer'
})

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  const date = parseApiDateToBrowserDate(value)
  if (!date) {
    return '-'

  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const getAgendaVisualStatus = (
  status: AgendaRow['status'],
  dueAt: string
): AgendaVisualStatus => {
  if (status !== 'pending') {
    return 'completed'
  }

  const parsedDate = parseApiDateToBrowserDate(dueAt)
  if (!parsedDate) {
    return 'scheduled'
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (parsedDate < startOfToday) {
    return 'overdue'
  }

  if (parsedDate <= endOfToday) {
    return 'today'
  }

  return 'scheduled'
}

const getStatusPresentation = (status: AgendaVisualStatus): TagPresentation => {
  if (status === 'overdue') {
    return {
      label: 'Atrasado',
      textColor: '#ff2d2d',
      icon: <Clock3 size={12} color="#ff2d2d" />
    }
  }

  if (status === 'today') {
    return {
      label: 'Hoje',
      textColor: '#f59e0b',
      icon: <CalendarClock size={12} color="#f59e0b" />
    }
  }

  if (status === 'completed') {
    return {
      label: 'Concluído',
      textColor: '#16a34a',
      icon: <CheckCircle2 size={12} color="#16a34a" />
    }
  }

  return {
    label: 'Agendado',
    textColor: '#2563eb',
    icon: <CalendarClock size={12} color="#2563eb" />
  }
}

const getAgendaDateTagColors = (
  status: AgendaVisualStatus
): { textColor: string; background: string } => {
  if (status === 'overdue') {
    return {
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  if (status === 'today') {
    return {
      textColor: '#b45309',
      background: '#fef3c7'
    }
  }

  if (status === 'completed') {
    return {
      textColor: '#166534',
      background: '#dcfce7'
    }
  }

  return {
    textColor: '#1d4ed8',
    background: '#dbeafe'
  }
}

const matchesFollowUpFilter = (
  row: AgendaRow,
  filter: AgendaFollowUpFilter
): boolean => {
  if (filter === 'all') {
    return true
  }

  if (filter === 'none') {
    return false
  }

  const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)

  if (filter === 'overdue') {
    return visualStatus === 'overdue'
  }

  if (filter === 'today') {
    return visualStatus === 'today'
  }

  return visualStatus === 'scheduled'
}

const toSafeText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

const toSafeFollowUpStatus = (
  value: unknown
): AgendaRow['status'] => {
  if (value === 'pending' || value === 'done' || value === 'canceled') {
    return value
  }

  return 'pending'
}

const toSortableTimestamp = (value: string | Date | null | undefined): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY
  }

  return timestamp
}

const getAgendaStatusSortRank = (
  row: AgendaRow,
  sortFocus: AgendaStatusSortFocus,
  availableStatusSortValues: AgendaStatusSortFocus[]
): number => {
  const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)
  const orderedStatuses = rotateValues(availableStatusSortValues, sortFocus)
  const statusIndex = orderedStatuses.indexOf(visualStatus)

  if (statusIndex === -1) {
    return Number.MAX_SAFE_INTEGER
  }

  return statusIndex
}

export default function AgendaPage() {
  const agendaItemsPerPage = 12
  const paginationWindowSize = 3
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120

  const navigate = useNavigate()
  const location = useLocation()
  const { leadId } = useParams<{ leadId?: string }>()
  const searchParams = new URLSearchParams(location.search)
  const requestedFollowUpFilter = searchParams.get('followUp')
  const initialFollowUpFilter: AgendaFollowUpFilter =
    requestedFollowUpFilter === 'none' ||
    requestedFollowUpFilter === 'scheduled' ||
    requestedFollowUpFilter === 'today' ||
    requestedFollowUpFilter === 'overdue'
      ? requestedFollowUpFilter
      : 'all'

  const { data: leadsData, isLoading: isLeadsLoading, error: leadsError } = useLeadsBootstrap()
  const [negocios, setNegocios] = useState<NegotiationResponse[]>([])
  const [followUps, setFollowUps] = useState<NegotiationFollowUpResponse[]>([])
  const [isLoadingAgenda, setIsLoadingAgenda] = useState<boolean>(true)
  const [agendaError, setAgendaError] = useState<string | null>(null)

  const [isSearchInputFocused, setIsSearchInputFocused] = useState<boolean>(false)
  const [isFiltersButtonHovered, setIsFiltersButtonHovered] = useState<boolean>(false)
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState<boolean>(false)
  const [hoveredFilterOption, setHoveredFilterOption] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [followUpFilter, setFollowUpFilter] = useState<AgendaFollowUpFilter>(initialFollowUpFilter)
  const [isCreatingAgendaFollowUp, setIsCreatingAgendaFollowUp] = useState<boolean>(false)
  const [isAgendaFollowUpPanelEntering, setIsAgendaFollowUpPanelEntering] = useState<boolean>(false)
  const [shouldRefreshOnAgendaClose, setShouldRefreshOnAgendaClose] = useState<boolean>(false)
  const [agendaFollowUpError, setAgendaFollowUpError] = useState<string | null>(null)
  const [agendaFollowUpDraft, setAgendaFollowUpDraft] = useState<AgendaFollowUpDraft>(
    initialAgendaFollowUpDraft
  )

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hoveredFollowUpId, setHoveredFollowUpId] = useState<string | null>(null)
  const [confirmingDeleteFollowUpId, setConfirmingDeleteFollowUpId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<AgendaSortKey>('status')
  const [sortDirection, setSortDirection] = useState<AgendaSortDirection>('asc')
  const [dateSortFocus, setDateSortFocus] = useState<AgendaDateSortFocus>('oldestFirst')
  const [statusSortFocus, setStatusSortFocus] = useState<AgendaStatusSortFocus>('overdue')
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [shouldRefreshOnLeadClose, setShouldRefreshOnLeadClose] = useState<boolean>(false)
  const [agendaReloadVersion, setAgendaReloadVersion] = useState<number>(0)
  const previousIsAgendaFollowUpPanelOpenRef = useRef<boolean>(false)
  const previousIsLeadSelectedRef = useRef<boolean>(false)

  const activeFiltersCount =
    Number(followUpFilter !== 'all')

  const activeFilterTags = followUpFilter === 'all'
    ? []
    : [{
        key: `followup-${followUpFilter}`,
        label:
          followUpFilter === 'none'
            ? 'Sem follow-up'
            : followUpFilter === 'scheduled'
              ? 'Agendados'
              : followUpFilter === 'today'
                ? 'Hoje'
                : 'Atrasados',
        textColor:
          followUpFilter === 'none'
            ? '#475569'
            : followUpFilter === 'scheduled'
              ? '#1d4ed8'
              : followUpFilter === 'today'
                ? '#b45309'
                : '#b91c1c',
        background:
          followUpFilter === 'none'
            ? '#e2e8f0'
            : followUpFilter === 'scheduled'
              ? '#dbeafe'
              : followUpFilter === 'today'
                ? '#fef3c7'
                : '#fee2e2',
        onRemove: () => setFollowUpFilter('all')
      }]

  const isLeadSelected = Boolean(leadId)
  const selectedBusinessId =
    ((location.state as AgendaLocationState | null)?.initialBusinessId ?? null)

  const agendaFollowUpBusinesses = useMemo(
    () => negocios.filter((negocio) => negocio.leadId === agendaFollowUpDraft.leadId),
    [agendaFollowUpDraft.leadId, negocios]
  )
  const canConfirmAgendaFollowUp =
    Boolean(agendaFollowUpDraft.leadId) && Boolean(agendaFollowUpDraft.negotiationId)

  const leadsById = useMemo(
    () =>
      new Map((leadsData.leads ?? []).map((lead, index) => [
        // Keep a strict state union to avoid broad string inference.
        lead.id,
        {
          name: lead.name?.trim() || `Lead ${index + 1}`,
          isFavorite: Boolean(lead.isFavorite),
          state:
            (lead.state === 'archived' ? 'archived' : 'active') as
              | 'archived'
              | 'active',
          createdAt: lead.createdAt ?? null
        }
      ])),
    [leadsData.leads]
  )

  const userLeadIdSet = useMemo(
    () => new Set((leadsData.leads ?? []).map((lead) => lead.id)),
    [leadsData.leads]
  )

  useEffect(() => {
    setFollowUpFilter(initialFollowUpFilter)
  }, [initialFollowUpFilter])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoadingAgenda(true)
        setAgendaError(null)

        const [loadedNegocios, loadedFollowUps] = await Promise.all([
          WebhookService.loadNegotiations(),
          WebhookService.loadNegotiationFollowUps()
        ])

        if (!isMounted) {
          return
        }

        setNegocios(loadedNegocios)
        setFollowUps(loadedFollowUps)
      } catch (exception: unknown) {
        if (!isMounted) {
          return
        }

        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao carregar agenda.'

        setAgendaError(message)
        setNegocios([])
        setFollowUps([])
      } finally {
        if (isMounted) {
          setIsLoadingAgenda(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [agendaReloadVersion])

  const handleLeadUpdated = () => {
    setShouldRefreshOnLeadClose(true)
  }

  useEffect(() => {
    const wasLeadSelected = previousIsLeadSelectedRef.current

    if (wasLeadSelected && !isLeadSelected && shouldRefreshOnLeadClose) {
      setAgendaReloadVersion((current) => current + 1)
      setShouldRefreshOnLeadClose(false)
    }

    previousIsLeadSelectedRef.current = isLeadSelected
  }, [isLeadSelected, shouldRefreshOnLeadClose])

  useEffect(() => {
    const wasAgendaFollowUpPanelOpen = previousIsAgendaFollowUpPanelOpenRef.current

    if (
      wasAgendaFollowUpPanelOpen &&
      !isCreatingAgendaFollowUp &&
      shouldRefreshOnAgendaClose
    ) {
      setAgendaReloadVersion((current) => current + 1)
      setShouldRefreshOnAgendaClose(false)
      setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
      setAgendaFollowUpError(null)
    }

    previousIsAgendaFollowUpPanelOpenRef.current = isCreatingAgendaFollowUp
  }, [isCreatingAgendaFollowUp, shouldRefreshOnAgendaClose])

  useEffect(() => {
    if (!isCreatingAgendaFollowUp) {
      setIsAgendaFollowUpPanelEntering(false)
      return
    }

    setIsAgendaFollowUpPanelEntering(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsAgendaFollowUpPanelEntering(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isCreatingAgendaFollowUp, leadPanelTransitionMs])

  const handleCreateAgendaFollowUp = async () => {
    if (!agendaFollowUpDraft.leadId || !agendaFollowUpDraft.negotiationId) {
      setAgendaFollowUpError('Selecione o lead e o negócio.')
      return
    }

    if (!agendaFollowUpDraft.value.trim() || !agendaFollowUpDraft.dueAt) {
      setAgendaFollowUpError('Preencha o nome do follow-up e a data/hora.')
      return
    }

    try {
      setAgendaFollowUpError(null)

      await WebhookService.createNegotiationFollowUp({
        negotiationId: agendaFollowUpDraft.negotiationId,
        value: agendaFollowUpDraft.value.trim(),
        dueAt: new Date(agendaFollowUpDraft.dueAt).toISOString()
      })

      setShouldRefreshOnAgendaClose(true)
      setAgendaFollowUpDraft((currentDraft) => ({
        ...currentDraft,
        value: '',
        dueAt: ''
      }))
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao criar follow-up.'
      setAgendaFollowUpError(message)
    }
  }

  const closeAgendaFollowUpPanel = () => {
    setIsCreatingAgendaFollowUp(false)
    setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
    setAgendaFollowUpError(null)
  }

  const negociosByUser = useMemo(
    () => negocios.filter((negocio) => userLeadIdSet.has(negocio.leadId)),
    [negocios, userLeadIdSet]
  )

  const negocioById = useMemo(
    () => new Map(negociosByUser.map((negocio) => [negocio.id, negocio])),
    [negociosByUser]
  )

  const agendaRows = useMemo(() => {
    const rows: AgendaRow[] = []

    followUps.forEach((followUp) => {
      const negocio = negocioById.get(followUp.negotiationId)
      if (!negocio) {
        return
      }

      const leadData = leadsById.get(negocio.leadId)
      if (!leadData) {
        return
      }

      rows.push({
        followUpId: followUp.id,
        leadId: negocio.leadId,
        negotiationId: negocio.id,
        leadName: leadData.name,
        negotiationTitle: negocio.title?.trim() || 'Negócio sem nome',
        value: toSafeText(followUp.value),
        dueAt: toSafeText(followUp.dueAt),
        status: toSafeFollowUpStatus(followUp.status),
        leadIsFavorite: leadData.isFavorite,
        leadState: leadData.state,
        leadCreatedAt: leadData.createdAt
      })
    })

    return rows
  }, [followUps, negocioById, leadsById])

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const filteredAgendaRows = useMemo(
    () =>
      agendaRows.filter((row) => {
        const matchesSearch = !normalizedSearchTerm
          ? true
          : toSafeText(row.leadName).toLowerCase().includes(normalizedSearchTerm) ||
            toSafeText(row.negotiationTitle).toLowerCase().includes(normalizedSearchTerm) ||
            toSafeText(row.value).toLowerCase().includes(normalizedSearchTerm)
        const matchesFollowUp = matchesFollowUpFilter(row, followUpFilter)

        return matchesSearch && matchesFollowUp
      }),
    [agendaRows, followUpFilter, normalizedSearchTerm]
  )

  const availableDateSortValues = useMemo(() => {
    const values: AgendaDateSortFocus[] = ['oldestFirst', 'recentFirst']
    const hasMissingDates = filteredAgendaRows.some((row) => !Number.isFinite(getApiDateTimestamp(row.dueAt)))

    if (hasMissingDates) {
      values.push('noDateFirst')
    }

    return values
  }, [filteredAgendaRows])

  const availableStatusSortValues = useMemo(() => {
    const orderedStatuses: AgendaStatusSortFocus[] = ['overdue', 'today', 'scheduled', 'completed']

    return orderedStatuses.filter((status) =>
      filteredAgendaRows.some((row) => getAgendaVisualStatus(row.status, row.dueAt) === status)
    )
  }, [filteredAgendaRows])

  const sortedFilteredAgendaRows = useMemo(() => {
    return [...filteredAgendaRows].sort((firstRow, secondRow) => {
      const directionFactor = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'value') {
        return firstRow.value.localeCompare(secondRow.value, 'pt-BR', { sensitivity: 'base' }) * directionFactor
      }

      if (sortKey === 'lead') {
        return firstRow.leadName.localeCompare(secondRow.leadName, 'pt-BR', { sensitivity: 'base' }) * directionFactor
      }

      if (sortKey === 'negotiation') {
        return firstRow.negotiationTitle.localeCompare(secondRow.negotiationTitle, 'pt-BR', { sensitivity: 'base' }) * directionFactor
      }

      if (sortKey === 'dateTime') {
        const firstDate = getApiDateTimestamp(firstRow.dueAt)
        const secondDate = getApiDateTimestamp(secondRow.dueAt)
        const firstHasDate = Number.isFinite(firstDate)
        const secondHasDate = Number.isFinite(secondDate)

        if (dateSortFocus === 'noDateFirst') {
          if (!firstHasDate && secondHasDate) {
            return -1
          }

          if (firstHasDate && !secondHasDate) {
            return 1
          }

          if (!firstHasDate && !secondHasDate) {
            return 0
          }

          return secondDate - firstDate
        }

        if (!firstHasDate && secondHasDate) {
          return 1
        }

        if (firstHasDate && !secondHasDate) {
          return -1
        }

        if (!firstHasDate && !secondHasDate) {
          return 0
        }

        if (dateSortFocus === 'oldestFirst') {
          return firstDate - secondDate
        }

        return secondDate - firstDate
      }

        const statusRankDifference =
        getAgendaStatusSortRank(firstRow, statusSortFocus, availableStatusSortValues) -
        getAgendaStatusSortRank(secondRow, statusSortFocus, availableStatusSortValues)

      if (statusRankDifference !== 0) {
        return statusRankDifference
      }

      return toSortableTimestamp(firstRow.dueAt) - toSortableTimestamp(secondRow.dueAt)
    })
  }, [availableStatusSortValues, dateSortFocus, filteredAgendaRows, sortDirection, sortKey, statusSortFocus])

  const totalPages = Math.max(1, Math.ceil(sortedFilteredAgendaRows.length / agendaItemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * agendaItemsPerPage
  const paginatedAgendaRows = sortedFilteredAgendaRows.slice(
    pageStartIndex,
    pageStartIndex + agendaItemsPerPage
  )

  const firstVisiblePage = Math.max(
    1,
    Math.min(safeCurrentPage - 1, totalPages - (paginationWindowSize - 1))
  )
  const lastVisiblePage = Math.min(
    totalPages,
    firstVisiblePage + (paginationWindowSize - 1)
  )
  const pageNumbers = Array.from(
    { length: Math.max(0, lastVisiblePage - firstVisiblePage + 1) },
    (_, index) => firstVisiblePage + index
  )

  useEffect(() => {
    setCurrentPage((current) => {
      if (current <= totalPages) {
        return current
      }

      return totalPages
    })
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [dateSortFocus, followUpFilter, searchTerm, sortDirection, sortKey, statusSortFocus])

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
  }, [isLeadSelected, leadPanelTransitionMs])

  const isLoading = isLeadsLoading || isLoadingAgenda
  const error = leadsError || agendaError

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      await WebhookService.deleteNegotiationFollowUp(followUpId)
      setFollowUps((current) => current.filter((followUp) => followUp.id !== followUpId))
      setConfirmingDeleteFollowUpId(null)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao deletar follow-up.'

      setAgendaError(message)
      setConfirmingDeleteFollowUpId(null)
    }
  }

  const handleSortToggle = (nextSortKey: AgendaSortKey) => {
    if (nextSortKey === 'dateTime') {
      if (sortKey !== 'dateTime') {
        setSortKey('dateTime')
        setSortDirection('asc')
        setDateSortFocus(availableDateSortValues[0] ?? 'oldestFirst')
        return
      }

      setDateSortFocus((currentFocus) => {
        if (availableDateSortValues.length <= 1) {
          return availableDateSortValues[0] ?? 'oldestFirst'
        }

        const currentIndex = availableDateSortValues.indexOf(currentFocus)
        if (currentIndex < 0) {
          return availableDateSortValues[0] ?? 'oldestFirst'
        }

        return availableDateSortValues[(currentIndex + 1) % availableDateSortValues.length] ?? 'oldestFirst'
      })
      return
    }

    if (nextSortKey === 'status') {
      if (sortKey !== 'status') {
        setSortKey('status')
        setSortDirection('asc')
        setStatusSortFocus(availableStatusSortValues[0] ?? 'overdue')
        return
      }

      setStatusSortFocus((currentFocus) => {
        if (availableStatusSortValues.length <= 1) {
          return availableStatusSortValues[0] ?? 'overdue'
        }

        const currentIndex = availableStatusSortValues.indexOf(currentFocus)
        if (currentIndex < 0) {
          return availableStatusSortValues[0] ?? 'overdue'
        }

        return availableStatusSortValues[(currentIndex + 1) % availableStatusSortValues.length] ?? 'overdue'
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

  const getSortIndicator = (targetSortKey: AgendaSortKey): string => {
    if (sortKey !== targetSortKey) {
      return '↕'
    }

    if (targetSortKey === 'dateTime') {
      return dateSortFocus === 'recentFirst' ? '↑' : '↓'
    }

    if (targetSortKey === 'status') {
      return statusSortFocus === 'overdue' || statusSortFocus === 'today' ? '↑' : '↓'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getHeaderSortButtonStyle = (targetSortKey: AgendaSortKey) => ({
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
    justifyContent: targetSortKey === 'dateTime' || targetSortKey === 'status' ? 'center' : 'flex-start',
    gap: 6
  })

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
          Agenda
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar FollowUp"
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
              background: isFiltersPanelOpen || isFiltersButtonHovered || activeFiltersCount > 0
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
            onClick={() => {
              setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
              setAgendaFollowUpError(null)
              setIsCreatingAgendaFollowUp(true)
            }}
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
            Adicionar FollowUp
          </button>
        </div>
      </header>

      {isFiltersPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar painel de filtros"
            onClick={() => setIsFiltersPanelOpen(false)}
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
              width: 'min(180px, calc(100vw - 40px))',
              background: '#fcfdff',
              border: `1px solid ${interactionTheme.sidebarItemActiveBackground}`,
              borderRadius: 18,
              zIndex: 36,
              padding: '14px 16px 12px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'grid', gap: 2 }}>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) => (current === 'none' ? 'all' : 'none'))
                }
                onMouseEnter={() => setHoveredFilterOption('followup-none')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'none' || hoveredFilterOption === 'followup-none'
                )}
              >
                Sem follow-up
              </button>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) =>
                    current === 'scheduled' ? 'all' : 'scheduled'
                  )
                }
                onMouseEnter={() => setHoveredFilterOption('followup-scheduled')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'scheduled' ||
                    hoveredFilterOption === 'followup-scheduled'
                )}
              >
                Agendados
              </button>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) => (current === 'today' ? 'all' : 'today'))
                }
                onMouseEnter={() => setHoveredFilterOption('followup-today')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'today' || hoveredFilterOption === 'followup-today'
                )}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) =>
                    current === 'overdue' ? 'all' : 'overdue'
                  )
                }
                onMouseEnter={() => setHoveredFilterOption('followup-overdue')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'overdue' || hoveredFilterOption === 'followup-overdue'
                )}
              >
                Atrasados
              </button>
            </div>
          </section>
        </>
      ) : null}

      {isCreatingAgendaFollowUp ? (
        <>
          <button
            type="button"
            aria-label="Fechar criação de follow-up"
            onClick={closeAgendaFollowUpPanel}
            style={{
              position: 'absolute',
              inset: 0,
              border: 'none',
              background: 'transparent',
              zIndex: 35,
              cursor: 'default'
            }}
          />

          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: leadPanelWidth,
              zIndex: 40,
              borderLeft: '2px solid #edf1f5',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform: isAgendaFollowUpPanelEntering ? 'translateX(0)' : 'translateX(100%)',
              transition: `transform ${leadPanelTransitionMs}ms ease`
            }}
          >
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
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>Novo follow-up</span>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                    Adicionar FollowUp
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Fechar criação de follow-up"
                  onClick={closeAgendaFollowUpPanel}
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

              {agendaFollowUpError ? (
                <p style={{ margin: 0, color: '#b91c1c' }}>{agendaFollowUpError}</p>
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
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Lead</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={agendaFollowUpDraft.leadId}
                      onChange={(event) => {
                        setAgendaFollowUpDraft((currentDraft) => ({
                          ...currentDraft,
                          leadId: event.target.value,
                          negotiationId: ''
                        }))
                      }}
                      style={{
                        width: '100%',
                        height: 46,
                        border: '1px solid #d7dce4',
                        borderRadius: 10,
                        padding: '0 42px 0 14px',
                        color: agendaFollowUpDraft.leadId ? '#111827' : '#6b7280',
                        fontSize: 14,
                        fontWeight: 600,
                        boxSizing: 'border-box',
                        appearance: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">Selecione</option>
                      {(leadsData.leads ?? []).map((lead, index) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name?.trim() || `Lead ${index + 1}`}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}>
                      <ChevronDown size={18} />
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Negócio</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={agendaFollowUpDraft.negotiationId}
                      onChange={(event) =>
                        setAgendaFollowUpDraft((currentDraft) => ({
                          ...currentDraft,
                          negotiationId: event.target.value
                        }))
                      }
                      disabled={!agendaFollowUpDraft.leadId}
                      style={{
                        width: '100%',
                        height: 46,
                        border: '1px solid #d7dce4',
                        borderRadius: 10,
                        padding: '0 42px 0 14px',
                        color: agendaFollowUpDraft.negotiationId ? '#111827' : '#6b7280',
                        fontSize: 14,
                        fontWeight: 600,
                        boxSizing: 'border-box',
                        appearance: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">Selecione</option>
                      {agendaFollowUpBusinesses.map((negocio) => (
                        <option key={negocio.id} value={negocio.id}>
                          {negocio.title ?? 'Negócio sem nome'}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}>
                      <ChevronDown size={18} />
                    </span>
                  </div>
                  {agendaFollowUpDraft.leadId && agendaFollowUpBusinesses.length === 0 ? (
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Esse lead ainda não tem negócios.</p>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Nome do Follow-up</label>
                  <input
                    type="text"
                    placeholder="Nome do Follow-up"
                    value={agendaFollowUpDraft.value}
                    onChange={(event) =>
                      setAgendaFollowUpDraft((currentDraft) => ({
                        ...currentDraft,
                        value: event.target.value
                      }))
                    }
                    style={{
                      height: 46,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: '#111827',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Data/Hora</label>
                  <input
                    type="datetime-local"
                    value={agendaFollowUpDraft.dueAt}
                    onChange={(event) =>
                      setAgendaFollowUpDraft((currentDraft) => ({
                        ...currentDraft,
                        dueAt: event.target.value
                      }))
                    }
                    style={{
                      height: 46,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: '#111827',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={closeAgendaFollowUpPanel}
                    style={{
                      minWidth: 136,
                      height: 50,
                      border: '1px solid #9ac6ae',
                      borderRadius: 10,
                      background: '#ffffff',
                      color: '#1f7a4d',
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateAgendaFollowUp()}
                    disabled={!canConfirmAgendaFollowUp}
                    style={{
                      minWidth: 136,
                      height: 50,
                      border: 'none',
                      borderRadius: 10,
                      background: canConfirmAgendaFollowUp
                        ? interactionTheme.primaryButtonBackground
                        : '#9ca3af',
                      color: '#ffffff',
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: canConfirmAgendaFollowUp ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              </article>
            </section>
          </aside>
        </>
      ) : null}

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeFilterTags.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
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
            overflow: 'hidden',
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
              <col style={{ width: '28%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('value')}
                    style={getHeaderSortButtonStyle('value')}
                  >
                    Follow-up <span style={{ fontSize: 11 }}>{getSortIndicator('value')}</span>
                  </button>
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('lead')}
                    style={getHeaderSortButtonStyle('lead')}
                  >
                    Lead <span style={{ fontSize: 11 }}>{getSortIndicator('lead')}</span>
                  </button>
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('negotiation')}
                    style={getHeaderSortButtonStyle('negotiation')}
                  >
                    Negócio <span style={{ fontSize: 11 }}>{getSortIndicator('negotiation')}</span>
                  </button>
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('dateTime')}
                    style={getHeaderSortButtonStyle('dateTime')}
                  >
                    Data/Hora <span style={{ fontSize: 11 }}>{getSortIndicator('dateTime')}</span>
                  </button>
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('status')}
                    style={getHeaderSortButtonStyle('status')}
                  >
                    Status <span style={{ fontSize: 11 }}>{getSortIndicator('status')}</span>
                  </button>
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedAgendaRows.map((row) => {
                const isHovered = hoveredFollowUpId === row.followUpId
                const isSelected = selectedBusinessId === row.negotiationId
                const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)
                const statusPresentation = getStatusPresentation(visualStatus)

                if (confirmingDeleteFollowUpId === row.followUpId) {
                  return (
                    <tr
                      key={row.followUpId}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: interactionTheme.clickableCardHoverBackground
                      }}
                      onMouseEnter={() => setHoveredFollowUpId(row.followUpId)}
                      onMouseLeave={() => setHoveredFollowUpId(null)}
                    >
                      <td
                        colSpan={6}
                        style={{
                          padding: '14px 16px',
                          color: '#2f2f2f',
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '28% 14% 18% 16% 14% 10%',
                            alignItems: 'center',
                            columnGap: 12
                          }}
                        >
                          <span style={{ gridColumn: '1 / 6' }}>Deletar Follow-up?</span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              justifySelf: 'start',
                              gridColumn: '6 / 7',
                              paddingLeft: 16,
                              boxSizing: 'border-box'
                            }}
                          >
                            <button
                              type="button"
                              aria-label="Cancelar exclusão de follow-up"
                              onClick={(event) => {
                                event.stopPropagation()
                                setConfirmingDeleteFollowUpId(null)
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
                              aria-label="Confirmar exclusão de follow-up"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteFollowUp(row.followUpId)
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
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={row.followUpId}
                    onClick={() => {
                      navigate(`/agenda/${row.leadId}${location.search}`, {
                        state: {
                          initialLeadTab: 'negocios',
                          initialBusinessId: row.negotiationId,
                          initialBusinessTab: 'followups'
                        }
                      })
                    }}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background:
                        isHovered || isSelected
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredFollowUpId(row.followUpId)}
                    onMouseLeave={() => setHoveredFollowUpId(null)}
                  >
                    <td style={{ padding: '14px 16px', color: '#111827' }}>
                      {row.value || '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827' }}>{row.leadName}</td>
                    <td style={{ padding: '14px 16px', color: '#111827' }}>{row.negotiationTitle}</td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {(() => {
                        const dateStatus = getAgendaVisualStatus(row.status, row.dueAt)
                        const dateTagColors = getAgendaDateTagColors(dateStatus)
                        const formattedDateTime = formatDateTime(row.dueAt)

                        if (formattedDateTime === '-') {
                          return <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                        }

                        return (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: dateTagColors.textColor,
                              whiteSpace: 'nowrap',
                              background: dateTagColors.background,
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '7px 12px',
                              lineHeight: 1.1
                            }}
                          >
                            {formattedDateTime}
                          </span>
                        )
                      })()}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: statusPresentation.textColor,
                          whiteSpace: 'nowrap',
                          background: `${statusPresentation.textColor}33`,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                          gap: 4
                        }}
                      >
                        {statusPresentation.icon}
                        {statusPresentation.label}
                      </span>
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
                          aria-label="Excluir follow-up"
                          onClick={() => {
                            setConfirmingDeleteFollowUpId(row.followUpId)
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

              {!isLoading && !error && sortedFilteredAgendaRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '14px 16px', color: '#6b7280' }}>
                    Nenhum follow-up encontrado.
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
            {filteredAgendaRows.length} follow-up{filteredAgendaRows.length === 1 ? '' : 's'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (safeCurrentPage <= 1) return
                setCurrentPage((current) => current - 1)
              }}
              disabled={safeCurrentPage <= 1}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#4b5563',
                padding: '0 4px',
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              {'<'}
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => {
                  if (pageNumber === safeCurrentPage) return
                  setCurrentPage(pageNumber)
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: pageNumber === safeCurrentPage ? '#111827' : '#4b5563',
                  padding: '0 4px',
                  cursor: pageNumber === safeCurrentPage ? 'default' : 'pointer',
                  fontWeight: pageNumber === safeCurrentPage ? 600 : 400
                }}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                if (safeCurrentPage >= totalPages) return
                setCurrentPage((current) => current + 1)
              }}
              disabled={safeCurrentPage >= totalPages}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#4b5563',
                padding: '0 4px',
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              {'>'}
            </button>
          </div>
        </div>

        {isLoading ? <p style={{ margin: '12px 0 0', color: '#4b5563' }}>Carregando...</p> : null}
        {error ? <p style={{ margin: '12px 0 0', color: '#b91c1c' }}>{error}</p> : null}

        {isLeadSelected ? (
          <button
            type="button"
            aria-label="Fechar lead aberto"
            onClick={() => navigate('/agenda')}
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
            <LeadPage onLeadUpdated={handleLeadUpdated} />
          </aside>
        ) : null}
      </div>
    </section>
  )
}
