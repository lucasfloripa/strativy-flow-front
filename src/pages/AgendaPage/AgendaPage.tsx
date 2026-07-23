import {
  CalendarClock,
  ChevronDown,
  ListFilter,
  Plus,
  Trash2
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import {
  formatDateTime,
  getApiDateTimestamp,
  parseApiDateToBrowserDate
} from '../../core/utils/dateTime'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import type {
  NegotiationFollowUpResponse,
  NegotiationResponse
} from '../../features/webhook/types/webhook.types'
import LeadPage from '../LeadPage'

type AgendaFollowUpFilter = 'all' | 'none' | 'scheduled' | 'today' | 'overdue'

type AgendaVisualStatus = 'overdue' | 'today' | 'scheduled' | 'completed'

type AgendaSortKey = 'title' | 'lead' | 'negotiation' | 'dateTime' | 'status'
type AgendaSortDirection = 'asc' | 'desc'
type AgendaDateSortFocus = 'recentFirst' | 'oldestFirst' | 'noDateFirst'
type AgendaStatusSortFocus = 'overdue' | 'today' | 'scheduled' | 'completed'

const AGENDA_TABLE_ROW_HEIGHT_PX = 60

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
  title: string
  templateName: string
  dueAt: string
  status: 'pending' | 'done' | 'canceled' | 'skipped'
  leadIsFavorite: boolean
  leadState: 'active' | 'archived'
  leadCreatedAt: string | Date | null
}

type AgendaFollowUpDraft = {
  leadId: string
  negotiationId: string
  title: string
  dueAt: string
}

