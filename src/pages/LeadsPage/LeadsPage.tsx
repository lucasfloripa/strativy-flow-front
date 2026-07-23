import { Archive, CalendarDays, Clock3, Facebook, Handshake, ListFilter, MessageCircle, Plus, Star, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import {
  formatDateTime,
  getApiDateTimestamp,
  parseApiDateToBrowserDate,
  parsePersistedUtcClockToBrowserDate
} from '../../core/utils/dateTime'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import { LeadsService } from '../../features/leads/services/LeadsService'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import LeadPage from '../LeadPage'

type LeadsTableRow = {
  id: string
  name: string
  phone: string
  state: string
  source: string
  leadQualification: string | null
  isFavorite: boolean
  createdAt: string | Date | null
  lastMessageAt: string | Date | null
  nextFollowUpDueAt: string | Date | null
  nextFollowUpId: string | null
  nextFollowUpNegotiationId: string | null
  topFollowUpStatus: 'overdue' | 'today' | 'scheduled' | 'completed' | null
  hasFollowUpOverdue: boolean
  hasFollowUpToday: boolean
  hasFollowUpScheduled: boolean
  hasAnyFollowUp: boolean
}

type TagPresentation = {
  label: string
  textColor: string
  icon?: ReactNode
}

type LeadSortKey = 'createdAt' | 'name' | 'qualification' | 'nextAgenda' | 'lastContact' | 'source'
type LeadSortDirection = 'asc' | 'desc'
type QualificationSortFocus = 'qualify' | 'notQualify' | 'unqualified'
type NextAgendaSortFocus = 'recentFirst' | 'oldestFirst' | 'noDateFirst'
type SourceSortFocus = 'whatsappFirst' | 'metaAdsFirst' | 'indicacaoFirst'


const getSourceTagPresentation = (source: string): TagPresentation => {
  const normalizedSource = source
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalizedSource === 'metaads') {
    return {
      label: 'Meta Ads',
      textColor: '#1877f2',
      icon: <Facebook size={12} />
    }
  }

  if (normalizedSource === 'whatsapp') {
    return {
      label: 'WhatsApp',
      textColor: '#15803d',
      icon: <MessageCircle size={12} />
    }
  }

  if (normalizedSource === 'indicacao') {
    return {
      label: 'Indicação',
      textColor: '#0f766e',
      icon: <Handshake size={12} />
    }
  }

  return {
    label: source,
    textColor: '#6b7280'
  }
}

const normalizePhoneDigits = (value: string): string => value.replace(/\D/g, '')

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

const isNewLead = (createdAt: string | Date | null): boolean => {
  if (!createdAt) {
    return true
  }

  const parsedCreatedAt = parseApiDateToBrowserDate(createdAt)
  if (!parsedCreatedAt) {
    return true
  }

  const ageInHours = (Date.now() - parsedCreatedAt.getTime()) / (1000 * 60 * 60)
  return ageInHours <= 24
}

const getInteractionTagPresentation = (
  lastMessageAt: string | Date | null,
  createdAt: string | Date | null
): TagPresentation => {
  const referenceValue = lastMessageAt ?? createdAt

  return {
    label: referenceValue ? formatDateTime(referenceValue) : '-',
    textColor: '#6b7280',
    icon: <Clock3 size={12} />
  }
}

const getLeadQualificationLabel = (
  value?: string | null
): string => {
  const normalizedValue = normalizeLeadQualificationValue(value)

  if (normalizedValue === 'qualify') {
    return 'Qualificado'
  }

  if (normalizedValue === 'not qualify') {
    return 'Não qualificado'
  }

  return '-'
}

const normalizeLeadQualificationValue = (
  value: string | null | undefined
): 'qualify' | 'not qualify' | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim().toLowerCase().replace(/_/g, ' ')

  if (normalizedValue === 'qualify') {
    return 'qualify'
  }

  if (normalizedValue === 'not qualify') {
    return 'not qualify'
  }

  return null
}

const formatAgendaDateTime = (value?: string | Date | null): string => {
  if (!value) {
    return '-'
  }

  return formatDateTime(value)
}

const resolveNextAgendaStatus = (
  lead: LeadsTableRow
): LeadsTableRow['topFollowUpStatus'] => {
  if (lead.nextFollowUpDueAt) {
    const dueDate = parseApiDateToBrowserDate(lead.nextFollowUpDueAt)

    if (dueDate) {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      if (dueDate < startOfToday) {
        return 'overdue'
      }

      if (dueDate <= endOfToday) {
        return 'today'
      }

      return 'scheduled'
    }
  }

  if (lead.hasFollowUpOverdue) {
    return 'overdue'
  }

  if (lead.hasFollowUpToday) {
    return 'today'
  }

  if (lead.hasFollowUpScheduled) {
    return 'scheduled'
  }

  const normalizedTopStatus =
    typeof lead.topFollowUpStatus === 'string'
      ? lead.topFollowUpStatus.trim().toLowerCase()
      : null

  if (
    normalizedTopStatus === 'overdue' ||
    normalizedTopStatus === 'today' ||
    normalizedTopStatus === 'scheduled' ||
    normalizedTopStatus === 'completed'
  ) {
    return normalizedTopStatus
  }

  return null
}

