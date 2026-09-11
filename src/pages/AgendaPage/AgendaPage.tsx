import {
  Archive,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  GitBranch,
  ListFilter,
  Mail,
  MailX,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Thermometer,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import 'react-day-picker/style.css'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { DelayedTooltip } from '../../core/components/DelayedTooltip'
import { DesktopTableSkeleton } from '../../core/components/DesktopTableSkeleton'
import { FollowUpActionFields } from '../../core/components/FollowUpActionFields'
import { MobileListSkeleton } from '../../core/components/MobileListSkeleton'
import { TotalCount } from '../../core/components/TotalCount'
import {
  initialFollowUpActionDraft,
  isFollowUpActionDraftValid,
  toFollowUpActionPayload,
} from '../../core/components/followUpActionDraft'
import type { FollowUpActionDraft } from '../../core/components/followUpActionDraft'
import { getFollowUpStatusPresentation } from '../../core/components/followUpStatusPresentation'
import { getLeadSourceTagPresentation } from '../../core/components/leadSourceTagPresentation'
import {
  formatDateTime,
  getApiDateTimestamp,
  parseApiDateToBrowserDate,
} from '../../core/utils/dateTime'
import { useLeadsBootstrap } from '../../features/leads/hooks/useLeadsBootstrap'
import { findPrimaryFollowUpActionStep } from '../../features/followup/utils/followUpAutomationTree'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import type {
  CreateFollowUpStepTreeItemPayload,
  FollowUpStepTreeActionType,
  FollowUpStepTreeConditionType,
  NegotiationFollowUpResponse,
  NegotiationResponse,
} from '../../features/webhook/types/webhook.types'
import LeadPage from '../LeadPage'

type AgendaFollowUpFilter = 'all' | 'none' | 'scheduled' | 'today' | 'overdue'
type AgendaFollowUpFormTab = 'information' | 'automation' | 'automationList'

type AgendaAutomationAction =
  | 'createFollowUp'
  | 'qualifyLead'
  | 'changeNegotiationStage'
  | 'changeNegotiationStatus'
  | 'changeNegotiationTemperature'
  | 'archiveLead'
  | 'deleteNegotiation'
  | 'deleteLead'

type AgendaAutomationCondition = 'replied' | 'notReplied' | 'deadlineReached'
type AgendaAutomationExecutionTiming = 'immediately' | 'afterPeriod'
type AgendaAutomationWaitUnit = 'minutes' | 'hours' | 'days'

const isAgendaReplyCondition = (
  conditionType: AgendaAutomationCondition,
): boolean => conditionType === 'replied' || conditionType === 'notReplied'

type AgendaAutomationFollowUpDraft = {
  title: string
  action: FollowUpActionDraft
  dueAt: string
}

type AgendaAutomationConditionItem = {
  id: string
  parentId: string | null
  type: 'condition'
  conditionType: AgendaAutomationCondition
}

type AgendaAutomationActionItem = {
  id: string
  parentId: string | null
  type: 'action'
  actionType: AgendaAutomationAction
  value: string
  waitTime: number
  waitUnit: AgendaAutomationWaitUnit
  scheduledAt: string | null
  followUp: AgendaAutomationFollowUpDraft | null
}

type AgendaAutomationItem =
  | AgendaAutomationConditionItem
  | AgendaAutomationActionItem

type AgendaAutomationTreeIcon =
  | 'agenda'
  | 'archive'
  | 'delete'
  | 'message'
  | 'mail'
  | 'user'
  | 'stage'
  | 'status'
  | 'temperature'
  | 'viewed'
  | 'followUp'

type AgendaAutomationTreeNode = {
  id: string
  automationId: string
  displayId: string
  title: string
  description?: string
  detail?: string
  icon: AgendaAutomationTreeIcon
  children?: AgendaAutomationTreeNode[]
}

type AgendaVisualStatus = 'overdue' | 'today' | 'scheduled' | 'completed'

type AgendaSortKey = 'title' | 'lead' | 'negotiation' | 'dateTime' | 'status'
type AgendaSortDirection = 'asc' | 'desc'
type AgendaDateSortFocus = 'recentFirst' | 'oldestFirst' | 'noDateFirst'
type AgendaStatusSortFocus = 'overdue' | 'today' | 'scheduled' | 'completed'

const AGENDA_TABLE_ROW_HEIGHT_PX = 60
const agendaFollowUpStatusOptions: Array<{
  value: AgendaRow['status']
  label: string
}> = [
  { value: 'done', label: 'Concluído' },
  { value: 'canceled', label: 'Cancelado' },
]

const rotateValues = <T,>(values: T[], startValue: T | null): T[] => {
  if (!values.length || startValue === null) {
    return values
  }

  const startIndex = values.indexOf(startValue)
  if (startIndex < 0) {
    return values
  }

  return [...values.slice(startIndex), ...values.slice(0, startIndex)]
}

type AgendaRow = {
  followUpId: string
  leadId: string
  negotiationId: string
  leadName: string
  negotiationTitle: string
  automationActionCount: number
  title: string
  dueAt: string
  status: 'pending' | 'done' | 'canceled' | 'skipped'
  actions: NegotiationFollowUpResponse['steps']
  leadIsFavorite: boolean
  leadState: 'active' | 'archived'
  leadCreatedAt: string | Date | null
}

type AgendaFollowUpDraft = {
  leadId: string
  negotiationId: string
  title: string
  action: FollowUpActionDraft
  dueAt: string
}

type AgendaStatusTagProps = {
  disabled: boolean
  presentation: ReturnType<typeof getFollowUpStatusPresentation>
  status: AgendaRow['status']
  onChange: (status: AgendaRow['status']) => void
}

const AgendaStatusTag = ({
  disabled,
  presentation,
  status,
  onChange,
}: AgendaStatusTagProps) => (
  <span
    style={{
      position: 'relative',
      fontSize: 12,
      fontWeight: 700,
      color: presentation.textColor,
      whiteSpace: 'nowrap',
      background: presentation.background,
      border: `1px solid ${presentation.textColor}`,
      borderRadius: 6,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '7px 12px',
      lineHeight: 1.1,
      opacity: disabled ? 0.65 : 1,
    }}
    onClick={(event) => event.stopPropagation()}
  >
    {presentation.label}
    <select
      aria-label="Alterar status do follow-up"
      value={status}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as AgendaRow['status'])}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'wait' : 'pointer',
        appearance: 'none',
        opacity: 0,
      }}
    >
      {agendaFollowUpStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </span>
)

const initialAgendaFollowUpDraft: AgendaFollowUpDraft = {
  leadId: '',
  negotiationId: '',
  title: '',
  action: initialFollowUpActionDraft,
  dueAt: '',
}

const initialAgendaAutomationFollowUpDraft: AgendaAutomationFollowUpDraft = {
  title: '',
  action: initialFollowUpActionDraft,
  dueAt: '',
}

const agendaAutomationActionOptions: Array<{
  value: AgendaAutomationAction
  label: string
}> = [
  { value: 'createFollowUp', label: 'Criar follow-up' },
  { value: 'qualifyLead', label: 'Qualificar lead' },
  { value: 'changeNegotiationStage', label: 'Alterar etapa negócio' },
  { value: 'changeNegotiationStatus', label: 'Alterar status negócio' },
  {
    value: 'changeNegotiationTemperature',
    label: 'Alterar temperatura negócio',
  },
  { value: 'archiveLead', label: 'Arquivar lead' },
  { value: 'deleteNegotiation', label: 'Deletar negócio' },
  { value: 'deleteLead', label: 'Deletar lead' },
]

const agendaAutomationConditionOptions: Array<{
  value: AgendaAutomationCondition
  label: string
}> = [
  { value: 'replied', label: 'Houve resposta' },
  { value: 'notReplied', label: 'Não houve resposta' },
  { value: 'deadlineReached', label: 'Prazo atingido' },
]

const agendaAutomationWaitUnitOptions: Array<{
  value: AgendaAutomationWaitUnit
  label: string
}> = [
  { value: 'minutes', label: 'Minuto' },
  { value: 'hours', label: 'Hora' },
  { value: 'days', label: 'Dia' },
]

const agendaAutomationValueOptions: Partial<
  Record<AgendaAutomationAction, Array<{ value: string; label: string }>>
> = {
  qualifyLead: [
    { value: 'qualify', label: 'Qualificado' },
    { value: 'not qualify', label: 'Não qualificado' },
  ],
  changeNegotiationStage: [
    { value: 'NEW', label: 'Novo' },
    { value: 'CONTACTED', label: 'Contatado' },
    { value: 'QUALIFIED', label: 'Qualificado' },
    { value: 'PROPOSAL_SENT', label: 'Proposta enviada' },
    { value: 'NEGOTIATION', label: 'Negociação' },
  ],
  changeNegotiationStatus: [
    { value: 'OPEN', label: 'Em Aberto' },
    { value: 'WON', label: 'Ganho' },
    { value: 'LOST', label: 'Perdido' },
  ],
  changeNegotiationTemperature: [
    { value: 'hot', label: 'Quente' },
    { value: 'warm', label: 'Morno' },
    { value: 'cold', label: 'Frio' },
  ],
}

const agendaAutomationValueLabels: Partial<
  Record<AgendaAutomationAction, string>
> = {
  qualifyLead: 'Qualificação',
  changeNegotiationStage: 'Etapa',
  changeNegotiationStatus: 'Status',
  changeNegotiationTemperature: 'Temperatura',
}

const agendaAutomationActionTypeMap: Record<
  AgendaAutomationAction,
  FollowUpStepTreeActionType
> = {
  createFollowUp: 'create_follow_up',
  qualifyLead: 'qualify_lead',
  changeNegotiationStage: 'change_stage',
  changeNegotiationStatus: 'change_status',
  changeNegotiationTemperature: 'change_temperature',
  archiveLead: 'archive_lead',
  deleteNegotiation: 'delete_negotiation',
  deleteLead: 'delete_lead',
}

const agendaAutomationConditionTypeMap: Record<
  AgendaAutomationCondition,
  FollowUpStepTreeConditionType
> = {
  replied: 'response_received',
  notReplied: 'no_response',
  deadlineReached: 'deadline_reached',
}

const toAgendaAutomationStepPayload = (
  automation: AgendaAutomationItem,
): CreateFollowUpStepTreeItemPayload => {
  if (automation.type === 'condition') {
    return {
      clientId: automation.id,
      parentClientId: automation.parentId,
      type: 'condition',
      conditionType: agendaAutomationConditionTypeMap[automation.conditionType],
    }
  }

  const payload: Record<string, unknown> =
    automation.actionType === 'createFollowUp' && automation.followUp
      ? {
          title: automation.followUp.title,
          dueAt: automation.followUp.dueAt,
          action: toFollowUpActionPayload(automation.followUp.action),
        }
      : automation.actionType === 'qualifyLead'
        ? { qualification: automation.value }
        : automation.actionType === 'changeNegotiationStage'
          ? { stage: automation.value }
          : automation.actionType === 'changeNegotiationStatus'
            ? { status: automation.value }
            : automation.actionType === 'changeNegotiationTemperature'
              ? { temperature: automation.value }
              : {}

  return {
    clientId: automation.id,
    parentClientId: automation.parentId,
    type: 'action',
    actionType: agendaAutomationActionTypeMap[automation.actionType],
    waitTime: automation.waitTime,
    waitUnit: automation.waitUnit,
    payload,
  }
}

type AgendaDateTimeInputProps = {
  value: string
  onChange: (nextValue: string) => void
  isMobile: boolean
}

const parseDateTimeLocalValue = (
  value: string,
): { date: Date | null; time: string } => {
  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return { date: null, time: '' }
  }

  const [datePart, timePart] = normalizedValue.split('T')
  if (!datePart || !timePart) {
    return { date: null, time: '' }
  }

  const [yearRaw, monthRaw, dayRaw] = datePart.split('-')
  if (!yearRaw || !monthRaw || !dayRaw) {
    return { date: null, time: '' }
  }

  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return { date: null, time: '' }
  }

  const parsedDate = new Date(year, month - 1, day)
  if (Number.isNaN(parsedDate.getTime())) {
    return { date: null, time: '' }
  }

  return {
    date: parsedDate,
    time: timePart.slice(0, 5),
  }
}

const buildDateTimeLocalValue = (date: Date, time: string): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : '09:00'

  return `${year}-${month}-${day}T${normalizedTime}`
}

const formatDatePickerLabel = (date: Date | null): string => {
  if (!date) {
    return 'Selecionar data'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function AgendaDateTimeInput({
  value,
  onChange,
  isMobile,
}: AgendaDateTimeInputProps) {
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false)
  const [draftTime, setDraftTime] = useState<string>('09:00')
  const pickerContainerRef = useRef<HTMLDivElement | null>(null)
  const parsedValue = parseDateTimeLocalValue(value)
  const fieldHeight = isMobile ? 46 : 42

  useEffect(() => {
    if (parsedValue.time) {
      setDraftTime(parsedValue.time)
    }
  }, [parsedValue.time])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!pickerContainerRef.current) {
        return
      }

      if (pickerContainerRef.current.contains(event.target as Node)) {
        return
      }

      setIsPickerOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <div
      ref={pickerContainerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
      }}
    >
      <button
        type="button"
        onClick={() => setIsPickerOpen((current) => !current)}
        style={{
          flex: 1,
          minWidth: 0,
          height: fieldHeight,
          border: '1px solid #d7dce4',
          borderRadius: 10,
          padding: '0 12px',
          color: parsedValue.date ? '#111827' : '#6b7280',
          fontSize: isMobile ? 17 / 1.2 : 14,
          fontWeight: 600,
          background: '#ffffff',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxSizing: 'border-box',
        }}
        aria-label="Selecionar data do follow-up"
      >
        <CalendarClock size={16} color="#6b7280" />
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {formatDatePickerLabel(parsedValue.date)}
        </span>
      </button>

      <input
        type="time"
        value={parsedValue.time || draftTime}
        onChange={(event) => {
          const nextTime = event.target.value
          setDraftTime(nextTime)

          if (parsedValue.date) {
            onChange(buildDateTimeLocalValue(parsedValue.date, nextTime))
          }
        }}
        style={{
          width: isMobile ? 108 : 104,
          height: fieldHeight,
          border: '1px solid #d7dce4',
          borderRadius: 10,
          padding: '0 10px',
          color: '#111827',
          fontSize: isMobile ? 17 / 1.2 : 14,
          boxSizing: 'border-box',
          background: '#ffffff',
        }}
        aria-label="Selecionar horário do follow-up"
      />

      {isPickerOpen ? (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            padding: 12,
            zIndex: 60,
          }}
        >
          <DayPicker
            mode="single"
            selected={parsedValue.date ?? undefined}
            onSelect={(selectedDate) => {
              if (!selectedDate) {
                onChange('')
                return
              }

              const nextTime = parsedValue.time || draftTime || '09:00'
              onChange(buildDateTimeLocalValue(selectedDate, nextTime))
              setIsPickerOpen(false)
            }}
            weekStartsOn={1}
            showOutsideDays
          />
        </div>
      ) : null}
    </div>
  )
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
  WebkitTapHighlightColor: 'transparent',
})

