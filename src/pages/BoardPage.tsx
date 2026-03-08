/* eslint-disable @typescript-eslint/no-explicit-any */
 
// BoardPage.tsx
// Tudo em 1 arquivo: axios + jotai + styled-components + dnd-kit
// UI-only reorder dentro da mesma coluna + modal ao clicar no lead + edição básica + modal de settings

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import styled, { createGlobalStyle } from 'styled-components'
import { Settings, X, RefreshCw } from 'lucide-react'
import { atom, useAtom, useSetAtom } from 'jotai'

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ----------------------------
// Types (baseado no teu backend /full e /leads/:id)
// ----------------------------
type Lead = {
  id: string
  boardId: string
  columnId: string
  position: number
  name: string
  phone: string
  email?: string
  source?: string
  fields?: Record<string, any>
  lastInboundMessageId?: string
  lastAutoReplyMessageId?: string
  movedAt?: string | Date
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

type Board = {
  id: string
  name: string
  userId: string
  isActive: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

type BoardColumn = {
  id: string
  name: string
  boardId: string
  position: number
  isDefault: boolean
  createdAt: string | Date
  updatedAt: string | Date
  leads: Lead[]
}

type BoardFullResponse = {
  board: Board
  columns: BoardColumn[]
}

type UpdateLeadPayload = {
  name?: string
  phone?: string
  email?: string
  source?: string
  fields?: Record<string, any>
  isArchived?: boolean
}

// ----------------------------
// Axios
// ----------------------------
const api = axios.create({
  baseURL: 'https://darleen-observant-comfortlessly.ngrok-free.dev',
  headers: {
    'ngrok-skip-browser-warning': 'true'
  },
  timeout: 15000
})

api.interceptors.request.use((config) => {
  // const token = localStorage.getItem('access_token')
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ----------------------------
// Jotai state
// ----------------------------
const boardIdAtom = atom<string>('')

const boardFullAtom = atom<BoardFullResponse | null>(null)
const isLoadingAtom = atom<boolean>(false)
const errorAtom = atom<string | null>(null)

const selectedLeadIdAtom = atom<string | null>(null)
const selectedLeadAtom = atom<Lead | null>(null)
const isLeadModalLoadingAtom = atom<boolean>(false)
const leadModalErrorAtom = atom<string | null>(null)

const isSettingsModalOpenAtom = atom<boolean>(false)

const setBoardIdAtom = atom(null, (_get, set, id: string) => {
  set(boardIdAtom, id)
})

// ----------------------------
// Helpers
// ----------------------------
function formatPhone(phone?: string) {
  return phone?.trim() || '—'
}

function getFirstLetters(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? '?'
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase()
}

function sortColumnsAndLeads(data: BoardFullResponse): BoardFullResponse {
  const columns = [...data.columns]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      ...c,
      leads: [...(c.leads ?? [])].sort((a, b) => a.position - b.position)
    }))

  return { ...data, columns }
}

function safeJsonParse(value: string): Record<string, any> {
  if (!value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    throw new Error('O campo fields precisa ser um JSON válido')
  }
}

function normalizeOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

// ----------------------------
// Modal de settings
// ----------------------------
function SettingsModal() {
  const [isOpen, setIsOpen] = useAtom(isSettingsModalOpenAtom)

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen) return null

  return (
    <ModalOverlay
      onClick={() => {
        closeModal()
      }}
    >
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Configurações</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar configurações"
            title="Fechar"
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <SettingsModalBody>
          <SettingsActionButton type="button">
            Editar Usuario
          </SettingsActionButton>

          <SettingsSpacer />

          <SettingsActionButton type="button">
            Logout
          </SettingsActionButton>
        </SettingsModalBody>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal do lead
// ----------------------------
function LeadDetailsModal() {
  const [selectedLeadId, setSelectedLeadId] = useAtom(selectedLeadIdAtom)
  const [selectedLead, setSelectedLead] = useAtom(selectedLeadAtom)
  const [isLoading, setLoading] = useAtom(isLeadModalLoadingAtom)
  const [error, setError] = useAtom(leadModalErrorAtom)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')

  const syncFormWithLead = useCallback((lead: Lead | null) => {
    setName(lead?.name ?? '')
    setPhone(lead?.phone ?? '')
    setEmail(lead?.email ?? '')
    setSource(lead?.source ?? '')
  }, [])

  const closeModal = useCallback(() => {
    setSelectedLeadId(null)
    setSelectedLead(null)
    setError(null)
    setLoading(false)
    setIsEditing(false)
    setIsSaving(false)
    syncFormWithLead(null)
  }, [setSelectedLeadId, setSelectedLead, setError, setLoading, syncFormWithLead])

  const fetchLead = useCallback(async () => {
    if (!selectedLeadId) return

    try {
      setLoading(true)
      setError(null)

      const res = await api.get<Lead>(`/leads/${selectedLeadId}`)
      setSelectedLead(res.data)
      syncFormWithLead(res.data)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        'Erro ao carregar lead'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }, [selectedLeadId, setSelectedLead, setLoading, setError, syncFormWithLead])

  useEffect(() => {
    if (selectedLeadId) {
      void fetchLead()
    }
  }, [selectedLeadId, fetchLead])

  useEffect(() => {
    if (!selectedLeadId) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedLeadId, closeModal])

  const handleStartEdit = () => {
    syncFormWithLead(selectedLead)
    setError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    syncFormWithLead(selectedLead)
    setError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!selectedLead) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: UpdateLeadPayload = {
        name: name.trim(),
        phone: phone.trim(),
        email: normalizeOptionalString(email),
        source: normalizeOptionalString(source),
        fields: safeJsonParse('{}')
      }

      const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
      setSelectedLead(res.data)
      syncFormWithLead(res.data)
      setIsEditing(false)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        'Erro ao salvar lead'
      setError(String(msg))
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedLeadId) return null

  return (
    <ModalOverlay
      onClick={() => {
        if (!isSaving) closeModal()
      }}
    >
      <ModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <ModalHeader>
          <ModalTitleArea>
            <ModalAvatar>{getFirstLetters(selectedLead?.name ?? 'Lead')}</ModalAvatar>

            <div>
              <ModalTitle>{selectedLead?.name ?? 'Detalhes do lead'}</ModalTitle>
              <ModalSubtitle>
                {isLoading ? 'Carregando dados...' : 'Informações completas do lead'}
              </ModalSubtitle>
            </div>
          </ModalTitleArea>
        </ModalHeader>

        {error ? <ModalError>{error}</ModalError> : null}

        {isLoading ? (
          <ModalLoading>Carregando lead...</ModalLoading>
        ) : selectedLead ? (
          <>
            <SectionTitle>Dados do lead</SectionTitle>

            <InfoList>
              <InfoRow>
                <InfoLabel>Nome</InfoLabel>
                {isEditing ? (
                  <InfoInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome"
                  />
                ) : (
                  <InfoValue>{selectedLead.name || '—'}</InfoValue>
                )}
              </InfoRow>

              <InfoRow>
                <InfoLabel>Telefone</InfoLabel>
                {isEditing ? (
                  <InfoInput
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefone"
                  />
                ) : (
                  <InfoValue>{formatPhone(selectedLead.phone)}</InfoValue>
                )}
              </InfoRow>

              <InfoRow>
                <InfoLabel>Email</InfoLabel>
                {isEditing ? (
                  <InfoInput
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                  />
                ) : (
                  <InfoValue>{selectedLead.email || '—'}</InfoValue>
                )}
              </InfoRow>

              <InfoRow>
                <InfoLabel>Origem</InfoLabel>
                {isEditing ? (
                  <InfoInput
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Origem"
                  />
                ) : (
                  <InfoValue>{selectedLead.source || '—'}</InfoValue>
                )}
              </InfoRow>
            </InfoList>

            <ModalFooter>
              {isEditing ? (
                <FooterButtons>
                  <DangerButton
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancelar
                  </DangerButton>

                  <SuccessButton
                    type="button"
                    onClick={() => {
                      void handleSave()
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </SuccessButton>
                </FooterButtons>
              ) : (
                <FooterButtons>
                  <NeutralButton type="button" onClick={handleStartEdit}>
                    Editar
                  </NeutralButton>

                  <NeutralButton type="button" onClick={closeModal}>
                    Fechar
                  </NeutralButton>
                </FooterButtons>
              )}
            </ModalFooter>
          </>
        ) : (
          <ModalLoading>Nenhum lead encontrado.</ModalLoading>
        )}
      </ModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// DnD: Sortable Lead Card
// ----------------------------
function SortableLeadCard({
  lead
}: {
  lead: Lead
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id })

  const setSelectedLeadId = useSetAtom(selectedLeadIdAtom)
  const setSelectedLead = useSetAtom(selectedLeadAtom)
  const setLeadModalError = useSetAtom(leadModalErrorAtom)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  return (
    <LeadCard
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        setSelectedLead(null)
        setLeadModalError(null)
        setSelectedLeadId(lead.id)
      }}
    >
      <LeadTopRow>
        <Avatar>{getFirstLetters(lead.name)}</Avatar>

        <LeadTitle>
          <LeadName>{lead.name}</LeadName>
          <LeadSub>{formatPhone(lead.phone)}</LeadSub>
        </LeadTitle>
      </LeadTopRow>

      <LeadMetaRow>
        {lead.source ? <Pill title="Origem">{lead.source}</Pill> : null}
      </LeadMetaRow>

      {lead.fields?.lastMessage ? (
        <LeadMessage title="Última mensagem">
          {String(lead.fields.lastMessage)}
        </LeadMessage>
      ) : null}
    </LeadCard>
  )
}

// ----------------------------
// Page
// ----------------------------
export default function BoardPage() {
  const [boardId, setBoardId] = useAtom(boardIdAtom)
  const [data, setData] = useAtom(boardFullAtom)
  const [isLoading, setLoading] = useAtom(isLoadingAtom)
  const [error, setError] = useAtom(errorAtom)
  const setBoardIdAction = useSetAtom(setBoardIdAtom)
  const setIsSettingsModalOpen = useSetAtom(isSettingsModalOpenAtom)

  useEffect(() => {
    if (!boardId) {
      setBoardId('')
      setBoardIdAction('60b37bbd-7d0c-4698-99e4-d9cddaccb375')
    }
  }, [boardId, setBoardIdAction, setBoardId])

  const fetchBoardFull = useCallback(async () => {
    if (!boardId) return

    try {
      setError(null)
      setLoading(true)

      const res = await api.get<BoardFullResponse>(`/boards/${boardId}/full`)
      setData(sortColumnsAndLeads(res.data))
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        'Erro ao carregar board'

      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }, [boardId, setData, setError, setLoading])

  useEffect(() => {
    void fetchBoardFull()
  }, [fetchBoardFull])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    })
  )

  const leadIdToColumnId = useMemo(() => {
    const map = new Map<string, string>()

    if (!data) return map

    for (const col of data.columns) {
      for (const lead of col.leads ?? []) {
        map.set(lead.id, col.id)
      }
    }

    return map
  }, [data])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!data) return

      const { active, over } = event
      if (!over) return
      if (active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)

      const fromColumnId = leadIdToColumnId.get(activeId)
      const toColumnId = leadIdToColumnId.get(overId)

      if (!fromColumnId || !toColumnId) return
      if (fromColumnId !== toColumnId) return

      const next = {
        ...data,
        columns: data.columns.map((c) => ({
          ...c,
          leads: [...c.leads]
        }))
      }

      const col = next.columns.find((c) => c.id === fromColumnId)
      if (!col) return

      const oldIndex = col.leads.findIndex((l) => l.id === activeId)
      const newIndex = col.leads.findIndex((l) => l.id === overId)
      if (oldIndex < 0 || newIndex < 0) return

      col.leads = arrayMove(col.leads, oldIndex, newIndex).map((l, idx) => ({
        ...l,
        position: idx
      }))

      setData(next)
    },
    [data, leadIdToColumnId, setData]
  )

  return (
    <>
      <GlobalStyle />

      <Page>
        <TopBar>
          <TopBarInner>
            <BrandLeft>
              <LogoDot />
              <BrandText>Strativy Flow</BrandText>
            </BrandLeft>

            <TopBarActions>
              <SettingsButton
                type="button"
                onClick={() => {
                  setIsSettingsModalOpen(true)
                }}
                aria-label="Abrir configurações"
                title="Configurações"
              >
                <Settings size={18} />
              </SettingsButton>
            </TopBarActions>
          </TopBarInner>
        </TopBar>

        <BoardOuter>
          <BoardShell>
            <BoardHeader>
              <BoardTitle>
                {data?.board?.name ?? 'Seu Board'}
              </BoardTitle>

              <BoardHeaderRight>
                <RefreshIconButton
                  type="button"
                  onClick={() => {
                    void fetchBoardFull()
                  }}
                  disabled={!boardId || isLoading}
                  aria-label="Atualizar leads"
                  title="Atualizar leads"
                >
                  <RefreshCw size={18} />
                </RefreshIconButton>

                {error ? <ErrorBadge>{error}</ErrorBadge> : null}
              </BoardHeaderRight>
            </BoardHeader>

            <ColumnsArea>
              {!data ? (
                <EmptyState>
                  <EmptyTitle>Board não carregado</EmptyTitle>
                  <EmptyText>
                    Clique em <b>Atualizar leads</b> para buscar os dados.
                  </EmptyText>
                </EmptyState>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <ColumnsRow>
                    {data.columns.map((col) => (
                      <Column key={col.id}>
                        <ColumnHeader>
                          <ColumnName>{col.name}</ColumnName>
                          <ColumnCount>{col.leads?.length ?? 0}</ColumnCount>
                        </ColumnHeader>

                        <ColumnBody>
                          <SortableContext
                            items={(col.leads ?? []).map((l) => l.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {(col.leads ?? []).length === 0 ? (
                              <ColumnEmpty>Sem leads</ColumnEmpty>
                            ) : (
                              (col.leads ?? []).map((lead) => (
                                <SortableLeadCard
                                  key={lead.id}
                                  lead={lead}
                                />
                              ))
                            )}
                          </SortableContext>
                        </ColumnBody>
                      </Column>
                    ))}
                  </ColumnsRow>
                </DndContext>
              )}
            </ColumnsArea>
          </BoardShell>
        </BoardOuter>
      </Page>

      <LeadDetailsModal />
      <SettingsModal />
    </>
  )
}

// ----------------------------
// Styles
// ----------------------------
const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    margin: 0;
    background: #ffffff;
    color: #111111;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  }
`

const Page = styled.div`
  min-height: 100%;
  background: #ffffff;
  color: #111111;
`

const TopBar = styled.div`
  width: 100%;
  padding: 16px 14px;
  border-bottom: 1px solid #e9e9e9;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
`

const TopBarInner = styled.div`
  width: 100%;
  margin: 0 auto;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
`

const BrandLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const LogoDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #111111;
`

const BrandText = styled.div`
  font-weight: 800;
  letter-spacing: -0.2px;
`

const SettingsButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #dcdcdc;
  background: #ffffff;
  color: #111111;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #f7f7f7;
  }
