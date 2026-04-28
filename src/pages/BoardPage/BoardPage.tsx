/* eslint-disable @typescript-eslint/no-explicit-any */

// BoardPage.tsx
// Tudo em 1 arquivo: axios + jotai + styled-components + dnd-kit
// UI-only reorder dentro da mesma coluna + modal ao clicar no lead + edição básica + modal de settings
// + modal de ações da coluna (editar/apagar)
// + botão de criação com dropdown para criar coluna ou lead
// + modal do lead com tabs de notas e follow-ups
// + follow-ups com criação inline + edição inline por linha + confirmação de exclusão

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-hot-toast'
import {
  Settings,
  X,
  Plus,
  Pencil,
  FileText,
  MessageSquare,
  Trash2,
  Calendar,
  ArrowRight,
  Check,
  Star,
  Clock3,
  ArrowLeft,
  Filter,
  CircleUser,
  Settings2,
  LogOut,
  Archive,
  Flame,
  Sun,
  Snowflake,
  RotateCcw
} from 'lucide-react'
import { useAtom, useSetAtom } from 'jotai'

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { api } from './boardPage.api'
import { getMeRequest, logoutRequest } from '../LoginPage/loginPage.api'
import * as Styles from './boardPage.styles'
import {
  boardIdAtom,
  openedColumnMenuIdAtom,
  boardFullAtom,
  userInfoAtom,
  isLoadingAtom,
  errorAtom,
  selectedLeadIdAtom,
  selectedLeadAtom,
  openCreateFollowupOnLeadOpenAtom,
  isLeadModalLoadingAtom,
  leadModalErrorAtom,
  isSettingsModalOpenAtom,
  selectedColumnAtom,
  isColumnModalOpenAtom,
  columnModalModeAtom,
  columnModalErrorAtom,
  isColumnModalSavingAtom,
  isCreateColumnModalOpenAtom,
  createColumnErrorAtom,
  isCreateColumnSavingAtom,
  isCreateLeadModalOpenAtom,
  createLeadErrorAtom,
  isCreateLeadSavingAtom,
  isAutomationsModalOpenAtom,
  automationsModalColumnAtom,
  setBoardIdAtom
} from './boardPage.store'

const {
  GlobalStyle,
  Page,
  SettingsButton,
  SettingsDropdownWrapper,
  SettingsDropdownMenu,
  SettingsDropdownOption,
  SettingsOptionWithIcon,
  PreferencesBody,
  PreferenceRow,
  PreferenceLabel,
  PreferenceToggle,
  PreferenceToggleDot,
  BoardOuter,
  BoardShell,
  BoardHeader,
  BoardHeaderTopRow,
  BoardSelectorWrapper,
  BoardTitleButton,
  BoardHeaderActions,
  MobileNavMenuDropdown,
  MobileNavMenuSectionTitle,
  MobileNavFilterSearchInput,
  MobileNavFiltersList,
  BoardTitle,
  BoardTitleCaret,
  BoardSelectorDropdown,
  BoardSelectorOption,
  BoardOptionCircle,
  BoardOptionName,
  FiltersDropdownWrapper,
  FiltersDropdownMenu,
  FiltersDropdownOption,
  FiltersOptionLabel,
  FiltersCheckPlaceholder,
  FiltersGroup,
  FiltersGroupTitle,
  BottomBrand,
  BottomFixedBackground,
  BottomBrandDot,
  BottomBrandText,
  ColumnsArea,
  ColumnsRow,
  Column,
  ColumnHeader,
  ColumnAccordionToggle,
  ColumnTitleGroup,
  ColumnName,
  ColumnCount,
  ColumnMoreButton,
  ColumnBody,
  AddLeadButton,
  AddColumnButton,
  LeadCard,
  LeadFollowUpBlock,
  LeadFollowUpContent,
  LeadSectionDivider,
  LeadFollowUpCount,
  LeadFollowUpNextLine,
  LeadTopRow,
  LeadTitle,
  LeadHeaderRow,
  LeadHeaderActions,
  LeadMetaRow,
  LeadBadgesRow,
  LeadName,
  LeadSourceBadge,
  LeadAgeBadge,
  LeadTemperatureBadge,
  LeadNewBadge,
  LeadNewFire,
  LeadQuickActionsWrapper,
  LeadQuickActionsButton,
  LeadQuickActionsDropdown,
  LeadQuickActionsOption,
  LeadQuickActionsSubmenuWrapper,
  LeadQuickActionsChevron,
  LeadQuickActionsSubmenu,
  LeadQuickActionsSubmenuOption,
  LeadMoveMenuWrapper,
  LeadMoveButton,
  LeadMoveDropdown,
  LeadMoveOptionButton,
  LeadFavoriteButton,
  EmptyState,
  EmptyTitle,
  EmptyText,
  ModalOverlay,
  ModalCard,
  SettingsModalCard,
  ModalHeader,
  SettingsModalHeader,
  ModalTitleArea,
  ModalTitleInlineRow,
  ModalTitleSeparator,
  ModalTitleColumnName,
  ModalTitleColumnToggle,
  MoveColumnMenuWrapper,
  MoveColumnDropdown,
  MoveColumnLabel,
  MoveColumnOptions,
  MoveColumnOptionButton,
  ModalTitleClickable,
  ModalHeaderEditInput,
  ModalHeaderRightArea,
  HeaderIconButtons,
  SettingsModalTitle,
  SettingsCloseIconButton,
  ModalFavoriteIconButton,
  ModalLoading,
  SectionTitle,
  SectionTitleNoMargin,
  LeadTabSectionTitle,
  CommentHeaderRow,
  FollowupFiltersTrigger,
  CommentMetaText,
  CommentStatusGroup,
  CommentStatusDot,
  CommentBox,
  InfoList,
  InfoRow,
  InfoLabel,
  InfoValue,
  LeadInfoBlockLabel,
  LeadInfoRowHeader,
  LeadInfoActions,
  LeadInfoActionButton,
  LeadNextActionCard,
  LeadNextActionLine,
  LeadNextActionDate,
  LeadNextActionTitle,
  LeadNextActionDot,
  LeadContactLine,
  LeadContactKey,
  LeadContactValue,
  LeadTemperaturePickerWrapper,
  LeadTemperaturePickerButton,
  LeadTemperatureMenu,
  LeadTemperatureMenuButton,
  LeadContactInlineInput,
  InfoInput,
  InfoSelect,
  CreateFormCard,
  CreateFieldsStack,
  FollowUpList,
  FollowUpListItem,
  FollowUpCreateRow,
  FollowUpCreateHeader,
  FollowUpCreateFooter,
  FollowUpTextInput,
  FollowUpDateInput,
  FollowUpInlineCreateIconButton,
  FollowUpInlineCancelButton,
  FollowUpListItemTop,
  FollowUpItemDate,
  FollowUpItemStatus,
  FollowUpItemMainLine,
  FollowUpItemMetaLine,
  FollowUpItemTitle,
  FollowUpItemActions,
  FollowUpActionIconButton,
  ModalFooter,
  FooterButtons,
  NeutralButton,
  CreateDropdownButton,
  DangerButton,
  SuccessButton,
  SettingsModalBody,
  SettingsActionButton,
  SettingsSpacer,
  AutomationsModalCard,
  ColumnSettingsMain,
  AutomationsTabs,
  AutomationsTabButton,
  AutomationsTabContent,
  AutomationsEntryArea,
  AutomationsCountBadge,
  AutomationsEntryMainLine,
  AutomationsEntryListItemTop,
  AutomationsEntryItemFollowUpInfo,
  AutomationsEntryItemSubtext,
  AutomationsEntryItemDueAt,
  AutomationsEmptyState,
  AutomationsEmptyTitle,
  AutomationsEmptyText,
  AutomationsCreateButton,
  AutomationsPickerOverlay,
  AutomationsPickerCard,
  AutomationsPickerTitle,
  AutomationsPickerHeader,
  AutomationsPickerCloseButton,
  AutomationsPickerSection,
  AutomationsPickerSectionTrigger,
  AutomationsPickerSectionTitle,
  AutomationsPickerSectionContent,
  AutomationsPickerSectionContentInner,
  AutomationsPickerOption,
  AutomationsEntryList,
  ArchivedColumnPickerWrapper,
  ArchivedPickerBackdrop,
  AutomationsEntryListItem,
  AutomationsEntryAddButton,
  AutomationsEntryItemCategory,
  AutomationsFormSection,
  AutomationsFormInput,
  AutomationsFormRadioGroup,
  AutomationsFormRadioOption,
  AutomationsFormNumberInput,
  AutomationsFormDateInput,
  AutomationsFormFooter,
  AutomationsFormButton,
  DeleteConfirmText,
  ColumnMenuWrapper,
  ColumnDropdown,
  ColumnSortMenuWrapper,
  ColumnSortChevron,
  ColumnSortActiveDot,
  ColumnSortSubmenu,
  ColumnSortOption,
} = Styles

// ----------------------------
// Types
// ----------------------------
type FollowUpBoardStatus = 'none' | 'scheduled' | 'today' | 'overdue'
type LeadSourceBadgeType = 'whatsapp' | 'metaads' | 'default'
type LeadTemperatureBadgeType = LeadTemperature
type LeadFilterKey =
  | 'favorite'
  | 'none'
  | 'scheduled'
  | 'today'
  | 'overdue'
  | 'hot'
  | 'warm'
  | 'cold'

type FollowupFilterKey = 'scheduled' | 'today' | 'overdue' | 'done'

type LeadFollowUpSummary = {
  openCount: number
  nextFollowUpValue: string | null
  nextDueAt: string | Date | null
  status: FollowUpBoardStatus
}

type LeadFollowUp = {
  id: string
  leadId: string
  value: string
  dueAt: string
  status: 'pending' | 'done' | 'canceled'
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

type LeadTemperature = 'hot' | 'warm' | 'cold'
type LeadOutcome = 'won' | 'lost'
type LeadState = 'active' | 'archived'

type Lead = {
  id: string
  boardId: string
  columnId: string
  position: number
  name: string
  phone: string
  email?: string
  source?: string
  companyName?: string
  notes?: string
  initialContext?: string
  temperature: LeadTemperature | null
  outcome: LeadOutcome | null
  state: LeadState
  isFavorite?: boolean
  followUpSummary?: LeadFollowUpSummary
  lastInboundMessageId?: string
  lastAutoReplyMessageId?: string
  lastActivityAt?: string | Date | null
  movedAt?: string | Date
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

type BoardColumnOnEnterCreateFollowUpAutomation = {
  value: string
  dueAt?: string
}

type BoardColumnOnEnterAutomation = {
  createFollowUp?: BoardColumnOnEnterCreateFollowUpAutomation
  favoriteLead?: boolean
  markAllFollowUpsAsDone?: boolean
  resetLastActivityAt?: boolean
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
  onEnter?: BoardColumnOnEnterAutomation | null
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
  companyName?: string
  notes?: string
  initialContext?: string
  temperature?: LeadTemperature | null
  outcome?: LeadOutcome | null
  state?: LeadState
}

type CreateLeadPayload = {
  boardId: string
  columnId?: string
  name: string
  phone: string
  email?: string
  source?: string
  companyName?: string
  notes?: string
  initialContext?: string
  temperature?: LeadTemperature | null
  outcome?: LeadOutcome | null
  state?: LeadState
}

type UpdateColumnPayload = {
  name?: string
  onEnter?: BoardColumnOnEnterAutomation | null
}

type CreateColumnPayload = {
  name: string
}

type ColumnModalMode = 'edit' | 'delete'
type LeadModalViewMode = 'followups' | 'notes' | 'details' | 'edit'
type ColumnSortKey = 'newest' | 'oldest' | 'next-followup' | 'no-followup' | 'favorites' | 'temperature'
type ThemeMode = 'light' | 'dark'

type AtomSetter<T> = React.Dispatch<React.SetStateAction<T>>

const THEME_STORAGE_KEY = 'strativy-theme-mode'
const DEFAULT_LEAD_TEMPERATURE: LeadTemperature = 'warm'
const DEFAULT_LEAD_STATE: LeadState = 'active'
const DEFAULT_LEAD_OUTCOME: LeadOutcome | null = null
const LEAD_TEMPERATURE_OPTIONS: Array<{ value: LeadTemperature; label: string }> = [
  { value: 'hot', label: 'Quente' },
  { value: 'warm', label: 'Morno' },
  { value: 'cold', label: 'Frio' }
]

const LEAD_SOURCE_OPTIONS: Array<{
  value: 'whatsapp' | 'metaads'
  label: string
}> = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'metaads', label: 'MetaAds' }
]



// ----------------------------
// Helpers
// ----------------------------
function formatFollowUpDateLabel(value?: string | Date | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  const endOfTomorrow = new Date(endOfToday)
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)

  const timeLabel = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (date >= startOfToday && date <= endOfToday) {
    return `Hoje ${timeLabel}`
  }

  if (date >= startOfTomorrow && date <= endOfTomorrow) {
    return `Amanhã ${timeLabel}`
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatFollowUpDateTimeExact(value?: string | Date | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getLeadFollowUpStatus(lead: Lead): FollowUpBoardStatus {
  return lead.followUpSummary?.status ?? 'none'
}

function getLeadFollowUpCountLabel(lead: Lead) {
  const count = lead.followUpSummary?.openCount ?? 0

  if (count <= 0) return null
  if (count === 1) return '1 follow-up aberto'
  return `${count} follow-ups abertos`
}

function getLeadFollowUpLine(lead: Lead) {
  const summary = lead.followUpSummary

  if (!summary || summary.status === 'none' || !summary.nextDueAt) {
    return '⚠️ Sem próxima ação'
  }

  if (summary.status === 'overdue') {
    const label = formatFollowUpDateLabel(summary.nextDueAt)
    return label ? `Atrasado: ${label}` : 'Atrasado'
  }

  const label = formatFollowUpDateLabel(summary.nextDueAt)
  return label ? `Próximo: ${label}` : 'Próximo follow-up'
}

function getSingleFollowUpVisualStatus(
  followup: LeadFollowUp
): FollowUpBoardStatus | 'done' {
  if (followup.status === 'done') return 'done'

  const due = new Date(followup.dueAt)
  if (Number.isNaN(due.getTime())) return 'scheduled'

  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  if (due < startOfToday) return 'overdue'
  if (due >= startOfToday && due <= endOfToday) return 'today'
  return 'scheduled'
}

function getFollowUpStatusLabel(status: FollowUpBoardStatus | 'done') {
  switch (status) {
    case 'overdue':
      return 'Atrasado'
    case 'today':
      return 'Hoje'
    case 'scheduled':
      return 'Agendado'
    case 'done':
      return 'Concluido'
    default:
      return 'Agendado'
  }
}

function formatPhone(phone?: string) {
  const raw = phone?.trim() ?? ''
  if (!raw) return '—'

  const digits = raw.replace(/\D/g, '')

  if (digits.length === 12) {
    const country = digits.slice(0, 2)
    const ddd = digits.slice(2, 4)
    const prefix = digits.slice(4, 8)
    const suffix = digits.slice(8, 12)
    return `(${country})${ddd} ${prefix}-${suffix}`
  }

  if (digits.length === 13) {
    const country = digits.slice(0, 2)
    const ddd = digits.slice(2, 4)
    const prefix = digits.slice(4, 9)
    const suffix = digits.slice(9, 13)
    return `(${country})${ddd} ${prefix}-${suffix}`
  }

  if (digits.length === 8) {
    const ddd = digits.slice(0, 2)
    const prefix = digits.slice(2, 6)
    const suffix = digits.slice(6, 10)
    return `${ddd} ${prefix}-${suffix}`
  }

  if (digits.length === 9) {
    const ddd = digits.slice(0, 2)
    const prefix = digits.slice(2, 7)
    const suffix = digits.slice(7, 11)
    return `${ddd} ${prefix}-${suffix}`
  }

  return raw
}

const TOAST_MESSAGES = {
  success: {
    createLead: 'Lead criado com sucesso',
    createColumn: 'Coluna criada com sucesso',
    editColumn: 'Coluna editada com sucesso',
    deleteColumn: 'Coluna excluída com sucesso',
    createFollowup: 'Follow-up criado com sucesso',
    saveNotes: 'Notas salvas com sucesso',
    editFollowup: 'Follow-up editado com sucesso',
    completeFollowup: 'Follow-up marcado como concluído',
    favoriteLead: 'Lead favoritado com sucesso',
    archiveLead: 'Lead arquivado com sucesso',
    editLead: 'Lead editado com sucesso',
    deleteItem: 'Lead excluído com sucesso',
    saveAutomation: 'Automação salva com sucesso',
    deleteAutomation: 'Automação excluída com sucesso',
    moveLeadColumn: 'Lead movido para coluna'
  },
  error: {
    saveLead: 'Falha ao salvar lead',
    createFollowup: 'Falha ao criar follow-up',
    updateFollowup: 'Falha ao editar follow-up',
    updateFollowupStatus: 'Falha ao atualizar status do follow-up',
    loadBoard: 'Falha ao carregar Board',
    integration: 'Falha na integração',
    unexpected: 'Erro inesperado'
  }
}

const getMoveLeadColumnToastMessage = (columnName?: string | null) => {
  const safeColumnName = columnName?.trim() || 'Sem coluna'
  return `${TOAST_MESSAGES.success.moveLeadColumn} '${safeColumnName}'`
}

const toastSuccess = (message: string) => {
  toast.success(message)
}

const toastWarning = (message: string) => {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#eab308',
      color: '#ffffff'
    }
  })
}

const toastError = (message: string) => {
  toast.error(message)
}

const API_ERROR_TRANSLATIONS: Record<string, string> = {
  'cannot delete column with leads': 'Não é possível excluir coluna com leads',
  'default columns cannot be deleted': 'Colunas padrão não podem ser excluídas',
  'column not found': 'Coluna não encontrada',
  'column not found in this board': 'Coluna não encontrada neste board',
  'board not found': 'Board não encontrado',
  'board not found for user': 'Board não encontrado para o usuário',
  'board does not belong to user': 'Board não pertence ao usuário',
  'board is archived': 'Este board está arquivado',
  'board has no columns': 'Este board não possui colunas',
  'lead not found': 'Lead não encontrado',
  'lead not found in this board': 'Lead não encontrado neste board',
  'follow-up not found': 'Follow-up não encontrado',
  'phone is required': 'Telefone é obrigatório',
  'missing bearer token': 'Token de autenticação não informado',
  'jwt secret is not configured': 'Configuração de autenticação inválida no servidor',
  'invalid token payload': 'Payload do token inválido',
  'invalid or expired token': 'Token inválido ou expirado'
}

function extractApiErrorMessage(error: unknown): string {
  const messageFromResponse = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message

  if (typeof messageFromResponse === 'string') {
    return messageFromResponse.trim()
  }

  if (Array.isArray(messageFromResponse)) {
    const firstMessage = messageFromResponse.find((item) => typeof item === 'string')
    if (typeof firstMessage === 'string') {
      return firstMessage.trim()
    }
  }

  if (error instanceof Error) {
    return error.message.trim()
  }

  if (typeof (error as { message?: unknown })?.message === 'string') {
    return String((error as { message?: unknown }).message).trim()
  }

  return ''
}

function translateApiErrorMessage(message: string): string {
  if (!message) return ''

  const normalized = message.trim().toLowerCase()
  const translated = API_ERROR_TRANSLATIONS[normalized]

  if (translated) return translated

  return message
}

function toastErrorFromException(error: unknown, defaultMessage: string) {
  const rawMessage = extractApiErrorMessage(error)
  const translatedMessage = translateApiErrorMessage(rawMessage)

  if (translatedMessage) {
    if (/integra[cç][aã]o/i.test(translatedMessage)) {
      toastError(TOAST_MESSAGES.error.integration)
      return
    }

    toastError(translatedMessage)
    return
  }

  if (/integra[cç][aã]o/i.test(rawMessage)) {
    toastError(TOAST_MESSAGES.error.integration)
    return
  }

  if (defaultMessage.trim()) {
    toastError(defaultMessage)
    return
  }

  toastError(TOAST_MESSAGES.error.unexpected)
}