const formatAgendaDateTimeLabel = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  return formatDateTime(value)
}

const getAgendaVisualStatus = (
  status: AgendaRow['status'],
  dueAt: string,
): AgendaVisualStatus => {
  if (status !== 'pending') {
    return 'completed'
  }

  const parsedDate = parseApiDateToBrowserDate(dueAt)
  if (!parsedDate) {
    return 'scheduled'
  }

  const now = new Date()
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  )

  if (parsedDate < now) {
    return 'overdue'
  }

  if (parsedDate <= endOfToday) {
    return 'today'
  }

  return 'scheduled'
}

const getAgendaDateTagColors = (
  status: AgendaVisualStatus,
): { textColor: string; background: string } => {
  if (status === 'overdue') {
    return {
      textColor: '#b91c1c',
      background: '#fee2e2',
    }
  }

  if (status === 'today') {
    return {
      textColor: '#b45309',
      background: '#fef3c7',
    }
  }

  if (status === 'completed') {
    return {
      textColor: '#166534',
      background: '#dcfce7',
    }
  }

  return {
    textColor: '#1d4ed8',
    background: '#dbeafe',
  }
}

const getAgendaChannelTagPresentation = (actions: AgendaRow['actions']) => {
  const channel = actions.find(
    (action) =>
      action.actionType === 'send_message' || action.type === 'send_message',
  )?.channel

  if (channel === 'Agenda') {
    return {
      label: 'Agenda',
      textColor: '#6d28d9',
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      icon: <CalendarClock size={12} />,
    }
  }

  if (channel) {
    return getLeadSourceTagPresentation(channel, '')
  }

  if (
    actions.some(
      (action) =>
        action.actionType === 'send_email' || action.type === 'send_email',
    )
  ) {
    return {
      label: 'Email',
      textColor: '#1d4ed8',
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      icon: <Mail size={12} />,
    }
  }

  return null
}

const matchesFollowUpFilter = (
  row: AgendaRow,
  filter: AgendaFollowUpFilter,
): boolean => {
  if (filter === 'all') {
    return true
  }

  if (filter === 'none') {
    return false
  }

  const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)

  if (filter === 'overdue') {
    return visualStatus === 'overdue'
  }

  if (filter === 'today') {
    return visualStatus === 'today'
  }

  return visualStatus === 'scheduled'
}

const toSafeText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

const toSafeFollowUpStatus = (value: unknown): AgendaRow['status'] => {
  if (
    value === 'pending' ||
    value === 'done' ||
    value === 'canceled' ||
    value === 'skipped'
  ) {
    return value
  }

  return 'pending'
}

const toSortableTimestamp = (
  value: string | Date | null | undefined,
): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY
  }

  return timestamp
}

const getAgendaStatusSortRank = (
  row: AgendaRow,
  sortFocus: AgendaStatusSortFocus,
  availableStatusSortValues: AgendaStatusSortFocus[],
): number => {
  const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)
  const orderedStatuses = rotateValues(availableStatusSortValues, sortFocus)
  const statusIndex = orderedStatuses.indexOf(visualStatus)

  if (statusIndex === -1) {
    return Number.MAX_SAFE_INTEGER
  }

  return statusIndex
}

