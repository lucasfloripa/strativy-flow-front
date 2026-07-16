import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Clock3,
  Clock4,
  CircleDollarSign,
  MessageCircle,
  UserPlus,
  X
} from 'lucide-react'
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState
} from 'react'
import { useNavigate } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import {
  formatDateTime,
  formatElapsedHoursAndMinutes,
  parseApiDateToBrowserDate
} from '../../core/utils/dateTime'
import { HomeService } from '../../features/home/services/HomeService'
import type {
  DashboardSummary,
  HomeHighlightedLead,
  UserNotification
} from '../../features/home/types/home.types'

type NotificationIcon = 'message' | 'lead' | 'followup'

type Notification = {
  id: string
  type: UserNotification['type']
  referenceType: UserNotification['referenceType']
  referenceId: string
  title: string
  description: string
  createdAt: string | Date
  time: string
  color: string
  icon: NotificationIcon
  messageCount?: number
}

type NotificationNavigation = {
  path: string
  state?: {
    initialLeadTab?: 'geral' | 'chat'
  }
}

type HighlightedLead = {
  id: string
  initials: string
  initialsColor: string
  name: string
  phone: string
  status: 'Ativo' | 'Arquivado'
  createdAt: string | Date | null
  lastMessageAt: string | Date | null
  nextFollowUpDueAt: string | Date | null
  nextFollowUpNegotiationId: string | null
  topFollowUpStatus: 'overdue' | 'today' | 'scheduled' | 'completed' | null
  hasFollowUpOverdue: boolean
  hasFollowUpToday: boolean
  hasFollowUpScheduled: boolean
}

type RevenueDateRange = {
  startDate: string
  endDate: string
}

const cardBackground = '#fcfdff'
const cardBorder = '1px solid #f4f6fa'
const cardShadow = '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)'
const topSummaryCardHeight = 120

const INITIAL_DASHBOARD_SUMMARY: DashboardSummary = {
  activeLeads: 0,
  newToday: 0,
  withoutConversation24h: 0,
  followUps: {
    overdue: 0,
    today: 0,
    scheduled: 0
  },
  revenue: 0
}

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeDashboardSummary = (payload: unknown): DashboardSummary => {
  if (!payload || typeof payload !== 'object') {
    return INITIAL_DASHBOARD_SUMMARY
  }

  const source = payload as Partial<DashboardSummary> & {
    followUps?: Partial<DashboardSummary['followUps']>
  }

  return {
    activeLeads: normalizeNumber(source.activeLeads),
    newToday: normalizeNumber(source.newToday),
    withoutConversation24h: normalizeNumber(source.withoutConversation24h),
    followUps: {
      overdue: normalizeNumber(source.followUps?.overdue),
      today: normalizeNumber(source.followUps?.today),
      scheduled: normalizeNumber(source.followUps?.scheduled)
    },
    revenue: normalizeNumber(source.revenue)
  }
}

const formatCurrencyBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isSameDate = (first: string, second: string): boolean => first === second