function getLeadFirstName(name?: string | null) {
  const trimmedName = name?.trim() ?? ''
  if (!trimmedName) return ''

  return trimmedName.split(/\s+/)[0] ?? ''
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

function normalizeOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function shouldOpenDropdownUpward(anchor: HTMLDivElement | null) {
  if (!anchor || typeof window === 'undefined') return false

  const rect = anchor.getBoundingClientRect()
  const estimatedMenuHeight = 180
  const viewportPadding = 12
  const availableBelow = window.innerHeight - rect.bottom - viewportPadding
  const availableAbove = rect.top - viewportPadding

  return availableBelow < estimatedMenuHeight && availableAbove > availableBelow
}

function getLeadNotes(lead?: Lead | null) {
  const value = lead?.notes
  return typeof value === 'string' ? value : ''
}

function sortFollowups(a: LeadFollowUp, b: LeadFollowUp) {
  const aDone = a.status === 'done'
  const bDone = b.status === 'done'
  if (aDone !== bDone) return aDone ? 1 : -1
  const aTime = new Date(a.dueAt).getTime()
  const bTime = new Date(b.dueAt).getTime()
  // done items: oldest dueAt goes to the very bottom (descending)
  if (aDone) return bTime - aTime
  // pending items: ascending by dueAt
  return aTime - bTime
}

function getLeadSourceBadge(source?: string | null) {
  if (!source) return null

  const trimmedSource = source.trim()
  if (!trimmedSource) return null

  const normalized = trimmedSource
    .toLowerCase()
    .replace(/[_\-\s]+/g, '')

  const sourceMap: Record<string, LeadSourceBadgeType> = {
    whatsapp: 'whatsapp',
    zap: 'whatsapp',
    wa: 'whatsapp',
    meta: 'metaads',
    metaads: 'metaads'
  }

  const type = sourceMap[normalized]
  if (!type) {
    return {
      type: 'default' as const,
      label: trimmedSource.charAt(0).toUpperCase() + trimmedSource.slice(1).toLowerCase()
    }
  }

  const labelMap: Record<LeadSourceBadgeType, string> = {
    whatsapp: 'WhatsApp',
    metaads: 'MetaAds',
    default: 'Origem'
  }

  return {
    type,
    label: labelMap[type]
  }
}

function getLeadTemperatureBadge(temperature?: LeadTemperature | null) {
  const labelMap: Record<LeadTemperatureBadgeType, string> = {
    hot: 'Quente',
    warm: 'Morno',
    cold: 'Frio'
  }

  if (!temperature) {
    return null
  }

  const type = temperature

  return {
    type,
    label: labelMap[type]
  }
}

function getLeadActivityBadge(lead?: Lead | null) {
  if (!lead?.lastActivityAt) {
    return {
      type: 'new' as const,
      label: 'Novo'
    }
  }

  if (lead.state === 'archived' || lead.outcome !== null) {
    return null
  }

  const activityDate = new Date(lead.lastActivityAt)
  if (Number.isNaN(activityDate.getTime())) {
    return {
      type: 'new' as const,
      label: 'Novo'
    }
  }

  const diffMs = Math.max(Date.now() - activityDate.getTime(), 0)
  const oneDayMs = 24 * 60 * 60 * 1000

  if (diffMs < oneDayMs) {
    return {
      type: 'new' as const,
      label: 'Novo'
    }
  }

  const elapsedDays = Math.floor(diffMs / oneDayMs)

  return {
    type: 'time' as const,
    label: `${elapsedDays} ${elapsedDays === 1 ? 'dia' : 'dias'}`
  }
}

function toDatetimeLocalValue(input?: string | Date | null) {
  if (!input) return ''

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
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
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Ações da coluna</SettingsModalTitle>

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
          <SettingsActionButton type="button">Editar Usuario</SettingsActionButton>
          <SettingsSpacer />
          <SettingsActionButton type="button">Logout</SettingsActionButton>
        </SettingsModalBody>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal da coluna
// ----------------------------
function ColumnActionsModal({
  onRefreshBoard
}: {
  onRefreshBoard: () => Promise<void>
}) {
  const [isOpen, setIsOpen] = useAtom(isColumnModalOpenAtom)
  const [selectedColumn, setSelectedColumn] = useAtom(selectedColumnAtom) as [
    BoardColumn | null,
    AtomSetter<BoardColumn | null>
  ]
  const [mode, setMode] = useAtom(columnModalModeAtom) as [
    ColumnModalMode,
    AtomSetter<ColumnModalMode>
  ]
  const [, setError] = useAtom(columnModalErrorAtom)
  const [isSaving, setIsSaving] = useAtom(isColumnModalSavingAtom)
  const [boardId] = useAtom(boardIdAtom)

  const [columnName, setColumnName] = useState('')

  const syncForm = useCallback((column: BoardColumn | null) => {
    setColumnName(column?.name ?? '')
  }, [])

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    setSelectedColumn(null)
    setMode('edit')
    setError(null)
    setIsSaving(false)
    syncForm(null)
  }, [
    isSaving,
    setError,
    setIsOpen,
    setIsSaving,
    setMode,
    setSelectedColumn,
    syncForm
  ])

  useEffect(() => {
    syncForm(selectedColumn)
  }, [selectedColumn, syncForm])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  const handleBackToMenu = () => {
    setError(null)
    syncForm(selectedColumn)
    setMode('edit')
  }

  const handleSaveColumn = async () => {
    if (!selectedColumn || !boardId) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: UpdateColumnPayload = {
        name: columnName.trim()
      }

      await api.patch<BoardColumn>(
        `/boards/${boardId}/columns/${selectedColumn.id}`,
        payload
      )

      setSelectedColumn((prev) =>
        prev ? { ...prev, name: payload.name ?? prev.name, leads: prev.leads } : prev
      )

      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.editColumn)
      setMode('edit')
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar coluna'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteColumn = async () => {
    if (!selectedColumn || !boardId) return

    try {
      setIsSaving(true)
      setError(null)

      await api.delete(`/boards/${boardId}/columns/${selectedColumn.id}`)
      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.deleteColumn)
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao apagar coluna'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
      setMode('edit')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !selectedColumn) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Excluir coluna</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar ações da coluna"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        {mode === 'delete' ? (
          <SettingsModalBody>
            <DeleteConfirmText>Você tem certeza que deseja excluir esta coluna ?</DeleteConfirmText>

            <FooterButtons>
              <DangerButton
                type="button"
                onClick={() => {
                  void handleDeleteColumn()
                }}
                disabled={isSaving}
              >
                Sim
              </DangerButton>

              <NeutralButton
                type="button"
                onClick={handleBackToMenu}
                disabled={isSaving}
              >
                Não
              </NeutralButton>
            </FooterButtons>
          </SettingsModalBody>
        ) : null}

        {mode === 'edit' ? (
          <>
            <SectionTitle>Editar coluna</SectionTitle>

            <InfoList>
              <InfoRow>
                <InfoLabel>Nome</InfoLabel>
                <InfoInput
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Nome da coluna"
                />
              </InfoRow>
            </InfoList>

            <ModalFooter>
              <FooterButtons>
                <DangerButton
                  type="button"
                  onClick={handleBackToMenu}
                  disabled={isSaving}
                >
                  Cancelar
                </DangerButton>

                <SuccessButton
                  type="button"
                  onClick={() => {
                    void handleSaveColumn()
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </SuccessButton>
              </FooterButtons>
            </ModalFooter>
          </>
        ) : null}
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal criar coluna
// ----------------------------
function CreateColumnModal({
  onRefreshBoard
}: {
  onRefreshBoard: () => Promise<void>
}) {
  const [isOpen, setIsOpen] = useAtom(isCreateColumnModalOpenAtom)
  const [, setError] = useAtom(createColumnErrorAtom)
  const [isSaving, setIsSaving] = useAtom(isCreateColumnSavingAtom)
  const [boardId] = useAtom(boardIdAtom)

  const [columnName, setColumnName] = useState('')

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    setError(null)
    setIsSaving(false)
    setColumnName('')
  }, [isSaving, setError, setIsOpen, setIsSaving])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  const handleSave = async () => {
    if (!boardId) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: CreateColumnPayload = {
        name: columnName.trim()
      }

      await api.post(`/boards/${boardId}/columns`, payload)
      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.createColumn)
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar coluna'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Criar coluna</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar criação de coluna"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <CreateFormCard>
          <InfoInput
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Nome da coluna"
          />
        </CreateFormCard>

        <ModalFooter>
          <FooterButtons>
            <NeutralButton type="button" onClick={closeModal} disabled={isSaving}>
              Fechar
            </NeutralButton>

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
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal criar lead
// ----------------------------
function CreateLeadModal({
  columns,
  onRefreshBoard,
  initialColumnId,
  onClose
}: {
  columns: BoardColumn[]
  onRefreshBoard: () => Promise<void>
  initialColumnId?: string
  onClose?: () => void
}) {
  const [isOpen, setIsOpen] = useAtom(isCreateLeadModalOpenAtom)
  const [, setError] = useAtom(createLeadErrorAtom)
  const [isSaving, setIsSaving] = useAtom(isCreateLeadSavingAtom)
  const [boardId] = useAtom(boardIdAtom)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [initialContext, setInitialContext] = useState('')
  const [columnId, setColumnId] = useState('')

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    setError(null)
    setIsSaving(false)
    setName('')
    setPhone('')
    setEmail('')
    setSource('')
    setInitialContext('')
    setColumnId('')
    onClose?.()
  }, [isSaving, setError, setIsOpen, setIsSaving, onClose])

  useEffect(() => {
    if (!isOpen) return
    const defaultColumnId = initialColumnId || columns[0]?.id || ''
    setColumnId((prev) => prev || defaultColumnId)
  }, [isOpen, columns, initialColumnId])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  const handleSave = async () => {
    if (!boardId) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: CreateLeadPayload = {
        boardId,
        columnId: normalizeOptionalString(columnId),
        name: name.trim(),
        phone: phone.trim(),
        email: normalizeOptionalString(email),
        source: normalizeOptionalString(source),
        temperature: DEFAULT_LEAD_TEMPERATURE,
        outcome: DEFAULT_LEAD_OUTCOME,
        state: DEFAULT_LEAD_STATE,
        initialContext: normalizeOptionalString(initialContext)
      }

      await api.post('/leads', payload)
      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.createLead)
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar lead'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Criar lead</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar criação de lead"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <CreateFormCard>
          <CreateFieldsStack>
            <InfoInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do lead"
            />

            <InfoInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone"
            />

            <InfoInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />

            <InfoInput
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Origem"
            />

            <InfoInput
              value={initialContext}
              onChange={(e) => setInitialContext(e.target.value)}
              placeholder="Contexto inicial"
            />

            <InfoSelect
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
            >
              {!columnId ? <option value="">Selecione a coluna</option> : null}
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </InfoSelect>
          </CreateFieldsStack>
        </CreateFormCard>

        <ModalFooter>
          <FooterButtons>
            <NeutralButton type="button" onClick={closeModal} disabled={isSaving}>
              Fechar
            </NeutralButton>

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
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modais do lead / followup
// ----------------------------
function LeadDeleteConfirmModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <ModalOverlay
      onClick={() => {
        if (!isDeleting) onClose()
      }}
    >
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Excluir lead</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={onClose}
            aria-label="Fechar confirmação de exclusão"
            title="Fechar"
            disabled={isDeleting}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <DeleteConfirmText>
          Você tem certeza que deseja excluir este lead?
        </DeleteConfirmText>

        <ModalFooter>
          <FooterButtons>
            <DangerButton type="button" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Sim'}
            </DangerButton>

            <NeutralButton type="button" onClick={onClose} disabled={isDeleting}>
              Não
            </NeutralButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