export default function AgendaPage() {
  const leadPanelWidth = 'min(48vw, 760px)'
  const leadPanelTransitionMs = 120
  const { isMobile } = useViewportBreakpoint()

  const navigate = useNavigate()
  const location = useLocation()
  const { leadId } = useParams<{ leadId?: string }>()
  const searchParams = new URLSearchParams(location.search)
  const requestedFollowUpFilter = searchParams.get('followUp')
  const initialFollowUpFilter: AgendaFollowUpFilter =
    requestedFollowUpFilter === 'none' ||
    requestedFollowUpFilter === 'scheduled' ||
    requestedFollowUpFilter === 'today' ||
    requestedFollowUpFilter === 'overdue'
      ? requestedFollowUpFilter
      : 'all'

  const {
    data: leadsData,
    isLoading: isLeadsLoading,
    error: leadsError,
  } = useLeadsBootstrap()
  const [negocios, setNegocios] = useState<NegotiationResponse[]>([])
  const [followUps, setFollowUps] = useState<NegotiationFollowUpResponse[]>([])
  const [isLoadingAgenda, setIsLoadingAgenda] = useState<boolean>(true)
  const [agendaError, setAgendaError] = useState<string | null>(null)

  const [isSearchInputFocused, setIsSearchInputFocused] =
    useState<boolean>(false)
  const [isFiltersButtonHovered, setIsFiltersButtonHovered] =
    useState<boolean>(false)
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState<boolean>(false)
  const [hoveredFilterOption, setHoveredFilterOption] = useState<string | null>(
    null,
  )
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [followUpFilter, setFollowUpFilter] = useState<AgendaFollowUpFilter>(
    initialFollowUpFilter,
  )
  const [isCreatingAgendaFollowUp, setIsCreatingAgendaFollowUp] =
    useState<boolean>(false)
  const [activeAgendaFollowUpFormTab, setActiveAgendaFollowUpFormTab] =
    useState<AgendaFollowUpFormTab>('information')
  const [agendaAutomationAction, setAgendaAutomationAction] = useState<
    AgendaAutomationAction | ''
  >('')
  const [agendaAutomationParentId, setAgendaAutomationParentId] =
    useState<string>('')
  const [agendaAutomationValue, setAgendaAutomationValue] = useState<string>('')
  const [agendaAutomationExecutionTiming, setAgendaAutomationExecutionTiming] =
    useState<AgendaAutomationExecutionTiming>('immediately')
  const [agendaAutomationWaitTime, setAgendaAutomationWaitTime] =
    useState<string>('')
  const [agendaAutomationWaitUnit, setAgendaAutomationWaitUnit] =
    useState<AgendaAutomationWaitUnit>('minutes')
  const [agendaAutomationFollowUpDraft, setAgendaAutomationFollowUpDraft] =
    useState<AgendaAutomationFollowUpDraft>(
      initialAgendaAutomationFollowUpDraft,
    )
  const [agendaAutomations, setAgendaAutomations] = useState<
    AgendaAutomationItem[]
  >([])
  const [editingAgendaAutomationId, setEditingAgendaAutomationId] = useState<
    string | null
  >(null)
  const [expandedAgendaAutomationIds, setExpandedAgendaAutomationIds] =
    useState<string[]>([])
  const [
    isAddingRootAgendaAutomationCondition,
    setIsAddingRootAgendaAutomationCondition,
  ] = useState<boolean>(false)
  const [rootAgendaAutomationCondition, setRootAgendaAutomationCondition] =
    useState<AgendaAutomationCondition | ''>('')
  const [openFollowUpConditionMenuId, setOpenFollowUpConditionMenuId] =
    useState<string | null>(null)
  const [
    confirmingDeleteAgendaAutomationId,
    setConfirmingDeleteAgendaAutomationId,
  ] = useState<string | null>(null)
  const [isAgendaFollowUpPanelEntering, setIsAgendaFollowUpPanelEntering] =
    useState<boolean>(false)
  const [shouldRefreshOnAgendaClose, setShouldRefreshOnAgendaClose] =
    useState<boolean>(false)
  const [agendaFollowUpError, setAgendaFollowUpError] = useState<string | null>(
    null,
  )
  const [agendaFollowUpDraft, setAgendaFollowUpDraft] =
    useState<AgendaFollowUpDraft>(initialAgendaFollowUpDraft)

  const [hoveredFollowUpId, setHoveredFollowUpId] = useState<string | null>(
    null,
  )
  const [confirmingDeleteFollowUpId, setConfirmingDeleteFollowUpId] = useState<
    string | null
  >(null)
  const [updatingFollowUpStatusId, setUpdatingFollowUpStatusId] = useState<
    string | null
  >(null)
  const [wrappedAgendaLeadNames, setWrappedAgendaLeadNames] = useState<
    Record<string, boolean>
  >({})
  const [sortKey, setSortKey] = useState<AgendaSortKey>('status')
  const [sortDirection, setSortDirection] = useState<AgendaSortDirection>('asc')
  const [dateSortFocus, setDateSortFocus] =
    useState<AgendaDateSortFocus>('oldestFirst')
  const [statusSortFocus, setStatusSortFocus] =
    useState<AgendaStatusSortFocus>('overdue')
  const [isLeadPanelEntering, setIsLeadPanelEntering] = useState<boolean>(false)
  const [isLeadFollowUpEditing, setIsLeadFollowUpEditing] =
    useState<boolean>(false)
  const [shouldRefreshOnLeadClose, setShouldRefreshOnLeadClose] =
    useState<boolean>(false)
  const [agendaReloadVersion, setAgendaReloadVersion] = useState<number>(0)
  const previousIsAgendaFollowUpPanelOpenRef = useRef<boolean>(false)
  const previousIsLeadSelectedRef = useRef<boolean>(false)
  const agendaLeadNameRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const openFollowUpConditionMenuRef = useRef<HTMLDivElement | null>(null)
  const agendaAutomationListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openFollowUpConditionMenuId) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !openFollowUpConditionMenuRef.current?.contains(event.target)
      ) {
        setOpenFollowUpConditionMenuId(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openFollowUpConditionMenuId])

  useEffect(() => {
    if (isAddingRootAgendaAutomationCondition) {
      agendaAutomationListRef.current?.scrollTo({ top: 0 })
    }
  }, [isAddingRootAgendaAutomationCondition])

  const activeLeads = useMemo(
    () =>
      (leadsData.leads ?? []).filter(
        (lead) => (lead.state ?? 'active').trim().toLowerCase() !== 'archived',
      ),
    [leadsData.leads],
  )

  const activeFiltersCount = Number(followUpFilter !== 'all')

  const activeFilterTags =
    followUpFilter === 'all'
      ? []
      : [
          {
            key: `followup-${followUpFilter}`,
            label:
              followUpFilter === 'none'
                ? 'Sem follow-up'
                : followUpFilter === 'scheduled'
                  ? 'Agendados'
                  : followUpFilter === 'today'
                    ? 'Hoje'
                    : 'Atrasados',
            textColor:
              followUpFilter === 'none'
                ? '#475569'
                : followUpFilter === 'scheduled'
                  ? '#1d4ed8'
                  : followUpFilter === 'today'
                    ? '#b45309'
                    : '#b91c1c',
            background:
              followUpFilter === 'none'
                ? '#e2e8f0'
                : followUpFilter === 'scheduled'
                  ? '#dbeafe'
                  : followUpFilter === 'today'
                    ? '#fef3c7'
                    : '#fee2e2',
            onRemove: () => setFollowUpFilter('all'),
          },
        ]

  const isLeadSelected = Boolean(leadId)

  const agendaFollowUpBusinesses = useMemo(
    () =>
      negocios.filter(
        (negocio) => negocio.leadId === agendaFollowUpDraft.leadId,
      ),
    [agendaFollowUpDraft.leadId, negocios],
  )
  const selectedAgendaLead =
    activeLeads.find((lead) => lead.id === agendaFollowUpDraft.leadId) ?? null

  const canConfirmAgendaFollowUp =
    Boolean(agendaFollowUpDraft.leadId) &&
    Boolean(agendaFollowUpDraft.negotiationId) &&
    Boolean(agendaFollowUpDraft.title.trim()) &&
    isFollowUpActionDraftValid(agendaFollowUpDraft.action) &&
    Boolean(agendaFollowUpDraft.dueAt)
  const rootAgendaAutomationConditionOptions =
    agendaFollowUpDraft.action.type === 'send_message'
      ? agendaAutomationConditionOptions
      : agendaAutomationConditionOptions.filter(
          (option) => option.value === 'deadlineReached',
        )
  const hasValidRootAgendaAutomationCondition =
    rootAgendaAutomationConditionOptions.some(
      (option) => option.value === rootAgendaAutomationCondition,
    )
  const agendaFollowUpFieldLabelStyle = {
    color: '#1f2937',
    fontSize: isMobile ? 17 / 1.3 : 13,
    fontWeight: 700,
  } as const
  const agendaFollowUpInputStyle = {
    width: '100%',
    height: isMobile ? 46 : 42,
    border: '1px solid #d7dce4',
    borderRadius: 10,
    padding: '0 14px',
    color: '#111827',
    fontSize: isMobile ? 17 / 1.2 : 14,
    boxSizing: 'border-box',
    background: '#ffffff',
  } as const
  const agendaFollowUpSelectStyle = {
    ...agendaFollowUpInputStyle,
    fontWeight: 600,
  } as const
  const selectedAgendaAutomationValueOptions = agendaAutomationAction
    ? agendaAutomationValueOptions[agendaAutomationAction]
    : undefined
  const selectedAgendaAutomationValueLabel = agendaAutomationAction
    ? agendaAutomationValueLabels[agendaAutomationAction]
    : undefined
  const agendaAutomationParent = agendaAutomations.find(
    (automation) => automation.id === agendaAutomationParentId,
  )
  const shouldUseAgendaWaitLabel =
    agendaAutomationParent?.type === 'condition' &&
    isAgendaReplyCondition(agendaAutomationParent.conditionType)
  const siblingAgendaAutomationActionTypes = new Set(
    agendaAutomationParent?.type === 'condition'
      ? agendaAutomations.flatMap((automation) =>
          automation.type === 'action' &&
          automation.parentId === agendaAutomationParentId &&
          automation.id !== editingAgendaAutomationId &&
          automation.actionType !== 'createFollowUp'
            ? [automation.actionType]
            : [],
        )
      : [],
  )
  const availableAgendaAutomationActionOptions =
    agendaAutomationActionOptions.filter(
      (option) =>
        option.value === 'createFollowUp' ||
        !siblingAgendaAutomationActionTypes.has(option.value),
    )
  const hasAvailableAgendaAutomationAction =
    !agendaAutomationAction ||
    availableAgendaAutomationActionOptions.some(
      (option) => option.value === agendaAutomationAction,
    )
  const parsedAgendaAutomationWaitTime = Number(agendaAutomationWaitTime)
  const hasValidAgendaAutomationWait =
    agendaAutomationExecutionTiming === 'immediately' ||
    (Number.isInteger(parsedAgendaAutomationWaitTime) &&
      parsedAgendaAutomationWaitTime > 0)
  const hasValidAgendaAutomationFollowUp =
    Boolean(agendaAutomationFollowUpDraft.title.trim()) &&
    isFollowUpActionDraftValid(agendaAutomationFollowUpDraft.action) &&
    Boolean(agendaAutomationFollowUpDraft.dueAt)
  const isMessageFollowUpAutomation = (
    automation: AgendaAutomationItem | undefined,
  ): automation is AgendaAutomationActionItem =>
    automation?.type === 'action' &&
    automation.actionType === 'createFollowUp' &&
    automation.followUp?.action.type === 'send_message'
  const canAgendaAutomationHaveChildren = (
    automation: AgendaAutomationItem | undefined,
  ) =>
    automation?.type === 'condition' || isMessageFollowUpAutomation(automation)
  let agendaAutomationBaseDueAt = agendaFollowUpDraft.dueAt
  let agendaAutomationAncestorId = agendaAutomationParentId

  while (agendaAutomationAncestorId) {
    const ancestor = agendaAutomations.find(
      (automation) => automation.id === agendaAutomationAncestorId,
    )

    if (
      ancestor?.type === 'action' &&
      ancestor.actionType === 'createFollowUp' &&
      ancestor.followUp?.dueAt
    ) {
      agendaAutomationBaseDueAt = ancestor.followUp.dueAt
      break
    }
    agendaAutomationAncestorId = ancestor?.parentId ?? ''
  }
  const agendaAutomationBaseDate = parseApiDateToBrowserDate(
    agendaAutomationBaseDueAt,
  )
  const agendaAutomationBaseDateLabel = agendaAutomationBaseDate
    ? formatDateTime(agendaAutomationBaseDate.toISOString())
    : '-'
  const canSaveAgendaAutomation = Boolean(
    agendaAutomationAction &&
    hasAvailableAgendaAutomationAction &&
    agendaAutomationBaseDate &&
    (!selectedAgendaAutomationValueOptions || agendaAutomationValue) &&
    hasValidAgendaAutomationWait &&
    (agendaAutomationAction !== 'createFollowUp' ||
      hasValidAgendaAutomationFollowUp),
  )
  const renderAgendaAutomationWaitTimeFields = () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={agendaFollowUpFieldLabelStyle}>Quando executar?</label>
      <select
        value={agendaAutomationExecutionTiming}
        onChange={(event) =>
          setAgendaAutomationExecutionTiming(
            event.target.value as AgendaAutomationExecutionTiming,
          )
        }
        style={agendaFollowUpSelectStyle}
      >
        <option value="immediately">Imediatamente</option>
        <option value="afterPeriod">
          {shouldUseAgendaWaitLabel ? 'Aguardar um período' : 'Após um período'}
        </option>
      </select>

      {agendaAutomationExecutionTiming === 'afterPeriod' ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={agendaFollowUpFieldLabelStyle}>Tempo</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <select
              value={agendaAutomationWaitUnit}
              onChange={(event) =>
                setAgendaAutomationWaitUnit(
                  event.target.value as AgendaAutomationWaitUnit,
                )
              }
              style={agendaFollowUpInputStyle}
            >
              {agendaAutomationWaitUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="1"
              value={agendaAutomationWaitTime}
              onChange={(event) =>
                setAgendaAutomationWaitTime(event.target.value)
              }
              style={agendaFollowUpInputStyle}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: interactionTheme.clickableCardHoverBackground,
              color: interactionTheme.activeIconColor,
              fontSize: isMobile ? 12 : 13,
            }}
          >
            <span style={{ fontWeight: 600 }}>Início da contagem</span>
            <strong style={{ textAlign: 'right' }}>
              {agendaAutomationBaseDateLabel}
            </strong>
          </div>
        </div>
      ) : null}
    </div>
  )

  const renderAgendaAutomationFollowUpFields = () => {
    if (agendaAutomationAction !== 'createFollowUp') {
      return null
    }

    return (
      <>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={agendaFollowUpFieldLabelStyle}>Nome do Follow-up</label>
          <input
            type="text"
            placeholder="Nome do Follow-up"
            value={agendaAutomationFollowUpDraft.title}
            onChange={(event) =>
              setAgendaAutomationFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
            style={agendaFollowUpInputStyle}
          />
        </div>

        <FollowUpActionFields
          value={agendaAutomationFollowUpDraft.action}
          onChange={(action) =>
            setAgendaAutomationFollowUpDraft((currentDraft) => ({
              ...currentDraft,
              action,
            }))
          }
          leadSource={selectedAgendaLead?.source}
          leadEmail={selectedAgendaLead?.email}
          leadPhone={selectedAgendaLead?.phone}
          isMobile={isMobile}
        />

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={agendaFollowUpFieldLabelStyle}>Data/Hora</label>
          <AgendaDateTimeInput
            value={agendaAutomationFollowUpDraft.dueAt}
            onChange={(nextValue) =>
              setAgendaAutomationFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                dueAt: nextValue,
              }))
            }
            isMobile={isMobile}
          />
        </div>
      </>
    )
  }

  const handleCancelAgendaAutomation = () => {
    setAgendaAutomationParentId('')
    setAgendaAutomationAction('')
    setAgendaAutomationValue('')
    setAgendaAutomationExecutionTiming('immediately')
    setAgendaAutomationWaitTime('')
    setAgendaAutomationWaitUnit('minutes')
    setAgendaAutomationFollowUpDraft(initialAgendaAutomationFollowUpDraft)
    setEditingAgendaAutomationId(null)
    setActiveAgendaFollowUpFormTab('automationList')
  }

  const handleSaveAgendaAutomation = () => {
    if (
      !canSaveAgendaAutomation ||
      !agendaAutomationAction ||
      !hasAvailableAgendaAutomationAction
    ) {
      return
    }

    const actionId = editingAgendaAutomationId ?? crypto.randomUUID()
    const baseDate = parseApiDateToBrowserDate(agendaAutomationBaseDueAt)
    const waitTime =
      agendaAutomationExecutionTiming === 'immediately'
        ? 0
        : parsedAgendaAutomationWaitTime
    const waitMilliseconds =
      waitTime *
      (agendaAutomationWaitUnit === 'days'
        ? 24 * 60 * 60 * 1000
        : agendaAutomationWaitUnit === 'hours'
          ? 60 * 60 * 1000
          : 60 * 1000)
    const actionStep: AgendaAutomationActionItem = {
      id: actionId,
      parentId: agendaAutomationParentId || null,
      type: 'action',
      actionType: agendaAutomationAction,
      value: agendaAutomationValue,
      waitTime,
      waitUnit: agendaAutomationWaitUnit,
      scheduledAt: baseDate
        ? new Date(baseDate.getTime() + waitMilliseconds).toISOString()
        : null,
      followUp:
        agendaAutomationAction === 'createFollowUp'
          ? {
              ...agendaAutomationFollowUpDraft,
              title: agendaAutomationFollowUpDraft.title.trim(),
              action: {
                ...agendaAutomationFollowUpDraft.action,
                templateVariables: {
                  ...agendaAutomationFollowUpDraft.action.templateVariables,
                },
                templateRequiredVariables: [
                  ...agendaAutomationFollowUpDraft.action
                    .templateRequiredVariables,
                ],
              },
            }
          : null,
    }
    setAgendaAutomations((current) =>
      editingAgendaAutomationId
        ? current.map((automation) =>
            automation.id === editingAgendaAutomationId
              ? actionStep
              : automation,
          )
        : [...current, actionStep],
    )
    const parentExpansionIds: string[] = []
    let ancestorId = agendaAutomationParentId

    while (ancestorId) {
      parentExpansionIds.push(ancestorId)
      ancestorId =
        agendaAutomations.find((automation) => automation.id === ancestorId)
          ?.parentId ?? ''
    }

    setExpandedAgendaAutomationIds((currentIds) => [
      ...new Set([...currentIds, ...parentExpansionIds]),
    ])
    handleCancelAgendaAutomation()
  }

  const renderAgendaAutomationSaveButton = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={handleCancelAgendaAutomation}
        style={{
          height: isMobile ? 46 : 42,
          border: '1px solid #d7dce4',
          borderRadius: 8,
          background: '#ffffff',
          color: '#475569',
          fontSize: isMobile ? 14 : 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleSaveAgendaAutomation}
        disabled={!canSaveAgendaAutomation}
        style={{
          height: isMobile ? 46 : 42,
          border: 'none',
          borderRadius: 8,
          background: canSaveAgendaAutomation
            ? interactionTheme.primaryButtonBackground
            : '#e5e7eb',
          color: canSaveAgendaAutomation ? '#ffffff' : '#94a3b8',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: isMobile ? 14 : 13,
          fontWeight: 700,
          cursor: canSaveAgendaAutomation ? 'pointer' : 'not-allowed',
        }}
      >
        <Save size={16} />
        {editingAgendaAutomationId ? 'Salvar alterações' : 'Salvar'}
      </button>
    </div>
  )

  const renderAgendaAutomationList = () => {
    const getOptionLabel = <T extends string>(
      options: Array<{ value: T; label: string }>,
      value: T,
    ) => options.find((option) => option.value === value)?.label ?? value
    const getWaitDescription = (automation: AgendaAutomationActionItem) => {
      if (automation.waitTime === 0) {
        return 'Imediatamente'
      }

      const unitLabels: Record<
        AgendaAutomationWaitUnit,
        [singular: string, plural: string]
      > = {
        minutes: ['minuto', 'minutos'],
        hours: ['hora', 'horas'],
        days: ['dia', 'dias'],
      }
      const [singular, plural] = unitLabels[automation.waitUnit]
      const parent = agendaAutomations.find(
        (candidate) => candidate.id === automation.parentId,
      )
      const prefix =
        parent?.type === 'condition' &&
        isAgendaReplyCondition(parent.conditionType)
          ? 'Aguardar'
          : 'Após'

      return `${prefix} ${automation.waitTime} ${automation.waitTime === 1 ? singular : plural}`
    }
    const getActionIcon = (
      automation: AgendaAutomationActionItem,
    ): AgendaAutomationTreeIcon => {
      if (automation.actionType === 'createFollowUp') {
        if (automation.followUp?.action.type === 'send_email') return 'mail'
        if (automation.followUp?.action.type === 'send_message')
          return 'message'
        return 'agenda'
      }
      if (automation.actionType === 'qualifyLead') return 'user'
      if (automation.actionType === 'changeNegotiationStage') return 'stage'
      if (automation.actionType === 'changeNegotiationStatus') return 'status'
      if (automation.actionType === 'changeNegotiationTemperature')
        return 'temperature'
      if (automation.actionType === 'archiveLead') return 'archive'
      return 'delete'
    }
    const getActionTitle = (automation: AgendaAutomationActionItem) => {
      if (automation.actionType !== 'createFollowUp') {
        return getOptionLabel(
          agendaAutomationActionOptions,
          automation.actionType,
        )
      }

      const followUpTypeLabels: Partial<
        Record<FollowUpActionDraft['type'], string>
      > = {
        agenda: 'Agenda',
        send_email: 'Email',
        send_message: 'Mensagem',
      }

      return `Criar follow-up - ${followUpTypeLabels[automation.followUp?.action.type ?? ''] ?? 'Agenda'}`
    }
    const getActionDetail = (automation: AgendaAutomationActionItem) => {
      if (automation.followUp) {
        return automation.followUp.title
      }

      const valueOptions = agendaAutomationValueOptions[automation.actionType]
      if (!valueOptions || !automation.value) {
        return undefined
      }

      return (
        valueOptions.find((option) => option.value === automation.value)
          ?.label ?? automation.value
      )
    }
    const getActionDescription = (automation: AgendaAutomationActionItem) => {
      const waitDescription = getWaitDescription(automation)
      let baseDueAt = agendaFollowUpDraft.dueAt
      let ancestorId = automation.parentId

      while (ancestorId) {
        const ancestor = agendaAutomations.find(
          (candidate) => candidate.id === ancestorId,
        )

        if (
          ancestor?.type === 'action' &&
          ancestor.actionType === 'createFollowUp' &&
          ancestor.followUp?.dueAt
        ) {
          baseDueAt = ancestor.followUp.dueAt
          break
        }
        ancestorId = ancestor?.parentId ?? null
      }

      const baseDate = parseApiDateToBrowserDate(baseDueAt)
      const waitMilliseconds =
        automation.waitTime *
        (automation.waitUnit === 'days'
          ? 24 * 60 * 60 * 1000
          : automation.waitUnit === 'hours'
            ? 60 * 60 * 1000
            : 60 * 1000)
      const scheduledAtLabel = baseDate
        ? formatDateTime(
            new Date(baseDate.getTime() + waitMilliseconds).toISOString(),
          )
        : '-'

      return `${waitDescription} - ${scheduledAtLabel}`
    }
    const buildAutomationNode = (
      automation: AgendaAutomationItem,
      displayId: string,
    ): AgendaAutomationTreeNode => {
      const childNodes = agendaAutomations
        .filter((candidate) => candidate.parentId === automation.id)
        .map((childAutomation, index) =>
          buildAutomationNode(childAutomation, `${displayId}.${index + 1}`),
        )

      if (automation.type === 'action') {
        return {
          id: automation.id,
          automationId: automation.id,
          displayId,
          title: getActionTitle(automation),
          description: getActionDescription(automation),
          detail: getActionDetail(automation),
          icon: getActionIcon(automation),
          children: childNodes.length ? childNodes : undefined,
        }
      }

      return {
        id: automation.id,
        automationId: automation.id,
        displayId,
        title: getOptionLabel(
          agendaAutomationConditionOptions,
          automation.conditionType,
        ),
        icon:
          automation.conditionType === 'replied'
            ? 'mail'
            : automation.conditionType === 'deadlineReached'
              ? 'agenda'
              : 'viewed',
        children: childNodes.length ? childNodes : undefined,
      }
    }
    const automationTree = agendaAutomations
      .filter(
        (automation) =>
          !automation.parentId ||
          !agendaAutomations.some(
            (candidate) => candidate.id === automation.parentId,
          ),
      )
      .map((automation, index) =>
        buildAutomationNode(automation, `${index + 1}`),
      )
    const handleAddChildAutomation = (automationId: string) => {
      setEditingAgendaAutomationId(null)
      setAgendaAutomationParentId(automationId)
      setAgendaAutomationAction('')
      setAgendaAutomationValue('')
      setAgendaAutomationExecutionTiming('immediately')
      setAgendaAutomationWaitTime('')
      setAgendaAutomationWaitUnit('minutes')
      setAgendaAutomationFollowUpDraft(initialAgendaAutomationFollowUpDraft)
      setActiveAgendaFollowUpFormTab('automation')
    }
    const handleEditAutomation = (automation: AgendaAutomationActionItem) => {
      setEditingAgendaAutomationId(automation.id)
      setAgendaAutomationParentId(automation.parentId ?? '')
      setAgendaAutomationAction(automation.actionType)
      setAgendaAutomationValue(automation.value)
      setAgendaAutomationExecutionTiming(
        automation.waitTime === 0 ? 'immediately' : 'afterPeriod',
      )
      setAgendaAutomationWaitTime(String(automation.waitTime))
      setAgendaAutomationWaitUnit(automation.waitUnit)
      setAgendaAutomationFollowUpDraft(
        automation.followUp
          ? {
              ...automation.followUp,
              action: {
                ...automation.followUp.action,
                templateVariables: {
                  ...automation.followUp.action.templateVariables,
                },
                templateRequiredVariables: [
                  ...automation.followUp.action.templateRequiredVariables,
                ],
              },
            }
          : initialAgendaAutomationFollowUpDraft,
      )
      setActiveAgendaFollowUpFormTab('automation')
    }
    const handleAddFollowUpCondition = (
      automationId: string,
      conditionType: AgendaAutomationCondition,
    ) => {
      const conditionId = crypto.randomUUID()

      setAgendaAutomations((current) => [
        ...current,
        {
          id: conditionId,
          parentId: automationId,
          type: 'condition',
          conditionType,
        },
      ])
      setExpandedAgendaAutomationIds((currentIds) => [
        ...new Set([...currentIds, automationId]),
      ])
      setOpenFollowUpConditionMenuId(null)
    }
    const handleDeleteAutomation = (automationId: string) => {
      const automationIdsToDelete = new Set([automationId])
      let foundDescendant = true

      while (foundDescendant) {
        foundDescendant = false
        agendaAutomations.forEach((automation) => {
          if (
            automation.parentId &&
            automationIdsToDelete.has(automation.parentId) &&
            !automationIdsToDelete.has(automation.id)
          ) {
            automationIdsToDelete.add(automation.id)
            foundDescendant = true
          }
        })
      }

      setAgendaAutomations((current) =>
        current.filter(
          (automation) => !automationIdsToDelete.has(automation.id),
        ),
      )
      setExpandedAgendaAutomationIds((currentIds) =>
        currentIds.filter((id) => !automationIdsToDelete.has(id)),
      )
      if (automationIdsToDelete.has(agendaAutomationParentId)) {
        setAgendaAutomationParentId('')
      }
      setConfirmingDeleteAgendaAutomationId(null)
      setOpenFollowUpConditionMenuId(null)
    }
    const handleSaveRootCondition = () => {
      if (
        !rootAgendaAutomationCondition ||
        !hasValidRootAgendaAutomationCondition
      ) {
        return
      }

      setAgendaAutomations((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          parentId: null,
          type: 'condition',
          conditionType: rootAgendaAutomationCondition,
        },
      ])
      setRootAgendaAutomationCondition('')
      setIsAddingRootAgendaAutomationCondition(false)
    }
    const toggleAutomationNode = (id: string) => {
      setExpandedAgendaAutomationIds((currentIds) =>
        currentIds.includes(id)
          ? currentIds.filter((currentId) => currentId !== id)
          : [...currentIds, id],
      )
    }
    const renderAutomationIcon = (icon: AgendaAutomationTreeIcon) => {
      const iconProps = { size: isMobile ? 19 : 20, strokeWidth: 2 }

      if (icon === 'mail') return <Mail {...iconProps} />
      if (icon === 'user') return <UserRound {...iconProps} />
      if (icon === 'agenda') return <CalendarClock {...iconProps} />
      if (icon === 'archive') return <Archive {...iconProps} />
      if (icon === 'delete') return <Trash2 {...iconProps} />
      if (icon === 'stage') return <GitBranch {...iconProps} />
      if (icon === 'status') return <BriefcaseBusiness {...iconProps} />
      if (icon === 'temperature') return <Thermometer {...iconProps} />
      if (icon === 'viewed') return <MailX {...iconProps} />
      if (icon === 'followUp') return <FileText {...iconProps} />
      return <MessageCircle {...iconProps} />
    }
    const renderAutomationNode = (node: AgendaAutomationTreeNode) => {
      const hasChildren = Boolean(node.children?.length)
      const isExpanded = expandedAgendaAutomationIds.includes(node.id)
      const sourceAutomation = agendaAutomations.find(
        (automation) => automation.id === node.automationId,
      )
      const isAction = sourceAutomation?.type === 'action'
      const canHaveChildren = canAgendaAutomationHaveChildren(sourceAutomation)
      const isConfirmingDelete = confirmingDeleteAgendaAutomationId === node.id
      const automationTypeLabel = isAction ? 'Ação' : 'Condição'

      return (
        <div key={node.id}>
          <article
            style={{
              minHeight: isMobile ? 68 : 62,
              display: 'grid',
              gridTemplateColumns: `${hasChildren ? `${isMobile ? 22 : 26}px ` : ''}${
                isMobile ? 40 : 46
              }px minmax(0, 1fr) ${isAction && canHaveChildren ? (isMobile ? 84 : 98) : isMobile ? 56 : 64}px`,
              alignItems: 'center',
              gap: isMobile ? 8 : 12,
              padding: isMobile ? '8px 10px' : '8px 12px',
              border: '1px solid #e1e7ef',
              borderRadius: 8,
              background: '#f9fbfd',
              boxSizing: 'border-box',
            }}
          >
            {isConfirmingDelete ? (
              <>
                <strong
                  style={{
                    gridColumn: '1 / -2',
                    color: '#111827',
                    fontSize: isMobile ? 13 : 14,
                  }}
                >
                  Deseja deletar {automationTypeLabel}?
                </strong>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Cancelar exclusão de automação"
                    onClick={() => setConfirmingDeleteAgendaAutomationId(null)}
                    style={{
                      width: 30,
                      height: 30,
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: '#4b5563',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Confirmar exclusão de automação"
                    onClick={() => handleDeleteAutomation(node.automationId)}
                    style={{
                      width: 30,
                      height: 30,
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${node.title}`}
                    onClick={() => toggleAutomationNode(node.id)}
                    style={{
                      width: isMobile ? 22 : 26,
                      height: isMobile ? 22 : 26,
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: '#172554',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={isMobile ? 18 : 20} />
                    ) : (
                      <ChevronRight size={isMobile ? 18 : 20} />
                    )}
                  </button>
                ) : null}

                <span
                  style={{
                    width: isMobile ? 40 : 46,
                    height: isMobile ? 40 : 46,
                    borderRadius: 8,
                    color: interactionTheme.activeIconColor,
                    background: interactionTheme.clickableCardHoverBackground,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {renderAutomationIcon(node.icon)}
                </span>

                <span style={{ minWidth: 0, display: 'grid', gap: 3 }}>
                  <strong
                    style={{
                      color: '#18233f',
                      fontSize: isMobile ? 13 : 14,
                      fontWeight: 750,
                      lineHeight: 1.25,
                    }}
                  >
                    {node.displayId}. {node.title}
                  </strong>
                  {node.description ? (
                    <span
                      style={{
                        color: '#64748b',
                        fontSize: isMobile ? 11 : 12,
                        lineHeight: 1.3,
                      }}
                    >
                      {node.description}
                    </span>
                  ) : null}
                  {node.detail ? (
                    <span
                      style={{
                        color: '#475569',
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {node.detail}
                    </span>
                  ) : null}
                </span>

                <div
                  ref={
                    openFollowUpConditionMenuId === node.id
                      ? openFollowUpConditionMenuRef
                      : undefined
                  }
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Deletar ${node.title}`}
                    title="Deletar"
                    onClick={() =>
                      setConfirmingDeleteAgendaAutomationId(node.id)
                    }
                    style={{
                      width: isMobile ? 26 : 30,
                      height: isMobile ? 26 : 30,
                      padding: 0,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#b91c1c',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                  {isAction ? (
                    <button
                      type="button"
                      aria-label={`Editar ${node.title}`}
                      title="Editar"
                      onClick={() => {
                        if (sourceAutomation?.type === 'action') {
                          handleEditAutomation(sourceAutomation)
                        }
                      }}
                      style={{
                        width: isMobile ? 26 : 30,
                        height: isMobile ? 26 : 30,
                        padding: 0,
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        color: '#183153',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                  ) : null}
                  {canHaveChildren ? (
                    <button
                      type="button"
                      aria-label={`Adicionar ${isMessageFollowUpAutomation(sourceAutomation) ? 'condição' : 'ação'} filha a ${node.title}`}
                      title={
                        isMessageFollowUpAutomation(sourceAutomation)
                          ? 'Adicionar condição'
                          : 'Adicionar ação'
                      }
                      onClick={() => {
                        if (sourceAutomation?.type === 'condition') {
                          handleAddChildAutomation(node.automationId)
                          return
                        }

                        if (isMessageFollowUpAutomation(sourceAutomation)) {
                          setOpenFollowUpConditionMenuId((currentId) =>
                            currentId === node.id ? null : node.id,
                          )
                        }
                      }}
                      style={{
                        width: isMobile ? 26 : 30,
                        height: isMobile ? 26 : 30,
                        padding: 0,
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        color: '#183153',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  ) : null}

                  {openFollowUpConditionMenuId === node.id ? (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 20,
                        top: 'calc(100% + 6px)',
                        right: 0,
                        width: 210,
                        padding: 6,
                        border: '1px solid #e1e7ef',
                        borderRadius: 8,
                        background: '#ffffff',
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                        display: 'grid',
                        gap: 2,
                      }}
                    >
                      {agendaAutomationConditionOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            handleAddFollowUpCondition(
                              node.automationId,
                              option.value,
                            )
                          }
                          style={{
                            border: 'none',
                            borderRadius: 6,
                            background: 'transparent',
                            color: '#263552',
                            padding: '9px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </article>

          {hasChildren && isExpanded ? (
            <div
              style={{
                display: 'grid',
                gap: 8,
                marginLeft: isMobile ? 20 : 24,
                paddingTop: 8,
                borderLeft: '1.5px solid #b9c9dc',
              }}
            >
              {node.children?.map((childNode) => (
                <div
                  key={childNode.id}
                  style={{
                    position: 'relative',
                    paddingLeft: isMobile ? 18 : 24,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: isMobile ? 33 : 30,
                      width: isMobile ? 18 : 24,
                      borderTop: '1.5px solid #b9c9dc',
                    }}
                  />
                  {renderAutomationNode(childNode)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          height: '100%',
        }}
      >
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            gap: 14,
            padding: isMobile ? 12 : 14,
            border: '1px solid #e1e7ef',
            borderRadius: 10,
            background: '#ffffff',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ minWidth: 0, display: 'grid', gap: 3 }}>
              <strong
                style={{
                  color: '#18233f',
                  fontSize: isMobile ? 17 : 18,
                  lineHeight: 1.2,
                }}
              >
                Árvore de automações
              </strong>
              <span
                style={{
                  color: '#64748b',
                  fontSize: isMobile ? 11 : 12,
                  lineHeight: 1.35,
                }}
              >
                Visualize e gerencie suas automações e suas ramificações.
              </span>
            </span>

            <button
              type="button"
              onClick={() => {
                setOpenFollowUpConditionMenuId(null)
                if (!isAddingRootAgendaAutomationCondition) {
                  setRootAgendaAutomationCondition('')
                  setIsAddingRootAgendaAutomationCondition(true)
                }
              }}
              style={{
                width: 'fit-content',
                flexShrink: 0,
                height: 42,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#ffffff',
                color: '#555555',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.2,
                cursor: 'pointer',
              }}
            >
              + Adicionar condição
            </button>
          </header>

          <div
            ref={agendaAutomationListRef}
            style={{
              display: 'grid',
              alignContent: 'start',
              gap: 10,
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {automationTree.length ? (
              automationTree.map(renderAutomationNode)
            ) : !isAddingRootAgendaAutomationCondition ? (
              <span
                style={{
                  padding: '24px 12px',
                  color: '#64748b',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Nenhuma automação adicionada.
              </span>
            ) : null}
            {isAddingRootAgendaAutomationCondition ? (
              <div
                style={{
                  order: -1,
                  minHeight: isMobile ? 68 : 62,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: isMobile ? 8 : 12,
                  padding: isMobile ? '8px 10px' : '8px 12px',
                  border: '1px solid #e1e7ef',
                  borderRadius: 8,
                  background: '#f9fbfd',
                  boxSizing: 'border-box',
                }}
              >
                <select
                  aria-label="Condição"
                  value={rootAgendaAutomationCondition}
                  onChange={(event) =>
                    setRootAgendaAutomationCondition(
                      event.target.value as AgendaAutomationCondition | '',
                    )
                  }
                  style={agendaFollowUpSelectStyle}
                >
                  <option value="">Selecione a condição</option>
                  {rootAgendaAutomationConditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Cancelar adição de condição"
                    title="Cancelar"
                    onClick={() => {
                      setRootAgendaAutomationCondition('')
                      setIsAddingRootAgendaAutomationCondition(false)
                    }}
                    style={{
                      width: isMobile ? 38 : 42,
                      height: isMobile ? 38 : 42,
                      border: 'none',
                      background: 'transparent',
                      color: '#4b5563',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Salvar condição"
                    title="Salvar"
                    disabled={!hasValidRootAgendaAutomationCondition}
                    onClick={handleSaveRootCondition}
                    style={{
                      width: isMobile ? 38 : 42,
                      height: isMobile ? 38 : 42,
                      border: 'none',
                      background: 'transparent',
                      color: hasValidRootAgendaAutomationCondition
                        ? '#16a34a'
                        : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: hasValidRootAgendaAutomationCondition
                        ? 'pointer'
                        : 'not-allowed',
                      opacity: hasValidRootAgendaAutomationCondition ? 1 : 0.6,
                    }}
                  >
                    <Check size={18} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  const renderAgendaFollowUpFormTabs = () => {
    const tabs: Array<{ key: AgendaFollowUpFormTab; label: string }> = [
      { key: 'information', label: 'Dados' },
      { key: 'automationList', label: 'Automações' },
      { key: 'automation', label: 'Ação' },
    ]

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          gap: 4,
          width: '100%',
          padding: 4,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#f8fafc',
          boxSizing: 'border-box',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeAgendaFollowUpFormTab === tab.key
          const isActionTab = tab.key === 'automation'
          const isAutomationListDisabled =
            tab.key === 'automationList' && !canConfirmAgendaFollowUp
          const isDisabled = isActionTab || isAutomationListDisabled

          return (
            <button
              key={tab.key}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveAgendaFollowUpFormTab(tab.key)}
              style={{
                minWidth: 0,
                height: 36,
                border: 'none',
                borderRadius: 6,
                background: isActive
                  ? isMobile
                    ? '#dcfce7'
                    : interactionTheme.clickableCardHoverBackground
                  : 'transparent',
                color: isActive
                  ? isMobile
                    ? '#1f7a4d'
                    : interactionTheme.activeIconColor
                  : '#6b7280',
                padding: '0 6px',
                fontSize: isMobile ? 11 : 13,
                fontWeight: isActive ? 700 : 600,
                cursor: isDisabled ? 'default' : 'pointer',
                opacity: isDisabled && !isActive ? 0.6 : 1,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

  const leadsById = useMemo(
    () =>
      new Map(
        (leadsData.leads ?? []).map((lead, index) => [
          // Keep a strict state union to avoid broad string inference.
          lead.id,
          {
            name: lead.name?.trim() || `Lead ${index + 1}`,
            source: lead.source ?? null,
            isFavorite: Boolean(lead.isFavorite),
            state: (lead.state === 'archived' ? 'archived' : 'active') as
              | 'archived'
              | 'active',
            createdAt: lead.createdAt ?? null,
          },
        ]),
      ),
    [leadsData.leads],
  )

  const userLeadIdSet = useMemo(
    () => new Set((leadsData.leads ?? []).map((lead) => lead.id)),
    [leadsData.leads],
  )

  useEffect(() => {
    setFollowUpFilter(initialFollowUpFilter)
  }, [initialFollowUpFilter])

  useEffect(() => {
    setAgendaFollowUpDraft((currentDraft) => {
      if (!currentDraft.leadId) {
        return currentDraft
      }

      const hasSelectedLead = activeLeads.some(
        (lead) => lead.id === currentDraft.leadId,
      )

      if (hasSelectedLead) {
        return currentDraft
      }

      return {
        ...currentDraft,
        leadId: '',
        negotiationId: '',
      }
    })
  }, [activeLeads])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoadingAgenda(true)
        setAgendaError(null)

        const [loadedNegocios, loadedFollowUps] = await Promise.all([
          WebhookService.loadNegotiations(),
          WebhookService.loadNegotiationFollowUps(),
        ])

        if (!isMounted) {
          return
        }

        setNegocios(loadedNegocios)
        setFollowUps(loadedFollowUps)
      } catch (exception: unknown) {
        if (!isMounted) {
          return
        }

        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao carregar agenda.'

        setAgendaError(message)
        setNegocios([])
        setFollowUps([])
      } finally {
        if (isMounted) {
          setIsLoadingAgenda(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [agendaReloadVersion])

  useEffect(() => {
    if (isCreatingAgendaFollowUp || isLeadFollowUpEditing) {
      return
    }

    const refreshInterval = window.setInterval(() => {
      setAgendaReloadVersion((current) => current + 1)
    }, 60_000)

    return () => window.clearInterval(refreshInterval)
  }, [isCreatingAgendaFollowUp, isLeadFollowUpEditing])

  const handleLeadUpdated = () => {
    setShouldRefreshOnLeadClose(true)
  }

  useEffect(() => {
    const wasLeadSelected = previousIsLeadSelectedRef.current

    if (wasLeadSelected && !isLeadSelected && shouldRefreshOnLeadClose) {
      setAgendaReloadVersion((current) => current + 1)
      setShouldRefreshOnLeadClose(false)
    }

    previousIsLeadSelectedRef.current = isLeadSelected
  }, [isLeadSelected, shouldRefreshOnLeadClose])

  useEffect(() => {
    const wasAgendaFollowUpPanelOpen =
      previousIsAgendaFollowUpPanelOpenRef.current

    if (
      wasAgendaFollowUpPanelOpen &&
      !isCreatingAgendaFollowUp &&
      shouldRefreshOnAgendaClose
    ) {
      setAgendaReloadVersion((current) => current + 1)
      setShouldRefreshOnAgendaClose(false)
      setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
      setAgendaFollowUpError(null)
    }

    previousIsAgendaFollowUpPanelOpenRef.current = isCreatingAgendaFollowUp
  }, [isCreatingAgendaFollowUp, shouldRefreshOnAgendaClose])

  useEffect(() => {
    if (!isCreatingAgendaFollowUp) {
      setIsAgendaFollowUpPanelEntering(false)
      return
    }

    setIsAgendaFollowUpPanelEntering(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsAgendaFollowUpPanelEntering(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isCreatingAgendaFollowUp, leadPanelTransitionMs])

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

  const handleCreateAgendaFollowUp = async () => {
    if (!agendaFollowUpDraft.leadId || !agendaFollowUpDraft.negotiationId) {
      setAgendaFollowUpError('Selecione o lead e o negócio.')
      return
    }

    if (!agendaFollowUpDraft.title.trim() || !agendaFollowUpDraft.dueAt) {
      setAgendaFollowUpError('Preencha o nome do follow-up e a data/hora.')
      return
    }

    try {
      setAgendaFollowUpError(null)

      const createdFollowUp = await WebhookService.createNegotiationFollowUp({
        negotiationId: agendaFollowUpDraft.negotiationId,
        title: agendaFollowUpDraft.title.trim(),
        steps: [toFollowUpActionPayload(agendaFollowUpDraft.action)],
        dueAt: agendaFollowUpDraft.dueAt,
      })

      if (agendaAutomations.length > 0) {
        try {
          await WebhookService.createFollowUpStepTree({
            followUpId: createdFollowUp.id,
            steps: agendaAutomations.map(toAgendaAutomationStepPayload),
          })
        } catch (exception: unknown) {
          try {
            await WebhookService.deleteNegotiationFollowUp(createdFollowUp.id)
          } catch {
            throw new Error(
              'O follow-up foi criado, mas não foi possível criar as automações nem desfazer a criação.',
            )
          }
          throw exception
        }
      }

      setAgendaReloadVersion((current) => current + 1)
      closeAgendaFollowUpPanel()
      navigate(`/agenda/${agendaFollowUpDraft.leadId}${location.search}`, {
        replace: true,
        state: {
          initialLeadTab: 'negocios',
          initialBusinessId: createdFollowUp.negotiationId,
          initialBusinessTab: 'followups',
          initialBusinessFollowUpId: createdFollowUp.id,
        },
      })
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao criar follow-up.'
      setAgendaFollowUpError(message)
    }
  }

  const closeAgendaFollowUpPanel = () => {
    setIsCreatingAgendaFollowUp(false)
    setActiveAgendaFollowUpFormTab('information')
    setAgendaAutomationAction('')
    setAgendaAutomationParentId('')
    setAgendaAutomationValue('')
    setAgendaAutomationExecutionTiming('immediately')
    setAgendaAutomationWaitTime('')
    setAgendaAutomationWaitUnit('minutes')
    setAgendaAutomationFollowUpDraft(initialAgendaAutomationFollowUpDraft)
    setAgendaAutomations([])
    setExpandedAgendaAutomationIds([])
    setEditingAgendaAutomationId(null)
    setIsAddingRootAgendaAutomationCondition(false)
    setRootAgendaAutomationCondition('')
    setOpenFollowUpConditionMenuId(null)
    setConfirmingDeleteAgendaAutomationId(null)
    setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
    setAgendaFollowUpError(null)
  }

  const negociosByUser = useMemo(
    () => negocios.filter((negocio) => userLeadIdSet.has(negocio.leadId)),
    [negocios, userLeadIdSet],
  )

  const negocioById = useMemo(
    () => new Map(negociosByUser.map((negocio) => [negocio.id, negocio])),
    [negociosByUser],
  )

  const agendaRows = useMemo(() => {
    const rows: AgendaRow[] = []

    followUps.forEach((followUp) => {
      const negocio = negocioById.get(followUp.negotiationId)
      if (!negocio) {
        return
      }

      const leadData = leadsById.get(negocio.leadId)
      if (!leadData) {
        return
      }

      const followUpSteps = followUp.steps ?? []
      const primaryActionId = findPrimaryFollowUpActionStep(followUpSteps)?.id

      rows.push({
        followUpId: followUp.id,
        leadId: negocio.leadId,
        negotiationId: negocio.id,
        leadName: leadData.name,
        negotiationTitle: negocio.title?.trim() || 'Negócio sem nome',
        automationActionCount: followUpSteps.filter(
          (step) => step.type === 'action' && step.id !== primaryActionId,
        ).length,
        title: toSafeText(followUp.title),
        dueAt: toSafeText(followUp.dueAt),
        status: toSafeFollowUpStatus(followUp.status),
        actions: followUpSteps,
        leadIsFavorite: leadData.isFavorite,
        leadState: leadData.state,
        leadCreatedAt: leadData.createdAt,
      })
    })

    return rows
  }, [followUps, negocioById, leadsById])

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  const filteredAgendaRows = useMemo(
    () =>
      agendaRows.filter((row) => {
        const matchesSearch = !normalizedSearchTerm
          ? true
          : toSafeText(row.leadName)
              .toLowerCase()
              .includes(normalizedSearchTerm) ||
            toSafeText(row.negotiationTitle)
              .toLowerCase()
              .includes(normalizedSearchTerm) ||
            toSafeText(row.title).toLowerCase().includes(normalizedSearchTerm)
        const matchesFollowUp = matchesFollowUpFilter(row, followUpFilter)

        return matchesSearch && matchesFollowUp
      }),
    [agendaRows, followUpFilter, normalizedSearchTerm],
  )

  const availableDateSortValues = useMemo(() => {
    const values: AgendaDateSortFocus[] = ['oldestFirst', 'recentFirst']
    const hasMissingDates = filteredAgendaRows.some(
      (row) => !Number.isFinite(getApiDateTimestamp(row.dueAt)),
    )

    if (hasMissingDates) {
      values.push('noDateFirst')
    }

    return values
  }, [filteredAgendaRows])

  const availableStatusSortValues = useMemo(() => {
    const orderedStatuses: AgendaStatusSortFocus[] = [
      'overdue',
      'today',
      'scheduled',
      'completed',
    ]

    return orderedStatuses.filter((status) =>
      filteredAgendaRows.some(
        (row) => getAgendaVisualStatus(row.status, row.dueAt) === status,
      ),
    )
  }, [filteredAgendaRows])

  const sortedFilteredAgendaRows = useMemo(() => {
    return [...filteredAgendaRows].sort((firstRow, secondRow) => {
      const directionFactor = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'title') {
        return (
          firstRow.title.localeCompare(secondRow.title, 'pt-BR', {
            sensitivity: 'base',
          }) * directionFactor
        )
      }

      if (sortKey === 'lead') {
        return (
          firstRow.leadName.localeCompare(secondRow.leadName, 'pt-BR', {
            sensitivity: 'base',
          }) * directionFactor
        )
      }

      if (sortKey === 'negotiation') {
        return (
          firstRow.negotiationTitle.localeCompare(
            secondRow.negotiationTitle,
            'pt-BR',
            { sensitivity: 'base' },
          ) * directionFactor
        )
      }

      if (sortKey === 'dateTime') {
        const firstDate = getApiDateTimestamp(firstRow.dueAt)
        const secondDate = getApiDateTimestamp(secondRow.dueAt)
        const firstHasDate = Number.isFinite(firstDate)
        const secondHasDate = Number.isFinite(secondDate)

        if (dateSortFocus === 'noDateFirst') {
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

        if (dateSortFocus === 'oldestFirst') {
          return firstDate - secondDate
        }

        return secondDate - firstDate
      }

      const statusRankDifference =
        getAgendaStatusSortRank(
          firstRow,
          statusSortFocus,
          availableStatusSortValues,
        ) -
        getAgendaStatusSortRank(
          secondRow,
          statusSortFocus,
          availableStatusSortValues,
        )

      if (statusRankDifference !== 0) {
        return statusRankDifference
      }

      return (
        toSortableTimestamp(firstRow.dueAt) -
        toSortableTimestamp(secondRow.dueAt)
      )
    })
  }, [
    availableStatusSortValues,
    dateSortFocus,
    filteredAgendaRows,
    sortDirection,
    sortKey,
    statusSortFocus,
  ])

  const paginatedAgendaRows = sortedFilteredAgendaRows

  const setAgendaLeadNameRef = (
    followUpId: string,
    element: HTMLSpanElement | null,
  ) => {
    agendaLeadNameRefs.current[followUpId] = element
  }

  useEffect(() => {
    if (isMobile) {
      return
    }

    const recalculateWrappedAgendaLeadNames = () => {
      const nextWrappedAgendaLeadNames: Record<string, boolean> = {}

      paginatedAgendaRows.forEach((row) => {
        const agendaLeadNameElement = agendaLeadNameRefs.current[row.followUpId]

        if (!agendaLeadNameElement) {
          nextWrappedAgendaLeadNames[row.followUpId] = false
          return
        }

        const computedStyle = window.getComputedStyle(agendaLeadNameElement)
        const lineHeight = Number.parseFloat(computedStyle.lineHeight)

        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
          nextWrappedAgendaLeadNames[row.followUpId] = false
          return
        }

        const lineCount = Math.round(
          agendaLeadNameElement.getBoundingClientRect().height / lineHeight,
        )

        nextWrappedAgendaLeadNames[row.followUpId] = lineCount > 1
      })

      setWrappedAgendaLeadNames((currentWrappedAgendaLeadNames) => {
        const currentKeys = Object.keys(currentWrappedAgendaLeadNames)
        const nextKeys = Object.keys(nextWrappedAgendaLeadNames)

        if (currentKeys.length !== nextKeys.length) {
          return nextWrappedAgendaLeadNames
        }

        const hasDifference = nextKeys.some(
          (key) =>
            currentWrappedAgendaLeadNames[key] !==
            nextWrappedAgendaLeadNames[key],
        )

        return hasDifference
          ? nextWrappedAgendaLeadNames
          : currentWrappedAgendaLeadNames
      })
    }

    recalculateWrappedAgendaLeadNames()
    window.addEventListener('resize', recalculateWrappedAgendaLeadNames)

    return () => {
      window.removeEventListener('resize', recalculateWrappedAgendaLeadNames)
    }
  }, [isMobile, paginatedAgendaRows])

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

  const isLoading = isLeadsLoading || isLoadingAgenda
  const error = leadsError || agendaError

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      await WebhookService.deleteNegotiationFollowUp(followUpId)
      setFollowUps((current) =>
        current.filter((followUp) => followUp.id !== followUpId),
      )
      setConfirmingDeleteFollowUpId(null)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao deletar follow-up.'

      setAgendaError(message)
      setConfirmingDeleteFollowUpId(null)
    }
  }

  const handleFollowUpStatusChange = async (
    followUpId: string,
    status: AgendaRow['status'],
  ) => {
    setUpdatingFollowUpStatusId(followUpId)

    try {
      setAgendaError(null)

      const updatedFollowUp = await WebhookService.updateNegotiationFollowUp(
        followUpId,
        {
          status,
          completedAt: status === 'done' ? new Date().toISOString() : null,
        },
      )

      setFollowUps((current) =>
        current.map((followUp) =>
          followUp.id === followUpId ? updatedFollowUp : followUp,
        ),
      )
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar status do follow-up.'

      setAgendaError(message)
    } finally {
      setUpdatingFollowUpStatusId(null)
    }
  }

  const handleSortToggle = (nextSortKey: AgendaSortKey) => {
    if (nextSortKey === 'dateTime') {
      if (sortKey !== 'dateTime') {
        setSortKey('dateTime')
        setSortDirection('asc')
        setDateSortFocus(availableDateSortValues[0] ?? 'oldestFirst')
        return
      }

      setDateSortFocus((currentFocus) => {
        if (availableDateSortValues.length <= 1) {
          return availableDateSortValues[0] ?? 'oldestFirst'
        }

        const currentIndex = availableDateSortValues.indexOf(currentFocus)
        if (currentIndex < 0) {
          return availableDateSortValues[0] ?? 'oldestFirst'
        }

        return (
          availableDateSortValues[
            (currentIndex + 1) % availableDateSortValues.length
          ] ?? 'oldestFirst'
        )
      })
      return
    }

    if (nextSortKey === 'status') {
      if (sortKey !== 'status') {
        setSortKey('status')
        setSortDirection('asc')
        setStatusSortFocus(availableStatusSortValues[0] ?? 'overdue')
        return
      }

      setStatusSortFocus((currentFocus) => {
        if (availableStatusSortValues.length <= 1) {
          return availableStatusSortValues[0] ?? 'overdue'
        }

        const currentIndex = availableStatusSortValues.indexOf(currentFocus)
        if (currentIndex < 0) {
          return availableStatusSortValues[0] ?? 'overdue'
        }

        return (
          availableStatusSortValues[
            (currentIndex + 1) % availableStatusSortValues.length
          ] ?? 'overdue'
        )
      })
      return
    }

    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) =>
        currentDirection === 'asc' ? 'desc' : 'asc',
      )
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  const getSortIndicator = (targetSortKey: AgendaSortKey): string => {
    if (sortKey !== targetSortKey) {
      return '↕'
    }

    if (targetSortKey === 'dateTime') {
      return dateSortFocus === 'recentFirst' ? '↑' : '↓'
    }

    if (targetSortKey === 'status') {
      return statusSortFocus === 'overdue' || statusSortFocus === 'today'
        ? '↑'
        : '↓'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getHeaderSortButtonStyle = (targetSortKey: AgendaSortKey) => ({
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
    justifyContent:
      targetSortKey === 'dateTime' || targetSortKey === 'status'
        ? 'center'
        : 'flex-start',
    gap: 6,
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
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              color: '#111827',
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            Agenda
          </h1>
          <span
            style={{
              width: 52,
              color: '#6b7280',
              fontSize: 13,
              fontWeight: 600,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <TotalCount
              isLoading={isLoading}
              total={filteredAgendaRows.length}
            />
          </span>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 52px 52px',
            gap: 12,
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar follow-up"
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
              boxSizing: 'border-box',
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
              background:
                isFiltersPanelOpen ||
                isFiltersButtonHovered ||
                activeFiltersCount > 0
                  ? interactionTheme.clickableCardHoverBackground
                  : '#ffffff',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#111827',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label="Abrir filtros"
          >
            <ListFilter size={20} color="#111827" />
          </button>

          <button
            type="button"
            aria-label="Adicionar follow-up"
            onClick={() => {
              setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
              setAgendaFollowUpError(null)
              setIsCreatingAgendaFollowUp(true)
            }}
            style={{
              height: 52,
              width: 52,
              border: 'none',
              borderRadius: 14,
              background: interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
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
                cursor: 'default',
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
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
              }}
            >
              <div style={{ display: 'grid', gap: 2 }}>
                <button
                  type="button"
                  onClick={() =>
                    setFollowUpFilter((current) =>
                      current === 'none' ? 'all' : 'none',
                    )
                  }
                  onMouseEnter={() => setHoveredFilterOption('followup-none')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(
                    followUpFilter === 'none' ||
                      hoveredFilterOption === 'followup-none',
                  )}
                >
                  Sem follow-up
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFollowUpFilter((current) =>
                      current === 'scheduled' ? 'all' : 'scheduled',
                    )
                  }
                  onMouseEnter={() =>
                    setHoveredFilterOption('followup-scheduled')
                  }
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(
                    followUpFilter === 'scheduled' ||
                      hoveredFilterOption === 'followup-scheduled',
                  )}
                >
                  Agendados
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFollowUpFilter((current) =>
                      current === 'today' ? 'all' : 'today',
                    )
                  }
                  onMouseEnter={() => setHoveredFilterOption('followup-today')}
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(
                    followUpFilter === 'today' ||
                      hoveredFilterOption === 'followup-today',
                  )}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFollowUpFilter((current) =>
                      current === 'overdue' ? 'all' : 'overdue',
                    )
                  }
                  onMouseEnter={() =>
                    setHoveredFilterOption('followup-overdue')
                  }
                  onMouseLeave={() => setHoveredFilterOption(null)}
                  style={getFilterOptionStyle(
                    followUpFilter === 'overdue' ||
                      hoveredFilterOption === 'followup-overdue',
                  )}
                >
                  Atrasados
                </button>
              </div>
            </section>
          </>
        ) : null}

        {activeFilterTags.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
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
                  lineHeight: 1,
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
                    justifyContent: 'center',
                  }}
                >
                  X
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {isCreatingAgendaFollowUp ? (
          <>
            <button
              type="button"
              aria-label="Fechar criação de follow-up"
              onClick={closeAgendaFollowUpPanel}
              style={{
                position: 'absolute',
                inset: 0,
                border: 'none',
                background: 'rgba(15, 23, 42, 0.18)',
                zIndex: 40,
                cursor: 'default',
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
                background: '#fcfdff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '22px 18px 16px',
                  flexShrink: 0,
                  borderBottom: 'none',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 24,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  Novo follow-up
                </h2>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Salvar follow-up"
                    title="Salvar follow-up"
                    onClick={() => void handleCreateAgendaFollowUp()}
                    disabled={!canConfirmAgendaFollowUp}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: canConfirmAgendaFollowUp ? '#6b7280' : '#cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: canConfirmAgendaFollowUp
                        ? 'pointer'
                        : 'not-allowed',
                    }}
                  >
                    <Save size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar criação de follow-up"
                    title="Cancelar criação"
                    onClick={closeAgendaFollowUpPanel}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#6b7280',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '0 18px', flexShrink: 0 }}>
                {renderAgendaFollowUpFormTabs()}
              </div>

              <div
                style={{
                  display:
                    activeAgendaFollowUpFormTab === 'automationList'
                      ? 'flex'
                      : 'grid',
                  flexDirection: 'column',
                  gap: 16,
                  flex: 1,
                  minHeight: 0,
                  overflowY:
                    activeAgendaFollowUpFormTab === 'automationList'
                      ? 'hidden'
                      : 'auto',
                  overflowX: 'hidden',
                  padding: '18px 18px 28px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display:
                      activeAgendaFollowUpFormTab === 'information'
                        ? 'contents'
                        : 'none',
                  }}
                >
                  {agendaFollowUpError ? (
                    <p style={{ margin: 0, color: '#b91c1c' }}>
                      {agendaFollowUpError}
                    </p>
                  ) : null}

                  <div style={{ display: 'grid', gap: 8 }}>
                    <label style={agendaFollowUpFieldLabelStyle}>Lead</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={agendaFollowUpDraft.leadId}
                        onChange={(event) => {
                          setAgendaFollowUpDraft((currentDraft) => ({
                            ...currentDraft,
                            leadId: event.target.value,
                            negotiationId: '',
                            action: initialFollowUpActionDraft,
                          }))
                        }}
                        style={{
                          ...agendaFollowUpSelectStyle,
                          padding: '0 42px 0 14px',
                          color: agendaFollowUpDraft.leadId
                            ? '#111827'
                            : '#6b7280',
                          appearance: 'none',
                        }}
                      >
                        <option value="">Selecione</option>
                        {activeLeads.map((lead, index) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.name?.trim() || `Lead ${index + 1}`}
                          </option>
                        ))}
                      </select>
                      <span
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6b7280',
                          pointerEvents: 'none',
                        }}
                      >
                        <ChevronDown size={18} />
                      </span>
                    </div>
                  </div>

                  {agendaFollowUpDraft.leadId ? (
                    <>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label style={agendaFollowUpFieldLabelStyle}>
                          Negócio
                        </label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={agendaFollowUpDraft.negotiationId}
                            onChange={(event) =>
                              setAgendaFollowUpDraft((currentDraft) => ({
                                ...currentDraft,
                                negotiationId: event.target.value,
                              }))
                            }
                            style={{
                              ...agendaFollowUpSelectStyle,
                              padding: '0 42px 0 14px',
                              color: agendaFollowUpDraft.negotiationId
                                ? '#111827'
                                : '#6b7280',
                              appearance: 'none',
                            }}
                          >
                            <option value="">Sem condição</option>
                            {agendaFollowUpBusinesses.map((negocio) => (
                              <option key={negocio.id} value={negocio.id}>
                                {negocio.title ?? 'Negócio sem nome'}
                              </option>
                            ))}
                          </select>
                          <span
                            style={{
                              position: 'absolute',
                              right: 12,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#6b7280',
                              pointerEvents: 'none',
                            }}
                          >
                            <ChevronDown size={18} />
                          </span>
                        </div>
                        {agendaFollowUpBusinesses.length === 0 ? (
                          <p
                            style={{
                              margin: 0,
                              color: '#6b7280',
                              fontSize: 12,
                            }}
                          >
                            Esse lead ainda não tem negócios.
                          </p>
                        ) : null}
                      </div>

                      {agendaFollowUpDraft.negotiationId ? (
                        <>
                          <div style={{ display: 'grid', gap: 8 }}>
                            <label style={agendaFollowUpFieldLabelStyle}>
                              Nome do Follow-up
                            </label>
                            <input
                              type="text"
                              placeholder="Nome do Follow-up"
                              value={agendaFollowUpDraft.title}
                              onChange={(event) =>
                                setAgendaFollowUpDraft((currentDraft) => ({
                                  ...currentDraft,
                                  title: event.target.value,
                                }))
                              }
                              style={agendaFollowUpInputStyle}
                            />
                          </div>

                          <FollowUpActionFields
                            value={agendaFollowUpDraft.action}
                            onChange={(action) =>
                              setAgendaFollowUpDraft((currentDraft) => ({
                                ...currentDraft,
                                action,
                              }))
                            }
                            leadSource={selectedAgendaLead?.source}
                            leadEmail={selectedAgendaLead?.email}
                            leadPhone={selectedAgendaLead?.phone}
                            isMobile
                          />

                          <div style={{ display: 'grid', gap: 8 }}>
                            <label style={agendaFollowUpFieldLabelStyle}>
                              Data/Hora
                            </label>
                            <AgendaDateTimeInput
                              value={agendaFollowUpDraft.dueAt}
                              onChange={(nextValue) =>
                                setAgendaFollowUpDraft((currentDraft) => ({
                                  ...currentDraft,
                                  dueAt: nextValue,
                                }))
                              }
                              isMobile
                            />
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
                      Selecione um lead para continuar.
                    </p>
                  )}
                </div>

                {activeAgendaFollowUpFormTab === 'automation' ? (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {renderAgendaAutomationWaitTimeFields()}

                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={agendaFollowUpFieldLabelStyle}>Ação</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={agendaAutomationAction}
                          onChange={(event) => {
                            setAgendaAutomationAction(
                              event.target.value as AgendaAutomationAction | '',
                            )
                            setAgendaAutomationValue('')
                          }}
                          style={{
                            ...agendaFollowUpSelectStyle,
                            padding: '0 42px 0 14px',
                            color: agendaAutomationAction
                              ? '#111827'
                              : '#6b7280',
                            appearance: 'none',
                          }}
                        >
                          <option value="">Sem condição</option>
                          {availableAgendaAutomationActionOptions.map(
                            (option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                        <span
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#6b7280',
                            pointerEvents: 'none',
                          }}
                        >
                          <ChevronDown size={18} />
                        </span>
                      </div>
                    </div>

                    {selectedAgendaAutomationValueOptions &&
                    selectedAgendaAutomationValueLabel ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label style={agendaFollowUpFieldLabelStyle}>
                          {selectedAgendaAutomationValueLabel}
                        </label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={agendaAutomationValue}
                            onChange={(event) =>
                              setAgendaAutomationValue(event.target.value)
                            }
                            style={{
                              ...agendaFollowUpSelectStyle,
                              padding: '0 42px 0 14px',
                              color: agendaAutomationValue
                                ? '#111827'
                                : '#6b7280',
                              appearance: 'none',
                            }}
                          >
                            <option value="">Selecione</option>
                            {selectedAgendaAutomationValueOptions.map(
                              (option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ),
                            )}
                          </select>
                          <span
                            style={{
                              position: 'absolute',
                              right: 12,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#6b7280',
                              pointerEvents: 'none',
                            }}
                          >
                            <ChevronDown size={18} />
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {renderAgendaAutomationFollowUpFields()}
                    {renderAgendaAutomationSaveButton()}
                  </div>
                ) : null}

                {activeAgendaFollowUpFormTab === 'automationList'
                  ? renderAgendaAutomationList()
                  : null}
              </div>
            </aside>
          </>
        ) : null}

        {isLeadSelected && !isCreatingAgendaFollowUp ? (
          <aside
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <LeadPage
              onLeadUpdated={handleLeadUpdated}
              onFollowUpEditingChange={setIsLeadFollowUpEditing}
            />
          </aside>
        ) : null}

        <div
          style={{
            maxHeight: '100%',
            minHeight: 0,
            overflowY: isCreatingAgendaFollowUp ? 'hidden' : 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingRight: 2,
          }}
        >
          {isLoading ? <MobileListSkeleton /> : null}
          {!isLoading &&
            paginatedAgendaRows.map((row) => {
              const isHovered = hoveredFollowUpId === row.followUpId
              const visualStatus = getAgendaVisualStatus(row.status, row.dueAt)
              const lifecycleStatusTag = getFollowUpStatusPresentation(
                row.status,
                row.actions,
                visualStatus === 'overdue',
              )
              const dateTagColors = getAgendaDateTagColors(visualStatus)
              const formattedDateTime = formatAgendaDateTimeLabel(row.dueAt)
              const channelTagPresentation = getAgendaChannelTagPresentation(
                row.actions,
              )

              if (confirmingDeleteFollowUpId === row.followUpId) {
                return (
                  <article
                    key={row.followUpId}
                    style={{
                      background: interactionTheme.clickableCardHoverBackground,
                      border: '1px solid #e5e7eb',
                      borderRadius: 18,
                      boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <strong style={{ color: '#111827', fontSize: 15 }}>
                      Deletar Follow-up?
                    </strong>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <button
                        type="button"
                        aria-label="Cancelar exclusão de follow-up"
                        onClick={() => setConfirmingDeleteFollowUpId(null)}
                        style={{
                          height: 32,
                          width: 32,
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          background: '#ffffff',
                          color: '#4b5563',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        X
                      </button>
                      <button
                        type="button"
                        aria-label="Confirmar exclusão de follow-up"
                        onClick={() =>
                          void handleDeleteFollowUp(row.followUpId)
                        }
                        style={{
                          height: 32,
                          width: 32,
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          background: '#ffffff',
                          color: '#4b5563',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  </article>
                )
              }

              return (
                <article
                  key={row.followUpId}
                  onClick={() => {
                    navigate(`/agenda/${row.leadId}${location.search}`, {
                      state: {
                        initialLeadTab: 'negocios',
                        initialBusinessId: row.negotiationId,
                        initialBusinessTab: 'followups',
                        initialBusinessFollowUpId: row.followUpId,
                      },
                    })
                  }}
                  onMouseEnter={() => setHoveredFollowUpId(row.followUpId)}
                  onMouseLeave={() => setHoveredFollowUpId(null)}
                  style={{
                    background: isHovered
                      ? interactionTheme.clickableCardHoverBackground
                      : '#ffffff',
                    border: '1px solid #f1f5f9',
                    borderRadius: 18,
                    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                    padding: 16,
                    display: 'grid',
                    gap: 18,
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      alignItems: 'start',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h2
                        style={{
                          margin: 0,
                          color: '#111827',
                          fontSize: 20,
                          lineHeight: 1.2,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.title || 'Follow-up sem nome'}
                      </h2>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        flexShrink: 0,
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Abrir conversa com ${row.leadName}`}
                          title="Abrir conversa"
                          onClick={() => {
                            navigate(
                              `/agenda/${row.leadId}${location.search}`,
                              {
                                state: {
                                  initialLeadTab: 'chat',
                                  focusMessageId:
                                    row.actions.find(
                                      (action) => action.replyMessageId,
                                    )?.replyMessageId ?? null,
                                },
                              },
                            )
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
                            justifyContent: 'center',
                          }}
                        >
                          <MessageCircle size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir follow-up"
                          onClick={() =>
                            setConfirmingDeleteFollowUpId(row.followUpId)
                          }
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
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: dateTagColors.textColor,
                        whiteSpace: 'nowrap',
                        background: dateTagColors.background,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '7px 12px',
                        lineHeight: 1.1,
                      }}
                    >
                      <CalendarClock size={12} />
                      <span
                        style={{
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginLeft: 4,
                        }}
                      >
                        {formattedDateTime}
                      </span>
                    </span>

                    <AgendaStatusTag
                      disabled={updatingFollowUpStatusId === row.followUpId}
                      presentation={lifecycleStatusTag}
                      status={row.status}
                      onChange={(status) =>
                        void handleFollowUpStatusChange(row.followUpId, status)
                      }
                    />

                    {channelTagPresentation ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: channelTagPresentation.textColor,
                          whiteSpace: 'nowrap',
                          background: channelTagPresentation.backgroundColor,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        {channelTagPresentation.icon ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              marginRight: 4,
                              lineHeight: 0,
                            }}
                          >
                            {channelTagPresentation.icon}
                          </span>
                        ) : null}
                        {channelTagPresentation.label}
                      </span>
                    ) : null}

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#dbeafe',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        padding: '7px 12px',
                        lineHeight: 1.1,
                        minWidth: 0,
                        maxWidth: '100%',
                        width: 'max-content',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        flex: '0 1 auto',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          minWidth: 0,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Lead: {row.leadName}
                      </span>
                    </span>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#1f7a4d',
                        background: '#dcfce7',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        padding: '7px 12px',
                        lineHeight: 1.1,
                        minWidth: 0,
                        maxWidth: '100%',
                        width: 'max-content',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        flex: '0 1 auto',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          minWidth: 0,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Negócio: {row.negotiationTitle}
                      </span>
                    </span>

                    <button
                      type="button"
                      aria-label={`Abrir ${row.automationActionCount} automações do follow-up`}
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/agenda/${row.leadId}${location.search}`, {
                          state: {
                            initialLeadTab: 'negocios',
                            initialBusinessId: row.negotiationId,
                            initialBusinessTab: 'followups',
                            initialBusinessFollowUpId: row.followUpId,
                            initialBusinessFollowUpTab: 'automationList',
                          },
                        })
                      }}
                      style={{
                        minHeight: 28,
                        border: '1px solid #16a34a',
                        borderRadius: 6,
                        padding: '6px 10px',
                        background: '#f0fdf4',
                        color: '#166534',
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                      }}
                    >
                      Automação: {row.automationActionCount}
                    </button>
                  </div>
                </article>
              )
            })}

          {!isLoading && !error && sortedFilteredAgendaRows.length === 0 ? (
            <div
              style={{
                color: '#6b7280',
                fontSize: 14,
                padding: 16,
                textAlign: 'center',
              }}
            >
              Nenhum follow-up encontrado.
            </div>
          ) : null}
          {error ? (
            <div
              style={{
                color: '#b91c1c',
                fontSize: 14,
                padding: 16,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          ) : null}
        </div>
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
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '4px 2px',
        }}
      >
        <h1
          style={{
            margin: 0,
            color: '#111827',
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          Agenda
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar FollowUp"
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
              outline: 'none',
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
              background:
                isFiltersPanelOpen ||
                isFiltersButtonHovered ||
                activeFiltersCount > 0
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
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label="Abrir filtros"
          >
            <ListFilter size={16} color="#111827" />
          </button>

          <button
            type="button"
            onClick={() => {
              setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
              setAgendaFollowUpError(null)
              setIsCreatingAgendaFollowUp(true)
            }}
            style={{
              height: 38,
              border: 'none',
              borderRadius: 8,
              background: interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              padding: '0 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Adicionar FollowUp
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
              cursor: 'default',
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
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'grid', gap: 2 }}>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) =>
                    current === 'none' ? 'all' : 'none',
                  )
                }
                onMouseEnter={() => setHoveredFilterOption('followup-none')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'none' ||
                    hoveredFilterOption === 'followup-none',
                )}
              >
                Sem follow-up
              </button>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) =>
                    current === 'scheduled' ? 'all' : 'scheduled',
                  )
                }
                onMouseEnter={() =>
                  setHoveredFilterOption('followup-scheduled')
                }
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'scheduled' ||
                    hoveredFilterOption === 'followup-scheduled',
                )}
              >
                Agendados
              </button>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) =>
                    current === 'today' ? 'all' : 'today',
                  )
                }
                onMouseEnter={() => setHoveredFilterOption('followup-today')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'today' ||
                    hoveredFilterOption === 'followup-today',
                )}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() =>
                  setFollowUpFilter((current) =>
                    current === 'overdue' ? 'all' : 'overdue',
                  )
                }
                onMouseEnter={() => setHoveredFilterOption('followup-overdue')}
                onMouseLeave={() => setHoveredFilterOption(null)}
                style={getFilterOptionStyle(
                  followUpFilter === 'overdue' ||
                    hoveredFilterOption === 'followup-overdue',
                )}
              >
                Atrasados
              </button>
            </div>
          </section>
        </>
      ) : null}

      {isCreatingAgendaFollowUp ? (
        <>
          <button
            type="button"
            aria-label="Fechar criação de follow-up"
            onClick={closeAgendaFollowUpPanel}
            style={{
              position: 'absolute',
              inset: 0,
              border: 'none',
              background: 'transparent',
              zIndex: 35,
              cursor: 'default',
            }}
          />

          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: leadPanelWidth,
              zIndex: 40,
              borderLeft: '2px solid #edf1f5',
              background: '#fcfdff',
              overflow: 'hidden',
              boxShadow: '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform: isAgendaFollowUpPanelEntering
                ? 'translateX(0)'
                : 'translateX(100%)',
              transition: `transform ${leadPanelTransitionMs}ms ease`,
            }}
          >
            <section
              style={{
                height: '100%',
                minHeight: 0,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '24px 24px 16px',
                  flexShrink: 0,
                  borderBottom: 'none',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 26,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  Novo follow-up
                </h2>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Salvar follow-up"
                    title="Salvar follow-up"
                    onClick={() => void handleCreateAgendaFollowUp()}
                    disabled={!canConfirmAgendaFollowUp}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: canConfirmAgendaFollowUp ? '#6b7280' : '#cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: canConfirmAgendaFollowUp
                        ? 'pointer'
                        : 'not-allowed',
                    }}
                  >
                    <Save size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar criação de follow-up"
                    title="Cancelar criação"
                    onClick={closeAgendaFollowUpPanel}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#6b7280',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '0 24px', flexShrink: 0 }}>
                {renderAgendaFollowUpFormTabs()}
              </div>

              <article
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY:
                    activeAgendaFollowUpFormTab === 'automationList'
                      ? 'hidden'
                      : 'auto',
                  padding: '16px 24px 24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  maxWidth: 'none',
                }}
              >
                <div
                  style={{
                    display:
                      activeAgendaFollowUpFormTab === 'information'
                        ? 'contents'
                        : 'none',
                  }}
                >
                  {agendaFollowUpError ? (
                    <p style={{ margin: 0, color: '#b91c1c' }}>
                      {agendaFollowUpError}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr)',
                      gap: 16,
                      alignContent: 'start',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={agendaFollowUpFieldLabelStyle}>Lead</label>
                      <select
                        value={agendaFollowUpDraft.leadId}
                        onChange={(event) => {
                          setAgendaFollowUpDraft((currentDraft) => ({
                            ...currentDraft,
                            leadId: event.target.value,
                            negotiationId: '',
                            action: initialFollowUpActionDraft,
                          }))
                        }}
                        style={agendaFollowUpSelectStyle}
                      >
                        <option value="">Selecione</option>
                        {activeLeads.map((lead, index) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.name?.trim() || `Lead ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {agendaFollowUpDraft.leadId ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label style={agendaFollowUpFieldLabelStyle}>
                          Negócio
                        </label>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <select
                            value={agendaFollowUpDraft.negotiationId}
                            onChange={(event) =>
                              setAgendaFollowUpDraft((currentDraft) => ({
                                ...currentDraft,
                                negotiationId: event.target.value,
                              }))
                            }
                            style={agendaFollowUpSelectStyle}
                          >
                            <option value="">Selecione</option>
                            {agendaFollowUpBusinesses.map((negocio) => (
                              <option key={negocio.id} value={negocio.id}>
                                {negocio.title ?? 'Negócio sem nome'}
                              </option>
                            ))}
                          </select>
                          {agendaFollowUpBusinesses.length === 0 ? (
                            <p
                              style={{
                                margin: 0,
                                color: '#6b7280',
                                fontSize: 12,
                              }}
                            >
                              Esse lead ainda não tem negócios.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
                        Selecione um lead para continuar.
                      </p>
                    )}

                    {agendaFollowUpDraft.negotiationId ? (
                      <>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <label style={agendaFollowUpFieldLabelStyle}>
                            Nome do Follow-up
                          </label>
                          <input
                            type="text"
                            placeholder="Nome do Follow-up"
                            value={agendaFollowUpDraft.title}
                            onChange={(event) =>
                              setAgendaFollowUpDraft((currentDraft) => ({
                                ...currentDraft,
                                title: event.target.value,
                              }))
                            }
                            style={agendaFollowUpInputStyle}
                          />
                        </div>

                        <FollowUpActionFields
                          value={agendaFollowUpDraft.action}
                          onChange={(action) =>
                            setAgendaFollowUpDraft((currentDraft) => ({
                              ...currentDraft,
                              action,
                            }))
                          }
                          leadSource={selectedAgendaLead?.source}
                          leadEmail={selectedAgendaLead?.email}
                          leadPhone={selectedAgendaLead?.phone}
                          isMobile={false}
                        />

                        <div style={{ display: 'grid', gap: 8 }}>
                          <label style={agendaFollowUpFieldLabelStyle}>
                            Data/Hora
                          </label>
                          <div>
                            <AgendaDateTimeInput
                              value={agendaFollowUpDraft.dueAt}
                              onChange={(nextValue) =>
                                setAgendaFollowUpDraft((currentDraft) => ({
                                  ...currentDraft,
                                  dueAt: nextValue,
                                }))
                              }
                              isMobile={false}
                            />
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {activeAgendaFollowUpFormTab === 'automation' ? (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {renderAgendaAutomationWaitTimeFields()}

                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={agendaFollowUpFieldLabelStyle}>Ação</label>
                      <select
                        value={agendaAutomationAction}
                        onChange={(event) => {
                          setAgendaAutomationAction(
                            event.target.value as AgendaAutomationAction | '',
                          )
                          setAgendaAutomationValue('')
                        }}
                        style={{
                          ...agendaFollowUpSelectStyle,
                          color: agendaAutomationAction ? '#111827' : '#6b7280',
                        }}
                      >
                        <option value="">Selecione</option>
                        {availableAgendaAutomationActionOptions.map(
                          (option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {selectedAgendaAutomationValueOptions &&
                    selectedAgendaAutomationValueLabel ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label style={agendaFollowUpFieldLabelStyle}>
                          {selectedAgendaAutomationValueLabel}
                        </label>
                        <select
                          value={agendaAutomationValue}
                          onChange={(event) =>
                            setAgendaAutomationValue(event.target.value)
                          }
                          style={{
                            ...agendaFollowUpSelectStyle,
                            color: agendaAutomationValue
                              ? '#111827'
                              : '#6b7280',
                          }}
                        >
                          <option value="">Selecione</option>
                          {selectedAgendaAutomationValueOptions.map(
                            (option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    ) : null}

                    {renderAgendaAutomationFollowUpFields()}
                    {renderAgendaAutomationSaveButton()}
                  </div>
                ) : null}

                {activeAgendaFollowUpFormTab === 'automationList'
                  ? renderAgendaAutomationList()
                  : null}
              </article>
            </section>
          </aside>
        </>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
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
              padding: '0 2px',
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
                  lineHeight: 1,
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
                    justifyContent: 'center',
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
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#ffffff',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '19%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid #ececec',
                  background: '#f3f4f6',
                }}
              >
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSortToggle('title')}
                    style={getHeaderSortButtonStyle('title')}
                  >
                    Follow-up{' '}
                    <span style={{ fontSize: 11 }}>
                      {getSortIndicator('title')}
                    </span>
                  </button>
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSortToggle('lead')}
                    style={getHeaderSortButtonStyle('lead')}
                  >
                    Lead{' '}
                    <span style={{ fontSize: 11 }}>
                      {getSortIndicator('lead')}
                    </span>
                  </button>
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSortToggle('negotiation')}
                    style={getHeaderSortButtonStyle('negotiation')}
                  >
                    Negócio{' '}
                    <span style={{ fontSize: 11 }}>
                      {getSortIndicator('negotiation')}
                    </span>
                  </button>
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  Automação
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  Canal
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSortToggle('dateTime')}
                    style={getHeaderSortButtonStyle('dateTime')}
                  >
                    Data/Hora{' '}
                    <span style={{ fontSize: 11 }}>
                      {getSortIndicator('dateTime')}
                    </span>
                  </button>
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSortToggle('status')}
                    style={getHeaderSortButtonStyle('status')}
                  >
                    Status{' '}
                    <span style={{ fontSize: 11 }}>
                      {getSortIndicator('status')}
                    </span>
                  </button>
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '10px 12px',
                    color: '#4b5563',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <DesktopTableSkeleton
                  columns={[
                    { width: '78%' },
                    { width: '70%' },
                    { width: '72%' },
                    { width: '54%', align: 'center' },
                    { width: '68%', align: 'center' },
                    { width: '72%', align: 'center' },
                    { width: '68%', align: 'center' },
                    { width: 32, align: 'center' },
                  ]}
                />
              ) : null}
              {!isLoading &&
                paginatedAgendaRows.map((row) => {
                  const isHovered = hoveredFollowUpId === row.followUpId
                  const visualStatus = getAgendaVisualStatus(
                    row.status,
                    row.dueAt,
                  )
                  const lifecycleStatusTag = getFollowUpStatusPresentation(
                    row.status,
                    row.actions,
                    visualStatus === 'overdue',
                  )
                  const channelTagPresentation =
                    getAgendaChannelTagPresentation(row.actions)

                  if (confirmingDeleteFollowUpId === row.followUpId) {
                    return (
                      <tr
                        key={row.followUpId}
                        style={{
                          height: AGENDA_TABLE_ROW_HEIGHT_PX,
                          borderBottom: '1px solid #f3f4f6',
                          background:
                            interactionTheme.clickableCardHoverBackground,
                        }}
                        onMouseEnter={() =>
                          setHoveredFollowUpId(row.followUpId)
                        }
                        onMouseLeave={() => setHoveredFollowUpId(null)}
                      >
                        <td
                          colSpan={7}
                          style={{
                            padding: '14px 16px',
                            color: '#2f2f2f',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Deletar Follow-up?
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            color: '#2f2f2f',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                            }}
                          >
                            <button
                              type="button"
                              aria-label="Cancelar exclusão de follow-up"
                              onClick={(event) => {
                                event.stopPropagation()
                                setConfirmingDeleteFollowUpId(null)
                              }}
                              style={{
                                height: 24,
                                width: 24,
                                border: 'none',
                                background: 'transparent',
                                color: '#4b5563',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              X
                            </button>
                            <button
                              type="button"
                              aria-label="Confirmar exclusão de follow-up"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteFollowUp(row.followUpId)
                              }}
                              style={{
                                height: 24,
                                width: 24,
                                border: 'none',
                                background: 'transparent',
                                color: '#4b5563',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
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
                      key={row.followUpId}
                      onClick={() => {
                        navigate(`/agenda/${row.leadId}${location.search}`, {
                          state: {
                            initialLeadTab: 'negocios',
                            initialBusinessId: row.negotiationId,
                            initialBusinessTab: 'followups',
                            initialBusinessFollowUpId: row.followUpId,
                          },
                        })
                      }}
                      style={{
                        height: AGENDA_TABLE_ROW_HEIGHT_PX,
                        borderBottom: '1px solid #f3f4f6',
                        background: isHovered
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredFollowUpId(row.followUpId)}
                      onMouseLeave={() => setHoveredFollowUpId(null)}
                    >
                      <td style={{ padding: '14px 16px', color: '#111827' }}>
                        <DelayedTooltip content={row.title || '-'}>
                          <span
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'normal',
                              lineHeight: '18px',
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {row.title || '-'}
                          </span>
                        </DelayedTooltip>
                      </td>
                      <td
                        style={{
                          padding: wrappedAgendaLeadNames[row.followUpId]
                            ? '6px 16px'
                            : '14px 16px',
                          color: '#64748b',
                        }}
                      >
                        <DelayedTooltip content={row.leadName}>
                          <span
                            ref={(element) => {
                              setAgendaLeadNameRef(row.followUpId, element)
                            }}
                            style={{
                              display: 'block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: 14,
                            }}
                          >
                            {row.leadName}
                          </span>
                        </DelayedTooltip>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#64748b',
                          fontSize: 14,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <DelayedTooltip content={row.negotiationTitle}>
                          <span
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.negotiationTitle}
                          </span>
                        </DelayedTooltip>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#111827',
                          textAlign: 'center',
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Abrir ${row.automationActionCount} automações do follow-up`}
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(
                              `/agenda/${row.leadId}${location.search}`,
                              {
                                state: {
                                  initialLeadTab: 'negocios',
                                  initialBusinessId: row.negotiationId,
                                  initialBusinessTab: 'followups',
                                  initialBusinessFollowUpId: row.followUpId,
                                  initialBusinessFollowUpTab: 'automationList',
                                },
                              },
                            )
                          }}
                          style={{
                            minHeight: 28,
                            border: '1px solid #16a34a',
                            borderRadius: 6,
                            padding: '6px 10px',
                            background: '#f0fdf4',
                            color: '#166534',
                            fontSize: 12,
                            fontWeight: 700,
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box',
                            cursor: 'pointer',
                          }}
                        >
                          {row.automationActionCount}
                        </button>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#111827',
                          textAlign: 'center',
                        }}
                      >
                        {channelTagPresentation ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: channelTagPresentation.textColor,
                              whiteSpace: 'nowrap',
                              background:
                                channelTagPresentation.backgroundColor,
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '7px 12px',
                              lineHeight: 1.1,
                            }}
                          >
                            {channelTagPresentation.icon ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  marginRight: 4,
                                  lineHeight: 0,
                                }}
                              >
                                {channelTagPresentation.icon}
                              </span>
                            ) : null}
                            {channelTagPresentation.label}
                          </span>
                        ) : null}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#111827',
                          textAlign: 'center',
                        }}
                      >
                        {(() => {
                          const dateStatus = getAgendaVisualStatus(
                            row.status,
                            row.dueAt,
                          )
                          const dateTagColors =
                            getAgendaDateTagColors(dateStatus)
                          const formattedDateTime = formatAgendaDateTimeLabel(
                            row.dueAt,
                          )

                          if (formattedDateTime === '-') {
                            return (
                              <span style={{ color: '#9ca3af', fontSize: 13 }}>
                                -
                              </span>
                            )
                          }

                          return (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: dateTagColors.textColor,
                                whiteSpace: 'nowrap',
                                background: dateTagColors.background,
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                lineHeight: 1.1,
                              }}
                            >
                              {formattedDateTime}
                            </span>
                          )
                        })()}
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#111827',
                          textAlign: 'center',
                        }}
                      >
                        <AgendaStatusTag
                          disabled={updatingFollowUpStatusId === row.followUpId}
                          presentation={lifecycleStatusTag}
                          status={row.status}
                          onChange={(status) =>
                            void handleFollowUpStatusChange(
                              row.followUpId,
                              status,
                            )
                          }
                        />
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#111827',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`Abrir conversa com ${row.leadName}`}
                            title="Abrir conversa"
                            onClick={() => {
                              navigate(
                                `/agenda/${row.leadId}${location.search}`,
                                {
                                  state: {
                                    initialLeadTab: 'chat',
                                    focusMessageId:
                                      row.actions.find(
                                        (action) => action.replyMessageId,
                                      )?.replyMessageId ?? null,
                                  },
                                },
                              )
                            }}
                            style={{
                              height: 24,
                              width: 24,
                              border: 'none',
                              background: 'transparent',
                              color: '#4b5563',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MessageCircle size={14} />
                          </button>

                          <button
                            type="button"
                            aria-label="Excluir follow-up"
                            onClick={() => {
                              setConfirmingDeleteFollowUpId(row.followUpId)
                            }}
                            style={{
                              height: 24,
                              width: 24,
                              border: 'none',
                              background: 'transparent',
                              color: '#4b5563',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

              {!isLoading && !error && sortedFilteredAgendaRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{ padding: '14px 16px', color: '#6b7280' }}
                  >
                    Nenhum follow-up encontrado.
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
            padding: '0 8px',
          }}
        >
          <TotalCount isLoading={isLoading} total={filteredAgendaRows.length} />
        </div>

        {error ? (
          <p style={{ margin: '12px 0 0', color: '#b91c1c' }}>{error}</p>
        ) : null}

        {isLeadSelected ? (
          <button
            type="button"
            aria-label="Fechar lead aberto"
            onClick={() => navigate('/agenda')}
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
              cursor: 'default',
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
              transform: isLeadPanelEntering
                ? 'translateX(0)'
                : 'translateX(100%)',
              transition: `transform ${leadPanelTransitionMs}ms ease`,
            }}
          >
            <LeadPage
              onLeadUpdated={handleLeadUpdated}
              onFollowUpEditingChange={setIsLeadFollowUpEditing}
            />
          </aside>
        ) : null}
      </div>
    </section>
  )
}
