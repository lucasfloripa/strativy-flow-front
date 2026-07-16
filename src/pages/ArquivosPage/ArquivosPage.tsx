import { ChevronDown, Download, FileText, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { interactionTheme } from '../../app/theme/brandTheme'
import { formatDate, getApiDateTimestamp } from '../../core/utils/dateTime'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import { WebhookService } from '../../features/webhook/services/WebhookService'

type ArquivoRow = {
  id: string
  negotiationId: string
  leadId: string
  nome: string
  tipo: string
  tamanho: number
  enviadoEm: string
  negocio: string
  lead: string
}

type NegocioOption = {
  id: string
  leadId: string
  title?: string | null
}

type ArquivoCreateDraft = {
  leadId: string
  negotiationId: string
  file: File | null
}

const arquivosPerPage = 12
const leadPanelWidth = 'min(48vw, 760px)'
const leadPanelTransitionMs = 120
const attachmentInputAccept =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip,.rar,.7z'

const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  const sizeInKb = sizeInBytes / 1024
  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`
  }

  const sizeInMb = sizeInKb / 1024
  return `${sizeInMb.toFixed(1)} MB`
}

export default function ArquivosPage() {
  const { data: leadsData, isLoading: isLeadsLoading, error: leadsError } = useLeadsBootstrap()
  const [isLoadingArquivos, setIsLoadingArquivos] = useState<boolean>(true)
  const [arquivosError, setArquivosError] = useState<string | null>(null)
  const [arquivos, setArquivos] = useState<ArquivoRow[]>([])
  const [negocios, setNegocios] = useState<NegocioOption[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearchInputFocused, setIsSearchInputFocused] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hoveredArquivoId, setHoveredArquivoId] = useState<string | null>(null)
  const [confirmingDeleteArquivoId, setConfirmingDeleteArquivoId] = useState<string | null>(null)
  const [deletingArquivoId, setDeletingArquivoId] = useState<string | null>(null)
  const [downloadingArquivoId, setDownloadingArquivoId] = useState<string | null>(null)
  const [isCreateArquivoPanelOpen, setIsCreateArquivoPanelOpen] = useState<boolean>(false)
  const [isArquivoPanelEntering, setIsArquivoPanelEntering] = useState<boolean>(false)
  const [arquivoCreateDraft, setArquivoCreateDraft] = useState<ArquivoCreateDraft>({
    leadId: '',
    negotiationId: '',
    file: null
  })
  const [arquivoCreateError, setArquivoCreateError] = useState<string | null>(null)
  const [isCreatingArquivo, setIsCreatingArquivo] = useState<boolean>(false)
  const arquivoInputRef = useRef<HTMLInputElement | null>(null)

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
    let isMounted = true

    const loadArquivos = async () => {
      try {
        setIsLoadingArquivos(true)
        setArquivosError(null)

        const leads = leadsData.leads ?? []
        const userLeadIdSet = new Set(leads.map((lead) => lead.id))

        const loadedNegocios = await WebhookService.loadNegotiations()
        const userNegocios = loadedNegocios.filter((negocio) =>
          userLeadIdSet.has(negocio.leadId)
        )

        const attachmentsByNegotiation = await Promise.all(
          userNegocios.map(async (negocio) => {
            const attachments = await WebhookService.loadNegotiationAttachments(negocio.id)

            return {
              negocio,
              attachments
            }
          })
        )

        const rows: ArquivoRow[] = attachmentsByNegotiation.flatMap(
          ({ negocio, attachments }) => {
            const leadName = leadNameById.get(negocio.leadId) ?? '-'
            const negocioNome = negocio.title?.trim() || 'Negócio sem nome'

            return attachments.map((attachment) => ({
              id: attachment.id,
              negotiationId: negocio.id,
              leadId: negocio.leadId,
              nome: attachment.originalName,
              tipo: attachment.extension.toUpperCase(),
              tamanho: attachment.size,
              enviadoEm: attachment.createdAt,
              negocio: negocioNome,
              lead: leadName
            }))
          }
        )

        rows.sort((first, second) => {
          const firstTimestamp = getApiDateTimestamp(first.enviadoEm)
          const secondTimestamp = getApiDateTimestamp(second.enviadoEm)

          return secondTimestamp - firstTimestamp
        })

        if (!isMounted) {
          return
        }

        setNegocios(userNegocios)
        setArquivos(rows)
      } catch (exception: unknown) {
        if (!isMounted) {
          return
        }

        const message =
          exception instanceof Error ? exception.message : 'Falha ao carregar arquivos.'

        setArquivosError(message)
        setNegocios([])
        setArquivos([])
      } finally {
        if (isMounted) {
          setIsLoadingArquivos(false)
        }
      }
    }

    void loadArquivos()

    return () => {
      isMounted = false
    }
  }, [leadNameById, leadsData.leads])

  const negociosBySelectedLead = useMemo(
    () =>
      negocios.filter((negocio) => {
        if (!arquivoCreateDraft.leadId) {
          return false
        }

        return negocio.leadId === arquivoCreateDraft.leadId
      }),
    [arquivoCreateDraft.leadId, negocios]
  )

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const filteredArquivos = useMemo(() => {
    if (!normalizedSearchTerm) {
      return arquivos
    }

    return arquivos.filter((arquivo) =>
      arquivo.nome.toLowerCase().includes(normalizedSearchTerm)
    )
  }, [arquivos, normalizedSearchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredArquivos.length / arquivosPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * arquivosPerPage
  const paginatedArquivos = filteredArquivos.slice(
    pageStartIndex,
    pageStartIndex + arquivosPerPage
  )

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage)
    }
  }, [currentPage, safeCurrentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [normalizedSearchTerm])

  useEffect(() => {
    if (!isCreateArquivoPanelOpen) {
      setIsArquivoPanelEntering(false)
      return
    }

    setIsArquivoPanelEntering(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsArquivoPanelEntering(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isCreateArquivoPanelOpen])

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
  const isLoading = isLeadsLoading || isLoadingArquivos
  const error = leadsError || arquivosError
  const canCreateArquivo =
    Boolean(arquivoCreateDraft.leadId) &&
    Boolean(arquivoCreateDraft.negotiationId) &&
    Boolean(arquivoCreateDraft.file)

  const applyActionHoverBackground = (
    isHovered: boolean,
    target: HTMLButtonElement
  ) => {
    target.style.background = isHovered
      ? interactionTheme.clickableCardHoverBackground
      : '#ffffff'
  }

  const handleOpenCreateArquivoPanel = () => {
    setArquivoCreateDraft({
      leadId: '',
      negotiationId: '',
      file: null
    })
    setArquivoCreateError(null)
    setIsCreateArquivoPanelOpen(true)
  }

  const closeCreateArquivoPanel = () => {
    setIsCreateArquivoPanelOpen(false)
    setArquivoCreateError(null)
    setArquivoCreateDraft({ leadId: '', negotiationId: '', file: null })
  }

  const handleDownloadArquivo = async (attachmentId: string) => {
    setDownloadingArquivoId(attachmentId)

    try {
      setArquivosError(null)
      const response = await WebhookService.getNegotiationAttachmentDownloadUrl(
        attachmentId
      )

      window.open(response.url, '_blank', 'noopener,noreferrer')
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao gerar link de download do arquivo.'

      setArquivosError(message)
    } finally {
      setDownloadingArquivoId(null)
    }
  }

  const handleDeleteArquivo = async (attachmentId: string) => {
    setDeletingArquivoId(attachmentId)

    try {
      setArquivosError(null)
      await WebhookService.deleteNegotiationAttachment(attachmentId)
      setArquivos((currentArquivos) =>
        currentArquivos.filter((arquivo) => arquivo.id !== attachmentId)
      )
      setConfirmingDeleteArquivoId(null)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao excluir arquivo.'

      setArquivosError(message)
    } finally {
      setDeletingArquivoId(null)
    }
  }

  const handleCreateArquivo = async () => {
    if (!canCreateArquivo || !arquivoCreateDraft.file) {
      setArquivoCreateError('Selecione lead, negócio e arquivo.')
      return
    }

    setIsCreatingArquivo(true)

    try {
      setArquivoCreateError(null)
      setArquivosError(null)

      const createdAttachment = await WebhookService.uploadNegotiationAttachment(
        arquivoCreateDraft.negotiationId,
        arquivoCreateDraft.file
      )

      const negocio = negocios.find(
        (currentNegocio) => currentNegocio.id === arquivoCreateDraft.negotiationId
      )

      const leadName = leadNameById.get(arquivoCreateDraft.leadId) ?? '-'
      const negocioNome = negocio?.title?.trim() || 'Negócio sem nome'

      const nextArquivo: ArquivoRow = {
        id: createdAttachment.id,
        negotiationId: arquivoCreateDraft.negotiationId,
        leadId: arquivoCreateDraft.leadId,
        nome: createdAttachment.originalName,
        tipo: createdAttachment.extension.toUpperCase(),
        tamanho: createdAttachment.size,
        enviadoEm: createdAttachment.createdAt,
        negocio: negocioNome,
        lead: leadName
      }

      setArquivos((currentArquivos) => {
        const nextArquivos = [nextArquivo, ...currentArquivos]

        return nextArquivos.sort((first, second) => {
          const firstTimestamp = getApiDateTimestamp(first.enviadoEm)
          const secondTimestamp = getApiDateTimestamp(second.enviadoEm)

          return secondTimestamp - firstTimestamp
        })
      })

      closeCreateArquivoPanel()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error ? exception.message : 'Falha ao enviar arquivo.'

      setArquivoCreateError(message)
    } finally {
      setIsCreatingArquivo(false)
    }
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
        overflow: 'hidden',
        position: 'relative'
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
          Arquivos
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar arquivo"
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
            onClick={handleOpenCreateArquivoPanel}
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
            Adicionar Arquivo
          </button>
        </div>
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
              <col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>

            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Nome
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  Tipo
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  Tamanho
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Enviado em
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Negócio
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Lead
                </th>
                <th style={{ padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedArquivos.map((arquivo) => {
                const rowBackground =
                  hoveredArquivoId === arquivo.id
                    ? interactionTheme.clickableCardHoverBackground
                    : '#ffffff'

                if (confirmingDeleteArquivoId === arquivo.id) {
                  return (
                    <tr
                      key={arquivo.id}
                      style={{ borderBottom: '1px solid #f0f0f0', background: rowBackground }}
                      onMouseEnter={() => setHoveredArquivoId(arquivo.id)}
                      onMouseLeave={() => setHoveredArquivoId(null)}
                    >
                      <td style={{ padding: '14px 16px', color: '#2f2f2f', fontSize: 13, fontWeight: 600 }}>
                        Deletar arquivo?
                      </td>
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                      <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            aria-label="Cancelar exclusão de arquivo"
                            onClick={() => setConfirmingDeleteArquivoId(null)}
                            onMouseEnter={(event) =>
                              applyActionHoverBackground(true, event.currentTarget)
                            }
                            onMouseLeave={(event) =>
                              applyActionHoverBackground(false, event.currentTarget)
                            }
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
                            aria-label="Confirmar exclusão de arquivo"
                            disabled={deletingArquivoId === arquivo.id}
                            onClick={() => void handleDeleteArquivo(arquivo.id)}
                            onMouseEnter={(event) =>
                              applyActionHoverBackground(true, event.currentTarget)
                            }
                            onMouseLeave={(event) =>
                              applyActionHoverBackground(false, event.currentTarget)
                            }
                            style={{
                              height: 24,
                              width: 24,
                              border: '1px solid #e5e7eb',
                              borderRadius: 4,
                              background: '#ffffff',
                              color: '#4b5563',
                              padding: 0,
                              cursor: 'pointer',
                              opacity: deletingArquivoId === arquivo.id ? 0.7 : 1
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
                    key={arquivo.id}
                    style={{ borderBottom: '1px solid #f0f0f0', background: rowBackground }}
                    onMouseEnter={() => setHoveredArquivoId(arquivo.id)}
                    onMouseLeave={() => setHoveredArquivoId(null)}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#2f2f2f',
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={arquivo.nome}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <FileText size={14} color="#4b5563" style={{ flexShrink: 0 }} />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {arquivo.nome}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          color: '#4b5563',
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1
                        }}
                      >
                        {arquivo.tipo}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#4b5563', fontSize: 12, fontWeight: 700 }}>
                      {formatFileSize(arquivo.tamanho)}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: 13 }}>
                      {formatDate(arquivo.enviadoEm)}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#111827',
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={arquivo.negocio}
                    >
                      {arquivo.negocio}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#111827',
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={arquivo.lead}
                    >
                      {arquivo.lead}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          aria-label="Baixar arquivo"
                          disabled={downloadingArquivoId === arquivo.id}
                          onClick={() => void handleDownloadArquivo(arquivo.id)}
                          onMouseEnter={(event) =>
                            applyActionHoverBackground(true, event.currentTarget)
                          }
                          onMouseLeave={(event) =>
                            applyActionHoverBackground(false, event.currentTarget)
                          }
                          style={{
                            height: 24,
                            width: 24,
                            border: '1px solid #e5e7eb',
                            borderRadius: 4,
                            background: '#ffffff',
                            color: '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                            opacity: downloadingArquivoId === arquivo.id ? 0.7 : 1
                          }}
                        >
                          <Download size={14} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir arquivo"
                          onClick={() => setConfirmingDeleteArquivoId(arquivo.id)}
                          onMouseEnter={(event) =>
                            applyActionHoverBackground(true, event.currentTarget)
                          }
                          onMouseLeave={(event) =>
                            applyActionHoverBackground(false, event.currentTarget)
                          }
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
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!isLoading && !error && filteredArquivos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '14px 16px', color: '#6b7280' }}>
                    Nenhum arquivo encontrado.
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
            {filteredArquivos.length} arquivo{filteredArquivos.length === 1 ? '' : 's'}
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

        {isCreateArquivoPanelOpen ? (
          <button
            type="button"
            aria-label="Fechar criação de arquivo"
            onClick={closeCreateArquivoPanel}
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

        {isCreateArquivoPanelOpen ? (
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
              transform: isArquivoPanelEntering ? 'translateX(0)' : 'translateX(100%)',
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
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>Novo arquivo</span>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                    Adicionar Arquivo
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeCreateArquivoPanel}
                  aria-label="Fechar painel de criação de arquivo"
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

              {arquivoCreateError ? (
                <p style={{ margin: 0, color: '#b91c1c' }}>{arquivoCreateError}</p>
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
                      value={arquivoCreateDraft.leadId}
                      onChange={(event) => {
                        const selectedLeadId = event.target.value

                        setArquivoCreateDraft((currentDraft) => ({
                          ...currentDraft,
                          leadId: selectedLeadId,
                          negotiationId: ''
                        }))
                      }}
                      style={{
                        width: '100%',
                        height: 46,
                        border: '1px solid #d7dce4',
                        borderRadius: 10,
                        padding: '0 42px 0 14px',
                        color: arquivoCreateDraft.leadId ? '#111827' : '#6b7280',
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
                      value={arquivoCreateDraft.negotiationId}
                      disabled={!arquivoCreateDraft.leadId || negociosBySelectedLead.length === 0}
                      onChange={(event) => {
                        setArquivoCreateDraft((currentDraft) => ({
                          ...currentDraft,
                          negotiationId: event.target.value
                        }))
                      }}
                      style={{
                        width: '100%',
                        height: 46,
                        border: '1px solid #d7dce4',
                        borderRadius: 10,
                        padding: '0 42px 0 14px',
                        color: arquivoCreateDraft.negotiationId ? '#111827' : '#6b7280',
                        fontSize: 14,
                        fontWeight: 600,
                        boxSizing: 'border-box',
                        appearance: 'none',
                        background: '#ffffff'
                      }}
                    >
                      <option value="">Selecione</option>
                      {negociosBySelectedLead.map((negocio) => (
                        <option key={negocio.id} value={negocio.id}>
                          {negocio.title?.trim() || 'Negócio sem nome'}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }}>
                      <ChevronDown size={18} />
                    </span>
                  </div>
                  {arquivoCreateDraft.leadId && negociosBySelectedLead.length === 0 ? (
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Esse lead ainda não tem negócios.</p>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    ref={arquivoInputRef}
                    type="file"
                    accept={attachmentInputAccept}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      setArquivoCreateDraft((currentDraft) => ({
                        ...currentDraft,
                        file: nextFile
                      }))
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => arquivoInputRef.current?.click()}
                    style={{
                      width: 'fit-content',
                      border: 'none',
                      borderRadius: 8,
                      background: '#ffffff',
                      height: 42,
                      padding: '0 14px',
                      textAlign: 'left',
                      color: '#555555',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: 1.2
                    }}
                  >
                    + Adicionar arquivo
                  </button>
                  <span style={{ color: arquivoCreateDraft.file ? '#111827' : '#6b7280', fontSize: 12, fontWeight: 600 }}>
                    {arquivoCreateDraft.file?.name ?? 'Nenhum arquivo selecionado'}
                  </span>
                </div>

                {(!leadsData.leads || leadsData.leads.length === 0) ? (
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>
                    Você não possui leads para vincular um arquivo.
                  </p>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={closeCreateArquivoPanel}
                    style={{
                      minWidth: 96,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid #d7dce4',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCreateArquivo()}
                    disabled={!canCreateArquivo || isCreatingArquivo}
                    style={{
                      minWidth: 132,
                      height: 40,
                      border: 'none',
                      borderRadius: 10,
                      background: canCreateArquivo
                        ? interactionTheme.primaryButtonBackground
                        : '#9ca3af',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: canCreateArquivo ? 'pointer' : 'not-allowed',
                      opacity: isCreatingArquivo ? 0.8 : 1
                    }}
                  >
                    {isCreatingArquivo ? 'Enviando...' : 'Adicionar'}
                  </button>
                </div>
              </article>
            </section>
          </aside>
        ) : null}
      </div>
    </section>
  )
}