function LeadArchiveConfirmModal({
  isOpen,
  isArchiving,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  isArchiving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isArchiving) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isArchiving, onClose])

  if (!isOpen) return null

  return (
    <ModalOverlay
      onClick={() => {
        if (!isArchiving) onClose()
      }}
    >
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Arquivar lead</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={onClose}
            aria-label="Fechar confirmação de arquivamento"
            title="Fechar"
            disabled={isArchiving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <DeleteConfirmText>
          Você tem certeza que deseja arquivar este lead?
        </DeleteConfirmText>

        <ModalFooter>
          <FooterButtons>
            <DangerButton type="button" onClick={onConfirm} disabled={isArchiving}>
              {isArchiving ? 'Arquivando...' : 'Sim'}
            </DangerButton>

            <NeutralButton type="button" onClick={onClose} disabled={isArchiving}>
              Não
            </NeutralButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

function FollowUpDeleteConfirmModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <ModalOverlay
      onClick={() => {
        if (!isDeleting) onClose()
      }}
    >
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Excluir follow-up</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={onClose}
            aria-label="Fechar confirmação de exclusão do follow-up"
            title="Fechar"
            disabled={isDeleting}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <DeleteConfirmText>
          Você tem certeza que deseja excluir este follow-up?
        </DeleteConfirmText>

        <ModalFooter>
          <FooterButtons>
            <DangerButton type="button" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Sim'}
            </DangerButton>

            <NeutralButton type="button" onClick={onClose} disabled={isDeleting}>
              Não
            </NeutralButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

function LeadDetailsModal({
  onRefreshBoard
}: {
  onRefreshBoard: () => Promise<void>
}) {
  const [selectedLeadId, setSelectedLeadId] = useAtom(selectedLeadIdAtom)
  const [selectedLead, setSelectedLead] = useAtom(selectedLeadAtom) as [
    Lead | null,
    AtomSetter<Lead | null>
  ]
  const [boardData, setBoardData] = useAtom(boardFullAtom) as [
    BoardFullResponse | null,
    AtomSetter<BoardFullResponse | null>
  ]
  const [openCreateFollowupOnLeadOpen, setOpenCreateFollowupOnLeadOpen] = useAtom(
    openCreateFollowupOnLeadOpenAtom
  )
  const [isLoading, setLoading] = useAtom(isLeadModalLoadingAtom)
  const [, setError] = useAtom(leadModalErrorAtom)

  const [viewMode, setViewMode] = useState<LeadModalViewMode>('details')
  const [isEditModeActive, setIsEditModeActive] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
  const [isColumnChanging, setIsColumnChanging] = useState(false)
  const [isMoveColumnMenuOpen, setIsMoveColumnMenuOpen] = useState(false)
  const [isTemperatureMenuOpen, setIsTemperatureMenuOpen] = useState(false)
  const [isTemperatureMenuOpenUpward, setIsTemperatureMenuOpenUpward] = useState(false)
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false)
  const [isSourceMenuOpenUpward, setIsSourceMenuOpenUpward] = useState(false)
  const [isFollowupFiltersOpen, setIsFollowupFiltersOpen] = useState(false)
  const [selectedFollowupFilters, setSelectedFollowupFilters] = useState<FollowupFilterKey[]>([])
  const [editingHeaderField, setEditingHeaderField] = useState<'name' | 'source' | null>(null)
  const [isHeaderFieldSaving, setIsHeaderFieldSaving] = useState(false)
  const [isContactEditMode, setIsContactEditMode] = useState(false)
  const [isContactSaving, setIsContactSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [temperature, setTemperature] = useState<LeadTemperature | null>(null)
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSource, setContactSource] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactTemperature, setContactTemperature] = useState<LeadTemperature | null>(null)

  const [isContextEditMode, setIsContextEditMode] = useState(false)
  const [isContextSaving, setIsContextSaving] = useState(false)
  const [editingContext, setEditingContext] = useState('')

  const [notes, setNotes] = useState('')
  const [isNotesDirty, setIsNotesDirty] = useState(false)
  const [isNotesSaving, setIsNotesSaving] = useState(false)
  const [notesCountdown, setNotesCountdown] = useState(5)

  const [followups, setFollowups] = useState<LeadFollowUp[]>([])
  const [isFollowupsLoading, setIsFollowupsLoading] = useState(false)
  const [isCreateFollowupOpen, setIsCreateFollowupOpen] = useState(false)
  const [newFollowupValue, setNewFollowupValue] = useState('')
  const [newFollowupDate, setNewFollowupDate] = useState('')

  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null)
  const [editingFollowupValue, setEditingFollowupValue] = useState('')
  const [editingFollowupDate, setEditingFollowupDate] = useState('')

  const [followupToDeleteId, setFollowupToDeleteId] = useState<string | null>(null)
  const [isDeletingFollowup, setIsDeletingFollowup] = useState(false)

  const skipNextNotesAutosaveRef = useRef(true)
  const createFollowupInputRef = useRef<HTMLInputElement | null>(null)
  const moveColumnMenuRef = useRef<HTMLDivElement | null>(null)
  const temperatureMenuRef = useRef<HTMLDivElement | null>(null)
  const sourceMenuRef = useRef<HTMLDivElement | null>(null)
  const followupFiltersRef = useRef<HTMLDivElement | null>(null)
  const followupFiltersMenuRef = useRef<HTMLDivElement | null>(null)
  const [followupFiltersMenuPos, setFollowupFiltersMenuPos] = useState<{ top: number; right: number } | null>(null)

  const syncFormWithLead = useCallback((lead: Lead | null) => {
    setName(lead?.name ?? '')
    setPhone(lead?.phone ?? '')
    setEmail(lead?.email ?? '')
    setSource(lead?.source ?? '')
    setTemperature(lead?.temperature ?? null)
    setContactPhone(lead?.phone ?? '')
    setContactEmail(lead?.email ?? '')
    setContactSource(lead?.source ?? '')
    setContactName(lead?.name ?? '')
    setContactTemperature(lead?.temperature ?? null)
    setEditingContext(lead?.initialContext ?? '')
    setNotes(getLeadNotes(lead))
    setIsNotesDirty(false)
    skipNextNotesAutosaveRef.current = true
  }, [])

  const resetFollowupForms = useCallback(() => {
    setIsCreateFollowupOpen(false)
    setNewFollowupValue('')
    setNewFollowupDate('')
    setEditingFollowupId(null)
    setEditingFollowupValue('')
    setEditingFollowupDate('')
    setFollowupToDeleteId(null)
    setIsDeletingFollowup(false)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedLeadId(null)
    setSelectedLead(null)
    setOpenCreateFollowupOnLeadOpen(false)
    setError(null)
    setLoading(false)
    setViewMode('details')
    setIsEditModeActive(false)
    setIsSaving(false)
    setIsNotesSaving(false)
    setIsHeaderFieldSaving(false)
    setIsContactSaving(false)
    setEditingHeaderField(null)
    setIsContactEditMode(false)
    setIsContextEditMode(false)
    setIsContextSaving(false)
    setEditingContext('')
    setIsDeleteConfirmOpen(false)
    setIsDeleting(false)
    setIsArchiveConfirmOpen(false)
    setIsArchiving(false)
    setIsMoveColumnMenuOpen(false)
    setIsTemperatureMenuOpen(false)
    setIsTemperatureMenuOpenUpward(false)
    setIsSourceMenuOpen(false)
    setIsSourceMenuOpenUpward(false)
    setIsFollowupFiltersOpen(false)
    setSelectedFollowupFilters([])
    setFollowups([])
    setIsFollowupsLoading(false)
    resetFollowupForms()
    syncFormWithLead(null)
  }, [
    setSelectedLeadId,
    setSelectedLead,
    setOpenCreateFollowupOnLeadOpen,
    setError,
    setLoading,
    syncFormWithLead,
    resetFollowupForms
  ])

  const fetchLead = useCallback(async () => {
    if (!selectedLeadId) return

    try {
      setLoading(true)
      setError(null)
      setIsFollowupsLoading(true)

      const [leadRes, followRes] = await Promise.all([
        api.get<Lead>(`/leads/${selectedLeadId}`),
        api.get<LeadFollowUp[]>(`/leads/${selectedLeadId}/followups`)
      ])

      setSelectedLead(leadRes.data)
      syncFormWithLead(leadRes.data)
      setFollowups([...followRes.data].sort(sortFollowups))
      resetFollowupForms()

      if (openCreateFollowupOnLeadOpen) {
        setViewMode('followups')
        setIsCreateFollowupOpen(true)
      } else {
        setViewMode('details')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao carregar lead'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setLoading(false)
      setIsFollowupsLoading(false)
    }
  }, [
    selectedLeadId,
    setSelectedLead,
    setLoading,
    setError,
    syncFormWithLead,
    resetFollowupForms,
    openCreateFollowupOnLeadOpen
  ])

  useEffect(() => {
    if (selectedLeadId) {
      void fetchLead()
    }
  }, [selectedLeadId, fetchLead])

  useEffect(() => {
    if (!selectedLeadId) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isSaving || isNotesSaving || isDeleting || isDeletingFollowup || isArchiving) return

      if (followupToDeleteId) {
        setFollowupToDeleteId(null)
        return
      }

      if (isDeleteConfirmOpen) {
        setIsDeleteConfirmOpen(false)
        return
      }

      if (isArchiveConfirmOpen) {
        setIsArchiveConfirmOpen(false)
        return
      }

      if (isMoveColumnMenuOpen) {
        setIsMoveColumnMenuOpen(false)
        return
      }

      if (isTemperatureMenuOpen) {
        setIsTemperatureMenuOpen(false)
        return
      }

      if (isSourceMenuOpen) {
        setIsSourceMenuOpen(false)
        return
      }

      if (isFollowupFiltersOpen) {
        setIsFollowupFiltersOpen(false)
        return
      }

      closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    selectedLeadId,
    closeModal,
    isSaving,
    isNotesSaving,
    isDeleting,
    isArchiving,
    isDeleteConfirmOpen,
    isArchiveConfirmOpen,
    followupToDeleteId,
    isDeletingFollowup,
    isMoveColumnMenuOpen,
    isTemperatureMenuOpen,
    isSourceMenuOpen,
    isFollowupFiltersOpen
  ])

  useEffect(() => {
    if (!isMoveColumnMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!moveColumnMenuRef.current?.contains(target)) {
        setIsMoveColumnMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMoveColumnMenuOpen])

  useEffect(() => {
    if (!isTemperatureMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!temperatureMenuRef.current?.contains(target)) {
        setIsTemperatureMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTemperatureMenuOpen])

  useEffect(() => {
    if (!isSourceMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!sourceMenuRef.current?.contains(target)) {
        setIsSourceMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSourceMenuOpen])

  useEffect(() => {
    if (!isFollowupFiltersOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!followupFiltersRef.current?.contains(target) && !followupFiltersMenuRef.current?.contains(target)) {
        setIsFollowupFiltersOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFollowupFiltersOpen])

  useEffect(() => {
    if (!isCreateFollowupOpen) return
    if (viewMode !== 'followups') return
    if (isLoading || isFollowupsLoading) return

    const frame = window.requestAnimationFrame(() => {
      createFollowupInputRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [isCreateFollowupOpen, viewMode, isLoading, isFollowupsLoading])

  const handleStartEdit = () => {
    syncFormWithLead(selectedLead)
    setError(null)
    setIsDeleteConfirmOpen(false)
    setViewMode('details')
    setIsEditModeActive(false)
  }

  const handleBackToNotes = () => {
    setError(null)
    syncFormWithLead(selectedLead)
    setIsDeleteConfirmOpen(false)
    setViewMode('notes')
  }

  const handleBackToFollowups = () => {
    setError(null)
    setIsDeleteConfirmOpen(false)
    setViewMode('followups')
  }

  const handleCancelEdit = () => {
    syncFormWithLead(selectedLead)
    setError(null)
    setIsEditModeActive(false)
  }

  const applyLeadUpdate = useCallback(
    (updated: Lead) => {
      setSelectedLead(updated)
      setName(updated.name ?? '')
      setPhone(updated.phone ?? '')
      setEmail(updated.email ?? '')
      setSource(updated.source ?? '')
      setTemperature(updated.temperature ?? null)
      setContactPhone(updated.phone ?? '')
      setContactEmail(updated.email ?? '')
      setContactSource(updated.source ?? '')
      setContactName(updated.name ?? '')
      setContactTemperature(updated.temperature ?? null)
    },
    [setSelectedLead]
  )

  const updateLeadTemperature = useCallback(
    async (nextTemperature: LeadTemperature | null) => {
      if (!selectedLead) return

      if (selectedLead.temperature === nextTemperature) {
        setIsTemperatureMenuOpen(false)
        return
      }

      try {
        setIsContactSaving(true)
        setError(null)

        const payload: UpdateLeadPayload = {
          temperature: nextTemperature
        }

        const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
        applyLeadUpdate(res.data)
        await onRefreshBoard()
        toastSuccess(TOAST_MESSAGES.success.editLead)
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : 'Erro ao atualizar temperatura'
        setError(String(msg))
        toastErrorFromException(e, TOAST_MESSAGES.error.saveLead)
      } finally {
        setIsContactSaving(false)
        setIsTemperatureMenuOpen(false)
      }
    },
    [selectedLead, setError, applyLeadUpdate, onRefreshBoard]
  )

  const saveHeaderField = useCallback(
    async (field: 'name' | 'source') => {
      if (!selectedLead) {
        setEditingHeaderField(null)
        return
      }

      const nextName = name.trim()
      const nextSource = normalizeOptionalString(contactSource)
      const currentName = selectedLead.name ?? ''
      const currentSource = selectedLead.source ?? undefined

      const changed =
        field === 'name'
          ? nextName !== currentName
          : (nextSource ?? undefined) !== currentSource

      if (!changed) {
        setEditingHeaderField(null)
        return
      }

      try {
        setIsHeaderFieldSaving(true)
        setError(null)

        const payload: UpdateLeadPayload =
          field === 'name' ? { name: nextName } : { source: nextSource }

        const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
        applyLeadUpdate(res.data)
        await onRefreshBoard()
        toastSuccess(TOAST_MESSAGES.success.editLead)
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : 'Erro ao atualizar lead'
        setError(String(msg))
        toastErrorFromException(e, TOAST_MESSAGES.error.saveLead)
        setName(selectedLead.name ?? '')
        setSource(selectedLead.source ?? '')
        setContactSource(selectedLead.source ?? '')
      } finally {
        setIsHeaderFieldSaving(false)
        setEditingHeaderField(null)
      }
    },
    [selectedLead, name, contactSource, setError, applyLeadUpdate, onRefreshBoard]
  )

  const startContactEdit = () => {
    setContactPhone(phone)
    setContactEmail(email)
    setContactSource(source)
    setContactName(name)
    setContactTemperature(temperature)
    setIsSourceMenuOpen(false)
    setIsContactEditMode(true)
  }

  const cancelContactEdit = () => {
    setContactPhone(phone)
    setContactEmail(email)
    setContactSource(source)
    setContactName(name)
    setContactTemperature(temperature)
    setIsSourceMenuOpen(false)
    setIsContactEditMode(false)
  }

  const saveContactEdit = useCallback(async () => {
    if (!selectedLead) return

    try {
      setIsContactSaving(true)
      setError(null)

      const payload: UpdateLeadPayload = {
        name: contactName.trim() || selectedLead.name,
        phone: contactPhone.trim(),
        email: normalizeOptionalString(contactEmail),
        source: normalizeOptionalString(contactSource),
        temperature: contactTemperature
      }

      const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
      applyLeadUpdate(res.data)
      await onRefreshBoard()
      setIsSourceMenuOpen(false)
      setIsContactEditMode(false)
      toastSuccess(TOAST_MESSAGES.success.editLead)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar contato'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.saveLead)
    } finally {
      setIsContactSaving(false)
    }
  }, [selectedLead, contactName, contactPhone, contactEmail, contactSource, contactTemperature, setError, applyLeadUpdate, onRefreshBoard])

  const startContextEdit = () => {
    setEditingContext(selectedLead?.initialContext ?? '')
    setIsContextEditMode(true)
  }

  const cancelContextEdit = () => {
    setEditingContext(selectedLead?.initialContext ?? '')
    setIsContextEditMode(false)
  }

  const saveContextEdit = useCallback(async () => {
    if (!selectedLead) return

    try {
      setIsContextSaving(true)
      setError(null)

      const payload: UpdateLeadPayload = {
        initialContext: normalizeOptionalString(editingContext)
      }

      const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
      applyLeadUpdate(res.data)
      await onRefreshBoard()
      setIsContextEditMode(false)
      toastSuccess(TOAST_MESSAGES.success.editLead)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar contexto'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.saveLead)
    } finally {
      setIsContextSaving(false)
    }
  }, [selectedLead, editingContext, setError, applyLeadUpdate, onRefreshBoard])

  const updateFavoriteLocally = useCallback(
    (nextValue: boolean) => {
      setSelectedLead((prev) => (prev ? { ...prev, isFavorite: nextValue } : prev))

      setBoardData((current) => {
        if (!current) return current

        return {
          ...current,
          columns: current.columns.map((column) => ({
            ...column,
            leads: column.leads.map((item) =>
              item.id === selectedLeadId ? { ...item, isFavorite: nextValue } : item
            )
          }))
        }
      })
    },
    [selectedLeadId, setBoardData, setSelectedLead]
  )

  const toggleFavoriteFromModal = useCallback(async () => {
    if (!selectedLead || isFavoriteUpdating) return

    const previousValue = Boolean(selectedLead.isFavorite)
    const nextValue = !previousValue

    setIsFavoriteUpdating(true)
    updateFavoriteLocally(nextValue)

    try {
      await api.patch(`/leads/${selectedLead.id}/favorite`, { isFavorite: nextValue })
      if (nextValue) {
        toastSuccess(TOAST_MESSAGES.success.favoriteLead)
      }
    } catch (e: any) {
      updateFavoriteLocally(previousValue)
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsFavoriteUpdating(false)
    }
  }, [selectedLead, isFavoriteUpdating, updateFavoriteLocally])

  const moveLeadFromModal = useCallback(
    async (nextColumnId: string) => {
      if (!selectedLead || !boardData) return
      if (!nextColumnId || nextColumnId === selectedLead.columnId) return

      try {
        setIsColumnChanging(true)
        setError(null)

        const targetColumn = boardData.columns.find((column) => column.id === nextColumnId)
        const toPosition = targetColumn?.leads.length ?? 0

        await api.patch(`/leads/${selectedLead.id}/move`, {
          boardId: selectedLead.boardId,
          toColumnId: nextColumnId,
          toPosition
        })

        setSelectedLead((prev) =>
          prev
            ? {
                ...prev,
                columnId: nextColumnId,
                movedAt: new Date().toISOString()
              }
            : prev
        )

        await onRefreshBoard()
        toastSuccess(getMoveLeadColumnToastMessage(targetColumn?.name))
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ?? e?.message ?? 'Erro ao mover lead de coluna'
        setError(String(msg))
        toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
      } finally {
        setIsColumnChanging(false)
      }
    },
    [selectedLead, boardData, setError, setSelectedLead, onRefreshBoard]
  )

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
        temperature,
        notes
      }

      const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
      setSelectedLead(res.data)
      syncFormWithLead(res.data)
      await onRefreshBoard()
      setIsEditModeActive(false)
      toastSuccess(TOAST_MESSAGES.success.editLead)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar lead'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.saveLead)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLead = async () => {
    if (!selectedLead) return

    try {
      setIsDeleting(true)
      setError(null)

      await api.delete(`/leads/${selectedLead.id}`)
      await onRefreshBoard()
      setIsDeleteConfirmOpen(false)
      toastSuccess(TOAST_MESSAGES.success.deleteItem)
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir lead'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchiveLead = async () => {
    if (!selectedLead) return

    try {
      setIsArchiving(true)
      setError(null)

      await api.patch(`/leads/${selectedLead.id}/archive`, { state: 'archived' })
      await onRefreshBoard()
      setIsArchiveConfirmOpen(false)
      toastSuccess(TOAST_MESSAGES.success.archiveLead)
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao arquivar lead'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsArchiving(false)
    }
  }

  const createFollowup = async () => {
    if (!selectedLead || !newFollowupValue.trim() || !newFollowupDate) return

    try {
      setError(null)

      const payload = {
        leadId: selectedLead.id,
        value: newFollowupValue.trim(),
        dueAt: newFollowupDate
      }

      const res = await api.post<LeadFollowUp>('/lead-followups', payload)

      setFollowups((prev) =>
        [...prev, res.data].sort(sortFollowups)
      )

      setIsCreateFollowupOpen(false)
      setNewFollowupValue('')
      setNewFollowupDate('')
      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.createFollowup)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar follow-up'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.createFollowup)
    }
  }

  const startInlineEditFollowup = (followup: LeadFollowUp) => {
    setEditingFollowupId(followup.id)
    setEditingFollowupValue(followup.value)
    setEditingFollowupDate(toDatetimeLocalValue(followup.dueAt))
  }

  const cancelInlineEditFollowup = () => {
    setEditingFollowupId(null)
    setEditingFollowupValue('')
    setEditingFollowupDate('')
  }

  const updateInlineFollowup = async (id: string) => {
    if (!editingFollowupValue.trim() || !editingFollowupDate) return

    try {
      setError(null)

      const payload = {
        value: editingFollowupValue.trim(),
        dueAt: editingFollowupDate
      }

      const res = await api.patch<LeadFollowUp>(`/lead-followups/${id}`, payload)

      setFollowups((prev) =>
        prev
          .map((f) => (f.id === id ? res.data : f))
          .sort(sortFollowups)
      )

      cancelInlineEditFollowup()
      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.editFollowup)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar follow-up'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.updateFollowup)
    }
  }

  const openDeleteFollowupConfirm = (id: string) => {
    setFollowupToDeleteId(id)
  }

  const deleteFollowup = async () => {
    if (!followupToDeleteId) return

    try {
      setError(null)
      setIsDeletingFollowup(true)

      await api.delete(`/lead-followups/${followupToDeleteId}`)

      setFollowups((prev) => prev.filter((f) => f.id !== followupToDeleteId))

      if (editingFollowupId === followupToDeleteId) {
        cancelInlineEditFollowup()
      }

      setFollowupToDeleteId(null)
      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.deleteItem)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Erro ao excluir follow-up'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsDeletingFollowup(false)
    }
  }

  const completeFollowup = async (id: string) => {
    try {
      setError(null)

      const res = await api.patch<LeadFollowUp>(`/lead-followups/${id}/complete`)

      setFollowups((prev) =>
        prev
          .map((f) => (f.id === id ? res.data : f))
          .sort(sortFollowups)
      )

      if (editingFollowupId === id) {
        cancelInlineEditFollowup()
      }

      await onRefreshBoard()
      toastSuccess(TOAST_MESSAGES.success.completeFollowup)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Erro ao atualizar status do follow-up'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.updateFollowupStatus)
    }
  }

  const uncompleteFollowup = async (id: string) => {
    try {
      setError(null)

      const res = await api.patch<LeadFollowUp>(`/lead-followups/${id}`, { status: 'pending' })

      setFollowups((prev) =>
        prev
          .map((f) => (f.id === id ? res.data : f))
          .sort(sortFollowups)
      )

      if (editingFollowupId === id) {
        cancelInlineEditFollowup()
      }

      await onRefreshBoard()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Erro ao atualizar status do follow-up'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.updateFollowupStatus)
    }
  }

  useEffect(() => {
    if (!selectedLead || !selectedLeadId || isDeleteConfirmOpen) return

    if (skipNextNotesAutosaveRef.current) {
      skipNextNotesAutosaveRef.current = false
      return
    }

    const currentNotes = getLeadNotes(selectedLead)

    if (notes === currentNotes) {
      setIsNotesDirty(false)
      return
    }

    setIsNotesDirty(true)
    setNotesCountdown(5)

    const countdownInterval = window.setInterval(() => {
      setNotesCountdown((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setIsNotesSaving(true)
          setError(null)

          const payload: UpdateLeadPayload = {
            notes
          }

          const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)

          setSelectedLead(res.data)
          setIsNotesDirty(false)
          setNotesCountdown(5)

          skipNextNotesAutosaveRef.current = true
          setNotes(getLeadNotes(res.data))
          toastSuccess(TOAST_MESSAGES.success.saveNotes)
        } catch (e: any) {
          const msg = e instanceof Error ? e.message : 'Erro ao salvar notas'
          setError(String(msg))
          toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
        } finally {
          setIsNotesSaving(false)
        }
      })()
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearInterval(countdownInterval)
    }
  }, [notes, selectedLead, selectedLeadId, isDeleteConfirmOpen, setSelectedLead, setError])

  if (!selectedLeadId) return null

  const notesBorderVariant = isNotesDirty ? 'dirty' : 'saved'
  const followupFilterOptions = [
    { key: 'overdue' as const, label: 'Atrasados' },
    { key: 'today' as const, label: 'Hoje' },
    { key: 'scheduled' as const, label: 'Agendados' },
    { key: 'done' as const, label: 'Concluídos' }
  ]
  const followupFiltersSet = new Set(selectedFollowupFilters)
  const filteredFollowups = followups.filter((f) => {
    if (followupFiltersSet.size === 0) return true
    const visualStatus = getSingleFollowUpVisualStatus(f)
    const filterKey: FollowupFilterKey =
      visualStatus === 'done' ? 'done' : visualStatus === 'none' ? 'scheduled' : visualStatus
    return followupFiltersSet.has(filterKey)
  })
  const visibleFollowups = editingFollowupId
    ? followups.filter((f) => f.id === editingFollowupId)
    : filteredFollowups
  const nextFollowup = followups[0] ?? null
  const nextFollowupStatus = nextFollowup
    ? getSingleFollowUpVisualStatus(nextFollowup)
    : undefined
  const contactSourceBadge = getLeadSourceBadge(contactSource)
  const contactTemperatureBadge = getLeadTemperatureBadge(contactTemperature)
  const currentColumnName = boardData?.columns.find(
    (column) => column.id === selectedLead?.columnId
  )?.name

  return (
    <>
      <ModalOverlay
        onClick={() => {
          if (
            !isSaving &&
            !isNotesSaving &&
            !isDeleting &&
            !isDeletingFollowup &&
            !followupToDeleteId
          ) {
            closeModal()
          }
        }}
      >
        <ModalCard
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <ModalHeader>
            <ModalTitleArea>
              {editingHeaderField === 'name' ? (
                <ModalHeaderEditInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    void saveHeaderField('name')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void saveHeaderField('name')
                    }

                    if (event.key === 'Escape') {
                      setName(selectedLead?.name ?? '')
                      setEditingHeaderField(null)
                    }
                  }}
                  autoFocus
                  disabled={isHeaderFieldSaving}
                  aria-label="Editar nome do lead"
                />
              ) : (
                <MoveColumnMenuWrapper ref={moveColumnMenuRef}>
                  <ModalTitleInlineRow>
                    <ModalTitleClickable
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingHeaderField('name')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setEditingHeaderField('name')
                        }
                      }}
                    >
                      {getLeadFirstName(selectedLead?.name) || 'Detalhes do lead'}
                    </ModalTitleClickable>

                    {selectedLead ? (
                      <>
                        <ModalTitleSeparator>|</ModalTitleSeparator>
                        {selectedLead.state === 'archived' ? (
                          <ModalTitleColumnName>Arquivado</ModalTitleColumnName>
                        ) : (
                          <>
                            <ModalTitleColumnName>{currentColumnName ?? 'Sem coluna'}</ModalTitleColumnName>
                            <ModalTitleColumnToggle
                              type="button"
                              onClick={() => {
                                setIsMoveColumnMenuOpen((prev) => !prev)
                              }}
                              aria-label="Abrir opções de coluna"
                              title="Mover de coluna"
                              disabled={
                                isSaving ||
                                isNotesSaving ||
                                isDeleting ||
                                isDeletingFollowup ||
                                isColumnChanging
                              }
                            >
                              <ArrowRight size={14} />
                            </ModalTitleColumnToggle>
                          </>
                        )}
                      </>
                    ) : null}
                  </ModalTitleInlineRow>

                  {isMoveColumnMenuOpen && selectedLead && selectedLead.state !== 'archived' ? (
                    <MoveColumnDropdown>
                      <MoveColumnLabel>Mover para</MoveColumnLabel>
                      <MoveColumnOptions>
                        {(boardData?.columns ?? []).map((column) => (
                          <MoveColumnOptionButton
                            key={column.id}
                            type="button"
                            $active={column.id === selectedLead.columnId}
                            onClick={() => {
                              void moveLeadFromModal(column.id)
                              setIsMoveColumnMenuOpen(false)
                            }}
                            disabled={isColumnChanging}
                          >
                            {column.name}
                          </MoveColumnOptionButton>
                        ))}
                      </MoveColumnOptions>
                    </MoveColumnDropdown>
                  ) : null}
                </MoveColumnMenuWrapper>
              )}
            </ModalTitleArea>
            <ModalHeaderRightArea>
              <HeaderIconButtons>
                <SettingsCloseIconButton
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(true)
                    setError(null)
                  }}
                  aria-label="Excluir lead"
                  title="Excluir lead"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isArchiving ||
                    isDeletingFollowup
                  }
                >
                  <Trash2 size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $hideOnNarrowMobile
                  onClick={() => {
                    setIsArchiveConfirmOpen(true)
                    setError(null)
                  }}
                  aria-label="Arquivar lead"
                  title="Arquivar lead"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isArchiving ||
                    isDeletingFollowup
                  }
                >
                  <Archive size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $active={viewMode === 'notes'}
                  onClick={handleBackToNotes}
                  aria-label="Notas"
                  title="Notas"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isArchiving ||
                    isDeletingFollowup ||
                    viewMode === 'notes'
                  }
                >
                  <MessageSquare size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $active={viewMode === 'followups'}
                  onClick={handleBackToFollowups}
                  aria-label="Follow-ups"
                  title="Follow-ups"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isArchiving ||
                    isDeletingFollowup ||
                    viewMode === 'followups'
                  }
                >
                  <Calendar size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $active={viewMode === 'details'}
                  onClick={handleStartEdit}
                  aria-label="Editar lead"
                  title="Editar"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isArchiving ||
                    isDeletingFollowup ||
                    isFavoriteUpdating
                  }
                >
                  <FileText size={18} />
                </SettingsCloseIconButton>

                <ModalFavoriteIconButton
                  type="button"
                  $active={Boolean(selectedLead?.isFavorite)}
                  onClick={() => {
                    void toggleFavoriteFromModal()
                  }}
                  aria-label={
                    selectedLead?.isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'
                  }
                  title={selectedLead?.isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isArchiving ||
                    isDeletingFollowup ||
                    isFavoriteUpdating
                  }
                >
                  <Star size={18} strokeWidth={2.2} />
                </ModalFavoriteIconButton>

                <SettingsCloseIconButton
                  type="button"
                  onClick={closeModal}
                  aria-label="Fechar modal do lead"
                  title="Fechar"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isDeletingFollowup ||
                    isFavoriteUpdating
                  }
                >
                  <X size={18} />
                </SettingsCloseIconButton>
              </HeaderIconButtons>
            </ModalHeaderRightArea>
          </ModalHeader>

          {isLoading ? (
            <ModalLoading>Carregando lead...</ModalLoading>
          ) : selectedLead ? (
            <>
              {viewMode === 'followups' ? (
                <>
                  <CommentHeaderRow>
                    <SectionTitleNoMargin>Follow-ups</SectionTitleNoMargin>

                    <FiltersDropdownWrapper ref={followupFiltersRef}>
                      <FollowupFiltersTrigger
                        type="button"
                        onClick={() => {
                          if (!isFollowupFiltersOpen) {
                            const rect = followupFiltersRef.current?.getBoundingClientRect()
                            if (rect) {
                              setFollowupFiltersMenuPos({
                                top: rect.bottom + 8,
                                right: window.innerWidth - rect.right
                              })
                            }
                          }
                          setIsFollowupFiltersOpen((prev) => !prev)
                        }}
                        aria-label="Filtros de follow-ups"
                        title="Filtros"
                      >
                        Filtros
                        {selectedFollowupFilters.length > 0
                          ? ` (${selectedFollowupFilters.length})`
                          : ''}{' '}
                        ▾
                      </FollowupFiltersTrigger>

                      {isFollowupFiltersOpen && followupFiltersMenuPos
                        ? createPortal(
                            <FiltersDropdownMenu
                              ref={followupFiltersMenuRef}
                              style={{
                                position: 'fixed',
                                top: followupFiltersMenuPos.top,
                                right: followupFiltersMenuPos.right
                              }}
                            >
                              {followupFilterOptions.map((option) => {
                                const isSelected = selectedFollowupFilters.includes(option.key)

                                return (
                                  <FiltersDropdownOption
                                    key={option.key}
                                    type="button"
                                    onClick={() => {
                                      setSelectedFollowupFilters((prev) =>
                                        prev.includes(option.key)
                                          ? prev.filter((key) => key !== option.key)
                                          : [...prev, option.key]
                                      )
                                    }}
                                  >
                                    <FiltersOptionLabel>{option.label}</FiltersOptionLabel>
                                    {isSelected ? <Check size={14} /> : <FiltersCheckPlaceholder />}
                                  </FiltersDropdownOption>
                                )
                              })}
                            </FiltersDropdownMenu>,
                            document.body
                          )
                        : null}
                    </FiltersDropdownWrapper>
                  </CommentHeaderRow>

                  <FollowUpList>
                    {isFollowupsLoading ? (
                      <ModalLoading>Carregando follow-ups...</ModalLoading>
                    ) : visibleFollowups.length === 0 ? null : (
                      visibleFollowups.map((f) =>
                      editingFollowupId === f.id ? (
                        <FollowUpListItem
                          key={f.id}
                          $status={getSingleFollowUpVisualStatus(f)}
                        >
                          <FollowUpCreateRow>
                            <FollowUpTextInput
                              value={editingFollowupValue}
                              onChange={(e) =>
                                setEditingFollowupValue(e.target.value)
                              }
                              placeholder="Ex: Ligar para cliente"
                            />

                            <FollowUpDateInput
                              type="datetime-local"
                              value={editingFollowupDate}
                              onChange={(e) =>
                                setEditingFollowupDate(e.target.value)
                              }
                            />

                            <FollowUpInlineCancelButton
                              type="button"
                              onClick={cancelInlineEditFollowup}
                              aria-label="Cancelar edição"
                              title="Cancelar edição"
                            >
                              <X size={18} />
                            </FollowUpInlineCancelButton>

                            <FollowUpInlineCreateIconButton
                              type="button"
                              onClick={() => {
                                void updateInlineFollowup(f.id)
                              }}
                              disabled={
                                !editingFollowupValue.trim() || !editingFollowupDate
                              }
                              aria-label="Salvar edição"
                              title="Salvar edição"
                            >
                              <ArrowRight size={18} />
                            </FollowUpInlineCreateIconButton>
                          </FollowUpCreateRow>
                        </FollowUpListItem>
                      ) : (
                        <FollowUpListItem
                          key={f.id}
                          $status={getSingleFollowUpVisualStatus(f)}
                        >
                          <FollowUpListItemTop>
  <FollowUpItemMainLine>
    <FollowUpItemTitle
      type="button"
      title={f.value}
      aria-label={f.value}
      data-tooltip={f.value}
    >
      {f.value}
    </FollowUpItemTitle>
    {(() => {
      const visualStatus = getSingleFollowUpVisualStatus(f)

      return (
        <FollowUpItemMetaLine>
          <FollowUpItemStatus $status={visualStatus}>
            {getFollowUpStatusLabel(visualStatus)}
          </FollowUpItemStatus>
          <FollowUpItemDate>{formatFollowUpDateTimeExact(f.dueAt)}</FollowUpItemDate>
        </FollowUpItemMetaLine>
      )
    })()}
  </FollowUpItemMainLine>

  <FollowUpItemActions>
    <FollowUpActionIconButton
      type="button"
      onClick={() => startInlineEditFollowup(f)}
      aria-label="Editar follow-up"
      title="Editar"
    >
      <Pencil size={16} />
    </FollowUpActionIconButton>

    <FollowUpActionIconButton
      type="button"
      onClick={() => openDeleteFollowupConfirm(f.id)}
      aria-label="Excluir follow-up"
      title="Excluir"
    >
      <Trash2 size={16} />
    </FollowUpActionIconButton>

    <FollowUpActionIconButton
      type="button"
      onClick={() => {
        void (f.completedAt ? uncompleteFollowup(f.id) : completeFollowup(f.id))
      }}
      aria-label={f.completedAt ? 'Desmarcar como completo' : 'Marcar como completo'}
      title={f.completedAt ? 'Desmarcar' : 'Concluir'}
    >
      {f.completedAt ? <X size={16} /> : <Check size={16} />}
    </FollowUpActionIconButton>
  </FollowUpItemActions>
</FollowUpListItemTop>
                        
                        {/* title already shown on the first line */}

                        </FollowUpListItem>
                        )
                      )
                    )}

                    <FollowUpCreateFooter>
                      {!isCreateFollowupOpen && !editingFollowupId ? (
                        <AddLeadButton
                          type="button"
                          onClick={() => {
                            setIsCreateFollowupOpen(true)
                          }}
                          aria-label="Adicionar follow-up"
                          title="Adicionar follow-up"
                        >
                          <Plus size={16} />
                          <span>Adicionar follow-up</span>
                        </AddLeadButton>
                      ) : isCreateFollowupOpen ? (
                        <FollowUpListItem $isCreateRow>
                          <FollowUpCreateHeader>
                            <InfoLabel>Novo follow-up</InfoLabel>
                          </FollowUpCreateHeader>

                          <FollowUpCreateRow>
                            <FollowUpTextInput
                              ref={createFollowupInputRef}
                              placeholder=""
                              value={newFollowupValue}
                              onChange={(e) => setNewFollowupValue(e.target.value)}
                            />

                            <FollowUpDateInput
                              type="datetime-local"
                              placeholder=""
                              value={newFollowupDate}
                              onChange={(e) => setNewFollowupDate(e.target.value)}
                            />

                            <FollowUpInlineCancelButton
                              type="button"
                              onClick={() => {
                                setIsCreateFollowupOpen(false)
                                setNewFollowupValue('')
                                setNewFollowupDate('')
                              }}
                              aria-label="Cancelar criação de follow-up"
                              title="Cancelar"
                            >
                              <X size={18} />
                            </FollowUpInlineCancelButton>

                            <FollowUpInlineCreateIconButton
                              type="button"
                              onClick={() => {
                                void createFollowup()
                              }}
                              disabled={!newFollowupValue.trim() || !newFollowupDate}
                              aria-label="Criar follow-up"
                              title="Criar follow-up"
                            >
                              <ArrowRight size={18} />
                            </FollowUpInlineCreateIconButton>
                          </FollowUpCreateRow>
                        </FollowUpListItem>
                      ) : null}
                    </FollowUpCreateFooter>
                  </FollowUpList>
                </>
              ) : null}

              {viewMode === 'notes' ? (
                <>
                  <CommentHeaderRow>
                    <SectionTitleNoMargin>Notas</SectionTitleNoMargin>

                    <CommentStatusGroup>
                      <CommentStatusDot
                        $variant={isNotesDirty ? 'dirty' : 'saved'}
                      />

                      <CommentMetaText>
                        {isNotesSaving
                          ? 'Salvando...'
                          : isNotesDirty
                            ? `Editando (${notesCountdown})`
                            : 'Salvo'}
                      </CommentMetaText>
                    </CommentStatusGroup>
                  </CommentHeaderRow>

                  <CommentBox
                    $variant={notesBorderVariant}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                    }}
                    placeholder="Escreva notas sobre este lead..."
                  />
                </>
              ) : null}

              {viewMode === 'details' ? (
                <>
                  <LeadTabSectionTitle>Dados do lead</LeadTabSectionTitle>

                  {!isEditModeActive ? (
                    <InfoList>
                      <InfoRow>
                        <LeadInfoBlockLabel>⚡ Próxima ação</LeadInfoBlockLabel>
                        {nextFollowup ? (
                          <LeadNextActionCard
                            type="button"
                            $status={nextFollowupStatus}
                            onClick={() => setViewMode('followups')}
                            aria-label="Ir para aba de follow-ups"
                            title="Abrir follow-ups"
                          >
                            {(() => {
                              const actionStatus = nextFollowupStatus ?? 'scheduled'

                              return (
                                <LeadNextActionLine>
                                  <FollowUpItemStatus $status={actionStatus}>
                                    {getFollowUpStatusLabel(actionStatus)}
                                  </FollowUpItemStatus>
                                  <LeadNextActionDate>
                                    {formatFollowUpDateTimeExact(nextFollowup.dueAt)}
                                  </LeadNextActionDate>
                                  <LeadNextActionDot />
                                  <LeadNextActionTitle>{nextFollowup.value}</LeadNextActionTitle>
                                </LeadNextActionLine>
                              )
                            })()}
                          </LeadNextActionCard>
                        ) : (
                          <AddLeadButton
                            type="button"
                            onClick={() => {
                              setViewMode('followups')
                              setIsCreateFollowupOpen(true)
                              setEditingFollowupId(null)
                              setNewFollowupValue('')
                              setNewFollowupDate('')
                            }}
                            aria-label="Adicionar follow-up"
                            title="Adicionar follow-up"
                          >
                            <Plus size={16} />
                            <span>Adicionar follow-up</span>
                          </AddLeadButton>
                        )}
                      </InfoRow>

                      <InfoRow>
                        <LeadInfoRowHeader>
                          <LeadInfoBlockLabel>💬 Contexto inicial</LeadInfoBlockLabel>
                          {!isContextEditMode ? (
                            <LeadInfoActionButton
                              type="button"
                              onClick={startContextEdit}
                              aria-label="Editar contexto inicial"
                              title="Editar contexto"
                              disabled={isContextSaving}
                            >
                              <Pencil size={14} />
                            </LeadInfoActionButton>
                          ) : (
                            <LeadInfoActions>
                              <LeadInfoActionButton
                                type="button"
                                onClick={cancelContextEdit}
                                aria-label="Cancelar edição de contexto"
                                title="Cancelar"
                                disabled={isContextSaving}
                              >
                                <X size={14} />
                              </LeadInfoActionButton>
                              <LeadInfoActionButton
                                type="button"
                                onClick={() => {
                                  void saveContextEdit()
                                }}
                                aria-label="Salvar contexto"
                                title="Salvar"
                                disabled={isContextSaving}
                              >
                                <Check size={14} />
                              </LeadInfoActionButton>
                            </LeadInfoActions>
                          )}
                        </LeadInfoRowHeader>
                        {isContextEditMode ? (
                          <LeadContactInlineInput
                            value={editingContext}
                            onChange={(e) => setEditingContext(e.target.value)}
                            placeholder="Contexto inicial"
                          />
                        ) : (
                          <InfoValue>
                            {String(selectedLead.initialContext ?? '').trim() || 'Sem contexto inicial'}
                          </InfoValue>
                        )}
                      </InfoRow>

                      <InfoRow>
                        <LeadInfoRowHeader>
                          <LeadInfoBlockLabel>ℹ️ Informações</LeadInfoBlockLabel>
                          {!isContactEditMode ? (
                            <LeadInfoActionButton
                              type="button"
                              onClick={startContactEdit}
                              aria-label="Editar contatos"
                              title="Editar contatos"
                              disabled={isContactSaving}
                            >
                              <Pencil size={14} />
                            </LeadInfoActionButton>
                          ) : (
                            <LeadInfoActions>
                              <LeadInfoActionButton
                                type="button"
                                onClick={cancelContactEdit}
                                aria-label="Cancelar edição de contatos"
                                title="Cancelar"
                                disabled={isContactSaving}
                              >
                                <X size={14} />
                              </LeadInfoActionButton>
                              <LeadInfoActionButton
                                type="button"
                                onClick={() => {
                                  void saveContactEdit()
                                }}
                                aria-label="Salvar contatos"
                                title="Salvar"
                                disabled={isContactSaving}
                              >
                                <Check size={14} />
                              </LeadInfoActionButton>
                            </LeadInfoActions>
                          )}
                        </LeadInfoRowHeader>

                        <LeadContactLine>
                          <LeadContactKey>Nome completo:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadContactInlineInput
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              placeholder="Nome completo"
                            />
                          ) : (
                            <LeadContactValue>{selectedLead.name?.trim() || '—'}</LeadContactValue>
                          )}
                        </LeadContactLine>

                        <LeadContactLine>
                          <LeadContactKey>Telefone:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadContactInlineInput
                              value={contactPhone}
                              onChange={(e) => setContactPhone(e.target.value)}
                              placeholder="Telefone"
                            />
                          ) : (
                            <LeadContactValue>{formatPhone(contactPhone) || '—'}</LeadContactValue>
                          )}
                        </LeadContactLine>

                        <LeadContactLine>
                          <LeadContactKey>Email:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadContactInlineInput
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              placeholder="Email"
                            />
                          ) : (
                            <LeadContactValue>{contactEmail || '—'}</LeadContactValue>
                          )}
                        </LeadContactLine>

                        <LeadContactLine>
                          <LeadContactKey>Temperatura:</LeadContactKey>
                          <LeadTemperaturePickerWrapper ref={temperatureMenuRef}>
                            <LeadTemperaturePickerButton
                              type="button"
                              onClick={() => {
                                if (!isTemperatureMenuOpen) {
                                  setIsTemperatureMenuOpenUpward(
                                    shouldOpenDropdownUpward(temperatureMenuRef.current)
                                  )
                                }
                                setIsTemperatureMenuOpen((prev) => !prev)
                              }}
                              disabled={isContactSaving}
                            >
                              {contactTemperatureBadge ? (
                                <LeadTemperatureBadge $type={contactTemperatureBadge.type}>
                                  {contactTemperatureBadge.type === 'hot' ? <Flame size={10} strokeWidth={2.4} /> : null}
                                  {contactTemperatureBadge.type === 'warm' ? <Sun size={10} strokeWidth={2.4} /> : null}
                                  {contactTemperatureBadge.type === 'cold' ? <Snowflake size={10} strokeWidth={2.4} /> : null}
                                  {contactTemperatureBadge.label}
                                </LeadTemperatureBadge>
                              ) : (
                                <LeadContactValue>—</LeadContactValue>
                              )}
                            </LeadTemperaturePickerButton>

                            {isTemperatureMenuOpen ? (
                              <LeadTemperatureMenu $openUp={isTemperatureMenuOpenUpward}>
                                {LEAD_TEMPERATURE_OPTIONS.map((option) => (
                                  <LeadTemperatureMenuButton
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      void updateLeadTemperature(option.value)
                                    }}
                                  >
                                    {option.value === 'hot' ? <Flame size={13} strokeWidth={2.4} /> : null}
                                    {option.value === 'warm' ? <Sun size={13} strokeWidth={2.4} /> : null}
                                    {option.value === 'cold' ? <Snowflake size={13} strokeWidth={2.4} /> : null}
                                    <span>{option.label}</span>
                                  </LeadTemperatureMenuButton>
                                ))}

                                <LeadTemperatureMenuButton
                                  type="button"
                                  onClick={() => {
                                    void updateLeadTemperature(null)
                                  }}
                                >
                                  <X size={13} strokeWidth={2.4} />
                                  <span>Remover temperatura</span>
                                </LeadTemperatureMenuButton>
                              </LeadTemperatureMenu>
                            ) : null}
                          </LeadTemperaturePickerWrapper>
                        </LeadContactLine>

                        <LeadContactLine>
                          <LeadContactKey>Origem:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadTemperaturePickerWrapper ref={sourceMenuRef}>
                              <LeadTemperaturePickerButton
                                type="button"
                                onClick={() => {
                                  if (!isSourceMenuOpen) {
                                    setIsSourceMenuOpenUpward(
                                      shouldOpenDropdownUpward(sourceMenuRef.current)
                                    )
                                  }
                                  setIsSourceMenuOpen((prev) => !prev)
                                }}
                                disabled={isContactSaving}
                              >
                                {contactSourceBadge ? (
                                  <LeadSourceBadge $type={contactSourceBadge.type}>
                                    {contactSourceBadge.label}
                                  </LeadSourceBadge>
                                ) : (
                                  <LeadContactValue>Sem origem</LeadContactValue>
                                )}
                              </LeadTemperaturePickerButton>

                              {isSourceMenuOpen ? (
                                <LeadTemperatureMenu $openUp={isSourceMenuOpenUpward}>
                                  {LEAD_SOURCE_OPTIONS.map((option) => (
                                    <LeadTemperatureMenuButton
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setContactSource(option.value)
                                        setIsSourceMenuOpen(false)
                                      }}
                                    >
                                      {option.label}
                                    </LeadTemperatureMenuButton>
                                  ))}
                                </LeadTemperatureMenu>
                              ) : null}
                            </LeadTemperaturePickerWrapper>
                          ) : (
                            <LeadContactValue>
                              {contactSourceBadge ? (
                                <LeadSourceBadge $type={contactSourceBadge.type}>
                                  {contactSourceBadge.label}
                                </LeadSourceBadge>
                              ) : (
                                contactSource || '—'
                              )}
                            </LeadContactValue>
                          )}
                        </LeadContactLine>
                      </InfoRow>
                    </InfoList>
                  ) : (
                    <InfoList>
                      <InfoRow>
                        <InfoLabel>Nome</InfoLabel>
                        <InfoInput
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nome"
                        />
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Telefone</InfoLabel>
                        <InfoInput
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Telefone"
                        />
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Email</InfoLabel>
                        <InfoInput
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                        />
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Temperatura</InfoLabel>
                        <InfoSelect
                          value={temperature ?? ''}
                          onChange={(e) => setTemperature((e.target.value || null) as LeadTemperature | null)}
                        >
                          <option value="">Sem temperatura</option>
                          {LEAD_TEMPERATURE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </InfoSelect>
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Origem</InfoLabel>
                        <InfoInput
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          placeholder="Origem"
                        />
                      </InfoRow>
                    </InfoList>
                  )}

                  {isEditModeActive ? (
                    <ModalFooter>
                      <FooterButtons>
                        <>
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
                        </>
                      </FooterButtons>
                    </ModalFooter>
                  ) : null}
                </>
              ) : null}
              </>
          ) : (
            <ModalLoading>Nenhum lead encontrado.</ModalLoading>
          )}
        </ModalCard>
      </ModalOverlay>

      <LeadDeleteConfirmModal
        isOpen={isDeleteConfirmOpen}
        isDeleting={isDeleting}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
        }}
        onConfirm={() => {
          void handleDeleteLead()
        }}
      />

      <LeadArchiveConfirmModal
        isOpen={isArchiveConfirmOpen}
        isArchiving={isArchiving}
        onClose={() => {
          if (!isArchiving) setIsArchiveConfirmOpen(false)
        }}
        onConfirm={() => {
          void handleArchiveLead()
        }}
      />

      <FollowUpDeleteConfirmModal
        isOpen={Boolean(followupToDeleteId)}
        isDeleting={isDeletingFollowup}
        onClose={() => {
          if (!isDeletingFollowup) setFollowupToDeleteId(null)
        }}
        onConfirm={() => {
          void deleteFollowup()
        }}
      />
    </>
  )
}