`

const RefreshIconButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #dcdcdc;
  background: #84cc16;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #65a30d;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const BoardOuter = styled.div`
  width: 100%;
  margin: 14px auto 28px auto;
  padding: 0 10px;
`

const BoardShell = styled.div`
  border: 1px solid #e6e6e6;
  border-radius: 18px;
  background: #ffffff;
  padding: 16px;
`

const BoardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 6px 12px 6px;
`

const BoardHeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
`

const BoardTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
`

const ErrorBadge = styled.div`
  border: 1px solid #ffdddd;
  background: #fff2f2;
  color: #7a0b0b;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  max-width: 520px;
`

const ColumnsArea = styled.div`
  margin-top: 12px;
`

const ColumnsRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 10px;
`

const Column = styled.div`
  min-width: 280px;
  max-width: 280px;
  border: 1px solid #ededed;
  border-radius: 16px;
  background: #ffffff;
  padding: 10px;
`

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 10px 6px;
`

const ColumnName = styled.div`
  font-weight: 900;
  letter-spacing: -0.2px;
`

const ColumnCount = styled.div`
  min-width: 26px;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #111111;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
`

const ColumnBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const ColumnEmpty = styled.div`
  border: 1px dashed #d9d9d9;
  border-radius: 14px;
  padding: 14px;
  color: #6b6b6b;
  font-size: 13px;
  font-weight: 600;
  background: #fbfbfb;
`

