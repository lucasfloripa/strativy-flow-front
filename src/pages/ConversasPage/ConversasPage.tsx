import { Facebook, Handshake, ListFilter, MessageCircle, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { formatDateTime } from '../../core/utils/dateTime'
import { HomeService } from '../../features/home/services/HomeService'
import type {
  DashboardConversation,
  DashboardConversationFilter,
  DashboardConversationStatus
} from '../../features/home/types/home.types'
import LeadPage from '../LeadPage'

type SourceTagPresentation = {
  label: string
  textColor: string
  icon?: ReactNode
}

const conversationFilters: Array<{
  key: DashboardConversationFilter
  label: string
}> = [
  { key: 'all', label: 'Todas' },
  { key: 'new', label: 'Novos' },
  { key: 'today', label: 'Para hoje' },
  { key: 'noResponse24h', label: 'Sem respostas 24h+' }
]

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
    ? content
    : conversation.lastMessageDirection === 'AUTOMATIC'
      ? `Sistema: ${content}`
      : `Você: ${content}`
}

const getSourceTagPresentation = (source?: string | null): SourceTagPresentation => {
  const sourceLabel = source?.trim() || 'Não informada'
  const normalizedSource = normalizeSearchValue(sourceLabel).replace(/[\s_-]+/g, '')

  if (normalizedSource === 'metaads') {
    return { label: 'Meta Ads', textColor: '#1877f2', icon: <Facebook size={12} /> }
  }

  if (normalizedSource === 'googleads') {
    return { label: 'Google Ads', textColor: '#FBBC04', icon: <Search size={12} /> }
  }

  if (normalizedSource === 'whatsapp') {
    return { label: 'WhatsApp', textColor: '#15803d', icon: <MessageCircle size={12} /> }
  }

  if (normalizedSource === 'indicacao') {
    return { label: 'Indicação', textColor: '#7c3aed', icon: <Handshake size={12} /> }
  }

  return { label: sourceLabel, textColor: '#6b7280' }
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

const SourceTag = ({ source }: { source?: string | null }) => {
  const presentation = getSourceTagPresentation(source)

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: presentation.textColor,
        whiteSpace: 'nowrap',
        background: `${presentation.textColor}44`,
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
        ? { label: 'Para Hoje', color: '#1d4ed8', background: '#dbeafe' }
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
  const [hoveredFilterOption, setHoveredFilterOption] = useState<DashboardConversationFilter | null>(null)
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null)
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [reloadVersion, setReloadVersion] = useState<number>(0)
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
    if (!normalizedSearchTerm) {
      return true
    }

    return normalizeSearchValue(conversation.leadName).includes(normalizedSearchTerm)
  })
  const selectedFilterLabel = conversationFilters.find(
    (filterOption) => filterOption.key === selectedFilter
  )?.label

  const openConversation = (leadId: string) => {
    navigate(`/conversas/${leadId}`, { state: { initialLeadTab: 'chat' } })
  }

  const applyFilter = (filter: DashboardConversationFilter) => {
    setSelectedFilter(filter)
    setIsFiltersPanelOpen(false)

    if (filter === 'all') {
      setSearchParams({})
      return
    }

    setSearchParams({ filter })
  }

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
        onClick={() => setIsFiltersPanelOpen(false)}
        style={{ position: 'absolute', inset: 0, border: 'none', background: 'transparent', zIndex: 35, cursor: 'default' }}
      />
      <section
        style={{
          position: 'absolute',
          top: isMobile ? 150 : 68,
          right: isMobile ? 16 : 20,
          width: isMobile ? 'min(220px, calc(100vw - 32px))' : 210,
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
          {conversationFilters.map((filterOption) => (
            <button
              key={filterOption.key}
              type="button"
              onClick={() => applyFilter(filterOption.key)}
              onMouseEnter={() => setHoveredFilterOption(filterOption.key)}
              onMouseLeave={() => setHoveredFilterOption(null)}
              style={getFilterOptionStyle(
                selectedFilter === filterOption.key || hoveredFilterOption === filterOption.key
              )}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </section>
    </>
  ) : null

  const activeFilterTag = selectedFilter !== 'all' && selectedFilterLabel ? (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 0 : 10, padding: isMobile ? 0 : '0 2px' }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#166534',
          background: '#dcfce7',
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          lineHeight: 1
        }}
      >
        <span>{selectedFilterLabel}</span>
        <button
          type="button"
          aria-label={`Remover filtro ${selectedFilterLabel}`}
          onClick={() => applyFilter('all')}
          style={{ border: 'none', background: 'transparent', color: '#166534', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: 1 }}
        >
          X
        </button>
      </span>
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
        background: isFiltersPanelOpen || isFiltersButtonHovered || selectedFilter !== 'all'
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
        <header>
          <h1 style={{ margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }}>Conversas</h1>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 52px', gap: 12 }}>
          {searchInput}
          {filterButton}
        </div>
        {filterPanel}
        {activeFilterTag}
        <div style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }}>
          {filteredConversations.map((conversation) => (
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
                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {getLastMessageLabel(conversation)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ color: '#4b5563', fontSize: 13, fontWeight: 700 }}>Data e Hora</span>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13, lineHeight: 1.35 }}>
                    {formatDateTime(conversation.lastMessageAt)}
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <RuntimeModeTag runtimeMode={conversation.runtimeMode} />
                  <SourceTag source={conversation.source} />
                </div>
              </div>
            </article>
          ))}
          {renderStatus()}
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
                {['Lead', 'Última Mensagem', 'Data e Hora', 'Atendimento', 'Status', 'Origem'].map((column, columnIndex) => (
                  <th key={`${column}-${columnIndex}`} style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: columnIndex < 2 ? 'left' : 'center' }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredConversations.map((conversation) => (
                <tr
                  key={conversation.leadId}
                  onClick={() => openConversation(conversation.leadId)}
                  onMouseEnter={() => setHoveredConversationId(conversation.leadId)}
                  onMouseLeave={() => setHoveredConversationId(null)}
                  style={{ borderBottom: '1px solid #f3f4f6', background: hoveredConversationId === conversation.leadId ? interactionTheme.clickableCardHoverBackground : '#ffffff', cursor: 'pointer', transition: 'background 120ms ease' }}
                >
                  <td style={{ padding: '14px 12px', color: '#111827', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.leadName}</td>
                  <td style={{ padding: '14px 12px', color: '#64748b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLastMessageLabel(conversation)}</td>
                  <td style={{ padding: '14px 12px', color: '#64748b', fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateTime(conversation.lastMessageAt)}</td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><RuntimeModeTag runtimeMode={conversation.runtimeMode} /></td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><StatusTag status={conversation.status} /></td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}><SourceTag source={conversation.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderStatus()}
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