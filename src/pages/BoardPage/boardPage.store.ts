/* eslint-disable @typescript-eslint/no-explicit-any */
import { atom } from 'jotai'

export type FollowUpBoardStatus = 'none' | 'scheduled' | 'today' | 'overdue'
export type LeadTemperature = 'hot' | 'warm' | 'cold'
export type LeadSourceBadgeType = 'whatsapp' | 'facebook' | 'instagram' | 'default'
export type LeadTemperatureBadgeType = LeadTemperature
export type LeadOutcome = 'won' | 'lost'
export type LeadState = 'active' | 'archived'

export type LeadFollowUpSummary = {
  openCount: number
  nextFollowUpValue: string | null
  nextDueAt: string | Date | null
  status: FollowUpBoardStatus
}

export type Lead = {
  id: string
  boardId: string
  columnId: string
  position: number
  name: string
  phone: string
  email?: string
  source?: string
  notes?: string
  temperature: LeadTemperature | null
  outcome: LeadOutcome | null
  state: LeadState
  fields?: Record<string, any>
  isFavorite?: boolean
  followUpSummary?: LeadFollowUpSummary
  lastInboundMessageId?: string
  lastAutoReplyMessageId?: string
  lastActivityAt?: string | Date | null
  movedAt?: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

export type Board = {
  id: string
  name: string
  userId: string
  isActive: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export type BoardColumnOnEnterCreateFollowUpAutomation = {
  value: string
  dueAt?: string
}

export type BoardColumnOnEnterAutomation = {
  createFollowUp?: BoardColumnOnEnterCreateFollowUpAutomation
  favoriteLead?: boolean
  markAllFollowUpsAsDone?: boolean
  resetLastActivityAt?: boolean
}

export type BoardColumn = {
  id: string
  name: string
  boardId: string
  position: number
  isDefault: boolean
  createdAt: string | Date
  updatedAt: string | Date
  leads: Lead[]
  onEnter?: BoardColumnOnEnterAutomation | null
}

export type BoardFullResponse = {
  board: Board
  columns: BoardColumn[]
}

export type BoardUserInfo = {
  email: string
  role: string
}

export type ColumnModalMode = 'edit' | 'delete'
export type ColumnSettingsView = 'details' | 'automations'

export const boardIdAtom = atom<string>('')
export const openedColumnMenuIdAtom = atom<string | null>(null)

export const boardFullAtom = atom<BoardFullResponse | null>(null)
export const userInfoAtom = atom<BoardUserInfo | null>(null)
export const isLoadingAtom = atom<boolean>(false)
export const errorAtom = atom<string | null>(null)

export const selectedLeadIdAtom = atom<string | null>(null)
export const selectedLeadAtom = atom<Lead | null>(null)
export const openCreateFollowupOnLeadOpenAtom = atom<boolean>(false)
export const isLeadModalLoadingAtom = atom<boolean>(false)
export const leadModalErrorAtom = atom<string | null>(null)

export const isSettingsModalOpenAtom = atom<boolean>(false)

export const selectedColumnAtom = atom<BoardColumn | null>(null)
export const isColumnModalOpenAtom = atom<boolean>(false)
export const columnModalModeAtom = atom<ColumnModalMode>('edit')
export const columnModalErrorAtom = atom<string | null>(null)
export const isColumnModalSavingAtom = atom<boolean>(false)

export const isCreateColumnModalOpenAtom = atom<boolean>(false)
export const createColumnErrorAtom = atom<string | null>(null)
export const isCreateColumnSavingAtom = atom<boolean>(false)

export const isCreateLeadModalOpenAtom = atom<boolean>(false)
export const createLeadErrorAtom = atom<string | null>(null)
export const isCreateLeadSavingAtom = atom<boolean>(false)

export const isAutomationsModalOpenAtom = atom<boolean>(false)
export const automationsModalColumnAtom = atom<BoardColumn | null>(null)
export const columnSettingsInitialViewAtom = atom<ColumnSettingsView>('details')

export const setBoardIdAtom = atom(null, (_get, set, id: string) => {
  set(boardIdAtom, id)
})