const LeadCard = styled.div`
  border: 1px solid #ededed;
  border-radius: 16px;
  background: #ffffff;
  padding: 12px;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`

const LeadTopRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

const Avatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #111111;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 12px;
`

const LeadTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const LeadName = styled.div`
  font-weight: 900;
  letter-spacing: -0.2px;
`

const LeadSub = styled.div`
  font-size: 12px;
  color: #5b5b5b;
  font-weight: 600;
`

const LeadMetaRow = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const Pill = styled.div`
  font-size: 11px;
  font-weight: 800;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e6e6e6;
  background: #fafafa;
  color: #111111;
`

const LeadMessage = styled.div`
  margin-top: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333333;
  border: 1px solid #efefef;
  background: #fcfcfc;
  border-radius: 12px;
  padding: 10px;
  line-height: 1.35;
  max-height: 88px;
  overflow: hidden;
`

const EmptyState = styled.div`
  border: 1px dashed #dedede;
  border-radius: 16px;
  padding: 18px;
  background: #fbfbfb;
`

const EmptyTitle = styled.div`
  font-weight: 900;
  font-size: 14px;
  margin-bottom: 6px;
`

const EmptyText = styled.div`
  font-size: 13px;
  color: #555;
  font-weight: 600;
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
`

const ModalCard = styled.div`
  width: min(680px, 100%);
  max-height: min(86vh, 900px);
  overflow-y: auto;
  border: 1px solid #e6e6e6;
  border-radius: 20px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