// ----------------------------
// Modal de automatizações
// ----------------------------
type AutomationsTab = 'entry' | 'exit' | 'time'
type FollowupWhenType = 'hours' | 'days' | 'specific-date'
type EntryActionSection = 'followup' | 'lead' | 'time'
type EntryAutomationAction =
  | 'create-followup'
  | 'complete-followups'
  | 'favorite-lead'
  | 'reset-idle-time'

type EntryAutomationListItem = {
  id: string
  action: EntryAutomationAction
  followUpValue?: string
  followUpDueAt?: string
}

const ENTRY_ACTION_LABELS: Record<EntryAutomationAction, string> = {
  'create-followup': 'Criar follow-up',
  'complete-followups': 'Concluir follow-ups',
  'favorite-lead': 'Lead prioritário',
  'reset-idle-time': 'Reativar lead'
}

const ENTRY_ACTION_CATEGORY_LABELS: Record<EntryAutomationAction, string> = {
  'create-followup': 'FOLLOW_UP',
  'complete-followups': 'FOLLOW_UP',
  'favorite-lead': 'LEAD',
  'reset-idle-time': 'TEMPO'
}

function onEnterToItems(
  onEnter: BoardColumnOnEnterAutomation | null | undefined
): EntryAutomationListItem[] {
  if (!onEnter) return []
  const items: EntryAutomationListItem[] = []
  if (onEnter.createFollowUp) {
    items.push({
      id: 'entry-automation-create-followup',
      action: 'create-followup',
      followUpValue: onEnter.createFollowUp.value,
      followUpDueAt: onEnter.createFollowUp.dueAt
    })
  }
  if (onEnter.markAllFollowUpsAsDone) {
    items.push({ id: 'entry-automation-complete-followups', action: 'complete-followups' })
  }
  if (onEnter.favoriteLead) {
    items.push({ id: 'entry-automation-favorite-lead', action: 'favorite-lead' })
  }
  if (onEnter.resetLastActivityAt) {
    items.push({ id: 'entry-automation-reset-idle-time', action: 'reset-idle-time' })
  }
  return items
}