const formatDateRangeLabel = (range: RevenueDateRange): string => {
  if (isSameDate(range.startDate, range.endDate)) {
    return 'Hoje'
  }

  const start = new Date(`${range.startDate}T00:00:00`)
  const end = new Date(`${range.endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Hoje'
  }

  const startFormatted = new Intl.DateTimeFormat('pt-BR').format(start)
  const endFormatted = new Intl.DateTimeFormat('pt-BR').format(end)
  return `${startFormatted} ate ${endFormatted}`
}

const initialsPalette = [
  '#7c3aed',
  '#f59e0b',
  '#3b82f6',
  '#16a34a',
  '#0ea5e9',
  '#e11d48',
  '#0f766e'
]

const getInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return 'LD'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

const getInitialsColor = (id: string): string => {
  const hash = [...id].reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0)
  return initialsPalette[hash % initialsPalette.length]
}

const formatPhone = (value?: string): string => {
  const phone = (value ?? '').trim()
  if (!phone) {
    return '-'
  }

  const digits = phone.replace(/\D/g, '')
  const normalizedDigits = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
  const phoneMatch = normalizedDigits.match(/^(\d{2})(\d{4,5})(\d{4})$/)

  if (!phoneMatch) {
    return phone
  }

  const [, ddd, firstPart, secondPart] = phoneMatch
  return `(${ddd}) ${firstPart}-${secondPart}`
}

const getStatusLabel = (value?: string): 'Ativo' | 'Arquivado' => {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized === 'archived' ? 'Arquivado' : 'Ativo'
}

const formatRelativeTime = (value?: string | Date | null): string => {
  return formatElapsedHoursAndMinutes(value)
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

const getInteractionTagPresentation = (
  lastMessageAt: string | Date | null,
  createdAt: string | Date | null
) => {
  const referenceValue = lastMessageAt ?? createdAt

  return {
    label: referenceValue ? formatDateTime(referenceValue) : '-',
    textColor: '#6b7280',
    icon: <Clock3 size={12} />
  }
}

const formatAgendaDateTime = (value?: string | Date | null): string => {
  if (!value) {
    return '-'
  }

  return formatDateTime(value)
}

const resolveNextAgendaStatus = (
  lead: HighlightedLead
): HighlightedLead['topFollowUpStatus'] => {
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

  return lead.topFollowUpStatus
}

const getNextAgendaTagColors = (
  status?: HighlightedLead['topFollowUpStatus']
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

const mapApiLeadToHighlightedLead = (lead: HomeHighlightedLead): HighlightedLead => {
  const name = (lead.name ?? '').trim() || 'Lead sem nome'

  return {
    id: lead.id,
    initials: getInitials(name),
    initialsColor: getInitialsColor(lead.id),
    name,
    phone: formatPhone(lead.phone),
    status: getStatusLabel(lead.state),
    createdAt: lead.createdAt ?? null,
    lastMessageAt: lead.lastMessageAt ?? null,
    nextFollowUpDueAt: lead.nextFollowUpDueAt ?? null,
    nextFollowUpNegotiationId: lead.nextFollowUpNegotiationId ?? null,
    topFollowUpStatus: lead.topFollowUpStatus ?? null,
    hasFollowUpOverdue: lead.hasFollowUpOverdue ?? false,
    hasFollowUpToday: lead.hasFollowUpToday ?? false,
    hasFollowUpScheduled: lead.hasFollowUpScheduled ?? false
  }
}

const mapApiNotification = (notification: UserNotification): Notification => {
  const isNewMessage = notification.type === 'MESSAGE_RECEIVED'
  const isFollowUpReminder = notification.type === 'FOLLOW_UP_REMINDER_1H'

  const icon: NotificationIcon = isNewMessage
    ? 'message'
    : isFollowUpReminder
      ? 'followup'
      : 'lead'

  const color = isNewMessage
    ? '#22c55e'
    : isFollowUpReminder
      ? '#f59e0b'
      : '#3b82f6'

  return {
    id: notification.id,
    type: notification.type,
    referenceType: notification.referenceType,
    referenceId: notification.referenceId,
    title: notification.title,
    description: notification.description,
    createdAt: notification.createdAt,
    time: formatRelativeTime(notification.createdAt),
    color,
    icon
  }
}

const groupUnreadNotifications = (
  notifications: UserNotification[]
): Notification[] => {
  const unreadNotifications = notifications.filter((item) => !item.isRead)
  const groupedMessageNotifications = new Map<string, UserNotification[]>()
  const nonMessageNotifications: UserNotification[] = []

  for (const notification of unreadNotifications) {
    if (notification.type !== 'MESSAGE_RECEIVED') {
      nonMessageNotifications.push(notification)
      continue
    }

    const existingGroup = groupedMessageNotifications.get(notification.referenceId)

    if (existingGroup) {
      existingGroup.push(notification)
      continue
    }

    groupedMessageNotifications.set(notification.referenceId, [notification])
  }

  const groupedMessages = Array.from(groupedMessageNotifications.values()).map(
    (group) => {
      const sortedGroup = [...group].sort((first, second) => {
        const firstTimestamp = new Date(first.createdAt).getTime()
        const secondTimestamp = new Date(second.createdAt).getTime()

        return secondTimestamp - firstTimestamp
      })

      const latestNotification = sortedGroup[0]
      const mapped = mapApiNotification(latestNotification)
      const messageCount = sortedGroup.length

      return {
        ...mapped,
        title:
          messageCount > 1
            ? `${mapped.title} (${messageCount})`
            : mapped.title,
        messageCount
      }
    }
  )

  const mergedNotifications = [
    ...nonMessageNotifications.map(mapApiNotification),
    ...groupedMessages
  ]

  return mergedNotifications.sort((first, second) => {
    const firstTime = new Date(first.createdAt).getTime()
    const secondTime = new Date(second.createdAt).getTime()

    return secondTime - firstTime
  })
}

const getNotificationNavigation = (
  notification: Notification
): NotificationNavigation => {
  switch (notification.type) {
    case 'LEAD_CREATED':
      return {
        path: `/leads/${notification.referenceId}`,
        state: {
          initialLeadTab: 'geral'
        }
      }
    case 'MESSAGE_RECEIVED':
      return {
        path: `/leads/${notification.referenceId}`,
        state: {
          initialLeadTab: 'chat'
        }
      }
    case 'FOLLOW_UP_REMINDER_1H':
      return {
        path: '/agenda?followUp=today'
      }
    default:
      return {
        path: '/leads'
      }
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const today = toDateInputValue(new Date())
  const [hoveredHighlightedLeadId, setHoveredHighlightedLeadId] = useState<string | null>(null)
  const [hoveredHighlightedNextAgendaLeadId, setHoveredHighlightedNextAgendaLeadId] = useState<string | null>(null)
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(null)
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null)
  const [isClearNotificationsHovered, setIsClearNotificationsHovered] = useState<boolean>(false)
  const [hoveredSummaryCardKey, setHoveredSummaryCardKey] = useState<string | null>(null)
  const [hoveredFollowUpMetricKey, setHoveredFollowUpMetricKey] = useState<string | null>(null)
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(
    INITIAL_DASHBOARD_SUMMARY
  )
  const [highlightedLeads, setHighlightedLeads] = useState<HighlightedLead[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [revenueValue, setRevenueValue] = useState<number>(0)
  const [appliedRevenueRange, setAppliedRevenueRange] = useState<RevenueDateRange>({
    startDate: today,
    endDate: today
  })
  const [revenueDatePickerValue, setRevenueDatePickerValue] = useState<string>(today)
  const [revenueDatePickerStep, setRevenueDatePickerStep] = useState<'idle' | 'start' | 'end'>(
    'idle'
  )
  const [pendingRevenueStartDate, setPendingRevenueStartDate] = useState<string | null>(null)
  const revenueDatePickerInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let isActive = true

    const loadDashboardSummary = async () => {
      const [summaryResult, highlightedResult, notificationsResult] =
        await Promise.allSettled([
          HomeService.getDashboardSummary(),
          HomeService.getHighlightedLeads(),
          HomeService.getNotifications()
        ])

      if (!isActive) {
        return
      }

      if (summaryResult.status === 'fulfilled') {
        setDashboardSummary(normalizeDashboardSummary(summaryResult.value))
      }

      if (highlightedResult.status === 'fulfilled') {
        setHighlightedLeads(
          highlightedResult.value.map(mapApiLeadToHighlightedLead)
        )
      }

      if (notificationsResult.status === 'fulfilled') {
        setNotifications(groupUnreadNotifications(notificationsResult.value))
      }
    }

    const loadRevenue = async () => {
      const incomeResult = await HomeService.getDashboardIncome(
        appliedRevenueRange.startDate,
        appliedRevenueRange.endDate
      )

      if (!isActive) {
        return
      }

      setRevenueValue(normalizeNumber(incomeResult.income))
    }

    void loadDashboardSummary()
    void loadRevenue()

    return () => {
      isActive = false
    }
  }, [appliedRevenueRange.endDate, appliedRevenueRange.startDate])

  const summaryFollowUps = dashboardSummary.followUps
  const summaryNewToday = dashboardSummary.newToday
  const summaryWithoutConversation24h = dashboardSummary.withoutConversation24h
  const summaryRevenue = revenueValue
  const revenueDateLabel = formatDateRangeLabel(appliedRevenueRange)

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotificationId(notification.id)

    try {
      if (notification.type === 'MESSAGE_RECEIVED') {
        await HomeService.markAllMessageNotificationsAsRead(
          notification.referenceId
        )
      } else {
        await HomeService.markNotificationAsRead(notification.id)
      }
    } catch {
      return
    }

    setNotifications((currentNotifications) => {
      if (notification.type === 'MESSAGE_RECEIVED') {
        return currentNotifications.filter(
          (item) =>
            !(
              item.type === 'MESSAGE_RECEIVED' &&
              item.referenceId === notification.referenceId
            )
        )
      }

      return currentNotifications.filter((item) => item.id !== notification.id)
    })

    const target = getNotificationNavigation(notification)
    navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  const handleClearNotifications = async () => {
    if (!notifications.length) {
      return
    }

    try {
      await HomeService.markAllNotificationsAsRead()
    } catch {
      return
    }

    setNotifications([])
    setSelectedNotificationId(null)
  }

  const handleDeleteNotification = async (notification: Notification) => {
    try {
      if (notification.type === 'MESSAGE_RECEIVED') {
        await HomeService.deleteAllMessageNotifications(notification.referenceId)
      } else {
        await HomeService.deleteNotification(notification.id)
      }
    } catch {
      return
    }

    setNotifications((currentNotifications) => {
      if (notification.type === 'MESSAGE_RECEIVED') {
        return currentNotifications.filter(
          (item) =>
            !(
              item.type === 'MESSAGE_RECEIVED' &&
              item.referenceId === notification.referenceId
            )
        )
      }

      return currentNotifications.filter((item) => item.id !== notification.id)
    })

    if (selectedNotificationId === notification.id) {
      setSelectedNotificationId(null)
    }
  }

  const revenueDateButtonStyle: CSSProperties = {
    height: 32,
    borderRadius: 7,
    border: 'none',
    padding: '0 10px',
    color: '#334155',
    background: '#f7fcf8',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    flexShrink: 0
  }

  const openRevenueDatePicker = () => {
    const input = revenueDatePickerInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null

    if (!input) {
      return
    }

    input.focus()
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }

    input.click()
  }

  const handleRevenueDateButtonClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setPendingRevenueStartDate(null)
    setRevenueDatePickerStep('start')
    setRevenueDatePickerValue(appliedRevenueRange.startDate)

    setTimeout(() => {
      openRevenueDatePicker()
    }, 0)
  }

  const handleRevenueDatePickerChange = (value: string) => {
    if (!value) {
      const fallbackDate = toDateInputValue(new Date())

      setAppliedRevenueRange({
        startDate: fallbackDate,
        endDate: fallbackDate
      })
      setRevenueDatePickerValue(fallbackDate)
      setPendingRevenueStartDate(null)
      setRevenueDatePickerStep('idle')
      return
    }

    if (revenueDatePickerStep === 'start') {
      setPendingRevenueStartDate(value)
      setAppliedRevenueRange({
        startDate: value,
        endDate: value
      })
      setRevenueDatePickerStep('end')
      setRevenueDatePickerValue(value)

      setTimeout(() => {
        openRevenueDatePicker()
      }, 0)
      return
    }

    if (revenueDatePickerStep === 'end') {
      const startDateCandidate = pendingRevenueStartDate ?? value
      const nextStartDate = startDateCandidate <= value ? startDateCandidate : value
      const nextEndDate = startDateCandidate <= value ? value : startDateCandidate

      setAppliedRevenueRange({
        startDate: nextStartDate,
        endDate: nextEndDate
      })
      setRevenueDatePickerValue(nextEndDate)
      setPendingRevenueStartDate(null)
      setRevenueDatePickerStep('idle')
    }
  }

  const priorities = [
    {
      key: 'overdue',
      title: 'Atrasados',
      value: summaryFollowUps.overdue,
      color: '#ef4444',
      background: '#fff7f7',
      icon: <Clock4 size={20} color="#ef4444" />
    },
    {
      key: 'today',
      title: 'Para hoje',
      value: summaryFollowUps.today,
      color: '#f59e0b',
      background: '#fffaf0',
      icon: <CalendarClock size={20} color="#f59e0b" />
    },
    {
      key: 'scheduled',
      title: 'Agendados',
      value: summaryFollowUps.scheduled,
      color: '#2563eb',
      background: '#f5f9ff',
      icon: <CalendarDays size={20} color="#2563eb" />
    }
  ]

  return (
    <section
      style={{
        height: '100%',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: '#fafbfd',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 6fr) minmax(0, 4fr)', gap: 8, minHeight: 0, flex: 1, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>

            <article
              onClick={() => navigate('/leads?newLeads=true')}
              onMouseEnter={() => setHoveredSummaryCardKey('new')}
              onMouseLeave={() => setHoveredSummaryCardKey(null)}
              style={{
                background: hoveredSummaryCardKey === 'new' ? interactionTheme.clickableCardHoverBackground : cardBackground,
                border: cardBorder,
                borderRadius: 12,
                padding: '6px 7px',
                boxShadow: cardShadow,
                minHeight: topSummaryCardHeight,
                height: topSummaryCardHeight,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 700 }}>Novos</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ height: 44, width: 44, borderRadius: 12, background: '#e9f9ef', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserPlus size={23} />
                  </span>
                  <strong style={{ color: '#16a34a', fontSize: 34, lineHeight: 1, fontWeight: 700 }}>{summaryNewToday}</strong>
                </div>
              </div>
            </article>

            <article
              onClick={() => navigate('/leads?withoutConversation24h=true')}
              onMouseEnter={() => setHoveredSummaryCardKey('idle')}
              onMouseLeave={() => setHoveredSummaryCardKey(null)}
              style={{
                background: hoveredSummaryCardKey === 'idle' ? interactionTheme.clickableCardHoverBackground : cardBackground,
                border: cardBorder,
                borderRadius: 12,
                padding: '6px 7px',
                boxShadow: cardShadow,
                minHeight: topSummaryCardHeight,
                height: topSummaryCardHeight,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 700 }}>Sem conversa 24h+</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ height: 44, width: 44, borderRadius: 12, background: '#fff6ec', color: '#f97316', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock3 size={23} />
                  </span>
                  <strong style={{ color: '#f97316', fontSize: 34, lineHeight: 1, fontWeight: 700 }}>{summaryWithoutConversation24h}</strong>
                </div>
              </div>
            </article>
          </div>

          <article style={{ background: cardBackground, border: cardBorder, borderRadius: 12, boxShadow: cardShadow, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <header style={{ padding: '12px 14px 6px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>Em Destaque</h3>
            </header>

            <div style={{ padding: '0 14px', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.9fr) minmax(120px, 1fr) minmax(220px, 1.8fr)', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '10px 0 12px', borderBottom: '1px solid #eef2f7', width: '100%' }}>
                    <span>Lead</span>
                    <span style={{ textAlign: 'center' }}>Último contato</span>
                    <span style={{ textAlign: 'center' }}>Próxima agenda</span>
                  </div>

                  {highlightedLeads.map((highlightedLead) => {
                  const isArchivedLead = highlightedLead.status === 'Arquivado'
                  const shouldShowNewTag = isNewLead(highlightedLead.createdAt)
                  const interactionTagPresentation = getInteractionTagPresentation(
                    highlightedLead.lastMessageAt,
                    highlightedLead.createdAt
                  )
                  const nextAgendaLabel = formatAgendaDateTime(highlightedLead.nextFollowUpDueAt)
                  const nextAgendaTagColors = getNextAgendaTagColors(resolveNextAgendaStatus(highlightedLead))

                  const navigateToFollowUps = () => {
                    if (!highlightedLead.nextFollowUpNegotiationId) {
                      return
                    }

                    navigate(`/leads/${highlightedLead.id}`, {
                      state: {
                        initialLeadTab: 'negocios',
                        initialBusinessId: highlightedLead.nextFollowUpNegotiationId,
                        initialBusinessTab: 'followups'
                      }
                    })
                  }

                    return (
                      <div
                        key={highlightedLead.id}
                        onClick={() => navigate(`/leads/${highlightedLead.id}`)}
                        onMouseEnter={() => setHoveredHighlightedLeadId(highlightedLead.id)}
                        onMouseLeave={() => {
                          setHoveredHighlightedLeadId(null)
                          setHoveredHighlightedNextAgendaLeadId(null)
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(180px, 1.9fr) minmax(120px, 1fr) minmax(220px, 1.8fr)',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 0',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: hoveredHighlightedLeadId === highlightedLead.id ? interactionTheme.clickableCardHoverBackground : 'transparent',
                          transition: 'background 120ms ease',
                          width: '100%'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <span style={{ height: 38, width: 38, borderRadius: '50%', background: highlightedLead.initialsColor, color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                            {highlightedLead.initials}
                          </span>

                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, color: '#0f172a', fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{highlightedLead.name}</p>
                            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 14 }}>{highlightedLead.phone}</p>
                          </div>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', textAlign: 'center' }}>
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
                                border: '1px solid transparent',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                cursor: 'default',
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
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                          {isArchivedLead || nextAgendaLabel === '-' ? (
                            <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                          ) : (
                            <span
                              onMouseEnter={() => setHoveredHighlightedNextAgendaLeadId(highlightedLead.id)}
                              onMouseLeave={() => setHoveredHighlightedNextAgendaLeadId(null)}
                              onClick={(event) => {
                                event.stopPropagation()
                                navigateToFollowUps()
                              }}
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: nextAgendaTagColors.textColor,
                                whiteSpace: 'nowrap',
                                background: nextAgendaTagColors.background,
                                border: hoveredHighlightedNextAgendaLeadId === highlightedLead.id
                                  ? '1px solid #16a34a'
                                  : '1px solid transparent',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                cursor: highlightedLead.nextFollowUpNegotiationId ? 'pointer' : 'default',
                                lineHeight: 1.1
                              }}
                            >
                              <span style={tagContentStyle}>{nextAgendaLabel}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </article>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%' }}>
          <article style={{ background: cardBackground, border: cardBorder, borderRadius: 12, boxShadow: cardShadow, padding: '4px 5px', display: 'flex', flexDirection: 'column', minHeight: topSummaryCardHeight, height: topSummaryCardHeight, flexShrink: 0, justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
              {priorities.map((priority) => (
                <div
                  key={priority.key}
                  onClick={() => navigate(`/agenda?followUp=${priority.key}`)}
                  onMouseEnter={() => setHoveredFollowUpMetricKey(priority.key)}
                  onMouseLeave={() => setHoveredFollowUpMetricKey(null)}
                  style={{
                    borderRadius: 8,
                    padding: '8px 2px',
                    background: hoveredFollowUpMetricKey === priority.key ? interactionTheme.clickableCardHoverBackground : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 102,
                    cursor: 'pointer'
                  }}
                >
                  <p style={{ margin: 0, color: '#0f172a', fontSize: 16, lineHeight: 1.2, fontWeight: 600, textAlign: 'center' }}>{priority.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{priority.key === 'overdue' ? <Clock4 size={28} color="#ef4444" /> : priority.key === 'today' ? <CalendarClock size={28} color="#f59e0b" /> : <CalendarDays size={28} color="#2563eb" />}</span>
                    <strong style={{ color: priority.color, fontSize: 26, lineHeight: 1, fontWeight: 700 }}>{priority.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article style={{ background: cardBackground, border: cardBorder, borderRadius: 12, boxShadow: cardShadow, padding: '10px 10px 8px', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>Notificações</h3>
              <button
                type="button"
                onClick={() => {
                  void handleClearNotifications()
                }}
                onMouseEnter={() => setIsClearNotificationsHovered(true)}
                onMouseLeave={() => setIsClearNotificationsHovered(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: isClearNotificationsHovered
                    ? interactionTheme.sidebarItemActiveColor
                    : '#334155',
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Limpar
              </button>
            </div>

            <div style={{ marginTop: 10, minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 4 }}>
              {notifications.map((activity) => {
                return (
                  <div
                    key={activity.id}
                    onMouseEnter={() => setHoveredNotificationId(activity.id)}
                    onMouseLeave={() => setHoveredNotificationId(null)}
                    onClick={() => {
                      void handleNotificationClick(activity)
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      borderRadius: 8,
                      padding: '8px 8px',
                      cursor: 'pointer',
                      background: selectedNotificationId === activity.id || hoveredNotificationId === activity.id ? interactionTheme.clickableCardHoverBackground : 'transparent',
                      transition: 'background 120ms ease'
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {activity.icon === 'message' ? (
                        <MessageCircle size={19} color={activity.color} />
                      ) : activity.icon === 'followup' ? (
                        <CalendarClock size={19} color={activity.color} />
                      ) : (
                        <UserPlus size={19} color={activity.color} />
                      )}

                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#0f172a', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.title}</p>
                        <p style={{ margin: '2px 0 0', color: '#475569', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.description}</p>
                      </div>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#64748b', fontSize: 14 }}>{activity.time}</span>
                      {hoveredNotificationId === activity.id ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeleteNotification(activity)
                          }}
                          aria-label="Excluir notificação"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

          </article>

          <article style={{ background: cardBackground, border: cardBorder, borderRadius: 12, boxShadow: cardShadow, padding: '0 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 70 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ height: 52, width: 52, borderRadius: 16, background: '#edf8f0', color: '#0f7a43', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CircleDollarSign size={26} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 700 }}>Receita</p>
                  <strong style={{ marginTop: 4, display: 'block', color: '#0f7a43', fontSize: 30, lineHeight: 1.1, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrencyBRL(summaryRevenue)}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRevenueDateButtonClick}
                style={revenueDateButtonStyle}
              >
                <CalendarDays size={14} color="#0f7a43" />
                <span style={{ fontSize: 14 }}>{revenueDateLabel}</span>
                <ChevronDown size={14} />
              </button>
            </div>

            <input
              ref={revenueDatePickerInputRef}
              type="date"
              value={revenueDatePickerValue}
              onChange={(event) => handleRevenueDatePickerChange(event.target.value)}
              style={{
                position: 'absolute',
                opacity: 0,
                width: 1,
                height: 1,
                pointerEvents: 'none'
              }}
              tabIndex={-1}
              aria-hidden="true"
            />
          </article>
        </div>
      </div>
    </section>
  )
}