const getNextAgendaTagColors = (
  status?: LeadsTableRow['topFollowUpStatus']
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

const getFilterOptionStyle = (isSelected: boolean) => ({
  width: '100%',
  border: '1px solid transparent',
  background: isSelected ? '#f3f4f6' : 'transparent',
  color: '#111827',
  fontSize: 39 / 3,
  fontWeight: 700,
  lineHeight: 1.05,
  padding: '7px 10px',
  borderRadius: 8,
  textAlign: 'left' as const,
  cursor: 'pointer',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent'
})

const getQualificationSortRank = (
  lead: LeadsTableRow,
  focus: QualificationSortFocus
): number => {
  const normalizedLeadQualification = normalizeLeadQualificationValue(lead.leadQualification)
  const qualificationKind =
    lead.state === 'archived'
      ? 'archived'
      : normalizedLeadQualification === 'qualify'
        ? 'qualify'
        : normalizedLeadQualification === 'not qualify'
          ? 'notQualify'
          : 'unqualified'

  const ranksByFocus: Record<QualificationSortFocus, Record<'qualify' | 'notQualify' | 'unqualified' | 'archived', number>> = {
    qualify: {
      qualify: 0,
      notQualify: 1,
      unqualified: 2,
      archived: 3
    },
    notQualify: {
      notQualify: 0,
      qualify: 1,
      unqualified: 2,
      archived: 3
    },
    unqualified: {
      unqualified: 0,
      qualify: 1,
      notQualify: 2,
      archived: 3
    }
  }

  return ranksByFocus[focus][qualificationKind]
}

const normalizeSourceValue = (
  source: string
): 'whatsapp' | 'metaads' | 'indicacao' | 'other' => {
  const normalizedSource = source
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '')

  if (normalizedSource === 'whatsapp') {
    return 'whatsapp'
  }

  if (normalizedSource === 'metaads') {
    return 'metaads'
  }

  if (normalizedSource === 'indicacao') {
    return 'indicacao'
  }

  return 'other'
}

const getSourceSortRank = (source: string, focus: SourceSortFocus): number => {
  const normalizedSource = normalizeSourceValue(source)

  const ranksByFocus: Record<
    SourceSortFocus,
    Record<'whatsapp' | 'metaads' | 'indicacao' | 'other', number>
  > = {
    whatsappFirst: {
      whatsapp: 0,
      metaads: 1,
      indicacao: 2,
      other: 3
    },
    metaAdsFirst: {
      metaads: 0,
      whatsapp: 1,
      indicacao: 2,
      other: 3
    },
    indicacaoFirst: {
      indicacao: 0,
      whatsapp: 1,
      metaads: 2,
      other: 3
    }
  }

  return ranksByFocus[focus][normalizedSource]
}

const toSortableTimestamp = (value: string | Date | null): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const timestamp = getApiDateTimestamp(value)

  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY
  }

  return timestamp
}

