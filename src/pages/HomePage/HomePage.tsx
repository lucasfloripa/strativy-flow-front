import {
  Bell,
  CalendarCheck,
  CalendarClock,
  Clock,
  MessageCircle,
  TimerReset,
  TriangleAlert,
  UserPlus,
  X
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import type { AuthenticatedLayoutOutletContext } from '../../app/layouts/AuthenticatedLayout'
import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { getLeadSourceTagPresentation } from '../../core/components/leadSourceTagPresentation'
import {
  formatChatMessageTimestamp,
  formatElapsedHoursAndMinutes
} from '../../core/utils/dateTime'
import { HomeService } from '../../features/home/services/HomeService'
import type {
  DashboardConversation,
  DashboardConversationFilter,
  DashboardSummary,
  UserNotification
} from '../../features/home/types/home.types'

type NotificationIcon = 'message' | 'lead' | 'followup' | 'expiring' | 'expired'

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
  iconBackground: string
  icon: NotificationIcon
  messageCount?: number
}

type NotificationNavigation = {
  path: string
  state?: {
    initialLeadTab?: 'geral' | 'chat'
  }
}

type ConversationFilter = DashboardConversationFilter

const conversationFilterPriority: ConversationFilter[] = [
  'today',
  'new',
  'noResponse24h'
]

const cardBackground = '#fcfdff'
const cardBorder = '1px solid #f4f6fa'
const cardShadow = '0 6px 14px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.016)'
const homeHeroImages = ['/cara.png', '/galega.png', '/doisnote.png'] as const
const homeGreetingMessages = [
  'Tudo pronto para você começar mais um dia de resultados.',
  'Tudo sob controle para você focar no que realmente importa.',
  'Mais organização para sua rotina, mais tempo para seus clientes.',
  'Pronto para mais um dia de boas conversas e bons negócios?',
  'Vamos transformar as oportunidades de hoje em resultados?',
  'Organize sua rotina e aproveite cada oportunidade.'
] as const

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

const getGreetingLabel = (): 'Bom dia' | 'Boa tarde' | 'Boa noite' => {
  const currentHour = new Date().getHours()

  if (currentHour >= 6 && currentHour < 12) {
    return 'Bom dia'
  }

  if (currentHour >= 12 && currentHour < 18) {
    return 'Boa tarde'
  }

  return 'Boa noite'
}

const formatRelativeTime = (value?: string | Date | null): string => {
  return formatElapsedHoursAndMinutes(value)
}