function itemsToOnEnter(
  items: EntryAutomationListItem[]
): BoardColumnOnEnterAutomation | null {
  if (items.length === 0) return null
  const result: BoardColumnOnEnterAutomation = {}
  for (const item of items) {
    switch (item.action) {
      case 'create-followup':
        result.createFollowUp = {
          value: item.followUpValue ?? '',
          dueAt: item.followUpDueAt
        }
        break
      case 'complete-followups':
        result.markAllFollowUpsAsDone = true
        break
      case 'favorite-lead':
        result.favoriteLead = true
        break
      case 'reset-idle-time':
        result.resetLastActivityAt = true
        break
    }
  }
  return result
}

function computeFollowUpDueAt(
  whenType: FollowupWhenType,
  whenValue: string,
  specificDate: string
): string | undefined {
  if (whenType === 'hours') {
    const hours = parseFloat(whenValue)
    if (!isNaN(hours) && hours > 0) {
      return new Date(Date.now() + hours * 3600 * 1000).toISOString()
    }
    return undefined
  }
  if (whenType === 'days') {
    const days = parseFloat(whenValue)
    if (!isNaN(days) && days > 0) {
      return new Date(Date.now() + days * 86400 * 1000).toISOString()
    }
    return undefined
  }
  if (whenType === 'specific-date' && specificDate) {
    const d = new Date(specificDate)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return undefined
}

function AutomationsModal({ onRefreshBoard }: { onRefreshBoard: () => Promise<void> }) {
  const [isOpen, setIsOpen] = useAtom(isAutomationsModalOpenAtom)
  const [column, setColumn] = useAtom(automationsModalColumnAtom)
  const [activeTab, setActiveTab] = useState<AutomationsTab>('entry')
  const [isEntryActionSelectorOpen, setIsEntryActionSelectorOpen] = useState(false)
  const [entryAutomationItems, setEntryAutomationItems] = useState<EntryAutomationListItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [, setSaveError] = useState<string | null>(null)
  const [editingEntryAutomationId, setEditingEntryAutomationId] = useState<string | null>(null)
  const [isConfiguringFollowup, setIsConfiguringFollowup] = useState(false)
  const [followupTitle, setFollowupTitle] = useState('')
  const [followupWhenType, setFollowupWhenType] = useState<FollowupWhenType>('hours')
  const [followupWhenValue, setFollowupWhenValue] = useState('')
  const [followupSpecificDate, setFollowupSpecificDate] = useState('')
  const followupDateInputRef = useRef<HTMLInputElement | null>(null)
  const [openEntrySections, setOpenEntrySections] = useState<Record<EntryActionSection, boolean>>({
    followup: true,
    lead: false,
    time: false
  })

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setColumn(null)
    setActiveTab('entry')
    setIsEntryActionSelectorOpen(false)
    setEntryAutomationItems([])
    setEditingEntryAutomationId(null)
    setIsConfiguringFollowup(false)
    setFollowupTitle('')
    setFollowupWhenType('hours')
    setFollowupWhenValue('')
    setFollowupSpecificDate('')
    setSaveError(null)
  }, [setIsOpen, setColumn])

  // Inicializa a lista quando a modal abre com um column
  useEffect(() => {
    if (isOpen && column) {
      setEntryAutomationItems(onEnterToItems(column.onEnter))
    }
  }, [isOpen, column])

  const patchOnEnter = useCallback(
    async (
      nextItems: EntryAutomationListItem[],
      successMessage = TOAST_MESSAGES.success.saveAutomation
    ) => {
      if (!column) return
      try {
        setIsSaving(true)
        setSaveError(null)
        const onEnterPayload = itemsToOnEnter(nextItems)
        await api.patch<BoardColumn>(
          `/boards/${column.boardId}/columns/${column.id}`,
          { onEnter: onEnterPayload }
        )
        await onRefreshBoard()
      toastSuccess(successMessage)
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao salvar automação'
        setSaveError(String(msg))
        toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
      } finally {
        setIsSaving(false)
      }
    },
    [column, onRefreshBoard]
  )

  const openEntryActionSelector = useCallback(() => {
    setIsEntryActionSelectorOpen(true)
  }, [])

  const closeEntryActionSelector = useCallback(() => {
    setIsEntryActionSelectorOpen(false)
  }, [])

  const startConfiguringFollowup = useCallback(
    (automationId?: string | null) => {
      setEditingEntryAutomationId(automationId ?? null)
      // Se editando um existing, preenche o form com os dados salvos
      if (automationId) {
        const existing = entryAutomationItems.find((i) => i.id === automationId)
        if (existing?.followUpValue) setFollowupTitle(existing.followUpValue)
        if (existing?.followUpDueAt) {
          // Carrega como data específica
          const d = new Date(existing.followUpDueAt)
          if (!isNaN(d.getTime())) {
            setFollowupWhenType('specific-date')
            setFollowupSpecificDate(d.toISOString().split('T')[0])
          }
        }
      }
      setIsConfiguringFollowup(true)
    },
    [entryAutomationItems]
  )

  const backToActionChoice = useCallback(() => {
    setIsConfiguringFollowup(false)
    setEditingEntryAutomationId(null)
    setFollowupTitle('')
    setFollowupWhenType('hours')
    setFollowupWhenValue('')
    setFollowupSpecificDate('')
  }, [])

  const saveFollowupAction = useCallback(async () => {
    const dueAt = computeFollowUpDueAt(followupWhenType, followupWhenValue, followupSpecificDate)
    let nextItems: EntryAutomationListItem[]

    if (editingEntryAutomationId) {
      nextItems = entryAutomationItems.map((item) =>
        item.id === editingEntryAutomationId
          ? { ...item, followUpValue: followupTitle, followUpDueAt: dueAt }
          : item
      )
    } else {
      nextItems = [
        ...entryAutomationItems,
        {
          id: `entry-automation-${Date.now()}`,
          action: 'create-followup' as EntryAutomationAction,
          followUpValue: followupTitle,
          followUpDueAt: dueAt
        }
      ]
    }

    setEntryAutomationItems(nextItems)
    setIsEntryActionSelectorOpen(false)
    setEditingEntryAutomationId(null)
    setIsConfiguringFollowup(false)
    setFollowupTitle('')
    setFollowupWhenType('hours')
    setFollowupWhenValue('')
    setFollowupSpecificDate('')
    await patchOnEnter(nextItems, TOAST_MESSAGES.success.saveAutomation)
  }, [
    editingEntryAutomationId,
    entryAutomationItems,
    followupTitle,
    followupWhenType,
    followupWhenValue,
    followupSpecificDate,
    patchOnEnter
  ])

  const removeEntryAutomation = useCallback(
    async (automationId: string) => {
      const nextItems = entryAutomationItems.filter((item) => item.id !== automationId)
      setEntryAutomationItems(nextItems)
      await patchOnEnter(nextItems, TOAST_MESSAGES.success.deleteAutomation)
    },
    [entryAutomationItems, patchOnEnter]
  )

  const toggleEntrySection = useCallback((section: EntryActionSection) => {
    setOpenEntrySections({
      followup: section === 'followup',
      lead: section === 'lead',
      time: section === 'time'
    })
  }, [])

  const chooseEntryAction = useCallback(
    async (action: EntryAutomationAction) => {
      if (action === 'create-followup') {
        startConfiguringFollowup()
      } else {
        if (entryAutomationItems.some((item) => item.action === action)) {
          toastWarning('Essa automação já foi adicionada para esta coluna')
          setIsEntryActionSelectorOpen(false)
          return
        }
        const nextItems = [
          ...entryAutomationItems,
          { id: `entry-automation-${Date.now()}`, action }
        ]
        setEntryAutomationItems(nextItems)
        setIsEntryActionSelectorOpen(false)
        await patchOnEnter(nextItems, TOAST_MESSAGES.success.saveAutomation)
      }
    },
    [startConfiguringFollowup, entryAutomationItems, patchOnEnter]
  )

  useEffect(() => {
    if (activeTab !== 'entry') {
      setIsEntryActionSelectorOpen(false)
    }
  }, [activeTab])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen || !column) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <AutomationsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <ModalTitleInlineRow>
            <SettingsModalTitle>Configurações</SettingsModalTitle>
            <ModalTitleSeparator>|</ModalTitleSeparator>
            <ModalTitleColumnName>{column.name}</ModalTitleColumnName>
          </ModalTitleInlineRow>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar automatizações"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <ColumnSettingsMain>
            <>
                <AutomationsTabs>
                  <AutomationsTabButton
                    type="button"
                    $active={activeTab === 'entry'}
                    onClick={() => setActiveTab('entry')}
                  >
                    Entrada de lead
                  </AutomationsTabButton>

                  <AutomationsTabButton
                    type="button"
                    $active={activeTab === 'exit'}
                    onClick={() => setActiveTab('exit')}
                  >
                    Saída de lead
                  </AutomationsTabButton>

                  <AutomationsTabButton
                    type="button"
                    $active={activeTab === 'time'}
                    onClick={() => setActiveTab('time')}
                  >
                    Tempo do lead
                  </AutomationsTabButton>
                </AutomationsTabs>

                <AutomationsTabContent>
                  {activeTab === 'entry' ? (
                    <AutomationsEntryArea>
              {entryAutomationItems.length > 0 ? (
              <AutomationsEntryList>
                {entryAutomationItems.map((item) => (
                  <AutomationsEntryListItem key={item.id}>
                    <AutomationsEntryListItemTop>
                      <AutomationsEntryMainLine>
                        <InfoValue>
                          <AutomationsEntryItemCategory>
                            {ENTRY_ACTION_CATEGORY_LABELS[item.action]}
                          </AutomationsEntryItemCategory>
                          {ENTRY_ACTION_LABELS[item.action]}
                        </InfoValue>
                        {item.action === 'create-followup' && item.followUpValue ? (
                          <AutomationsEntryItemFollowUpInfo>
                            <AutomationsEntryItemSubtext>{item.followUpValue}</AutomationsEntryItemSubtext>
                            {item.followUpDueAt ? (
                              <AutomationsEntryItemDueAt>
                                {new Date(item.followUpDueAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </AutomationsEntryItemDueAt>
                            ) : null}
                          </AutomationsEntryItemFollowUpInfo>
                        ) : null}
                      </AutomationsEntryMainLine>

                      <FollowUpItemActions>
                        {item.action === 'create-followup' ? (
                          <FollowUpActionIconButton
                            type="button"
                            onClick={() => {
                              setIsEntryActionSelectorOpen(true)
                              startConfiguringFollowup(item.id)
                            }}
                            aria-label="Editar ação de criar follow-up"
                            title="Editar"
                            disabled={isSaving}
                          >
                            <Pencil size={16} />
                          </FollowUpActionIconButton>
                        ) : null}

                        <FollowUpActionIconButton
                          type="button"
                          onClick={() => { void removeEntryAutomation(item.id) }}
                          aria-label="Excluir automação"
                          title="Excluir"
                          disabled={isSaving}
                        >
                          <Trash2 size={16} />
                        </FollowUpActionIconButton>
                      </FollowUpItemActions>
                    </AutomationsEntryListItemTop>
                  </AutomationsEntryListItem>
                ))}

                <AutomationsEntryAddButton type="button" onClick={openEntryActionSelector} disabled={isSaving}>
                  <Plus size={14} strokeWidth={2.4} />
                  Nova ação
                </AutomationsEntryAddButton>
              </AutomationsEntryList>
              ) : (
              <AutomationsEmptyState>
                <AutomationsEmptyTitle>Nenhuma automação de entrada</AutomationsEmptyTitle>
                <AutomationsEmptyText>
                  Automatizações acionadas quando um lead entra nesta coluna.
                </AutomationsEmptyText>
                <AutomationsCreateButton type="button" onClick={openEntryActionSelector} disabled={isSaving}>
                  <Plus size={14} strokeWidth={2.4} />
                  Criar primeira ação
                </AutomationsCreateButton>
              </AutomationsEmptyState>
              )}

              {isEntryActionSelectorOpen ? (
                <AutomationsPickerOverlay onClick={closeEntryActionSelector}>
                  <AutomationsPickerCard
                    onClick={(event) => {
                      event.stopPropagation()
                    }}
                  >
                    {isConfiguringFollowup ? (
                      <>
                        <AutomationsPickerHeader>
                          <AutomationsPickerTitle>Criar follow-up</AutomationsPickerTitle>
                          <AutomationsPickerCloseButton
                            type="button"
                            onClick={backToActionChoice}
                            aria-label="Voltar para escolha de ações"
                            title="Voltar"
                          >
                            <ArrowLeft size={18} />
                          </AutomationsPickerCloseButton>
                        </AutomationsPickerHeader>

                        <AutomationsFormSection>
                          <AutomationsFormInput
                            type="text"
                            placeholder="Título do follow-up"
                            value={followupTitle}
                            onChange={(e) => setFollowupTitle(e.target.value)}
                          />
                        </AutomationsFormSection>

                        <AutomationsFormSection>
                          <AutomationsFormRadioGroup>
                            <AutomationsFormRadioOption>
                              <input
                                type="radio"
                                name="when"
                                value="hours"
                                checked={followupWhenType === 'hours'}
                                onChange={(e) => setFollowupWhenType(e.target.value as FollowupWhenType)}
                              />
                              <span>Em X horas</span>
                              <AutomationsFormNumberInput
                                type="number"
                                min="1"
                                value={followupWhenType === 'hours' ? followupWhenValue : ''}
                                onChange={(e) => followupWhenType === 'hours' && setFollowupWhenValue(e.target.value)}
                              />
                            </AutomationsFormRadioOption>

                            <AutomationsFormRadioOption>
                              <input
                                type="radio"
                                name="when"
                                value="days"
                                checked={followupWhenType === 'days'}
                                onChange={(e) => setFollowupWhenType(e.target.value as FollowupWhenType)}
                              />
                              <span>Em X dias</span>
                              <AutomationsFormNumberInput
                                type="number"
                                min="1"
                                value={followupWhenType === 'days' ? followupWhenValue : ''}
                                onChange={(e) => followupWhenType === 'days' && setFollowupWhenValue(e.target.value)}
                              />
                            </AutomationsFormRadioOption>

                            <AutomationsFormRadioOption>
                              <input
                                type="radio"
                                name="when"
                                value="specific-date"
                                checked={followupWhenType === 'specific-date'}
                                onChange={() => {
                                  setFollowupWhenType('specific-date')
                                  requestAnimationFrame(() => {
                                    const input = followupDateInputRef.current
                                    if (!input) return

                                    input.focus()
                                    if (typeof input.showPicker === 'function') {
                                      input.showPicker()
                                    } else {
                                      input.click()
                                    }
                                  })
                                }}
                              />
                              <span>Data específica</span>
                              {followupWhenType === 'specific-date' ? (
                                <AutomationsFormDateInput
                                  $hasValue={Boolean(followupSpecificDate)}
                                  ref={followupDateInputRef}
                                  type="date"
                                  value={followupSpecificDate}
                                  onFocus={() => setFollowupWhenType('specific-date')}
                                  onChange={(e) => setFollowupSpecificDate(e.target.value)}
                                />
                              ) : null}
                            </AutomationsFormRadioOption>
                          </AutomationsFormRadioGroup>
                        </AutomationsFormSection>

                        <AutomationsFormFooter>
                          <AutomationsFormButton
                            type="button"
                            onClick={backToActionChoice}
                            disabled={isSaving}
                          >
                            Cancelar
                          </AutomationsFormButton>
                          <AutomationsFormButton
                            type="button"
                            $primary
                            disabled={isSaving}
                            onClick={() => { void saveFollowupAction() }}
                          >
                            {isSaving ? 'Salvando...' : 'Salvar ação'}
                          </AutomationsFormButton>
                        </AutomationsFormFooter>
                      </>
                    ) : (
                      <>
                        <AutomationsPickerHeader>
                          <AutomationsPickerTitle>Adicionar nova ação</AutomationsPickerTitle>
                          <AutomationsPickerCloseButton
                            type="button"
                            onClick={closeEntryActionSelector}
                            aria-label="Fechar seletor de ações"
                            title="Fechar"
                          >
                            <X size={18} />
                          </AutomationsPickerCloseButton>
                        </AutomationsPickerHeader>

                        <AutomationsPickerSection>
                          <AutomationsPickerSectionTrigger
                            type="button"
                            onClick={() => toggleEntrySection('followup')}
                            aria-expanded={openEntrySections.followup}
                          >
                            <AutomationsPickerSectionTitle>
                              <Calendar size={14} strokeWidth={2.4} />
                              Follow-up
                            </AutomationsPickerSectionTitle>
                          </AutomationsPickerSectionTrigger>
                          <AutomationsPickerSectionContent $open={openEntrySections.followup}>
                            <AutomationsPickerSectionContentInner>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('create-followup') }}
                              >
                                Criar follow-up
                              </AutomationsPickerOption>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('complete-followups') }}
                              >
                                Concluir follow-ups
                              </AutomationsPickerOption>
                            </AutomationsPickerSectionContentInner>
                          </AutomationsPickerSectionContent>
                        </AutomationsPickerSection>

                        <AutomationsPickerSection>
                          <AutomationsPickerSectionTrigger
                            type="button"
                            onClick={() => toggleEntrySection('lead')}
                            aria-expanded={openEntrySections.lead}
                          >
                            <AutomationsPickerSectionTitle>
                              <FileText size={14} strokeWidth={2.4} />
                              Lead
                            </AutomationsPickerSectionTitle>
                          </AutomationsPickerSectionTrigger>
                          <AutomationsPickerSectionContent $open={openEntrySections.lead}>
                            <AutomationsPickerSectionContentInner>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('favorite-lead') }}
                              >
                                Lead prioritário
                              </AutomationsPickerOption>
                            </AutomationsPickerSectionContentInner>
                          </AutomationsPickerSectionContent>
                        </AutomationsPickerSection>

                        <AutomationsPickerSection>
                          <AutomationsPickerSectionTrigger
                            type="button"
                            onClick={() => toggleEntrySection('time')}
                            aria-expanded={openEntrySections.time}
                          >
                            <AutomationsPickerSectionTitle>
                              <Clock3 size={14} strokeWidth={2.4} />
                              Tempo
                            </AutomationsPickerSectionTitle>
                          </AutomationsPickerSectionTrigger>
                          <AutomationsPickerSectionContent $open={openEntrySections.time}>
                            <AutomationsPickerSectionContentInner>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('reset-idle-time') }}
                              >
                                Reativar lead
                              </AutomationsPickerOption>
                            </AutomationsPickerSectionContentInner>
                          </AutomationsPickerSectionContent>
                        </AutomationsPickerSection>
                      </>
                    )}
                  </AutomationsPickerCard>
                </AutomationsPickerOverlay>
              ) : null}
                    </AutomationsEntryArea>
                  ) : activeTab === 'exit' ? (
                    <AutomationsEmptyState>
                      <AutomationsEmptyTitle>Nenhuma automação de saída</AutomationsEmptyTitle>
                      <AutomationsEmptyText>
                        Automatizações acionadas quando um lead sai desta coluna.
                      </AutomationsEmptyText>
                      <AutomationsCreateButton type="button" disabled>
                        <Plus size={14} strokeWidth={2.4} />
                        Criar primeira ação
                      </AutomationsCreateButton>
                    </AutomationsEmptyState>
                  ) : (
                    <AutomationsEmptyState>
                      <AutomationsEmptyTitle>Nenhuma automação de tempo</AutomationsEmptyTitle>
                      <AutomationsEmptyText>
                        Automatizações acionadas com base no tempo do lead nesta coluna.
                      </AutomationsEmptyText>
                      <AutomationsCreateButton type="button" disabled>
                        <Plus size={14} strokeWidth={2.4} />
                        Criar primeira ação
                      </AutomationsCreateButton>
                    </AutomationsEmptyState>
                  )}
                </AutomationsTabContent>
            </>
        </ColumnSettingsMain>
      </AutomationsModalCard>
    </ModalOverlay>
  )
}

