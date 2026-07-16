import { ArchiveRestore, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import { LeadsService } from '../../features/leads/services/LeadsService'
import LeadPage from '../LeadPage'

type ArchivedLeadRow = {
  id: string
  name: string
  state: string
}

type NameSortDirection = 'asc' | 'desc'

const leadsPerPage = 12

export default function LeadsArquivadosPage() {
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120
  const navigate = useNavigate()
  const location = useLocation()
  const { leadId } = useParams<{ leadId?: string }>()
  const { data, isLoading, error, reload } = useLeadsBootstrap()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearchInputFocused, setIsSearchInputFocused] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null)
  const [confirmingDeleteLeadId, setConfirmingDeleteLeadId] = useState<string | null>(null)
  const [nameSortDirection, setNameSortDirection] = useState<NameSortDirection>('asc')
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [shouldRefreshOnLeadClose, setShouldRefreshOnLeadClose] = useState<boolean>(false)
  const isLeadSelected = Boolean(leadId)
  const previousIsLeadSelectedRef = useRef<boolean>(isLeadSelected)

  const archivedLeads = useMemo<ArchivedLeadRow[]>(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    return (data.leads ?? [])
      .filter((lead) => (lead.state ?? '').trim().toLowerCase() === 'archived')
      .filter((lead) => {
        if (!normalizedSearchTerm) {
          return true
        }

        const normalizedName = (lead.name ?? '').trim().toLowerCase()
        return normalizedName.includes(normalizedSearchTerm)
      })
      .map((lead) => ({
        id: lead.id,
        name: (lead.name ?? '').trim() || 'Lead sem nome',
        state: 'Arquivado'
      }))
  }, [data.leads, searchTerm])

  const sortedArchivedLeads = useMemo<ArchivedLeadRow[]>(() => {
    const directionFactor = nameSortDirection === 'asc' ? 1 : -1

    return [...archivedLeads].sort((firstLead, secondLead) => {
      return firstLead.name.localeCompare(secondLead.name, 'pt-BR', { sensitivity: 'base' }) * directionFactor
    })
  }, [archivedLeads, nameSortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedArchivedLeads.length / leadsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * leadsPerPage
  const paginatedLeads = sortedArchivedLeads.slice(pageStartIndex, pageStartIndex + leadsPerPage)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  const getHeaderSortButtonStyle = () => ({
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: '#4b5563',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    width: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6
  })

  const handleUnarchiveLead = async (leadId: string) => {
    try {
      await LeadsService.setLeadArchiveState(leadId, 'active')
      setConfirmingDeleteLeadId(null)
      await reload()
    } catch {
      // noop
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    try {
      await LeadsService.deleteLead(leadId)
      setConfirmingDeleteLeadId(null)
      await reload()
    } catch {
      // noop
    }
  }

  const handleLeadUpdated = () => {
    setShouldRefreshOnLeadClose(true)
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

  useEffect(() => {
    setCurrentPage(1)
  }, [nameSortDirection])

  return (
    <section
      style={{
        height: '100%',
        padding: '16px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: '#f3f4f6',
        boxSizing: 'border-box',
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
          Leads Arquivados
        </h1>

        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value)
            setCurrentPage(1)
          }}
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
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
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
              <col style={{ width: '56%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid #ececec',
                  background: '#f3f4f6'
                }}
              >
                <th
                  style={{
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setNameSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
                    }}
                    style={getHeaderSortButtonStyle()}
                  >
                    Nome <span style={{ fontSize: 11 }}>{nameSortDirection === 'asc' ? '↑' : '↓'}</span>
                  </button>
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => {
                if (confirmingDeleteLeadId === lead.id) {
                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: interactionTheme.clickableCardHoverBackground
                      }}
                    >
                      <td
                        colSpan={3}
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
                            gridTemplateColumns: '72% 28%',
                            alignItems: 'center',
                            columnGap: 12
                          }}
                        >
                          <span>Deletar lead arquivado?</span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              justifySelf: 'start'
                            }}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setConfirmingDeleteLeadId(null)
                              }}
                              style={{
                                height: 24,
                                width: 24,
                                border: '1px solid #e5e7eb',
                                borderRadius: 4,
                                background: '#ffffff',
                                color: '#4b5563',
                                padding: 0,
                                cursor: 'pointer'
                              }}
                            >
                              X
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteLead(lead.id)
                              }}
                              style={{
                                height: 24,
                                width: 24,
                                border: '1px solid #e5e7eb',
                                borderRadius: 4,
                                background: '#ffffff',
                                color: '#4b5563',
                                padding: 0,
                                cursor: 'pointer'
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
                    key={lead.id}
                    onClick={() => navigate(`/arquivados/${lead.id}${location.search}`)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background:
                        hoveredLeadId === lead.id || leadId === lead.id
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredLeadId(lead.id)}
                    onMouseLeave={() => setHoveredLeadId(null)}
                  >
                    <td style={{ padding: '14px 16px', color: '#111827' }}>{lead.name}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#b45309',
                          whiteSpace: 'nowrap',
                          background: '#fef3c7',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1
                        }}
                      >
                        {lead.state}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          aria-label="Desarquivar lead"
                          onClick={() => {
                            void handleUnarchiveLead(lead.id)
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            border: '1px solid #d1d5db',
                            borderRadius: 4,
                            background: '#e5e7eb',
                            color: '#6b7280',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <ArchiveRestore size={14} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir lead"
                          onClick={() => {
                            setConfirmingDeleteLeadId(lead.id)
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

              {!isLoading && !error && archivedLeads.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '14px 16px', color: '#6b7280' }}>
                    Nenhum lead arquivado encontrado.
                  </td>
                </tr>
              ) : null}

              {isLoading ? (
                <tr>
                  <td colSpan={3} style={{ padding: '14px 16px', color: '#6b7280' }}>
                    Carregando arquivados...
                  </td>
                </tr>
              ) : null}

              {error ? (
                <tr>
                  <td colSpan={3} style={{ padding: '14px 16px', color: '#b91c1c' }}>
                    {error}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 'auto',
            padding: '2px 2px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <span style={{ color: '#6b7280', fontSize: 13, marginLeft: 8 }}>
            {archivedLeads.length} arquivado{archivedLeads.length === 1 ? '' : 's'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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

        {isLeadSelected ? (
          <button
            type="button"
            aria-label="Fechar lead aberto"
            onClick={() => navigate(`/arquivados${location.search}`)}
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