export default function LeadsPage() {
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120
  const { isMobile } = useViewportBreakpoint()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { leadId } = useParams<{ leadId?: string }>()
  const { data, isLoading, error, reload } = useLeadsBootstrap()
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null)
  const [hoveredNextAgendaValueLeadId, setHoveredNextAgendaValueLeadId] = useState<string | null>(null)
  const [isSearchInputFocused, setIsSearchInputFocused] = useState<boolean>(false)
  const [isFiltersButtonHovered, setIsFiltersButtonHovered] = useState<boolean>(false)
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState<boolean>(false)
  const [hoveredFilterOption, setHoveredFilterOption] = useState<string | null>(null)
  const [isAddLeadButtonHovered, setIsAddLeadButtonHovered] = useState<boolean>(false)
  const [sortKey, setSortKey] = useState<LeadSortKey>('nextAgenda')
  const [sortDirection, setSortDirection] = useState<LeadSortDirection>('desc')
  const [qualificationSortFocus, setQualificationSortFocus] = useState<QualificationSortFocus>('qualify')
  const [nextAgendaSortFocus, setNextAgendaSortFocus] = useState<NextAgendaSortFocus>('oldestFirst')
  const [sourceSortFocus, setSourceSortFocus] = useState<SourceSortFocus>('whatsappFirst')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(() => {
    return searchParams.get('favorites') === 'true'
  })
  const [showOnlyNewLeads, setShowOnlyNewLeads] = useState<boolean>(() => {
    return searchParams.get('newLeads') === 'true'
  })
  const [showOnlyWithoutConversation24h, setShowOnlyWithoutConversation24h] = useState<boolean>(() => {
    return searchParams.get('withoutConversation24h') === 'true'
  })
  const [showOnlyQualified, setShowOnlyQualified] = useState<boolean>(false)
  const [showOnlyNotQualified, setShowOnlyNotQualified] = useState<boolean>(false)
  const [confirmingDeleteLeadId, setConfirmingDeleteLeadId] = useState<string | null>(null)
  const [confirmingArchiveLeadId, setConfirmingArchiveLeadId] = useState<string | null>(null)
  const [wrappedLeadNames, setWrappedLeadNames] = useState<
    Record<string, boolean>
  >({})
  const isLeadSelected = Boolean(leadId)
  const isCreateLeadFormOpen = leadId === 'new'
  const previousIsLeadSelectedRef = useRef<boolean>(isLeadSelected)
  const leadNameRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const [shouldRefreshOnLeadClose, setShouldRefreshOnLeadClose] = useState<boolean>(false)
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const quickView = searchParams.get('view')
  const isNewTodayView = quickView === 'new-today'
  const isWithoutConversation24hView = quickView === 'without-conversation-24h'
  const activeFiltersCount =
    Number(showOnlyFavorites) +
    Number(showOnlyNewLeads) +
    Number(showOnlyWithoutConversation24h) +
    Number(showOnlyQualified) +
    Number(showOnlyNotQualified)

  const activeFilterTags = [
    showOnlyFavorites
      ? {
          key: 'favorites',
          label: 'Favoritos',
          textColor: '#a16207',
          background: '#fef3c7',
          onRemove: () => setShowOnlyFavorites(false)
        }
      : null,
    showOnlyNewLeads
      ? {
          key: 'new-leads',
          label: 'Novos',
          textColor: '#b45309',
          background: '#fef3c7',
          onRemove: () => setShowOnlyNewLeads(false)
        }
      : null,
    showOnlyWithoutConversation24h
      ? {
          key: 'without-conversation-24h',
          label: 'Sem conversa 24h+',
          textColor: '#1d4ed8',
          background: '#dbeafe',
          onRemove: () => setShowOnlyWithoutConversation24h(false)
        }
      : null,
    showOnlyQualified
      ? {
          key: 'qualified',
          label: 'Qualificado',
          textColor: '#166534',
          background: '#dcfce7',
          onRemove: () => setShowOnlyQualified(false)
        }
      : null,
    showOnlyNotQualified
      ? {
          key: 'not-qualified',
          label: 'Não qualificado',
          textColor: '#b91c1c',
          background: '#fee2e2',
          onRemove: () => setShowOnlyNotQualified(false)
        }
      : null
  ].filter((tag): tag is {
    key: string
    label: string
    textColor: string
    background: string
    onRemove: () => void
  } => tag !== null)

  const handleLeadUpdated = () => {
    setShouldRefreshOnLeadClose(true)
  }

  const handleLeadCreated = () => {
    void reload()
  }

  useEffect(() => {
    const wasLeadSelected = previousIsLeadSelectedRef.current

    if (wasLeadSelected && !isLeadSelected && shouldRefreshOnLeadClose) {
      void reload()
      setShouldRefreshOnLeadClose(false)
    }

    previousIsLeadSelectedRef.current = isLeadSelected
  }, [isLeadSelected, reload, shouldRefreshOnLeadClose])

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

  const leads: LeadsTableRow[] = (data.leads ?? [])
    .map((lead, index) => ({
      // Backward-compatible extraction in case API already returns this field.
      nextFollowUpId: ((lead as { nextFollowUpId?: string | null }).nextFollowUpId ?? null),
      id: lead.id,
      name: lead.name ?? `Lead ${index + 1}`,
      phone: lead.phone ?? '-',
      state: lead.state ?? 'active',
      source: lead.source ?? '-',
      leadQualification: typeof lead.leadQualification === 'string'
        ? lead.leadQualification
        : null,
      isFavorite: lead.isFavorite ?? false,
      createdAt: lead.createdAt ?? null,
      lastMessageAt: lead.lastMessageAt ?? null,
      nextFollowUpDueAt: lead.nextFollowUpDueAt ?? null,
      nextFollowUpNegotiationId: lead.nextFollowUpNegotiationId ?? null,
      topFollowUpStatus: lead.topFollowUpStatus ?? null,
      hasFollowUpOverdue: lead.hasFollowUpOverdue ?? false,
      hasFollowUpToday: lead.hasFollowUpToday ?? false,
      hasFollowUpScheduled: lead.hasFollowUpScheduled ?? false,
      hasAnyFollowUp: lead.hasAnyFollowUp ?? false
    }))

  const openLeadNextAgendaFollowUp = async (lead: LeadsTableRow) => {
    if (!lead.nextFollowUpNegotiationId) {
      return
    }

    const baseState = {
      initialLeadTab: 'negocios' as const,
      initialBusinessId: lead.nextFollowUpNegotiationId,
      initialBusinessTab: 'followups' as const
    }

    if (lead.nextFollowUpId) {
      navigate(`/leads/${lead.id}${location.search}`, {
        state: {
          ...baseState,
          initialBusinessFollowUpId: lead.nextFollowUpId
        }
      })
      return
    }

    try {
      const allFollowUps = await WebhookService.loadNegotiationFollowUps()
      const businessFollowUps = allFollowUps.filter(
        (followUp) => followUp.negotiationId === lead.nextFollowUpNegotiationId
      )

      let targetFollowUpId: string | null = null
      const targetDueTimestamp = lead.nextFollowUpDueAt
        ? getApiDateTimestamp(lead.nextFollowUpDueAt)
        : Number.NaN

      if (Number.isFinite(targetDueTimestamp) && businessFollowUps.length > 0) {
        const pendingFollowUps = businessFollowUps.filter((followUp) => followUp.status === 'pending')
        const candidates = pendingFollowUps.length > 0 ? pendingFollowUps : businessFollowUps
        const sortedCandidates = [...candidates].sort((first, second) => {
          const firstDiff = Math.abs(getApiDateTimestamp(first.dueAt) - targetDueTimestamp)
          const secondDiff = Math.abs(getApiDateTimestamp(second.dueAt) - targetDueTimestamp)
          return firstDiff - secondDiff
        })

        targetFollowUpId = sortedCandidates[0]?.id ?? null
      }

      navigate(`/leads/${lead.id}${location.search}`, {
        state: targetFollowUpId
          ? {
              ...baseState,
              initialBusinessFollowUpId: targetFollowUpId
            }
          : baseState
      })
    } catch {
      navigate(`/leads/${lead.id}${location.search}`, {
        state: baseState
      })
    }
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const normalizedSearchDigits = normalizePhoneDigits(searchTerm)

  const filteredLeads = leads.filter((lead) => {
    if (lead.state !== 'active') {
      return false
    }

    const normalizedLeadName = lead.name.trim().toLowerCase()
    const normalizedLeadPhone = normalizePhoneDigits(lead.phone)

    const matchesFavorite = showOnlyFavorites ? lead.isFavorite : true
    const normalizedLeadQualification = normalizeLeadQualificationValue(lead.leadQualification)
    const matchesQualification =
      showOnlyQualified && showOnlyNotQualified
        ? normalizedLeadQualification === 'qualify' || normalizedLeadQualification === 'not qualify'
        : showOnlyQualified
          ? normalizedLeadQualification === 'qualify'
          : showOnlyNotQualified
            ? normalizedLeadQualification === 'not qualify'
            : true
    const matchesName = normalizedSearchTerm
      ? normalizedLeadName.includes(normalizedSearchTerm)
      : false
    const matchesPhone = normalizedSearchDigits
      ? normalizedLeadPhone.includes(normalizedSearchDigits)
      : false
    const matchesSearch =
      !normalizedSearchTerm && !normalizedSearchDigits
        ? true
        : matchesName || matchesPhone

    const createdAtDate = parseApiDateToBrowserDate(lead.createdAt)
    const createdAtTimestamp = createdAtDate?.getTime() ?? Number.NaN
    const hasValidCreatedAt = Number.isFinite(createdAtTimestamp)
    const isCreatedWithin24h = isNewLead(lead.createdAt)

    const lastMessageDate = parsePersistedUtcClockToBrowserDate(lead.lastMessageAt)
    const lastMessageTimestamp = lastMessageDate?.getTime() ?? Number.NaN
    const hasRecentMessageInLast24h =
      Number.isFinite(lastMessageTimestamp) &&
      Date.now() - lastMessageTimestamp <= 24 * 60 * 60 * 1000
    const hasAnyMessage = Number.isFinite(lastMessageTimestamp)
    const hasNoConversationFor24h = hasAnyMessage
      ? !hasRecentMessageInLast24h
      : hasValidCreatedAt && Date.now() - createdAtTimestamp > 24 * 60 * 60 * 1000

    const matchesQuickView = isNewTodayView
      ? isCreatedWithin24h
      : isWithoutConversation24hView
        ? hasNoConversationFor24h
        : true
    const matchesNewFilter = showOnlyNewLeads ? isCreatedWithin24h : true
    const matchesWithoutConversation24hFilter = showOnlyWithoutConversation24h
      ? hasAnyMessage && !hasRecentMessageInLast24h
      : true

    return (
      matchesFavorite &&
      matchesNewFilter &&
      matchesWithoutConversation24hFilter &&
      matchesQualification &&
      matchesSearch &&
      matchesQuickView
    )
  })

  const sortedFilteredLeads = [...filteredLeads].sort((firstLead, secondLead) => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1

    if (sortKey === 'createdAt') {
      const dateDifference = toSortableTimestamp(firstLead.createdAt) - toSortableTimestamp(secondLead.createdAt)
      return dateDifference * directionFactor
    }

    if (sortKey === 'name') {
      return firstLead.name.localeCompare(secondLead.name, 'pt-BR', { sensitivity: 'base' }) * directionFactor
    }

    if (sortKey === 'qualification') {
      return getQualificationSortRank(firstLead, qualificationSortFocus) - getQualificationSortRank(secondLead, qualificationSortFocus)
    }

    if (sortKey === 'nextAgenda') {
      const firstDate = getApiDateTimestamp(firstLead.nextFollowUpDueAt)
      const secondDate = getApiDateTimestamp(secondLead.nextFollowUpDueAt)
      const firstHasDate = Number.isFinite(firstDate)
      const secondHasDate = Number.isFinite(secondDate)

      if (nextAgendaSortFocus === 'noDateFirst') {
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

      if (nextAgendaSortFocus === 'oldestFirst') {
        return firstDate - secondDate
      }

      return secondDate - firstDate
    }

    if (sortKey === 'lastContact') {
      const dateDifference =
        getApiDateTimestamp(parsePersistedUtcClockToBrowserDate(firstLead.lastMessageAt)) -
        getApiDateTimestamp(parsePersistedUtcClockToBrowserDate(secondLead.lastMessageAt))
      return dateDifference * directionFactor
    }

    return getSourceSortRank(firstLead.source, sourceSortFocus) - getSourceSortRank(secondLead.source, sourceSortFocus)
  })

  const paginatedLeads = sortedFilteredLeads

  const setLeadNameRef = (leadId: string, element: HTMLSpanElement | null) => {
    leadNameRefs.current[leadId] = element
  }

  useEffect(() => {
    if (isMobile) {
      return
    }

    const recalculateWrappedNames = () => {
      const nextWrappedNames: Record<string, boolean> = {}

      paginatedLeads.forEach((lead) => {
        const leadNameElement = leadNameRefs.current[lead.id]

        if (!leadNameElement) {
          nextWrappedNames[lead.id] = false
          return
        }

        const computedStyle = window.getComputedStyle(leadNameElement)
        const lineHeight = Number.parseFloat(computedStyle.lineHeight)

        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
          nextWrappedNames[lead.id] = false
          return
        }

        const lineCount = Math.round(
          leadNameElement.getBoundingClientRect().height / lineHeight
        )

        nextWrappedNames[lead.id] = lineCount > 1
      })

      setWrappedLeadNames((currentWrappedNames) => {
        const currentKeys = Object.keys(currentWrappedNames)
        const nextKeys = Object.keys(nextWrappedNames)

        if (currentKeys.length !== nextKeys.length) {
          return nextWrappedNames
        }

        const hasDifference = nextKeys.some(
          (key) => currentWrappedNames[key] !== nextWrappedNames[key]
        )

        return hasDifference ? nextWrappedNames : currentWrappedNames
      })
    }

    recalculateWrappedNames()
    window.addEventListener('resize', recalculateWrappedNames)

    return () => {
      window.removeEventListener('resize', recalculateWrappedNames)
    }
  }, [isMobile, paginatedLeads])
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

  const handleDeleteLead = async (leadId: string) => {
    try {
      await LeadsService.deleteLead(leadId)
      setConfirmingDeleteLeadId(null)
      await reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao deletar lead.'
      console.error('Erro ao deletar lead:', message)
      setConfirmingDeleteLeadId(null)
    }
  }

  const handleArchiveLead = async (leadId: string) => {
    try {
      await LeadsService.setLeadArchiveState(leadId, 'archived')
      setConfirmingArchiveLeadId(null)
      await reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao arquivar lead.'
      console.error('Erro ao arquivar lead:', message)
      setConfirmingArchiveLeadId(null)
    }
  }

  const handleUnarchiveLead = async (leadId: string) => {
    try {
      await LeadsService.setLeadArchiveState(leadId, 'active')
      await reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao desarquivar lead.'
      console.error('Erro ao desarquivar lead:', message)
    }
  }

  const handleToggleFavoriteLead = async (targetLead: LeadsTableRow) => {
    try {
      await LeadsService.toggleFavoriteLead(targetLead.id, !targetLead.isFavorite)
      await reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar favorito do lead.'
      console.error('Erro ao favoritar lead:', message)
    }
  }

  const handleSortToggle = (nextSortKey: LeadSortKey) => {
    if (nextSortKey === 'qualification') {
      if (sortKey !== 'qualification') {
        setSortKey('qualification')
        setSortDirection('asc')
        setQualificationSortFocus('qualify')
        return
      }

      setQualificationSortFocus((currentFocus) => {
        if (currentFocus === 'qualify') {
          return 'notQualify'
        }

        if (currentFocus === 'notQualify') {
          return 'unqualified'
        }

        return 'qualify'
      })
      return
    }

    if (nextSortKey === 'nextAgenda') {
      if (sortKey !== 'nextAgenda') {
        setSortKey('nextAgenda')
        setSortDirection('asc')
        setNextAgendaSortFocus('oldestFirst')
        return
      }

      setNextAgendaSortFocus((currentFocus) => {
        if (currentFocus === 'oldestFirst') {
          return 'recentFirst'
        }

        if (currentFocus === 'recentFirst') {
          return 'noDateFirst'
        }

        return 'oldestFirst'
      })
      return
    }

    if (nextSortKey === 'source') {
      if (sortKey !== 'source') {
        setSortKey('source')
        setSortDirection('asc')
        setSourceSortFocus('whatsappFirst')
        return
      }

      setSourceSortFocus((currentFocus) => {
        if (currentFocus === 'whatsappFirst') {
          return 'metaAdsFirst'
        }

        if (currentFocus === 'metaAdsFirst') {
          return 'indicacaoFirst'
        }

        return 'whatsappFirst'
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

  const getSortIndicator = (targetSortKey: LeadSortKey): string => {
    if (sortKey !== targetSortKey) {
      return '↕'
    }

    if (targetSortKey === 'qualification') {
      return qualificationSortFocus === 'qualify' ? '↑' : '↓'
    }

    if (targetSortKey === 'nextAgenda') {
      return nextAgendaSortFocus === 'recentFirst' ? '↑' : '↓'
    }

    if (targetSortKey === 'source') {
      return ''
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getHeaderSortButtonStyle = (targetSortKey: LeadSortKey) => ({
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
    justifyContent: 'flex-start',
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
          <h1 style={{ margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }}>Leads</h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 52px 52px', gap: 12 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar lead"
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
              cursor: 'pointer',
              color: '#111827',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            aria-label="Abrir filtros"
          >
            <ListFilter size={20} color="#111827" />
          </button>

          <button
            type="button"
            aria-label="Adicionar lead"
            onMouseEnter={() => setIsAddLeadButtonHovered(true)}
            onMouseLeave={() => setIsAddLeadButtonHovered(false)}
            onClick={() => navigate(`/leads/new${location.search}`)}
            style={{
              height: 52,
              width: 52,
              border: 'none',
              borderRadius: 14,
              background: isAddLeadButtonHovered
                ? interactionTheme.primaryButtonHoverBackground
                : interactionTheme.primaryButtonBackground,
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
                  onClick={() => setShowOnlyFavorites((current) => !current)}
                  onMouseEnter={() => setHoveredFilterOption('favorites')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(showOnlyFavorites || hoveredFilterOption === 'favorites')}
                >
                  Favoritos
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyNewLeads((current) => !current)}
                  onMouseEnter={() => setHoveredFilterOption('new-leads')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(showOnlyNewLeads || hoveredFilterOption === 'new-leads')}
                >
                  Novos
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyWithoutConversation24h((current) => !current)}
                  onMouseEnter={() => setHoveredFilterOption('without-conversation-24h')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(showOnlyWithoutConversation24h || hoveredFilterOption === 'without-conversation-24h')}
                >
                  Sem conversa 24h+
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyQualified((current) => !current)}
                  onMouseEnter={() => setHoveredFilterOption('qualified')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(showOnlyQualified || hoveredFilterOption === 'qualified')}
                >
                  Qualificado
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyNotQualified((current) => !current)}
                  onMouseEnter={() => setHoveredFilterOption('not-qualified')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(showOnlyNotQualified || hoveredFilterOption === 'not-qualified')}
                >
                  Não qualificado
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

        <div style={{ maxHeight: '100%', minHeight: 0, overflowY: isCreateLeadFormOpen ? 'hidden' : 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }}>
          {paginatedLeads.map((lead) => {
            const isArchivedLead = lead.state === 'archived'
            const shouldShowNewTag = isNewLead(lead.createdAt)
            const interactionTagPresentation = getInteractionTagPresentation(
              lead.lastMessageAt,
              lead.createdAt
            )
            const sourceTagPresentation = getSourceTagPresentation(lead.source)
            const nextAgendaLabel = formatAgendaDateTime(lead.nextFollowUpDueAt)
            const nextAgendaTagColors = getNextAgendaTagColors(resolveNextAgendaStatus(lead))

            if (confirmingArchiveLeadId === lead.id) {
              return (
                <article
                  key={lead.id}
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
                  <strong style={{ color: '#111827', fontSize: 15 }}>Arquivar Lead?</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      aria-label="Cancelar arquivamento de lead"
                      onClick={() => setConfirmingArchiveLeadId(null)}
                      style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      aria-label="Confirmar arquivamento de lead"
                      onClick={() => void handleArchiveLead(lead.id)}
                      style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                    >
                      ✓
                    </button>
                  </div>
                </article>
              )
            }

            if (confirmingDeleteLeadId === lead.id) {
              return (
                <article
                  key={lead.id}
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
                  <strong style={{ color: '#111827', fontSize: 15 }}>Deletar Lead?</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      aria-label="Cancelar exclusão de lead"
                      onClick={() => setConfirmingDeleteLeadId(null)}
                      style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      aria-label="Confirmar exclusão de lead"
                      onClick={() => void handleDeleteLead(lead.id)}
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
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}${location.search}`)}
                onMouseEnter={() => setHoveredLeadId(lead.id)}
                onMouseLeave={() => {
                  setHoveredLeadId(null)
                  setHoveredNextAgendaValueLeadId(null)
                }}
                style={{
                  background:
                    hoveredLeadId === lead.id || leadId === lead.id
                      ? interactionTheme.clickableCardHoverBackground
                      : '#ffffff',
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
                    <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</h2>
                    {isArchivedLead || sourceTagPresentation.label === '-' ? null : (
                      <span
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          color: sourceTagPresentation.textColor,
                          whiteSpace: 'nowrap',
                          background: `${sourceTagPresentation.textColor}44`,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                          flexShrink: 0
                        }}
                      >
                        {sourceTagPresentation.icon ? (
                          <span style={tagIconStyle}>{sourceTagPresentation.icon}</span>
                        ) : null}
                        <span style={tagContentStyle}>{sourceTagPresentation.label}</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={lead.isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
                      onClick={() => {
                        void handleToggleFavoriteLead(lead)
                      }}
                      style={{
                        height: 34,
                        width: 34,
                        border: lead.isFavorite ? '1px solid #fde047' : '1px solid #e5e7eb',
                        borderRadius: 8,
                        background: lead.isFavorite ? '#fef9c3' : '#ffffff',
                        color: lead.isFavorite ? '#facc15' : '#4b5563',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Star size={17} fill={lead.isFavorite ? '#facc15' : 'none'} strokeWidth={2} />
                    </button>

                    <button
                      type="button"
                      aria-label={isArchivedLead ? 'Desarquivar lead' : 'Arquivar lead'}
                      onClick={() => {
                        setConfirmingDeleteLeadId(null)
                        if (isArchivedLead) {
                          void handleUnarchiveLead(lead.id)
                          return
                        }

                        setConfirmingArchiveLeadId(lead.id)
                      }}
                      style={{
                        height: 34,
                        width: 34,
                        border: isArchivedLead ? '1px solid #d1d5db' : '1px solid #e5e7eb',
                        borderRadius: 8,
                        background: isArchivedLead ? '#e5e7eb' : '#ffffff',
                        color: isArchivedLead ? '#6b7280' : '#4b5563',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Archive size={16} />
                    </button>

                    <button
                      type="button"
                      aria-label="Excluir lead"
                      onClick={() => {
                        setConfirmingArchiveLeadId(null)
                        setConfirmingDeleteLeadId(lead.id)
                      }}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#4b5563', fontSize: 14, fontWeight: 700 }}>
                      <Clock3 size={17} />
                      <span>Último contato</span>
                    </div>
                    <p style={{ margin: '8px 0 0 24px', color: '#64748b', fontSize: 14, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isArchivedLead ? '-' : shouldShowNewTag ? 'Novo' : interactionTagPresentation.label}
                    </p>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#4b5563', fontSize: 14, fontWeight: 700 }}>
                      <CalendarDays size={17} />
                      <span>Próxima agenda</span>
                    </div>
                    <button
                      type="button"
                      disabled={isArchivedLead || nextAgendaLabel === '-' || !lead.nextFollowUpNegotiationId}
                      onClick={(event) => {
                        event.stopPropagation()

                        if (!lead.nextFollowUpNegotiationId) {
                          return
                        }

                        void openLeadNextAgendaFollowUp(lead)
                      }}
                      style={{
                        margin: '8px 0 0 24px',
                        border: 'none',
                        background: 'transparent',
                        color: nextAgendaTagColors.textColor,
                        padding: 0,
                        fontSize: 14,
                        lineHeight: 1.35,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 'calc(100% - 24px)',
                        cursor: lead.nextFollowUpNegotiationId ? 'pointer' : 'default',
                        textAlign: 'left'
                      }}
                    >
                      {isArchivedLead ? '-' : nextAgendaLabel}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}

          {!isLoading && !error && filteredLeads.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Nenhum lead encontrado.</div>
          ) : null}
          {isLoading ? (
            <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Carregando leads...</div>
          ) : null}
          {error ? (
            <div style={{ color: '#b91c1c', fontSize: 14, padding: 16, textAlign: 'center' }}>{error}</div>
          ) : null}
        </div>

        {leadId === 'new' ? (
          <>
            <button
              type="button"
              aria-label="Fechar criação de lead"
              onClick={() => navigate(`/leads${location.search}`)}
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
              <LeadPage onLeadUpdated={handleLeadUpdated} onLeadCreated={handleLeadCreated} />
            </aside>
          </>
        ) : isLeadSelected ? (
          <aside
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: '#ffffff',
              overflow: 'hidden'
            }}
          >
            <LeadPage onLeadUpdated={handleLeadUpdated} onLeadCreated={handleLeadCreated} />
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
        <h1 style={{ margin: 0, fontSize: 18, color: '#111827', lineHeight: 1.2 }}>Leads</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar Lead"
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
              cursor: 'pointer',
              color: '#111827',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            aria-label="Abrir filtros"
          >
            <ListFilter size={16} color="#111827" />
          </button>
          <button
            type="button"
            onMouseEnter={() => setIsAddLeadButtonHovered(true)}
            onMouseLeave={() => setIsAddLeadButtonHovered(false)}
            onClick={() => navigate(`/leads/new${location.search}`)}
            style={{
              height: 38,
              border: 'none',
              borderRadius: 8,
              background: isAddLeadButtonHovered
                ? interactionTheme.primaryButtonHoverBackground
                : interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              padding: '0 16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Adicionar Lead
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
                onClick={() => setShowOnlyFavorites((current) => !current)}
                onMouseEnter={() => setHoveredFilterOption('favorites')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(showOnlyFavorites || hoveredFilterOption === 'favorites')}
              >
                Favoritos
              </button>

              <button
                type="button"
                onClick={() => setShowOnlyNewLeads((current) => !current)}
                onMouseEnter={() => setHoveredFilterOption('new-leads')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(showOnlyNewLeads || hoveredFilterOption === 'new-leads')}
              >
                Novos
              </button>

              <button
                type="button"
                onClick={() => setShowOnlyWithoutConversation24h((current) => !current)}
                onMouseEnter={() => setHoveredFilterOption('without-conversation-24h')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(showOnlyWithoutConversation24h || hoveredFilterOption === 'without-conversation-24h')}
              >
                Sem conversa 24h+
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyQualified((current) => !current)}
                onMouseEnter={() => setHoveredFilterOption('qualified')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(showOnlyQualified || hoveredFilterOption === 'qualified')}
              >
                Qualificado
              </button>

              <button
                type="button"
                onClick={() => setShowOnlyNotQualified((current) => !current)}
                onMouseEnter={() => setHoveredFilterOption('not-qualified')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(showOnlyNotQualified || hoveredFilterOption === 'not-qualified')}
              >
                Não qualificado
              </button>
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
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('name')}
                    style={getHeaderSortButtonStyle('name')}
                  >
                    Nome <span style={{ fontSize: 11 }}>{getSortIndicator('name')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('qualification')}
                    style={getHeaderSortButtonStyle('qualification')}
                  >
                    Qualificação <span style={{ fontSize: 11 }}>{getSortIndicator('qualification')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('nextAgenda')}
                    style={getHeaderSortButtonStyle('nextAgenda')}
                  >
                    Próxima agenda <span style={{ fontSize: 11 }}>{getSortIndicator('nextAgenda')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('lastContact')}
                    style={getHeaderSortButtonStyle('lastContact')}
                  >
                    Último contato <span style={{ fontSize: 11 }}>{getSortIndicator('lastContact')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSortToggle('source')}
                    style={getHeaderSortButtonStyle('source')}
                  >
                    Origem <span style={{ fontSize: 11 }}>{getSortIndicator('source')}</span>
                  </button>
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => {
                const isArchivedLead = lead.state === 'archived'
                const shouldShowNewTag = isNewLead(lead.createdAt)
                const interactionTagPresentation = getInteractionTagPresentation(
                  lead.lastMessageAt,
                  lead.createdAt
                )
                const sourceTagPresentation = getSourceTagPresentation(lead.source)
                const leadQualificationLabel = isArchivedLead
                  ? 'Arquivado'
                  : getLeadQualificationLabel(lead.leadQualification)
                const nextAgendaLabel = formatAgendaDateTime(lead.nextFollowUpDueAt)
                const nextAgendaTagColors = getNextAgendaTagColors(resolveNextAgendaStatus(lead))
                if (confirmingArchiveLeadId === lead.id) {
                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: interactionTheme.clickableCardHoverBackground
                      }}
                      onMouseEnter={() => setHoveredLeadId(lead.id)}
                      onMouseLeave={() => setHoveredLeadId(null)}
                    >
                      <td
                        colSpan={5}
                        style={{
                          padding: '14px 16px',
                          color: '#2f2f2f',
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        Arquivar Lead?
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
                            aria-label="Cancelar arquivamento de lead"
                            onClick={(event) => {
                              event.stopPropagation()
                              setConfirmingArchiveLeadId(null)
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
                            aria-label="Confirmar arquivamento de lead"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleArchiveLead(lead.id)
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

                if (confirmingDeleteLeadId === lead.id) {
                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: interactionTheme.clickableCardHoverBackground
                      }}
                      onMouseEnter={() => setHoveredLeadId(lead.id)}
                      onMouseLeave={() => setHoveredLeadId(null)}
                    >
                      <td
                        colSpan={5}
                        style={{
                          padding: '14px 16px',
                          color: '#2f2f2f',
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        Deletar Lead?
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
                            aria-label="Cancelar exclusão de lead"
                            onClick={(event) => {
                              event.stopPropagation()
                              setConfirmingDeleteLeadId(null)
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
                            aria-label="Confirmar exclusão de lead"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDeleteLead(lead.id)
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
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}${location.search}`)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background:
                        hoveredLeadId === lead.id || leadId === lead.id
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredLeadId(lead.id)}
                    onMouseLeave={() => {
                      setHoveredLeadId(null)
                      setHoveredNextAgendaValueLeadId(null)
                    }}
                  >
                    <td
                      style={{
                        padding: wrappedLeadNames[lead.id]
                          ? '6px 16px'
                          : '14px 16px',
                        color: '#111827'
                      }}
                    >
                      <span
                        ref={(element) => setLeadNameRef(lead.id, element)}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'normal',
                          lineHeight: '18px'
                        }}
                      >
                        {lead.name}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {leadQualificationLabel === '-' ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              leadQualificationLabel === 'Qualificado'
                                ? '#166534'
                                : leadQualificationLabel === 'Não qualificado'
                                  ? '#b91c1c'
                                  : '#b45309',
                            whiteSpace: 'nowrap',
                            background:
                              leadQualificationLabel === 'Qualificado'
                                ? '#dcfce7'
                                : leadQualificationLabel === 'Não qualificado'
                                  ? '#fee2e2'
                                  : '#fef3c7',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1
                          }}
                        >
                          <span style={tagContentStyle}>{leadQualificationLabel}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {isArchivedLead || nextAgendaLabel === '-' ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          onMouseEnter={() => setHoveredNextAgendaValueLeadId(lead.id)}
                          onMouseLeave={() => setHoveredNextAgendaValueLeadId(null)}
                          onClick={(event) => {
                            event.stopPropagation()

                            if (!lead.nextFollowUpNegotiationId) {
                              return
                            }

                            void openLeadNextAgendaFollowUp(lead)
                          }}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: nextAgendaTagColors.textColor,
                            whiteSpace: 'nowrap',
                            background: nextAgendaTagColors.background,
                            border: hoveredNextAgendaValueLeadId === lead.id
                              ? '1px solid #16a34a'
                              : '1px solid transparent',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            cursor: lead.nextFollowUpNegotiationId ? 'pointer' : 'default',
                            lineHeight: 1.1
                          }}
                        >
                          <span style={tagContentStyle}>{nextAgendaLabel}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {isArchivedLead ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: shouldShowNewTag ? '#eab308' : interactionTagPresentation.textColor,
                            whiteSpace: 'nowrap',
                            background: shouldShowNewTag ? '#fef3c7' : `${interactionTagPresentation.textColor}44`,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1
                          }}
                        >
                          {!shouldShowNewTag && interactionTagPresentation.icon ? (
                            <span style={tagIconStyle}>
                              {interactionTagPresentation.icon}
                            </span>
                          ) : null}
                          <span style={tagContentStyle}>
                            {shouldShowNewTag ? 'Novo' : interactionTagPresentation.label}
                          </span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111827', textAlign: 'center' }}>
                      {isArchivedLead || sourceTagPresentation.label === '-' ? (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: sourceTagPresentation.textColor,
                            whiteSpace: 'nowrap',
                            background: `${sourceTagPresentation.textColor}44`,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1
                          }}
                        >
                          {sourceTagPresentation.icon ? (
                            <span style={tagIconStyle}>
                              {sourceTagPresentation.icon}
                            </span>
                          ) : null}
                          <span style={tagContentStyle}>{sourceTagPresentation.label}</span>
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
                          aria-label={lead.isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
                          onClick={() => {
                            void handleToggleFavoriteLead(lead)
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            border: lead.isFavorite ? '1px solid #fde047' : '1px solid #e5e7eb',
                            borderRadius: 4,
                            background: lead.isFavorite ? '#fef9c3' : '#ffffff',
                            color: lead.isFavorite ? '#facc15' : '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Star
                            size={14}
                            fill={lead.isFavorite ? '#facc15' : 'none'}
                            strokeWidth={2}
                          />
                        </button>

                        <button
                          type="button"
                          aria-label={isArchivedLead ? 'Desarquivar lead' : 'Arquivar lead'}
                          onClick={() => {
                            setConfirmingDeleteLeadId(null)
                            if (isArchivedLead) {
                              void handleUnarchiveLead(lead.id)
                              return
                            }

                            setConfirmingArchiveLeadId(lead.id)
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.background = isArchivedLead
                              ? '#e5e7eb'
                              : interactionTheme.clickableCardHoverBackground
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.background = isArchivedLead
                              ? '#e5e7eb'
                              : '#ffffff'
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            border: isArchivedLead ? '1px solid #d1d5db' : '1px solid #e5e7eb',
                            borderRadius: 4,
                            background: isArchivedLead ? '#e5e7eb' : '#ffffff',
                            color: isArchivedLead ? '#6b7280' : '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Archive size={14} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir lead"
                          onClick={() => {
                            setConfirmingArchiveLeadId(null)
                            setConfirmingDeleteLeadId(lead.id)
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
              {!isLoading && !error && filteredLeads.length === 0 ? (
                <tr>
                  <td
                      colSpan={6}
                    style={{ padding: '14px 16px', color: '#6b7280' }}
                  >
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td
                      colSpan={6}
                    style={{ padding: '14px 16px', color: '#6b7280' }}
                  >
                    Carregando leads...
                  </td>
                </tr>
              ) : null}
              {error ? (
                <tr>
                  <td
                      colSpan={6}
                    style={{ padding: '14px 16px', color: '#b91c1c' }}
                  >
                    {error}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {isLeadSelected && !isMobile ? (
          <button
            type="button"
            aria-label="Fechar lead aberto"
            onClick={() => navigate(`/leads${location.search}`)}
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
              left: isMobile ? 0 : 'auto',
              width: isMobile ? '100%' : leadPanelWidth,
              zIndex: 30,
              borderLeft: isMobile ? 'none' : '2px solid #edf1f5',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: isMobile ? 'none' : '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform: isLeadPanelEntering ? 'translateX(0)' : 'translateX(100%)',
              transition: `transform ${leadPanelTransitionMs}ms ease`
            }}
          >
            <LeadPage onLeadUpdated={handleLeadUpdated} onLeadCreated={handleLeadCreated} />
          </aside>
        ) : null}
      </div>
    </section>
  )
}