const initialAgendaFollowUpDraft: AgendaFollowUpDraft = {
  leadId: '',
  negotiationId: '',
  title: '',
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

const formatAgendaDateTimeLabel = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  return formatDateTime(value)
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

const getFollowUpLifecycleStatusTag = (
  status: AgendaRow['status']
): { label: string; textColor: string; background: string } => {
  if (status === 'done') {
    return {
      label: 'Concluído',
      textColor: '#166534',
      background: '#dcfce7'
    }
  }

  if (status === 'canceled') {
    return {
      label: 'Cancelado',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  if (status === 'skipped') {
    return {
      label: 'Ignorado',
      textColor: '#7c2d12',
      background: '#ffedd5'
    }
  }

  return {
    label: 'Pendente',
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
  if (value === 'pending' || value === 'done' || value === 'canceled' || value === 'skipped') {
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
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120
  const { isMobile } = useViewportBreakpoint()

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

  const [hoveredFollowUpId, setHoveredFollowUpId] = useState<string | null>(null)
  const [confirmingDeleteFollowUpId, setConfirmingDeleteFollowUpId] = useState<string | null>(null)
  const [wrappedAgendaLeadNames, setWrappedAgendaLeadNames] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<AgendaSortKey>('status')
  const [sortDirection, setSortDirection] = useState<AgendaSortDirection>('asc')
  const [dateSortFocus, setDateSortFocus] = useState<AgendaDateSortFocus>('oldestFirst')
  const [statusSortFocus, setStatusSortFocus] = useState<AgendaStatusSortFocus>('overdue')
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [shouldRefreshOnLeadClose, setShouldRefreshOnLeadClose] = useState<boolean>(false)
  const [agendaReloadVersion, setAgendaReloadVersion] = useState<number>(0)
  const previousIsAgendaFollowUpPanelOpenRef = useRef<boolean>(false)
  const previousIsLeadSelectedRef = useRef<boolean>(false)
  const agendaLeadNameRefs = useRef<Record<string, HTMLSpanElement | null>>({})

  const activeLeads = useMemo(
    () =>
      (leadsData.leads ?? []).filter(
        (lead) => (lead.state ?? 'active').trim().toLowerCase() !== 'archived'
      ),
    [leadsData.leads]
  )

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
    setAgendaFollowUpDraft((currentDraft) => {
      if (!currentDraft.leadId) {
        return currentDraft
      }

      const hasSelectedLead = activeLeads.some((lead) => lead.id === currentDraft.leadId)

      if (hasSelectedLead) {
        return currentDraft
      }

      return {
        ...currentDraft,
        leadId: '',
        negotiationId: ''
      }
    })
  }, [activeLeads])

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

    if (!agendaFollowUpDraft.title.trim() || !agendaFollowUpDraft.dueAt) {
      setAgendaFollowUpError('Preencha o nome do follow-up e a data/hora.')
      return
    }

    try {
      setAgendaFollowUpError(null)

      const createdFollowUp = await WebhookService.createNegotiationFollowUp({
        negotiationId: agendaFollowUpDraft.negotiationId,
        title: agendaFollowUpDraft.title.trim(),
        dueAt: agendaFollowUpDraft.dueAt
      })

      setAgendaReloadVersion((current) => current + 1)
      closeAgendaFollowUpPanel()
      navigate(`/agenda/${agendaFollowUpDraft.leadId}${location.search}`, {
        replace: true,
        state: {
          initialLeadTab: 'negocios',
          initialBusinessId: createdFollowUp.negotiationId,
          initialBusinessTab: 'followups',
          initialBusinessFollowUpId: createdFollowUp.id
        }
      })
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
        title: toSafeText(followUp.title),
        templateName: toSafeText(followUp.template?.name),
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
            toSafeText(row.title).toLowerCase().includes(normalizedSearchTerm)
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

      if (sortKey === 'title') {
        return firstRow.title.localeCompare(secondRow.title, 'pt-BR', { sensitivity: 'base' }) * directionFactor
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

  const paginatedAgendaRows = sortedFilteredAgendaRows

  const setAgendaLeadNameRef = (followUpId: string, element: HTMLSpanElement | null) => {
    agendaLeadNameRefs.current[followUpId] = element
  }

  useEffect(() => {
    if (isMobile) {
      return
    }

    const recalculateWrappedAgendaLeadNames = () => {
      const nextWrappedAgendaLeadNames: Record<string, boolean> = {}

      paginatedAgendaRows.forEach((row) => {
        const agendaLeadNameElement = agendaLeadNameRefs.current[row.followUpId]

        if (!agendaLeadNameElement) {
          nextWrappedAgendaLeadNames[row.followUpId] = false
          return
        }

        const computedStyle = window.getComputedStyle(agendaLeadNameElement)
        const lineHeight = Number.parseFloat(computedStyle.lineHeight)

        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
          nextWrappedAgendaLeadNames[row.followUpId] = false
          return
        }

        const lineCount = Math.round(
          agendaLeadNameElement.getBoundingClientRect().height / lineHeight
        )

        nextWrappedAgendaLeadNames[row.followUpId] = lineCount > 1
      })

      setWrappedAgendaLeadNames((currentWrappedAgendaLeadNames) => {
        const currentKeys = Object.keys(currentWrappedAgendaLeadNames)
        const nextKeys = Object.keys(nextWrappedAgendaLeadNames)

        if (currentKeys.length !== nextKeys.length) {
          return nextWrappedAgendaLeadNames
        }

        const hasDifference = nextKeys.some(
          (key) => currentWrappedAgendaLeadNames[key] !== nextWrappedAgendaLeadNames[key]
        )

        return hasDifference ? nextWrappedAgendaLeadNames : currentWrappedAgendaLeadNames
      })
    }

    recalculateWrappedAgendaLeadNames()
    window.addEventListener('resize', recalculateWrappedAgendaLeadNames)

    return () => {
      window.removeEventListener('resize', recalculateWrappedAgendaLeadNames)
    }
  }, [isMobile, paginatedAgendaRows])

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

  const handleToggleFollowUpStatus = async (
    followUpId: string,
    currentStatus: AgendaRow['status']
  ) => {
    try {
      setAgendaError(null)

      if (currentStatus === 'done') {
        await WebhookService.updateNegotiationFollowUp(followUpId, {
          status: 'pending',
          completedAt: null
        })
      } else {
        await WebhookService.updateNegotiationFollowUp(followUpId, {
          status: 'done',
          completedAt: new Date().toISOString()
        })
      }

      setFollowUps((current) =>
        current.map((followUp) => {
          if (followUp.id !== followUpId) {
            return followUp
          }

          return {
            ...followUp,
            status: currentStatus === 'done' ? 'pending' : 'done'
          }
        })
      )
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar status do follow-up.'

      setAgendaError(message)
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
          <h1 style={{ margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }}>Agenda</h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 52px 52px', gap: 12 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar follow-up"
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
              background: isFiltersPanelOpen || isFiltersButtonHovered || activeFiltersCount > 0
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
            aria-label="Adicionar follow-up"
            onClick={() => {
              setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
              setAgendaFollowUpError(null)
              setIsCreatingAgendaFollowUp(true)
            }}
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
                top: 150,
                right: 16,
                width: 'min(220px, calc(100vw - 32px))',
                background: '#fcfdff',
                border: `1px solid ${interactionTheme.sidebarItemActiveBackground}`,
                borderRadius: 18,
                zIndex: 36,
                padding: '14px 16px 12px',
                boxSizing: 'border-box',
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)'
              }}
            >
              <div style={{ display: 'grid', gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setFollowUpFilter((current) => (current === 'none' ? 'all' : 'none'))}
                  onMouseEnter={() => setHoveredFilterOption('followup-none')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(followUpFilter === 'none' || hoveredFilterOption === 'followup-none')}
                >
                  Sem follow-up
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpFilter((current) => (current === 'scheduled' ? 'all' : 'scheduled'))}
                  onMouseEnter={() => setHoveredFilterOption('followup-scheduled')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(followUpFilter === 'scheduled' || hoveredFilterOption === 'followup-scheduled')}
                >
                  Agendados
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpFilter((current) => (current === 'today' ? 'all' : 'today'))}
                  onMouseEnter={() => setHoveredFilterOption('followup-today')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(followUpFilter === 'today' || hoveredFilterOption === 'followup-today')}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpFilter((current) => (current === 'overdue' ? 'all' : 'overdue'))}
                  onMouseEnter={() => setHoveredFilterOption('followup-overdue')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(followUpFilter === 'overdue' || hoveredFilterOption === 'followup-overdue')}
                >
                  Atrasados
                </button>
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
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)',
                padding: '22px 18px 28px',
                boxSizing: 'border-box',
                gap: 18
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>Novo follow-up</h2>
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

              {agendaFollowUpError ? <p style={{ margin: 0, color: '#b91c1c' }}>{agendaFollowUpError}</p> : null}

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
                      style={{ width: '100%', height: 48, border: '1px solid #d7dce4', borderRadius: 12, padding: '0 42px 0 14px', color: agendaFollowUpDraft.leadId ? '#111827' : '#6b7280', fontSize: 15, fontWeight: 600, boxSizing: 'border-box', appearance: 'none', background: '#ffffff' }}
                    >
                      <option value="">Selecione</option>
                      {activeLeads.map((lead, index) => (
                        <option key={lead.id} value={lead.id}>{lead.name?.trim() || `Lead ${index + 1}`}</option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}><ChevronDown size={18} /></span>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Negócio</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={agendaFollowUpDraft.negotiationId}
                      onChange={(event) => setAgendaFollowUpDraft((currentDraft) => ({ ...currentDraft, negotiationId: event.target.value }))}
                      disabled={!agendaFollowUpDraft.leadId}
                      style={{ width: '100%', height: 48, border: '1px solid #d7dce4', borderRadius: 12, padding: '0 42px 0 14px', color: agendaFollowUpDraft.negotiationId ? '#111827' : '#6b7280', fontSize: 15, fontWeight: 600, boxSizing: 'border-box', appearance: 'none', background: '#ffffff' }}
                    >
                      <option value="">Selecione</option>
                      {agendaFollowUpBusinesses.map((negocio) => (
                        <option key={negocio.id} value={negocio.id}>{negocio.title ?? 'Negócio sem nome'}</option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}><ChevronDown size={18} /></span>
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
                    value={agendaFollowUpDraft.title}
                    onChange={(event) => setAgendaFollowUpDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                    style={{ height: 48, border: '1px solid #d7dce4', borderRadius: 12, padding: '0 14px', color: '#111827', fontSize: 15, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Data/Hora</label>
                  <input
                    type="datetime-local"
                    value={agendaFollowUpDraft.dueAt}
                    onChange={(event) => setAgendaFollowUpDraft((currentDraft) => ({ ...currentDraft, dueAt: event.target.value }))}
                    style={{ height: 48, border: '1px solid #d7dce4', borderRadius: 12, padding: '0 14px', color: '#111827', fontSize: 15, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={closeAgendaFollowUpPanel}
                    style={{ height: 42, border: '1px solid #d1d5db', borderRadius: 8, background: '#ffffff', color: '#0f172a', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateAgendaFollowUp()}
                    disabled={!canConfirmAgendaFollowUp}
                    style={{ height: 42, border: 'none', borderRadius: 8, background: '#1f7a4d', color: '#ffffff', fontSize: 14, fontWeight: 700, cursor: canConfirmAgendaFollowUp ? 'pointer' : 'not-allowed' }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </aside>
          </>
        ) : null}

        {isLeadSelected && !isCreatingAgendaFollowUp ? (
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

        <div style={{ maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }}>
          {paginatedAgendaRows.map((row) => {
            const isHovered = hoveredFollowUpId === row.followUpId
            const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)
            const lifecycleStatusTag = getFollowUpLifecycleStatusTag(row.status)
            const dateTagColors = getAgendaDateTagColors(visualStatus)
            const formattedDateTime = formatAgendaDateTimeLabel(row.dueAt)

            if (confirmingDeleteFollowUpId === row.followUpId) {
              return (
                <article
                  key={row.followUpId}
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
                  <strong style={{ color: '#111827', fontSize: 15 }}>Deletar Follow-up?</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      aria-label="Cancelar exclusão de follow-up"
                      onClick={() => setConfirmingDeleteFollowUpId(null)}
                      style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      aria-label="Confirmar exclusão de follow-up"
                      onClick={() => void handleDeleteFollowUp(row.followUpId)}
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
                key={row.followUpId}
                onClick={() => {
                  navigate(`/agenda/${row.leadId}${location.search}`, {
                    state: {
                      initialLeadTab: 'negocios',
                      initialBusinessId: row.negotiationId,
                      initialBusinessTab: 'followups',
                      initialBusinessFollowUpId: row.followUpId
                    }
                  })
                }}
                onMouseEnter={() => setHoveredFollowUpId(row.followUpId)}
                onMouseLeave={() => setHoveredFollowUpId(null)}
                style={{
                  background: isHovered ? interactionTheme.clickableCardHoverBackground : '#ffffff',
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
                      {row.title || 'Follow-up sem nome'}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Excluir follow-up"
                      onClick={() => setConfirmingDeleteFollowUpId(row.followUpId)}
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

                    <button
                      type="button"
                      aria-label={row.status === 'done' ? 'Desfazer conclusão do follow-up' : 'Concluir follow-up'}
                      onClick={() => void handleToggleFollowUpStatus(row.followUpId, row.status)}
                      style={{
                        height: 34,
                        width: 34,
                        border: row.status === 'done' ? '1px solid #86efac' : '1px solid #e5e7eb',
                        borderRadius: 8,
                        background: row.status === 'done' ? '#ecfdf3' : '#ffffff',
                        color: row.status === 'done' ? '#16a34a' : '#4b5563',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                    >
                      ✓
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: dateTagColors.textColor, whiteSpace: 'nowrap', background: dateTagColors.background, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                    <CalendarClock size={12} />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 4 }}>{formattedDateTime}</span>
                  </span>

                  <span style={{ fontSize: 12, fontWeight: 700, color: lifecycleStatusTag.textColor, whiteSpace: 'nowrap', background: lifecycleStatusTag.background, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lifecycleStatusTag.label}</span>
                  </span>

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#dbeafe', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', padding: '7px 12px', lineHeight: 1.1, minWidth: 0, maxWidth: '100%', width: 'max-content', boxSizing: 'border-box', overflow: 'hidden', flex: '0 1 auto' }}>
                    <span style={{ display: 'block', minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lead: {row.leadName}</span>
                  </span>

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1f7a4d', background: '#dcfce7', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', padding: '7px 12px', lineHeight: 1.1, minWidth: 0, maxWidth: '100%', width: 'max-content', boxSizing: 'border-box', overflow: 'hidden', flex: '0 1 auto' }}>
                    <span style={{ display: 'block', minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Negócio: {row.negotiationTitle}</span>
                  </span>
                </div>
              </article>
            )
          })}

          {!isLoading && !error && sortedFilteredAgendaRows.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Nenhum follow-up encontrado.</div>
          ) : null}
          {isLoading ? (
            <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Carregando...</div>
          ) : null}
          {error ? (
            <div style={{ color: '#b91c1c', fontSize: 14, padding: 16, textAlign: 'center' }}>{error}</div>
          ) : null}
        </div>

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
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                    Novo follow-up
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
                    value={agendaFollowUpDraft.leadId}
                    onChange={(event) => {
                      setAgendaFollowUpDraft((currentDraft) => ({
                        ...currentDraft,
                        leadId: event.target.value,
                        negotiationId: ''
                      }))
                    }}
                    style={{
                      height: 36,
                      maxWidth: 360,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 10px',
                      color: '#111827',
                      fontSize: 14,
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

                  <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Negócio</span>
                  <div style={{ display: 'grid', gap: 6 }}>
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
                        height: 36,
                        maxWidth: 360,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 10px',
                        color: '#111827',
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecione</option>
                      {agendaFollowUpBusinesses.map((negocio) => (
                        <option key={negocio.id} value={negocio.id}>
                          {negocio.title ?? 'Negócio sem nome'}
                        </option>
                      ))}
                    </select>
                    {agendaFollowUpDraft.leadId && agendaFollowUpBusinesses.length === 0 ? (
                      <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Esse lead ainda não tem negócios.</p>
                    ) : null}
                  </div>

                  <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Nome do Follow-up</span>
                  <input
                    type="text"
                    placeholder="Nome do Follow-up"
                    value={agendaFollowUpDraft.title}
                    onChange={(event) =>
                      setAgendaFollowUpDraft((currentDraft) => ({
                        ...currentDraft,
                        title: event.target.value
                      }))
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

                  <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Data/Hora</span>
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
                      height: 36,
                      maxWidth: 360,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 10px',
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
                    onClick={() => void handleCreateAgendaFollowUp()}
                    disabled={!canConfirmAgendaFollowUp}
                    style={{
                      minWidth: 120,
                      height: 42,
                      border: 'none',
                      borderRadius: 8,
                      background: '#1f7a4d',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: canConfirmAgendaFollowUp ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </article>
            </section>
          </aside>
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
              <col style={{ width: '24%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('title')}
                    style={getHeaderSortButtonStyle('title')}
                  >
                    Follow-up <span style={{ fontSize: 11 }}>{getSortIndicator('title')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Template
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('lead')}
                    style={getHeaderSortButtonStyle('lead')}
                  >
                    Lead <span style={{ fontSize: 11 }}>{getSortIndicator('lead')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('negotiation')}
                    style={getHeaderSortButtonStyle('negotiation')}
                  >
                    Negócio <span style={{ fontSize: 11 }}>{getSortIndicator('negotiation')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('status')}
                    style={getHeaderSortButtonStyle('status')}
                  >
                    Status <span style={{ fontSize: 11 }}>{getSortIndicator('status')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('dateTime')}
                    style={getHeaderSortButtonStyle('dateTime')}
                  >
                    Data/Hora <span style={{ fontSize: 11 }}>{getSortIndicator('dateTime')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedAgendaRows.map((row) => {
                const isHovered = hoveredFollowUpId === row.followUpId
                const lifecycleStatusTag = getFollowUpLifecycleStatusTag(row.status)

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
                        Deletar Follow-up?
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
                          initialBusinessTab: 'followups',
                          initialBusinessFollowUpId: row.followUpId
                        }
                      })
                    }}
                    style={{
                      height: AGENDA_TABLE_ROW_HEIGHT_PX,
                      borderBottom: '1px solid #f3f4f6',
                      background:
                        isHovered
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredFollowUpId(row.followUpId)}
                    onMouseLeave={() => setHoveredFollowUpId(null)}
                  >
                    <td style={{ padding: '14px 16px', color: '#111827' }}>
                      {row.title || '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827' }}>{row.templateName || '-'}</td>
                    <td
                      style={{
                        padding: wrappedAgendaLeadNames[row.followUpId]
                          ? '6px 16px'
                          : '14px 16px',
                        color: '#111827'
                      }}
                    >
                      <span
                        ref={(element) => {
                          setAgendaLeadNameRef(row.followUpId, element)
                        }}
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          lineHeight: 1.25,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word'
                        }}
                      >
                        {row.leadName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827' }}>{row.negotiationTitle}</td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: lifecycleStatusTag.textColor,
                          whiteSpace: 'nowrap',
                          background: lifecycleStatusTag.background,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1
                        }}
                      >
                        {lifecycleStatusTag.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {(() => {
                        const dateStatus = getAgendaVisualStatus(row.status, row.dueAt)
                        const dateTagColors = getAgendaDateTagColors(dateStatus)
                        const formattedDateTime = formatAgendaDateTimeLabel(row.dueAt)

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

                        <button
                          type="button"
                          aria-label={
                            row.status === 'done'
                              ? 'Desfazer conclusão do follow-up'
                              : 'Concluir follow-up'
                          }
                          onClick={() => {
                            void handleToggleFollowUpStatus(row.followUpId, row.status)
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            border: row.status === 'done' ? '1px solid #86efac' : '1px solid #e5e7eb',
                            borderRadius: 4,
                            background: row.status === 'done' ? '#ecfdf3' : '#ffffff',
                            color: row.status === 'done' ? '#16a34a' : '#4b5563',
                            padding: 0,
                            cursor: 'pointer'
                          }}
                        >
                          ✓
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