const COLUMN_SORT_OPTIONS: { key: ColumnSortKey; label: string }[] = [
  { key: 'newest', label: 'Mais recente' },
  { key: 'oldest', label: 'Mais antigo' },
  { key: 'next-followup', label: 'Próximo follow-up' },
  { key: 'no-followup', label: 'Sem follow-up' },
  { key: 'favorites', label: 'Favoritos' },
  { key: 'temperature', label: 'Temperatura' },
]

// ----------------------------
// DnD
// ----------------------------
function ColumnActionsMenu({
  column,
  onDeleteColumn,
  onOpenSettings,
  activeSort,
  onSort
}: {
  column: BoardColumn
  onDeleteColumn: (column: BoardColumn) => void
  onOpenSettings: (column: BoardColumn) => void
  activeSort?: ColumnSortKey
  onSort: (columnId: string, sort: ColumnSortKey) => void
}) {
  const [openedColumnMenuId, setOpenedColumnMenuId] = useAtom(openedColumnMenuIdAtom)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const isOpen = openedColumnMenuId === column.id

  useEffect(() => {
    if (!isOpen) setIsSortOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!wrapperRef.current?.contains(target)) {
        setOpenedColumnMenuId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenedColumnMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, setOpenedColumnMenuId])

  return (
    <ColumnMenuWrapper
      ref={wrapperRef}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <ColumnMoreButton
        type="button"
        aria-label={`Mais opções da coluna ${column.name}`}
        title="Mais opções"
        onClick={() => {
          setOpenedColumnMenuId((prev) => (prev === column.id ? null : column.id))
        }}
      >
        ...
      </ColumnMoreButton>

      {isOpen ? (
        <ColumnDropdown>
          <ColumnSortMenuWrapper>
            <CreateDropdownButton
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
            >
              <span>Ordenar por{activeSort ? <ColumnSortActiveDot /> : null}</span>
              <ColumnSortChevron $open={isSortOpen}>›</ColumnSortChevron>
            </CreateDropdownButton>
            {isSortOpen ? (
              <ColumnSortSubmenu>
                {COLUMN_SORT_OPTIONS.map((opt) => (
                  <ColumnSortOption
                    key={opt.key}
                    type="button"
                    $active={activeSort === opt.key}
                    onClick={() => {
                      onSort(column.id, opt.key)
                      setIsSortOpen(false)
                      setOpenedColumnMenuId(null)
                    }}
                  >
                    {opt.label}
                  </ColumnSortOption>
                ))}
              </ColumnSortSubmenu>
            ) : null}
          </ColumnSortMenuWrapper>

          <CreateDropdownButton
            type="button"
            onClick={() => {
              setOpenedColumnMenuId(null)
              onOpenSettings(column)
            }}
          >
            Configurações{(() => {
              const onEnter = column.onEnter
              if (!onEnter) return null
              const count = [onEnter.createFollowUp, onEnter.markAllFollowUpsAsDone, onEnter.favoriteLead, onEnter.resetLastActivityAt].filter(Boolean).length
              return count > 0 ? <AutomationsCountBadge>{count}</AutomationsCountBadge> : null
            })()}
          </CreateDropdownButton>

          <CreateDropdownButton
            type="button"
            onClick={() => {
              setOpenedColumnMenuId(null)
              onDeleteColumn(column)
            }}
          >
            Excluir coluna
          </CreateDropdownButton>
        </ColumnDropdown>
      ) : null}
    </ColumnMenuWrapper>
  )
}

function SortableLeadCard({
  lead,
  isDragDisabled
}: {
  lead: Lead
  isDragDisabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, disabled: Boolean(isDragDisabled) })

  const [boardData, setBoardData] = useAtom(boardFullAtom) as [
    BoardFullResponse | null,
    AtomSetter<BoardFullResponse | null>
  ]
  const setOpenCreateFollowupOnLeadOpen = useSetAtom(openCreateFollowupOnLeadOpenAtom)
  const setSelectedLeadId = useSetAtom(selectedLeadIdAtom)
  const [selectedLead, setSelectedLead] = useAtom(selectedLeadAtom) as [
    Lead | null,
    AtomSetter<Lead | null>
  ]
  const setLeadModalError = useSetAtom(leadModalErrorAtom)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false)
  const [isTemperatureMenuOpen, setIsTemperatureMenuOpen] = useState(false)
  const [isTemperatureMenuOpenUpward, setIsTemperatureMenuOpenUpward] = useState(false)
  const [isQuickActionsMenuOpen, setIsQuickActionsMenuOpen] = useState(false)
  const [isQuickActionsTemperatureMenuOpen, setIsQuickActionsTemperatureMenuOpen] = useState(false)
  const moveMenuRef = useRef<HTMLDivElement | null>(null)
  const temperatureMenuRef = useRef<HTMLDivElement | null>(null)
  const quickActionsMenuRef = useRef<HTMLDivElement | null>(null)

  const isFavorite = Boolean(lead.isFavorite)
  const sourceBadge = getLeadSourceBadge(lead.source)
  const temperatureBadge = getLeadTemperatureBadge(lead.temperature)
  const activityBadge = getLeadActivityBadge(lead)

  const followUpStatus = getLeadFollowUpStatus(lead)
  const followUpCountLabel = getLeadFollowUpCountLabel(lead)
  const followUpLine = getLeadFollowUpLine(lead)
  const hideFollowUpCount = followUpStatus === 'none'

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  const updateLeadLocally = useCallback(
    (patch: Partial<Lead>) => {
      setBoardData((current) => {
        if (!current) return current

        return {
          ...current,
          columns: current.columns.map((column) => ({
            ...column,
            leads: column.leads.map((item) =>
              item.id === lead.id ? { ...item, ...patch } : item
            )
          }))
        }
      })

      if (selectedLead?.id === lead.id) {
        setSelectedLead((prev) => (prev ? { ...prev, ...patch } : prev))
      }
    },
    [lead.id, selectedLead?.id, setBoardData, setSelectedLead]
  )

  const toggleFavorite = useCallback(async () => {
    if (isFavoriteUpdating) return

    const previousValue = isFavorite
    const nextValue = !previousValue

    setIsFavoriteUpdating(true)
    updateLeadLocally({ isFavorite: nextValue })

    try {
      await api.patch(`/leads/${lead.id}/favorite`, { isFavorite: nextValue })
      if (nextValue) {
        toastSuccess(TOAST_MESSAGES.success.favoriteLead)
      }
    } catch (e: any) {
      updateLeadLocally({ isFavorite: previousValue })
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      setIsFavoriteUpdating(false)
    }
  }, [isFavorite, isFavoriteUpdating, lead.id, updateLeadLocally])

  const moveLeadFromCard = useCallback(
    (nextColumnId: string) => {
      if (!nextColumnId || nextColumnId === lead.columnId) {
        setIsMoveMenuOpen(false)
        return
      }

      const movedAt = new Date().toISOString()

      setBoardData((current) => {
        if (!current) return current

        let movedLead: Lead | null = null

        const detachedColumns = current.columns.map((column) => {
          if (column.id !== lead.columnId) return column

          const remainingLeads = column.leads.filter((item) => {
            if (item.id === lead.id) {
              movedLead = {
                ...item,
                columnId: nextColumnId,
                movedAt,
                lastActivityAt: movedAt,
                updatedAt: movedAt
              }
              return false
            }
            return true
          })

          return {
            ...column,
            leads: remainingLeads.map((item, index) => ({ ...item, position: index }))
          }
        })

        if (!movedLead) return current

        const movedLeadSnapshot: Lead = movedLead

        return {
          ...current,
          columns: detachedColumns.map((column) => {
            if (column.id !== nextColumnId) return column

            const nextLeads = [...column.leads, { ...movedLeadSnapshot, position: column.leads.length }]
            return { ...column, leads: nextLeads }
          })
        }
      })

      const toPosition = boardData?.columns.find((c) => c.id === nextColumnId)?.leads.length ?? 0
      void api.patch(`/leads/${lead.id}/move`, {
        boardId: lead.boardId,
        toColumnId: nextColumnId,
        toPosition
      })

      if (selectedLead?.id === lead.id) {
        setSelectedLead((prev) =>
          prev
            ? {
                ...prev,
                columnId: nextColumnId,
                movedAt,
                lastActivityAt: movedAt,
                updatedAt: movedAt
              }
            : prev
        )
      }

      setIsMoveMenuOpen(false)
    },
    [boardData, lead.boardId, lead.columnId, lead.id, selectedLead?.id, setBoardData, setSelectedLead]
  )

  const updateTemperatureFromCard = useCallback(
    (nextTemperature: LeadTemperature | null) => {
      if (lead.temperature === nextTemperature) {
        setIsTemperatureMenuOpen(false)
        setIsQuickActionsTemperatureMenuOpen(false)
        setIsQuickActionsMenuOpen(false)
        return
      }

      updateLeadLocally({ temperature: nextTemperature })
      void api.patch(`/leads/${lead.id}`, { temperature: nextTemperature })
      setIsTemperatureMenuOpen(false)
      setIsQuickActionsTemperatureMenuOpen(false)
      setIsQuickActionsMenuOpen(false)
      toastSuccess(TOAST_MESSAGES.success.editLead)
    },
    [lead.id, lead.temperature, updateLeadLocally]
  )

  useEffect(() => {
    if (!isMoveMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!moveMenuRef.current?.contains(target)) {
        setIsMoveMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoveMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMoveMenuOpen])

  useEffect(() => {
    if (!isQuickActionsMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!quickActionsMenuRef.current?.contains(target)) {
        setIsQuickActionsMenuOpen(false)
        setIsQuickActionsTemperatureMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuickActionsMenuOpen(false)
        setIsQuickActionsTemperatureMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isQuickActionsMenuOpen])

  useEffect(() => {
    if (!isTemperatureMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!temperatureMenuRef.current?.contains(target)) {
        setIsTemperatureMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTemperatureMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isTemperatureMenuOpen])

  return (
    <LeadCard
      $menuOpen={isMoveMenuOpen}
      ref={setNodeRef}
      style={style}
      {...(isDragDisabled ? {} : attributes)}
      {...(isDragDisabled ? {} : listeners)}
      onClick={() => {
        setOpenCreateFollowupOnLeadOpen(false)
        setSelectedLead(null)
        setLeadModalError(null)
        setSelectedLeadId(lead.id)
      }}
    >
      <LeadTopRow>
        <LeadTitle>
          <LeadHeaderRow>
            <LeadName>{lead.name}</LeadName>

            <LeadHeaderActions>
              <LeadFavoriteButton
                type="button"
                aria-label={isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
                title={isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
                $active={isFavorite}
                disabled={isFavoriteUpdating}
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  void toggleFavorite()
                }}
              >
                <Star size={14} strokeWidth={2.2} />
              </LeadFavoriteButton>

              
            </LeadHeaderActions>
          </LeadHeaderRow>

          <LeadMetaRow>
            <LeadBadgesRow>
              {sourceBadge ? (
                <LeadSourceBadge $type={sourceBadge.type}>
                  {sourceBadge.label}
                </LeadSourceBadge>
              ) : null}

              {activityBadge?.type === 'new' ? (
                <LeadNewBadge>
                  <LeadNewFire aria-hidden="true">🔥</LeadNewFire>
                  {activityBadge.label}
                </LeadNewBadge>
              ) : null}

              {activityBadge?.type === 'time' ? (
                <LeadAgeBadge>
                  <Clock3 size={10} strokeWidth={2.4} />
                  {activityBadge.label}
                </LeadAgeBadge>
              ) : null}

              <LeadTemperaturePickerWrapper
                ref={temperatureMenuRef}
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <LeadTemperaturePickerButton
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!isTemperatureMenuOpen) {
                      setIsTemperatureMenuOpenUpward(
                        shouldOpenDropdownUpward(temperatureMenuRef.current)
                      )
                    }
                    setIsTemperatureMenuOpen((prev) => !prev)
                  }}
                  aria-label="Editar temperatura"
                  title="Editar temperatura"
                >
                  {temperatureBadge ? (
                    <LeadTemperatureBadge $type={temperatureBadge.type}>
                      {temperatureBadge.type === 'hot' ? <Flame size={10} strokeWidth={2.4} /> : null}
                      {temperatureBadge.type === 'warm' ? <Sun size={10} strokeWidth={2.4} /> : null}
                      {temperatureBadge.type === 'cold' ? <Snowflake size={10} strokeWidth={2.4} /> : null}
                      {temperatureBadge.label}
                    </LeadTemperatureBadge>
                  ) : null}
                </LeadTemperaturePickerButton>

                {isTemperatureMenuOpen ? (
                  <LeadTemperatureMenu $openUp={isTemperatureMenuOpenUpward}>
                    {LEAD_TEMPERATURE_OPTIONS.map((option) => (
                      <LeadTemperatureMenuButton
                        key={option.value}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          updateTemperatureFromCard(option.value)
                        }}
                      >
                        {option.value === 'hot' ? <Flame size={13} strokeWidth={2.4} /> : null}
                        {option.value === 'warm' ? <Sun size={13} strokeWidth={2.4} /> : null}
                        {option.value === 'cold' ? <Snowflake size={13} strokeWidth={2.4} /> : null}
                        <span>{option.label}</span>
                      </LeadTemperatureMenuButton>
                    ))}

                    <LeadTemperatureMenuButton
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        updateTemperatureFromCard(null)
                      }}
                    >
                      <X size={13} strokeWidth={2.4} />
                      <span>Remover temperatura</span>
                    </LeadTemperatureMenuButton>
                  </LeadTemperatureMenu>
                ) : null}
              </LeadTemperaturePickerWrapper>
            </LeadBadgesRow>
            <LeadMoveMenuWrapper
                ref={moveMenuRef}
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <LeadMoveButton
                  type="button"
                  aria-label="Mover lead"
                  title="Mover lead"
                  onClick={() => {
                    setIsMoveMenuOpen((prev) => !prev)
                  }}
                >
                  <ArrowRight size={13} strokeWidth={2.2} />
                </LeadMoveButton>

                {isMoveMenuOpen ? (
                  <LeadMoveDropdown>
                    <MoveColumnLabel>Mover para</MoveColumnLabel>
                    {(boardData?.columns ?? []).map((column) => {
                      const isCurrent = column.id === lead.columnId

                      return (
                        <LeadMoveOptionButton
                          key={column.id}
                          type="button"
                          $active={isCurrent}
                          onClick={() => {
                            moveLeadFromCard(column.id)
                          }}
                        >
                          {column.name}
                        </LeadMoveOptionButton>
                      )
                    })}
                  </LeadMoveDropdown>
                ) : null}
              </LeadMoveMenuWrapper>
          </LeadMetaRow>
        </LeadTitle>
      </LeadTopRow>

      <LeadSectionDivider />

      <LeadFollowUpBlock>
        <LeadFollowUpContent $singleLine={hideFollowUpCount}>
          {!hideFollowUpCount ? (
            followUpCountLabel ? (
              <LeadFollowUpCount>{followUpCountLabel}</LeadFollowUpCount>
            ) : (
              <LeadFollowUpCount>Sem follow-up</LeadFollowUpCount>
            )
          ) : null}

          <LeadFollowUpNextLine $status={followUpStatus}>
            {followUpLine}
          </LeadFollowUpNextLine>
        </LeadFollowUpContent>

        <LeadQuickActionsWrapper
          $alignToFollowupLines
          ref={quickActionsMenuRef}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          <LeadQuickActionsButton
            type="button"
            aria-label="Ações rápidas do lead"
            title="Ações rápidas"
            onClick={() => {
              setIsQuickActionsMenuOpen((prev) => !prev)
              setIsQuickActionsTemperatureMenuOpen(false)
            }}
          >
            <Plus size={14} strokeWidth={2.4} />
          </LeadQuickActionsButton>

          {isQuickActionsMenuOpen ? (
            <LeadQuickActionsDropdown>
              <LeadQuickActionsOption
                type="button"
                onClick={() => {
                  setOpenCreateFollowupOnLeadOpen(true)
                  setSelectedLead(null)
                  setLeadModalError(null)
                  setSelectedLeadId(lead.id)
                  setIsQuickActionsMenuOpen(false)
                  setIsQuickActionsTemperatureMenuOpen(false)
                }}
              >
                Adicionar Follow-up
              </LeadQuickActionsOption>

              <LeadQuickActionsSubmenuWrapper>
                <LeadQuickActionsOption
                  type="button"
                  onClick={() => {
                    setIsQuickActionsTemperatureMenuOpen((prev) => !prev)
                  }}
                >
                  <span>Temperatura</span>
                  <LeadQuickActionsChevron $open={isQuickActionsTemperatureMenuOpen}>›</LeadQuickActionsChevron>
                </LeadQuickActionsOption>

                {isQuickActionsTemperatureMenuOpen ? (
                  <LeadQuickActionsSubmenu>
                    {LEAD_TEMPERATURE_OPTIONS.map((option) => (
                      <LeadQuickActionsSubmenuOption
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateTemperatureFromCard(
                            lead.temperature === option.value ? null : option.value
                          )
                        }}
                      >
                        {option.value === 'hot' ? <Flame size={13} strokeWidth={2.4} /> : null}
                        {option.value === 'warm' ? <Sun size={13} strokeWidth={2.4} /> : null}
                        {option.value === 'cold' ? <Snowflake size={13} strokeWidth={2.4} /> : null}
                        <span>{option.label}</span>
                      </LeadQuickActionsSubmenuOption>
                    ))}
                  </LeadQuickActionsSubmenu>
                ) : null}
              </LeadQuickActionsSubmenuWrapper>
            </LeadQuickActionsDropdown>
          ) : null}
        </LeadQuickActionsWrapper>
      </LeadFollowUpBlock>
    </LeadCard>
  )
}

