/* eslint-disable @typescript-eslint/no-explicit-any */
 
// BoardPage.tsx
// Tudo em 1 arquivo: axios + jotai + styled-components + dnd-kit (UI-only reorder, sem chamadas de move)

import React, { useCallback, useEffect, useMemo } from 'react'
import axios from 'axios'
import styled, { createGlobalStyle } from 'styled-components'
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
// Types (baseado no teu backend /full)
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
  fields?: Record<string, never>
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

// ----------------------------
// Axios (ajusta BASE_URL conforme teu setup)
// ----------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000', // ajuste
  timeout: 15000
})

// Se você tiver token depois, coloca aqui
api.interceptors.request.use((config) => {
  // const token = localStorage.getItem('access_token')
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ----------------------------
// Jotai state
// ----------------------------
const boardIdAtom = atom<string>('') // você pode setar via route param no useEffect
const boardFullAtom = atom<BoardFullResponse | null>(null)
const isLoadingAtom = atom<boolean>(false)
const errorAtom = atom<string | null>(null)

const setBoardIdAtom = atom(null, (_get, set, id: string) => {
  set(boardIdAtom, id)
})

// ----------------------------
// Helpers
// ----------------------------
function formatPhone(phone: string) {
  // simples: não muda muito, só quebra linha/visual
  return phone?.trim()
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

// ----------------------------
// DnD: Sortable Lead Card
// ----------------------------
function SortableLeadCard({
  lead,
  columnName
}: {
  lead: Lead
  columnName: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  return (
    <LeadCard ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadTopRow>
        <Avatar>{getFirstLetters(lead.name)}</Avatar>
        <LeadTitle>
          <LeadName>{lead.name}</LeadName>
          <LeadSub>{formatPhone(lead.phone)}</LeadSub>
        </LeadTitle>
      </LeadTopRow>

      <LeadMetaRow>
        <Pill title="Coluna atual">{columnName}</Pill>
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

  // EXEMPLO: se você não estiver usando router ainda,
  // seta manualmente um boardId aqui.
  // Se usa React Router, substitui isso por useParams().
  useEffect(() => {
    if (!boardId) {
      // TODO: setar pelo seu id real
      setBoardId('') // deixa vazio pra não chamar API errado
      setBoardIdAction('60b37bbd-7d0c-4698-99e4-d9cddaccb375')
      // Deixo vazio pra não chamar API errado
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    })
  )

  // Mapa rápido de colunas pra achar onde está um lead
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

  // UI-only reorder:
  // - reordena SOMENTE dentro da mesma coluna
  // - não move entre colunas (você pediu pra não pensar nas chamadas de mover card agora)
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

      // Só reorder dentro da mesma coluna
      if (!fromColumnId || !toColumnId) return
      if (fromColumnId !== toColumnId) return

      const next = { ...data, columns: data.columns.map((c) => ({ ...c, leads: [...c.leads] })) }
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

            <TopBarRight>
              {/* Campo pra colar boardId se você quiser testar sem router */}
              <BoardIdInput
                value={boardId}
                onChange={(e) => setBoardIdAction(e.target.value)}
                placeholder="Cole aqui o boardId (UUID) e aperte Atualizar"
              />

              <PrimaryButton onClick={fetchBoardFull} disabled={!boardId || isLoading}>
                {isLoading ? 'Carregando...' : 'Atualizar leads'}
              </PrimaryButton>
            </TopBarRight>
          </TopBarInner>
        </TopBar>

        <BoardOuter>
          <BoardShell>
            {/* Header do board */}
            <BoardHeader>
              <BoardTitle>
                {data?.board?.name ?? 'Seu Board'}
                <BoardSubtitle>
                  {data ? `${data.columns.length} colunas` : '—'}
                </BoardSubtitle>
              </BoardTitle>

              {error ? <ErrorBadge>{error}</ErrorBadge> : null}
            </BoardHeader>

            {/* Barra de navegação dentro do board (borda arredondada de ponta a ponta) */}
            <BoardNav>
              <NavPill>Board</NavPill>
              <NavPillMuted>
                {data?.board?.isArchived ? 'Arquivado' : 'Ativo'}
              </NavPillMuted>
              <NavSpacer />
              <NavHint>
                DnD (UI): reordena dentro da coluna
              </NavHint>
            </BoardNav>

            {/* Colunas + Leads */}
            <ColumnsArea>
              {!data ? (
                <EmptyState>
                  <EmptyTitle>Informe um boardId</EmptyTitle>
                  <EmptyText>
                    Cole o UUID do board no campo acima e clique em <b>Atualizar leads</b>.
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
                                  columnName={col.name}
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
    </>
  )
}

// ----------------------------
// Styles (white bg + black text)
// ----------------------------
const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
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
  padding: 16px 18px;
  border-bottom: 1px solid #e9e9e9;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
`

const TopBarInner = styled.div`
  max-width: 1200px;
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

const TopBarRight = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  width: min(860px, 100%);
  justify-content: flex-end;
`

const BoardIdInput = styled.input`
  width: min(520px, 100%);
  height: 40px;
  border-radius: 10px;
  border: 1px solid #e2e2e2;
  padding: 0 12px;
  outline: none;
  color: #111111;
  background: #ffffff;

  &:focus {
    border-color: #cfcfcf;
    box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
  }
`

const PrimaryButton = styled.button`
  height: 40px;
  border-radius: 10px;
  padding: 0 14px;
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const BoardOuter = styled.div`
  max-width: 1200px;
  margin: 18px auto 32px auto;
  padding: 0 18px;
`

// “component board geral” com borda arredondada
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

const BoardTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
`

const BoardSubtitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #5b5b5b;
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

// “outra borda arredondada indo de uma ponta a outra da tela, dentro do board geral”
const BoardNav = styled.div`
  width: 100%;
  border: 1px solid #ededed;
  border-radius: 16px;
  background: #fafafa;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
`

const NavPill = styled.div`
  padding: 6px 10px;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
`

const NavPillMuted = styled.div`
  padding: 6px 10px;
  border-radius: 999px;
  background: #ffffff;
  color: #111111;
  border: 1px solid #e5e5e5;
  font-size: 12px;
  font-weight: 800;
`

const NavSpacer = styled.div`
  flex: 1;
`

const NavHint = styled.div`
  font-size: 12px;
  color: #4d4d4d;
  font-weight: 600;
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