`

const SettingsModalCard = styled.div`
  width: min(420px, 100%);
  border: 1px solid #e6e6e6;
  border-radius: 20px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
`

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`

const SettingsModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
`

const ModalTitleArea = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`

const ModalAvatar = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: #111111;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 14px;
`

const ModalTitle = styled.div`
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.3px;
`

const SettingsModalTitle = styled.div`
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
`

const ModalSubtitle = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: #5b5b5b;
  font-weight: 600;
`

const SettingsCloseIconButton = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #111111;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: #f7f7f7;
  }
`

const ModalError = styled.div`
  border: 1px solid #ffdddd;
  background: #fff2f2;
  color: #7a0b0b;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
`

const ModalLoading = styled.div`
  border: 1px solid #ededed;
  background: #fafafa;
  color: #333333;
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
`

const SectionTitle = styled.div`
  margin-top: 18px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 900;
  color: #111111;
`

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const InfoRow = styled.div`
  border: 1px solid #ededed;
  background: #fcfcfc;
  border-radius: 14px;
  padding: 12px;
`

const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
`

const InfoValue = styled.div<{ $preWrap?: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: #111111;
  line-height: 1.45;
  white-space: ${(props) => (props.$preWrap ? 'pre-wrap' : 'normal')};
  word-break: break-word;
`

const InfoInput = styled.input`
  width: 100%;
  min-height: 42px;
  border: 1px solid #dcdcdc;
  border-radius: 10px;
  background: #ffffff;
  color: #111111;
  padding: 0 12px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

const ModalFooter = styled.div`
  margin-top: 18px;
`

const FooterButtons = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`

const FooterButtonBase = styled.button`
  flex: 1;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

const NeutralButton = styled(FooterButtonBase)`
  background: #ededed;
  color: #111111;
  border-color: #dfdfdf;
`

const DangerButton = styled(FooterButtonBase)`
  background: #d9534f;
  color: #ffffff;
  border-color: #c8423e;
`

const SuccessButton = styled(FooterButtonBase)`
  background: #2e9b57;
  color: #ffffff;
  border-color: #27874b;
`

const SettingsModalBody = styled.div`
  display: flex;
  flex-direction: column;
`

const SettingsActionButton = styled.button`
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid #dfdfdf;
  background: #f3f3f3;
  color: #111111;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
`

const SettingsSpacer = styled.div`
  height: 42px;
`