function DroppableColumnBody({
  columnId,
  children
}: {
  columnId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnId}`
  })

  return (
    <ColumnBody ref={setNodeRef} $isOver={isOver}>
      {children}
    </ColumnBody>
  )
}

function DroppableColumnHeader({
  columnId,
  onClick,
  children
}: {
  columnId: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-header-${columnId}`
  })

  return (
    <ColumnHeader ref={setNodeRef} $isOver={isOver} onClick={onClick}>
      {children}
    </ColumnHeader>
  )
}

// ----------------------------
// Page
// ----------------------------
export default function BoardPage() {
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 50)
  }, [])

  const [boardId] = useAtom(boardIdAtom)
  const [data, setData] = useAtom(boardFullAtom) as [
    BoardFullResponse | null,
    AtomSetter<BoardFullResponse | null>
  ]
  const [userInfo, setUserInfo] = useAtom(userInfoAtom)
  const [, setLoading] = useAtom(isLoadingAtom)
  const [, setError] = useAtom(errorAtom)

  const setBoardIdAction = useSetAtom(setBoardIdAtom)

  const setIsCreateColumnModalOpen = useSetAtom(isCreateColumnModalOpenAtom)
  const setCreateColumnError = useSetAtom(createColumnErrorAtom)
  const setIsCreateLeadModalOpen = useSetAtom(isCreateLeadModalOpenAtom)
  const setIsAutomationsModalOpen = useSetAtom(isAutomationsModalOpenAtom)
  const setAutomationsModalColumn = useSetAtom(automationsModalColumnAtom)
  const setSelectedColumn = useSetAtom(selectedColumnAtom)
  const setIsColumnModalOpen = useSetAtom(isColumnModalOpenAtom)
  const setColumnModalMode = useSetAtom(columnModalModeAtom)
  const setOpenCreateFollowupOnLeadOpen = useSetAtom(openCreateFollowupOnLeadOpenAtom)
  const setSelectedLeadId = useSetAtom(selectedLeadIdAtom)
  const setSelectedLead = useSetAtom(selectedLeadAtom)
  const setLeadModalError = useSetAtom(leadModalErrorAtom)

  const [createLeadColumnId, setCreateLeadColumnId] = useState<string>('')

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false)
  const [selectedLeadFilters, setSelectedLeadFilters] = useState<LeadFilterKey[]>([])
  const [columnSorts, setColumnSorts] = useState<Record<string, ColumnSortKey>>({})
  const [isBoardSelectorOpen, setIsBoardSelectorOpen] = useState(false)
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false)
  const [isMobileNavMenuOpen, setIsMobileNavMenuOpen] = useState(false)
  const [isMobileCreateDropdownOpen, setIsMobileCreateDropdownOpen] = useState(false)
  const [isMobileSettingsDropdownOpen, setIsMobileSettingsDropdownOpen] = useState(false)
  const [isUserDataModalOpen, setIsUserDataModalOpen] = useState(false)
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false)
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false)
  const [isArchivedLeadsModalOpen, setIsArchivedLeadsModalOpen] = useState(false)
  const [openColumnPickerLeadId, setOpenColumnPickerLeadId] = useState<string | null>(null)
  const [isNarrowMobile, setIsNarrowMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 450px)').matches
  })
  const [openMobileColumnMap, setOpenMobileColumnMap] = useState<Record<string, boolean>>({})
  const [selectedBoardOptionId, setSelectedBoardOptionId] = useState<string>('')
  const [isLeadEntryNotificationEnabled, setIsLeadEntryNotificationEnabled] = useState(true)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'

    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const boardSelectorRef = useRef<HTMLDivElement | null>(null)
  const filtersDropdownRef = useRef<HTMLDivElement | null>(null)
  const searchDropdownRef = useRef<HTMLDivElement | null>(null)
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null)
  const mobileNavMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileSettingsDropdownRef = useRef<HTMLDivElement | null>(null)

  const [dragSnapshot, setDragSnapshot] = useState<BoardFullResponse | null>(null)

  const handleLogout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch (e: any) {
      // Even if backend logout fails, clear local session and redirect.
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    } finally {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    }
  }, [])

  const fetchBoardFull = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const res = await api.get<BoardFullResponse>('/boards/full')
      setData(sortColumnsAndLeads(res.data))
      setBoardIdAction(res.data.board.id)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar board'
      setError(String(msg))
      toastErrorFromException(e, TOAST_MESSAGES.error.loadBoard)
    } finally {
      setLoading(false)
    }
  }, [setBoardIdAction, setData, setError, setLoading])

  const fetchCurrentUser = useCallback(async () => {
    try {
      const me = await getMeRequest()
      setUserInfo(me)
    } catch (e: any) {
      setUserInfo(null)
      toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
    }
  }, [setUserInfo])

  const filteredData = useMemo(() => {
    if (!data) return data

    const term = searchTerm.toLowerCase().trim()
    const hasSearch = term.length > 0
    const selectedFilters = new Set(selectedLeadFilters)
    const hasActiveFilters = selectedFilters.size > 0

    const matchesLeadFilters = (lead: Lead) => {
      if (!hasActiveFilters) return true

      const status = lead.followUpSummary?.status ?? 'none'
      const temperature = lead.temperature

      return (
        (selectedFilters.has('favorite') && Boolean(lead.isFavorite)) ||
        (selectedFilters.has('none') && status === 'none') ||
        (selectedFilters.has('scheduled') && status === 'scheduled') ||
        (selectedFilters.has('today') && status === 'today') ||
        (selectedFilters.has('overdue') && status === 'overdue') ||
        (selectedFilters.has('hot') && temperature === 'hot') ||
        (selectedFilters.has('warm') && temperature === 'warm') ||
        (selectedFilters.has('cold') && temperature === 'cold')
      )
    }

    const filteredColumns = data.columns
      .map((col) => ({
        ...col,
        leads: col.leads.filter((lead) =>
          lead.state === 'active' &&
          (!hasSearch ||
            lead.name.toLowerCase().includes(term) ||
            (lead.email && lead.email.toLowerCase().includes(term)) ||
            lead.phone.toLowerCase().includes(term)) &&
          matchesLeadFilters(lead)
        )
      }))

    return { ...data, columns: filteredColumns }
  }, [data, searchTerm, selectedLeadFilters])

  const archivedLeads = useMemo(() => {
    if (!data) return [] as Lead[]

    return data.columns.flatMap((column) =>
      column.leads.filter((lead) => lead.state === 'archived')
    )
  }, [data])

  const unarchiveLeadToColumn = useCallback(
    (leadId: string, targetColumnId: string) => {
      setData((current) => {
        if (!current) return current

        let movedLead: Lead | null = null
        const updatedAt = new Date().toISOString()

        const withoutLead = current.columns.map((column) => {
          const idx = column.leads.findIndex((l) => l.id === leadId)
          if (idx === -1) return column

          movedLead = {
            ...column.leads[idx],
            state: 'active',
            updatedAt,
            columnId: targetColumnId
          }

          return {
            ...column,
            leads: column.leads
              .filter((l) => l.id !== leadId)
              .map((l, i) => ({ ...l, position: i }))
          }
        })

        if (!movedLead) return current

        const movedLeadSnapshot: Lead = movedLead

        const nextColumns = withoutLead.map((column) => {
          if (column.id !== targetColumnId) return column

          return {
            ...column,
            leads: [
              ...column.leads,
              { ...movedLeadSnapshot, position: column.leads.length }
            ]
          }
        })

        void api.patch(`/leads/${leadId}/archive`, { state: 'active' })
        toastSuccess('Lead reativado com sucesso')

        return { ...current, columns: nextColumns }
      })

      setOpenColumnPickerLeadId(null)
    },
    [setData]
  )

  const openLeadFromArchivedList = useCallback(
    (leadId: string) => {
      setOpenCreateFollowupOnLeadOpen(false)
      setSelectedLead(null)
      setLeadModalError(null)
      setSelectedLeadId(leadId)
      setOpenColumnPickerLeadId(null)
      setIsArchivedLeadsModalOpen(false)
    },
    [
      setOpenCreateFollowupOnLeadOpen,
      setSelectedLead,
      setLeadModalError,
      setSelectedLeadId
    ]
  )

  const leadFilterGroups = useMemo(
    () => [
      {
        title: null as string | null,
        options: [{ key: 'favorite' as const, label: 'Favoritos' }]
      },
      {
        title: 'Follow-up',
        options: [
          { key: 'none' as const, label: 'Sem follow-up' },
          { key: 'scheduled' as const, label: 'Agendados' },
          { key: 'today' as const, label: 'Hoje' },
          { key: 'overdue' as const, label: 'Atrasados' }
        ]
      },
      {
        title: 'Temperatura',
        options: [
          { key: 'hot' as const, label: 'Quente' },
          { key: 'warm' as const, label: 'Morno' },
          { key: 'cold' as const, label: 'Frio' }
        ]
      }
    ],
    []
  )

  const toggleLeadFilter = useCallback((key: LeadFilterKey) => {
    setSelectedLeadFilters((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    )
  }, [])

  const boardOptions = useMemo(() => {
    if (!data?.board) return []

    // Keeping this as an array so it is ready for multiple boards when available.
    return [
      {
        id: data.board.id,
        name: data.board.name
      }
    ]
  }, [data?.board])

  useEffect(() => {
    if (!boardOptions.length) return

    setSelectedBoardOptionId((prev) => (prev ? prev : boardOptions[0].id))
  }, [boardOptions])

  useEffect(() => {
    if (
      !isUserDataModalOpen &&
      !isPreferencesModalOpen &&
      !isNotificationsModalOpen &&
      !isArchivedLeadsModalOpen
    ) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsUserDataModalOpen(false)
      setIsPreferencesModalOpen(false)
      setIsNotificationsModalOpen(false)
      setIsArchivedLeadsModalOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    isUserDataModalOpen,
    isPreferencesModalOpen,
    isNotificationsModalOpen,
    isArchivedLeadsModalOpen
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(max-width: 450px)')
    const onChange = (event: MediaQueryListEvent) => {
      setIsNarrowMobile(event.matches)
    }

    setIsNarrowMobile(media.matches)
    media.addEventListener('change', onChange)

    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    if (!isNarrowMobile) return

    const columns = filteredData?.columns ?? []
    if (!columns.length) {
      setOpenMobileColumnMap({})
      return
    }

    setOpenMobileColumnMap((prev) => {
      const next: Record<string, boolean> = {}
      columns.forEach((column) => {
        if (typeof prev[column.id] === 'boolean') {
          next[column.id] = prev[column.id]
          return
        }
        next[column.id] = false
      })
      return next
    })
  }, [filteredData, isNarrowMobile])

  useEffect(() => {
    if (!isBoardSelectorOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!boardSelectorRef.current?.contains(target)) {
        setIsBoardSelectorOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBoardSelectorOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isBoardSelectorOpen])

  useEffect(() => {
    if (!isSettingsDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!settingsDropdownRef.current?.contains(target)) {
        setIsSettingsDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSettingsDropdownOpen])

  useEffect(() => {
    if (!isFiltersDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!filtersDropdownRef.current?.contains(target)) {
        setIsFiltersDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFiltersDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isFiltersDropdownOpen])

  useEffect(() => {
    if (!isSearchOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!searchDropdownRef.current?.contains(target)) {
        setIsSearchOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (!isMobileNavMenuOpen && !isMobileCreateDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!mobileNavMenuRef.current?.contains(target)) {
        setIsMobileNavMenuOpen(false)
        setIsMobileCreateDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavMenuOpen(false)
        setIsMobileCreateDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileNavMenuOpen, isMobileCreateDropdownOpen])

  useEffect(() => {
    if (!isMobileSettingsDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!mobileSettingsDropdownRef.current?.contains(target)) {
        setIsMobileSettingsDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSettingsDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileSettingsDropdownOpen])

  useEffect(() => {
    void fetchBoardFull()
    void fetchCurrentUser()
  }, [fetchBoardFull, fetchCurrentUser])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 6
      }
    })
  )

  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    return closestCenter(args)
  }, [])

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

  const getOverColumnId = useCallback(
    (overId: string) => {
      if (overId.startsWith('column-header-')) {
        return overId.replace('column-header-', '')
      }

      if (overId.startsWith('column-')) {
        return overId.replace('column-', '')
      }

      return leadIdToColumnId.get(overId) ?? null
    },
    [leadIdToColumnId]
  )

  const moveLeadLocally = useCallback(
    (
      currentData: BoardFullResponse,
      activeId: string,
      overId: string
    ): BoardFullResponse | null => {
      const fromColumnId = currentData.columns.find((column) =>
        column.leads.some((lead) => lead.id === activeId)
      )?.id

      const toColumnId = overId.startsWith('column-header-')
        ? overId.replace('column-header-', '')
        : overId.startsWith('column-')
          ? overId.replace('column-', '')
          : currentData.columns.find((column) =>
              column.leads.some((lead) => lead.id === overId)
            )?.id

      if (!fromColumnId || !toColumnId) return null

      const next: BoardFullResponse = {
        ...currentData,
        columns: currentData.columns.map((column) => ({
          ...column,
          leads: [...column.leads]
        }))
      }

      const fromColumn = next.columns.find((column) => column.id === fromColumnId)
      const toColumn = next.columns.find((column) => column.id === toColumnId)

      if (!fromColumn || !toColumn) return null

      const activeIndex = fromColumn.leads.findIndex((lead) => lead.id === activeId)
      if (activeIndex < 0) return null

      const [movedLead] = fromColumn.leads.splice(activeIndex, 1)

      let newIndex = 0

      if (overId.startsWith('column-header-') || overId.startsWith('column-')) {
        newIndex = toColumn.leads.length
      } else {
        const overIndex = toColumn.leads.findIndex((lead) => lead.id === overId)
        if (overIndex < 0) {
          newIndex = toColumn.leads.length
        } else if (fromColumnId === toColumnId && activeIndex <= overIndex) {
          // Same-column downward drag: active was before over in the original array.
          // After splicing active out, over shifted left by 1, so insert AFTER over.
          newIndex = overIndex + 1
        } else {
          newIndex = overIndex
        }
      }

      if (fromColumnId === toColumnId) {
        const originalIndex = currentData.columns
          .find((column) => column.id === fromColumnId)
          ?.leads.findIndex((lead) => lead.id === activeId)

        if (originalIndex === newIndex) {
          return currentData
        }
      }

      toColumn.leads.splice(newIndex, 0, {
        ...movedLead,
        columnId: toColumnId
      })

      fromColumn.leads = fromColumn.leads.map((lead, index) => ({
        ...lead,
        position: index
      }))

      toColumn.leads = toColumn.leads.map((lead, index) => ({
        ...lead,
        position: index
      }))

      return next
    },
    []
  )

  const onDragStart = useCallback(() => {
    if (!data) return

    setDragSnapshot({
      ...data,
      columns: data.columns.map((column) => ({
        ...column,
        leads: [...column.leads]
      }))
    })
  }, [data])

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!data) return

      const { active, over } = event
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)

      if (activeId === overId) return

      const next = moveLeadLocally(data, activeId, overId)
      if (!next || next === data) return

      setData(next)
    },
    [data, moveLeadLocally, setData]
  )

  const onDragCancel = useCallback(() => {
    if (dragSnapshot) {
      setData(dragSnapshot)
    }

    setDragSnapshot(null)
  }, [dragSnapshot, setData])

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!data || !boardId) {
        setDragSnapshot(null)
        return
      }

      const { active, over } = event

      if (!over) {
        if (dragSnapshot) setData(dragSnapshot)
        setDragSnapshot(null)
        return
      }

      const activeId = String(active.id)
      const overId = String(over.id)
      const originalColumnId =
        (dragSnapshot ?? data).columns.find((column) =>
          column.leads.some((lead) => lead.id === activeId)
        )?.id ?? null

      // During sortable drops, `over` can be the same as `active`.
      // In this case the UI state may already be correctly previewed by `onDragOver`,
      // so applying another local move here can corrupt the final order.
      const finalData =
        activeId === overId ? data : moveLeadLocally(data, activeId, overId) ?? data
      setData(finalData)

      const targetColumnId = getOverColumnId(overId)
      if (!targetColumnId) {
        if (dragSnapshot) setData(dragSnapshot)
        setDragSnapshot(null)
        return
      }

      const targetColumn = finalData.columns.find(
        (column) => column.id === targetColumnId
      )

      const movedLeadIndex =
        targetColumn?.leads.findIndex((lead) => lead.id === activeId) ?? -1

      if (movedLeadIndex < 0) {
        if (dragSnapshot) setData(dragSnapshot)
        setDragSnapshot(null)
        return
      }

      try {
        const movedLeadPatch = {
          lastActivityAt: new Date().toISOString(),
          movedAt: new Date().toISOString()
        }

        const movedLead = finalData.columns.flatMap((c) => c.leads).find((l) => l.id === activeId)
        await api.patch(`/leads/${activeId}/move`, {
          boardId: movedLead?.boardId ?? boardId,
          toColumnId: targetColumnId,
          toPosition: movedLeadIndex
        })

        setData((current) => {
          if (!current) return current

          return {
            ...current,
            columns: current.columns.map((column) => ({
              ...column,
              leads: column.leads.map((lead) =>
                lead.id === activeId ? { ...lead, ...movedLeadPatch } : lead
              )
            }))
          }
        })

        const targetColumnOnEnter = finalData.columns.find(
          (column) => column.id === targetColumnId
        )?.onEnter

        const columnHasAutomations = targetColumnOnEnter && (
          targetColumnOnEnter.createFollowUp ||
          targetColumnOnEnter.favoriteLead ||
          targetColumnOnEnter.markAllFollowUpsAsDone ||
          targetColumnOnEnter.resetLastActivityAt
        )

        if (columnHasAutomations) {
          await fetchBoardFull()
        }

        if (originalColumnId && originalColumnId !== targetColumnId) {
          toastSuccess(getMoveLeadColumnToastMessage(targetColumn?.name))
        }
      } catch (e) {
        console.error('Erro ao mover lead:', e)
        toastErrorFromException(e, TOAST_MESSAGES.error.unexpected)
        if (dragSnapshot) setData(dragSnapshot)
        await fetchBoardFull()
      } finally {
        setDragSnapshot(null)
      }
    },
    [
      data,
      boardId,
      dragSnapshot,
      getOverColumnId,
      moveLeadLocally,
      setData,
      fetchBoardFull
    ]
  )

  return (
    <>
      <GlobalStyle $themeMode={themeMode} />

      <Page>
        <BottomFixedBackground />

        <BottomBrand>
          <BottomBrandDot />
          <BottomBrandText>Strativy.co</BottomBrandText>
        </BottomBrand>

        <BoardOuter>
          <BoardShell>
            <BoardHeader>
              <BoardHeaderTopRow>
                <BoardSelectorWrapper ref={boardSelectorRef}>
                  <BoardTitleButton
                    type="button"
                    onClick={() => {
                      setIsBoardSelectorOpen((prev) => !prev)
                    }}
                    aria-label="Selecionar board"
                    title="Selecionar board"
                  >
                    <BoardTitle>{data?.board?.name ?? 'Seu Board'}</BoardTitle>
                    <BoardTitleCaret>{isBoardSelectorOpen ? '▴' : '▾'}</BoardTitleCaret>
                  </BoardTitleButton>

                  {isBoardSelectorOpen ? (
                    <BoardSelectorDropdown>
                      {boardOptions.map((option) => {
                        const isSelected = option.id === selectedBoardOptionId

                        return (
                          <BoardSelectorOption
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedBoardOptionId(option.id)
                              setIsBoardSelectorOpen(false)

                              if (option.id !== boardId) {
                                setBoardIdAction(option.id)
                              }
                            }}
                            aria-label={`Selecionar board ${option.name}`}
                            title={option.name}
                          >
                            <BoardOptionCircle $selected={isSelected} />
                            <BoardOptionName>{option.name}</BoardOptionName>
                          </BoardSelectorOption>
                        )
                      })}
                    </BoardSelectorDropdown>
                  ) : null}
                </BoardSelectorWrapper>

                <BoardHeaderActions ref={mobileNavMenuRef}>
                  <SettingsButton
                    type="button"
                    onClick={() => {
                      setIsMobileNavMenuOpen(false)
                      setIsMobileCreateDropdownOpen(false)
                      setIsMobileSettingsDropdownOpen(false)
                      setIsArchivedLeadsModalOpen(true)
                    }}
                    aria-label="Abrir modal de arquivados"
                    title={`Arquivados${archivedLeads.length > 0 ? ` (${archivedLeads.length})` : ''}`}
                  >
                    <Archive size={18} />
                  </SettingsButton>

                  <SettingsDropdownWrapper>
                    <SettingsButton
                      type="button"
                      onClick={() => {
                        setIsMobileCreateDropdownOpen(false)
                        setIsMobileSettingsDropdownOpen(false)
                        setIsMobileNavMenuOpen((prev) => !prev)
                      }}
                      aria-label="Abrir filtros"
                      title="Filtros"
                    >
                      <Filter size={18} />
                    </SettingsButton>

                    {isMobileNavMenuOpen ? (
                      <MobileNavMenuDropdown>
                        <MobileNavMenuSectionTitle>Buscar leads</MobileNavMenuSectionTitle>
                        <MobileNavFilterSearchInput
                          type="text"
                          placeholder="Nome, telefone, email"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <MobileNavMenuSectionTitle>Filtros</MobileNavMenuSectionTitle>
                        <MobileNavFiltersList>
                          {leadFilterGroups.map((group) => (
                            <FiltersGroup key={group.title ?? 'favorites'}>
                              {group.title ? <FiltersGroupTitle>{group.title}</FiltersGroupTitle> : null}

                              {group.options.map((option) => {
                                const isSelected = selectedLeadFilters.includes(option.key)

                                return (
                                  <FiltersDropdownOption
                                    key={option.key}
                                    type="button"
                                    onClick={() => {
                                      toggleLeadFilter(option.key)
                                    }}
                                  >
                                    <FiltersOptionLabel>{option.label}</FiltersOptionLabel>
                                    {isSelected ? <Check size={14} /> : <FiltersCheckPlaceholder />}
                                  </FiltersDropdownOption>
                                )
                              })}
                            </FiltersGroup>
                          ))}
                        </MobileNavFiltersList>
                      </MobileNavMenuDropdown>
                    ) : null}
                  </SettingsDropdownWrapper>

                  <SettingsDropdownWrapper>
                    <SettingsButton
                      type="button"
                      onClick={() => {
                        setIsMobileNavMenuOpen(false)
                        setIsMobileSettingsDropdownOpen(false)
                        setIsMobileCreateDropdownOpen((prev) => !prev)
                      }}
                      aria-label="Abrir menu de criação"
                      title="Criar"
                    >
                      <Plus size={18} />
                    </SettingsButton>

                    {isMobileCreateDropdownOpen ? (
                      <SettingsDropdownMenu>
                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setCreateColumnError(null)
                            setIsCreateColumnModalOpen(true)
                            setIsMobileCreateDropdownOpen(false)
                          }}
                        >
                          Nova coluna
                        </SettingsDropdownOption>

                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setCreateLeadColumnId('')
                            setIsCreateLeadModalOpen(true)
                            setIsMobileCreateDropdownOpen(false)
                          }}
                        >
                          Novo lead
                        </SettingsDropdownOption>
                      </SettingsDropdownMenu>
                    ) : null}
                  </SettingsDropdownWrapper>

                  <SettingsDropdownWrapper ref={mobileSettingsDropdownRef}>
                    <SettingsButton
                      type="button"
                      onClick={() => {
                        setIsMobileNavMenuOpen(false)
                        setIsMobileCreateDropdownOpen(false)
                        setIsMobileSettingsDropdownOpen((prev) => !prev)
                      }}
                      aria-label="Abrir menu de configurações"
                      title="Configurações"
                    >
                      <Settings size={18} />
                    </SettingsButton>

                    {isMobileSettingsDropdownOpen ? (
                      <SettingsDropdownMenu>
                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setIsUserDataModalOpen(true)
                            setIsMobileSettingsDropdownOpen(false)
                          }}
                        >
                          <SettingsOptionWithIcon>
                            <CircleUser size={14} />
                            Dados do usuário
                          </SettingsOptionWithIcon>
                        </SettingsDropdownOption>

                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setIsPreferencesModalOpen(true)
                            setIsMobileSettingsDropdownOpen(false)
                          }}
                        >
                          <SettingsOptionWithIcon>
                            <Settings2 size={14} />
                            Preferências
                          </SettingsOptionWithIcon>
                        </SettingsDropdownOption>

                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setIsMobileSettingsDropdownOpen(false)
                            void handleLogout()
                          }}
                        >
                          <SettingsOptionWithIcon>
                            <LogOut size={14} />
                            Logout
                          </SettingsOptionWithIcon>
                        </SettingsDropdownOption>
                      </SettingsDropdownMenu>
                    ) : null}
                  </SettingsDropdownWrapper>
                </BoardHeaderActions>
              </BoardHeaderTopRow>

            </BoardHeader>

            <ColumnsArea>
              {!filteredData ? (
                <EmptyState>
                  <EmptyTitle>Board não carregado</EmptyTitle>
                  <EmptyText>
                    Clique em <b>Atualizar leads</b> para buscar os dados.
                  </EmptyText>
                </EmptyState>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={collisionDetectionStrategy}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  onDragCancel={onDragCancel}
                >
                  <ColumnsRow>
                    {filteredData.columns.map((col) => {
                      const isColumnOpen = !isNarrowMobile || Boolean(openMobileColumnMap[col.id])

                      return (
                      <Column key={col.id}>
                        <DroppableColumnHeader
                          columnId={col.id}
                          onClick={() => {
                            if (!isNarrowMobile) return

                            setOpenMobileColumnMap((prev) => ({
                              ...prev,
                              [col.id]: !prev[col.id]
                            }))
                          }}
                        >
                          <ColumnTitleGroup>
                            <ColumnAccordionToggle
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setOpenMobileColumnMap((prev) => ({
                                  ...prev,
                                  [col.id]: !prev[col.id]
                                }))
                              }}
                              $open={isColumnOpen}
                              aria-label={isColumnOpen
                                ? `Fechar coluna ${col.name}`
                                : `Abrir coluna ${col.name}`}
                              title={isColumnOpen ? 'Fechar coluna' : 'Abrir coluna'}
                            >
                              <ArrowRight size={14} />
                            </ColumnAccordionToggle>
                            <ColumnName>{col.name}</ColumnName>
                            <ColumnCount>({col.leads.length})</ColumnCount>
                          </ColumnTitleGroup>

                          <ColumnActionsMenu
                            column={col}
                            activeSort={columnSorts[col.id]}
                            onSort={(columnId, sort) =>
                              setColumnSorts((prev) => {
                                if (prev[columnId] === sort) {
                                  const next = { ...prev }
                                  delete next[columnId]
                                  return next
                                }
                                return { ...prev, [columnId]: sort }
                              })
                            }
                            onOpenSettings={(column) => {
                              setAutomationsModalColumn(column)
                              setIsAutomationsModalOpen(true)
                            }}
                            onDeleteColumn={(column) => {
                              setSelectedColumn(column)
                              setColumnModalMode('delete')
                              setIsColumnModalOpen(true)
                            }}
                          />
                        </DroppableColumnHeader>

                        {isColumnOpen ? (
                        <DroppableColumnBody columnId={col.id}>
                          <SortableContext
                            items={(col.leads ?? []).map((l) => l.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {((() => {
                              const sort = columnSorts[col.id]
                              if (!sort) return col.leads ?? []
                              const leads = [...(col.leads ?? [])]
                              const followUpOrder = (lead: Lead): number => {
                                const s = lead.followUpSummary?.status ?? 'none'
                                if (s === 'overdue') return 0
                                if (s === 'today') return 1
                                if (s === 'scheduled') return 2
                                return 3
                              }
                              const temperatureOrder = (lead: Lead): number => {
                                if (lead.temperature === 'hot') return 0
                                if (lead.temperature === 'warm') return 1
                                if (lead.temperature === 'cold') return 2
                                return 3
                              }
                              if (sort === 'newest') {
                                leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              } else if (sort === 'oldest') {
                                leads.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                              } else if (sort === 'next-followup') {
                                leads.sort((a, b) => followUpOrder(a) - followUpOrder(b))
                              } else if (sort === 'no-followup') {
                                leads.sort((a, b) => {
                                  const aNone = (a.followUpSummary?.status ?? 'none') === 'none' ? 0 : 1
                                  const bNone = (b.followUpSummary?.status ?? 'none') === 'none' ? 0 : 1
                                  return aNone - bNone
                                })
                              } else if (sort === 'favorites') {
                                leads.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
                              } else if (sort === 'temperature') {
                                leads.sort((a, b) => {
                                  const temperatureDifference = temperatureOrder(a) - temperatureOrder(b)
                                  if (temperatureDifference !== 0) return temperatureDifference

                                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                })
                              }
                              return leads
                            })()).map((lead) => (
                              <SortableLeadCard
                                key={lead.id}
                                lead={lead}
                                isDragDisabled={isNarrowMobile}
                              />
                            ))}
                          </SortableContext>

                          <AddLeadButton
                            type="button"
                            onClick={() => {
                              setCreateLeadColumnId(col.id)
                              setIsCreateLeadModalOpen(true)
                            }}
                            aria-label={`Adicionar lead à coluna ${col.name}`}
                            title="Adicionar lead"
                          >
                            <Plus size={16} />
                            Adicionar lead
                          </AddLeadButton>
                        </DroppableColumnBody>
                        ) : null}
                      </Column>
                      )
                    })}

                    <AddColumnButton
                      type="button"
                      onClick={() => {
                        setCreateColumnError(null)
                        setIsCreateColumnModalOpen(true)
                      }}
                      aria-label="Adicionar coluna"
                      title="Adicionar coluna"
                    >
                      <Plus size={20} />
                      Adicionar coluna
                    </AddColumnButton>
                  </ColumnsRow>
                </DndContext>
              )}
            </ColumnsArea>
          </BoardShell>
        </BoardOuter>
      </Page>

      {isUserDataModalOpen ? (
        <ModalOverlay
          onClick={() => {
            setIsUserDataModalOpen(false)
          }}
        >
          <SettingsModalCard
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <SettingsModalHeader>
              <SettingsModalTitle>Dados do usuário</SettingsModalTitle>

              <SettingsCloseIconButton
                type="button"
                onClick={() => {
                  setIsUserDataModalOpen(false)
                }}
                aria-label="Fechar modal de dados do usuário"
                title="Fechar"
              >
                <X size={18} />
              </SettingsCloseIconButton>
            </SettingsModalHeader>

            <InfoList>
              <InfoRow>
                <InfoLabel>Email</InfoLabel>
                <InfoValue>{userInfo?.email ?? '—'}</InfoValue>
              </InfoRow>
            </InfoList>
          </SettingsModalCard>
        </ModalOverlay>
      ) : null}

      {isPreferencesModalOpen ? (
        <ModalOverlay
          onClick={() => {
            setIsPreferencesModalOpen(false)
          }}
        >
          <SettingsModalCard
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <SettingsModalHeader>
              <SettingsModalTitle>Preferências</SettingsModalTitle>

              <SettingsCloseIconButton
                type="button"
                onClick={() => {
                  setIsPreferencesModalOpen(false)
                }}
                aria-label="Fechar modal de preferências"
                title="Fechar"
              >
                <X size={18} />
              </SettingsCloseIconButton>
            </SettingsModalHeader>

            <PreferencesBody>
              <PreferenceRow>
                <PreferenceLabel>Tema escuro</PreferenceLabel>
                <PreferenceToggle
                  type="button"
                  $active={themeMode === 'dark'}
                  onClick={() => {
                    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
                  }}
                  aria-label={themeMode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
                  title={themeMode === 'dark' ? 'Tema escuro ativo' : 'Tema claro ativo'}
                >
                  <PreferenceToggleDot $active={themeMode === 'dark'} />
                </PreferenceToggle>
              </PreferenceRow>
            </PreferencesBody>
          </SettingsModalCard>
        </ModalOverlay>
      ) : null}

      {isNotificationsModalOpen ? (
        <ModalOverlay
          onClick={() => {
            setIsNotificationsModalOpen(false)
          }}
        >
          <SettingsModalCard
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <SettingsModalHeader>
              <SettingsModalTitle>
                  Notificações
              </SettingsModalTitle>

              <SettingsCloseIconButton
                type="button"
                onClick={() => {
                  setIsNotificationsModalOpen(false)
                }}
                aria-label="Fechar modal de notificações"
                title="Fechar"
              >
                <X size={18} />
              </SettingsCloseIconButton>
            </SettingsModalHeader>

            <PreferencesBody>
              <PreferenceRow>
                <PreferenceLabel>Entrada de lead</PreferenceLabel>
                <PreferenceToggle
                  type="button"
                  $active={isLeadEntryNotificationEnabled}
                  onClick={() => {
                    setIsLeadEntryNotificationEnabled((prev) => !prev)
                  }}
                  aria-label={isLeadEntryNotificationEnabled
                    ? 'Desativar notificação de entrada de lead'
                    : 'Ativar notificação de entrada de lead'}
                  title={isLeadEntryNotificationEnabled
                    ? 'Notificação de entrada de lead ativa'
                    : 'Notificação de entrada de lead inativa'}
                >
                  <PreferenceToggleDot $active={isLeadEntryNotificationEnabled} />
                </PreferenceToggle>
              </PreferenceRow>
            </PreferencesBody>
          </SettingsModalCard>
        </ModalOverlay>
      ) : null}

      {isArchivedLeadsModalOpen ? (
        <ModalOverlay
          onClick={() => {
            setIsArchivedLeadsModalOpen(false)
            setOpenColumnPickerLeadId(null)
          }}
        >
          <SettingsModalCard
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <SettingsModalHeader>
              <SettingsModalTitle>Arquivados</SettingsModalTitle>

              <SettingsCloseIconButton
                type="button"
                onClick={() => {
                  setIsArchivedLeadsModalOpen(false)
                  setOpenColumnPickerLeadId(null)
                }}
                aria-label="Fechar modal de arquivados"
                title="Fechar"
              >
                <X size={18} />
              </SettingsCloseIconButton>
            </SettingsModalHeader>

            {archivedLeads.length === 0 ? (
              <AutomationsEmptyState>
                <AutomationsEmptyTitle>Nenhum lead arquivado</AutomationsEmptyTitle>
                <AutomationsEmptyText>
                  Quando um lead for arquivado, ele aparecera aqui.
                </AutomationsEmptyText>
              </AutomationsEmptyState>
            ) : (
              <AutomationsEntryList>
                {archivedLeads.map((lead) => (
                  <AutomationsEntryListItem
                    key={lead.id}
                    onClick={() => {
                      openLeadFromArchivedList(lead.id)
                    }}
                  >
                    <AutomationsEntryListItemTop>
                      <AutomationsEntryMainLine>
                        <InfoValue>
                          <AutomationsEntryItemCategory>LEAD</AutomationsEntryItemCategory>
                          {lead.name}
                        </InfoValue>
                      </AutomationsEntryMainLine>

                      <FollowUpItemActions>
                        <ArchivedColumnPickerWrapper
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                        >
                          {openColumnPickerLeadId === lead.id ? (
                            <ArchivedPickerBackdrop
                              onClick={(event) => {
                                event.stopPropagation()
                                setOpenColumnPickerLeadId(null)
                              }}
                            />
                          ) : null}

                          <FollowUpActionIconButton
                            type="button"
                            onClick={() => {
                              setOpenColumnPickerLeadId((prev) =>
                                prev === lead.id ? null : lead.id
                              )
                            }}
                            aria-label="Escolher coluna para reativar lead"
                            title="Reativar em coluna"
                          >
                            <RotateCcw size={16} />
                          </FollowUpActionIconButton>

                          {openColumnPickerLeadId === lead.id ? (
                            <LeadMoveDropdown>
                              <MoveColumnLabel>Mover para</MoveColumnLabel>
                              {(data?.columns ?? []).map((column) => (
                                <LeadMoveOptionButton
                                  key={column.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    unarchiveLeadToColumn(lead.id, column.id)
                                  }}
                                >
                                  {column.name}
                                </LeadMoveOptionButton>
                              ))}
                            </LeadMoveDropdown>
                          ) : null}
                        </ArchivedColumnPickerWrapper>
                      </FollowUpItemActions>
                    </AutomationsEntryListItemTop>
                  </AutomationsEntryListItem>
                ))}
              </AutomationsEntryList>
            )}
          </SettingsModalCard>
        </ModalOverlay>
      ) : null}

      <LeadDetailsModal onRefreshBoard={fetchBoardFull} />
      <SettingsModal />
      <ColumnActionsModal onRefreshBoard={fetchBoardFull} />
      <CreateColumnModal onRefreshBoard={fetchBoardFull} />
      <AutomationsModal onRefreshBoard={fetchBoardFull} />
      <CreateLeadModal
        columns={data?.columns ?? []}
        onRefreshBoard={fetchBoardFull}
        initialColumnId={createLeadColumnId}
        onClose={() => setCreateLeadColumnId('')}
      />
    </>
  )
}

// ----------------------------
// Styles
// ----------------------------