const mapApiNotification = (notification: UserNotification): Notification => {
  const presentationByType: Record<UserNotification['type'], { color: string; iconBackground: string; icon: NotificationIcon }> = {
    LEAD_CREATED: { color: '#3b82f6', iconBackground: '#dbeafe', icon: 'lead' },
    MESSAGE_RECEIVED: { color: '#22c55e', iconBackground: '#dcfce7', icon: 'message' },
    FOLLOW_UP_REMINDER_1H: { color: '#f59e0b', iconBackground: '#fef3c7', icon: 'followup' },
    CONVERSATION_EXPIRING_1H: { color: '#f59e0b', iconBackground: '#fef3c7', icon: 'expiring' },
    CONVERSATION_EXPIRED: { color: '#ef4444', iconBackground: '#fee2e2', icon: 'expired' }
  }
  const presentation = presentationByType[notification.type]

  return {
    id: notification.id,
    type: notification.type,
    referenceType: notification.referenceType,
    referenceId: notification.referenceId,
    title: notification.title,
    description: notification.description,
    createdAt: notification.createdAt,
    time: formatRelativeTime(notification.createdAt),
    color: presentation.color,
    iconBackground: presentation.iconBackground,
    icon: presentation.icon
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
    case 'CONVERSATION_EXPIRING_1H':
      return {
        path: `/leads/${notification.referenceId}`,
        state: {
          initialLeadTab: 'chat'
        }
      }
    default:
      return {
        path: '/leads'
      }
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isMobile } = useViewportBreakpoint()
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

  const {
    isMobileHomeNotificationsOpen,
    setIsMobileHomeNotificationsOpen,
    setMobileHomeNotificationsCount,
    userFirstName
  } = useOutletContext<AuthenticatedLayoutOutletContext>()
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(null)
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null)
  const [isClearNotificationsHovered, setIsClearNotificationsHovered] = useState<boolean>(false)
  const [selectedConversationFilter, setSelectedConversationFilter] = useState<ConversationFilter>('today')
  const hasResolvedInitialConversationFilterRef = useRef(false)
  const [hoveredConversationFilter, setHoveredConversationFilter] = useState<ConversationFilter | null>(null)
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [conversationCounts, setConversationCounts] = useState<Record<ConversationFilter, number>>({
    all: 0,
    new: 0,
    today: 0,
    noResponse24h: 0
  })
  const [heroImageSrc] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * homeHeroImages.length)
    return homeHeroImages[randomIndex]
  })
  const [greetingMessage] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * homeGreetingMessages.length)
    return homeGreetingMessages[randomIndex]
  })
  const greetingLabel = getGreetingLabel()

  useEffect(() => {
    let isActive = true

    const loadHomeData = async () => {
      const [notificationsRequest, summaryRequest] = await Promise.allSettled([
        HomeService.getNotifications(),
        HomeService.getDashboardSummary()
      ])

      if (!isActive) {
        return
      }

      const apiNotifications = notificationsRequest.status === 'fulfilled'
        ? notificationsRequest.value
        : []
      setNotifications(groupUnreadNotifications(apiNotifications))

      if (summaryRequest.status === 'fulfilled') {
        setDashboardSummary(summaryRequest.value)
      }
    }

    void loadHomeData()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadConversations = async () => {
      try {
        const response = await HomeService.getDashboardConversations(
          selectedConversationFilter
        )

        if (!isActive) {
          return
        }

        setConversationCounts(response.counts)

        if (!hasResolvedInitialConversationFilterRef.current) {
          hasResolvedInitialConversationFilterRef.current = true
          const initialConversationFilter =
            conversationFilterPriority.find((filter) => response.counts[filter] > 0) ?? 'today'

          if (initialConversationFilter !== selectedConversationFilter) {
            setSelectedConversationFilter(initialConversationFilter)
            return
          }
        }

        setConversations(response.items)
      } catch {
        if (isActive) {
          setConversations([])
        }
      }
    }

    void loadConversations()

    return () => {
      isActive = false
    }
  }, [selectedConversationFilter])

  useEffect(() => {
    setMobileHomeNotificationsCount(notifications.length)

    return () => {
      setMobileHomeNotificationsCount(0)
    }
  }, [notifications.length, setMobileHomeNotificationsCount])

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

  const renderWaitingResponseContainer = () => {
    const cellFontSize = isMobile ? 13 : 14

    return (
      <article
        style={{
          background: cardBackground,
          border: cardBorder,
          borderRadius: 12,
          boxShadow: cardShadow,
          padding: '10px 10px 8px',
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Últimas Conversas
            </h3>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            padding: '0 8px',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            alignItems: 'center',
            gap: 8
          }}
        >
          {[
            { key: 'today', label: 'Para Hoje' },
            { key: 'new', label: 'Novos' },
            { key: 'noResponse24h', label: 'Sem resposta 24h+' }
          ].map((filterOption) => {
            const filterKey = filterOption.key as ConversationFilter
            const isActive = selectedConversationFilter === filterKey
            const isHovered = hoveredConversationFilter === filterKey
            const count = conversationCounts[filterKey]

            return (
              <button
                key={filterOption.key}
                type="button"
                onClick={() => {
                  hasResolvedInitialConversationFilterRef.current = true
                  setSelectedConversationFilter(filterKey)
                }}
                onMouseEnter={() => setHoveredConversationFilter(filterKey)}
                onMouseLeave={() => setHoveredConversationFilter(null)}
                style={{
                  border: 'none',
                  borderRadius: 10,
                  background:
                    isActive
                      ? '#e8f4ec'
                      : isHovered
                        ? interactionTheme.sidebarItemHoverBackground
                        : '#f1f5f9',
                  color: isActive ? interactionTheme.sidebarItemActiveColor : '#475569',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 600,
                  lineHeight: 1,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 32,
                  minWidth: 88,
                  flex: isMobile ? '0 0 calc(50% - 4px)' : undefined
                }}
              >
                <span>{filterOption.label}</span>
                {count !== null ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 20,
                      height: 20,
                      borderRadius: 999,
                      padding: '0 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      background: isActive || isHovered ? '#d9f7e5' : '#e2e8f0',
                      color: isActive || isHovered ? interactionTheme.sidebarItemActiveColor : '#475569'
                    }}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px', marginTop: 4 }}>
          {conversations.map((item, index) => {
            const sourceTagPresentation = getLeadSourceTagPresentation(
              item.source,
              'Não informada'
            )
            const lastContactLabel = formatChatMessageTimestamp(item.lastMessageAt)
            const messageContent = item.lastMessage?.trim() || 'Mensagem sem texto'
            const lastMessageLabel = item.lastMessageDirection === 'INBOUND'
              ? messageContent
              : item.lastMessageDirection === 'AUTOMATIC'
                ? `Sistema: ${messageContent}`
                : `Você: ${messageContent}`

            return (
              <button
                key={item.leadId}
                type="button"
                onMouseEnter={() => setHoveredConversationId(item.leadId)}
                onMouseLeave={() => setHoveredConversationId(null)}
                onClick={() => {
                  navigate(`/conversas/${item.leadId}`, {
                    state: { initialLeadTab: 'chat' }
                  })
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? 'minmax(0, 1fr) 132px'
                    : 'minmax(0, 1fr) 76px 168px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 8px',
                  marginBottom: index < conversations.length - 1 ? 6 : 0,
                  border: 'none',
                  borderRadius: 8,
                  background:
                    hoveredConversationId === item.leadId
                      ? interactionTheme.clickableCardHoverBackground
                      : 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background-color 120ms ease'
                }}
              >
                <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ color: '#0f172a', fontSize: cellFontSize, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.leadName}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lastMessageLabel}
                  </span>
                </span>

                {!isMobile ? (
                  <span style={{ justifySelf: 'end', alignSelf: 'end', minHeight: 1, width: '100%', display: 'inline-flex', justifyContent: 'flex-end', alignItems: 'flex-end', transform: 'translateX(40px)' }}>
                    {item.isNew ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#eab308',
                          whiteSpace: 'nowrap',
                          background: '#fef3c7',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1
                        }}
                      >
                        Novo
                      </span>
                    ) : null}
                  </span>
                ) : null}

                <span style={{ justifySelf: 'end', width: '100%', maxWidth: '100%', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {isMobile && item.isNew ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#eab308',
                        whiteSpace: 'nowrap',
                        background: '#fef3c7',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '7px 12px',
                        lineHeight: 1
                      }}
                    >
                      Novo
                    </span>
                  ) : (
                    <span style={{ color: '#475569', fontSize: 12, fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {lastContactLabel}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: sourceTagPresentation.textColor,
                      whiteSpace: 'nowrap',
                      background: sourceTagPresentation.backgroundColor,
                      border: `1px solid ${sourceTagPresentation.borderColor}`,
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '7px 12px',
                      lineHeight: 1.1,
                      maxWidth: '100%'
                    }}
                  >
                    {sourceTagPresentation.icon ? (
                      <span style={tagIconStyle}>
                        {sourceTagPresentation.icon}
                      </span>
                    ) : null}
                    <span style={tagContentStyle}>{sourceTagPresentation.label}</span>
                  </span>
                </span>
              </button>
            )
          })}

          {conversations.length === 0 ? (
            <div style={{ padding: '16px 8px', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
              Nenhuma conversa encontrada neste filtro.
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 'auto', padding: '10px 8px 2px', borderTop: '1px solid #eef2f7', background: cardBackground }}>
          <button
            type="button"
            onClick={() => navigate('/conversas')}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 10,
              background: '#f1f5f9',
              color: '#475569',
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease'
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = interactionTheme.sidebarItemHoverBackground
              event.currentTarget.style.color = interactionTheme.sidebarItemActiveColor
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = '#f1f5f9'
              event.currentTarget.style.color = '#475569'
            }}
          >
            Ver todas as conversas
          </button>
        </div>
      </article>
    )
  }

  const renderUpcomingAgendasContainer = () => {
    const agendaFilterOptions = [
      {
        key: 'scheduled',
        label: 'Agendados',
        count: dashboardSummary?.followUps.scheduled ?? 0,
        icon: <CalendarCheck size={28} strokeWidth={2} />,
        color: '#1d4ed8'
      },
      {
        key: 'today',
        label: 'Hoje',
        count: dashboardSummary?.followUps.today ?? 0,
        icon: <Clock size={28} strokeWidth={2} />,
        color: '#b45309'
      },
      {
        key: 'overdue',
        label: 'Atrasados',
        count: dashboardSummary?.followUps.overdue ?? 0,
        icon: <TriangleAlert size={28} strokeWidth={2} />,
        color: '#b91c1c'
      }
    ] as const

    return (
      <article
        style={{
          background: cardBackground,
          border: cardBorder,
          borderRadius: 12,
          boxShadow: cardShadow,
          padding: '10px',
          minHeight: 0,
          flex: '0 0 auto',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Agenda
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', padding: '18px 4px 8px' }}>
          {agendaFilterOptions.map((filterOption, index) => (
            <button
              key={filterOption.key}
              type="button"
              onClick={() => navigate(`/agenda?followUp=${filterOption.key}`)}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = interactionTheme.clickableCardHoverBackground
                event.currentTarget.style.borderRadius = '10px'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent'
                event.currentTarget.style.borderRadius = '0'
              }}
              onFocus={(event) => {
                event.currentTarget.style.background = interactionTheme.clickableCardHoverBackground
                event.currentTarget.style.borderRadius = '10px'
              }}
              onBlur={(event) => {
                event.currentTarget.style.background = 'transparent'
                event.currentTarget.style.borderRadius = '0'
              }}
              style={{
                minWidth: 0,
                minHeight: 112,
                padding: '10px 8px',
                border: 'none',
                borderLeft: index === 0 ? 'none' : '1px solid #e5e7eb',
                borderRadius: 0,
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span style={{ display: 'inline-flex', color: filterOption.color }}>
                {filterOption.icon}
              </span>
              <strong style={{ marginTop: 7, color: filterOption.color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                {filterOption.count}
              </strong>
              <span style={{ marginTop: 5, color: '#0f172a', fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>
                {filterOption.label}
              </span>
            </button>
          ))}
        </div>
      </article>
    )
  }

  const renderNotificationsList = (title: string, titleIcon?: ReactNode) => {
    const visibleNotifications = notifications

    return (
    <article style={{ background: cardBackground, border: cardBorder, borderRadius: 12, boxShadow: cardShadow, padding: '10px 10px 8px', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {titleIcon ?? null}
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h3>
        </div>
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
        {visibleNotifications.map((activity) => {
          return (
            <div
              key={activity.id}
              onMouseEnter={() => setHoveredNotificationId(activity.id)}
              onMouseLeave={() => setHoveredNotificationId(null)}
              onClick={() => {
                void handleNotificationClick(activity)
                setIsMobileHomeNotificationsOpen(false)
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
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: activity.iconBackground,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {activity.icon === 'message' ? (
                    <MessageCircle size={20} color={activity.color} />
                  ) : activity.icon === 'followup' ? (
                    <CalendarClock size={20} color={activity.color} />
                  ) : activity.icon === 'expiring' ? (
                    <TimerReset size={20} color={activity.color} />
                  ) : activity.icon === 'expired' ? (
                    <TriangleAlert size={20} color={activity.color} />
                  ) : (
                    <UserPlus size={20} color={activity.color} />
                  )}
                </span>

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
    )
  }

  if (isMobile && isMobileHomeNotificationsOpen) {
    return (
      <section
        style={{
          height: '100%',
          padding: '12px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#fafbfd',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {renderNotificationsList('Notificações', <Bell size={22} color={interactionTheme.sidebarItemActiveColor} />)}
      </section>
    )
  }

  if (isMobile) {
    return (
      <section
        style={{
          height: '100%',
          padding: '12px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#fafbfd',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
          {renderUpcomingAgendasContainer()}
          {renderWaitingResponseContainer()}
        </div>

      </section>
    )
  }

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          alignItems: 'center',
          height: 'min(20vh, 140px)',
          padding: '0 12px 10px',
          marginBottom: 10,
          flexShrink: 0,
          gap: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0, paddingRight: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
            <p style={{ margin: 0, color: '#0f172a', fontSize: 28, lineHeight: 1.1, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {greetingLabel}, {userFirstName || 'Usuário'}! <span aria-hidden="true">👋</span>
            </p>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 16, lineHeight: 1.25, fontWeight: 500 }}>
              {greetingMessage}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0, paddingLeft: 10 }}>
          <img
          src={heroImageSrc}
            alt="Avatar"
            style={{
              height: 'min(20vh, 140px)',
              width: 'auto',
              display: 'block',
              transform: 'scale(1.52)',
              transformOrigin: 'center left'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 6fr) minmax(0, 4fr)', gap: 8, minHeight: 0, flex: 1, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
            {renderWaitingResponseContainer()}
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%' }}>
          {!isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
              <div style={{ minHeight: 0, flex: 1, display: 'flex', overflow: 'hidden' }}>
                {renderNotificationsList('Notificações')}
              </div>
              <div style={{ minHeight: 0, flex: '0 0 auto', display: 'flex', overflow: 'hidden' }}>
                {renderUpcomingAgendasContainer()}
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </section>
  )
}
