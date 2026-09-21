import {
  Archive,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
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
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { FollowUpActionFields } from '../../../core/components/FollowUpActionFields'
import {
  initialFollowUpActionDraft,
  isFollowUpActionDraftValid,
} from '../../../core/components/followUpActionDraft'
import type { FollowUpActionDraft } from '../../../core/components/followUpActionDraft'
import {
  formatDateTime,
  formatDateTimeInputValue,
  parseApiDateToBrowserDate,
} from '../../../core/utils/dateTime'
import type { BusinessFollowUpAutomationItem } from '../utils/followUpAutomationTree'
import type { FollowUpActionStatus } from '../../webhook/types/webhook.types'

type ComposerTab = 'information' | 'automationList' | 'automation'
type AutomationAction =
  | 'createFollowUp'
  | 'qualifyLead'
  | 'changeNegotiationStage'
  | 'changeNegotiationStatus'
  | 'changeNegotiationTemperature'
  | 'archiveLead'
  | 'deleteNegotiation'
  | 'deleteLead'
type AutomationCondition = 'replied' | 'notReplied' | 'deadlineReached'
type AutomationExecutionTiming = 'immediately' | 'afterPeriod'
type AutomationWaitUnit = 'minutes' | 'hours' | 'days'

const isReplyCondition = (conditionType: AutomationCondition): boolean =>
  conditionType === 'replied' || conditionType === 'notReplied'

type AutomationFollowUpDraft = {
  title: string
  action: FollowUpActionDraft
  dueAt: string
}

type AutomationActionItem = Extract<
  BusinessFollowUpAutomationItem,
  { type: 'action' }
>

type BusinessFollowUpComposerDraft = {
  title: string
  action: FollowUpActionDraft
  dueAt: string
}

type TreeIcon =
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

type TreeNode = {
  id: string
  automationId: string
  displayId: string
  title: string
  description?: string
  detail?: string
  icon: TreeIcon
  children?: TreeNode[]
}

type BusinessFollowUpAutomationComposerProps = {
  value: BusinessFollowUpComposerDraft
  onChange: (value: BusinessFollowUpComposerDraft) => void
  automations: BusinessFollowUpAutomationItem[]
  onAutomationsChange: (value: BusinessFollowUpAutomationItem[]) => void
  businessTitle: string
  businessField?: ReactNode
  additionalInformationFields?: ReactNode
  isBusinessSelected?: boolean
  leadSource?: string | null
  leadEmail?: string | null
  leadPhone?: string | null
  isMobile: boolean
  readOnly?: boolean
  initialTab?: Extract<ComposerTab, 'information' | 'automationList'>
}

const automationStatusPresentation: Record<
  FollowUpActionStatus,
  { label: string; color: string; background: string }
> = {
  pending: {
    label: 'Pendente',
    color: '#92400e',
    background: '#fffbeb',
  },
  waiting: {
    label: 'Aguardando',
    color: '#1d4ed8',
    background: '#eff6ff',
  },
  executing: {
    label: 'Executando',
    color: '#0369a1',
    background: '#f0f9ff',
  },
  scheduled: {
    label: 'Agendado',
    color: '#1d4ed8',
    background: '#eff6ff',
  },
  awaiting_reply: {
    label: 'Aguardando resposta',
    color: '#6d28d9',
    background: '#f5f3ff',
  },
  executed: {
    label: 'Executado',
    color: '#166534',
    background: '#f0fdf4',
  },
  failed: {
    label: 'Falhou',
    color: '#b91c1c',
    background: '#fef2f2',
  },
  skipped: {
    label: 'Ignorado',
    color: '#475569',
    background: '#f8fafc',
  },
  manual_required: {
    label: 'Ação manual',
    color: '#9a3412',
    background: '#fff7ed',
  },
}

const initialAutomationFollowUpDraft: AutomationFollowUpDraft = {
  title: '',
  action: initialFollowUpActionDraft,
  dueAt: '',
}

const automationActionOptions: Array<{
  value: AutomationAction
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

const automationConditionOptions: Array<{
  value: AutomationCondition
  label: string
}> = [
  { value: 'replied', label: 'Houve resposta' },
  { value: 'notReplied', label: 'Não houve resposta' },
  { value: 'deadlineReached', label: 'Prazo atingido' },
]

const automationWaitUnitOptions: Array<{
  value: AutomationWaitUnit
  label: string
}> = [
  { value: 'minutes', label: 'Minuto' },
  { value: 'hours', label: 'Hora' },
  { value: 'days', label: 'Dia' },
]

const automationValueOptions: Partial<
  Record<AutomationAction, Array<{ value: string; label: string }>>
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

const automationValueLabels: Partial<Record<AutomationAction, string>> = {
  qualifyLead: 'Qualificação',
  changeNegotiationStage: 'Etapa',
  changeNegotiationStatus: 'Status',
  changeNegotiationTemperature: 'Temperatura',
}

type DateTimeInputProps = {
  value: string
  onChange: (nextValue: string) => void
  isMobile: boolean
  readOnly?: boolean
}

const parseDateTimeLocalValue = (
  value: string,
): { date: Date | null; time: string } => {
  const normalizedValue = formatDateTimeInputValue(value)
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

function ComposerDateTimeInput({
  value,
  onChange,
  isMobile,
  readOnly = false,
}: DateTimeInputProps) {
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
        onClick={() => {
          if (!readOnly) {
            setIsPickerOpen((current) => !current)
          }
        }}
        disabled={readOnly}
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
          background: readOnly ? '#f8fafc' : '#ffffff',
          cursor: readOnly ? 'not-allowed' : 'pointer',
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
        readOnly={readOnly}
        disabled={readOnly}
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
          background: readOnly ? '#f8fafc' : '#ffffff',
          cursor: readOnly ? 'not-allowed' : 'text',
        }}
        aria-label="Selecionar horário do follow-up"
      />

      {isPickerOpen && !readOnly ? (
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

export function BusinessFollowUpAutomationComposer({
  value,
  onChange,
  automations,
  onAutomationsChange,
  businessTitle,
  businessField,
  additionalInformationFields,
  isBusinessSelected = true,
  leadSource,
  leadEmail,
  leadPhone,
  isMobile,
  readOnly = false,
  initialTab = 'information',
}: BusinessFollowUpAutomationComposerProps) {
  const [activeTab, setActiveTab] = useState<ComposerTab>(initialTab)
  const [automationAction, setAutomationAction] = useState<
    AutomationAction | ''
  >('')
  const [automationParentId, setAutomationParentId] = useState<string>('')
  const [automationValue, setAutomationValue] = useState<string>('')
  const [automationExecutionTiming, setAutomationExecutionTiming] =
    useState<AutomationExecutionTiming>('immediately')
  const [automationWaitTime, setAutomationWaitTime] = useState<string>('')
  const [automationWaitUnit, setAutomationWaitUnit] =
    useState<AutomationWaitUnit>('minutes')
  const [automationFollowUpDraft, setAutomationFollowUpDraft] =
    useState<AutomationFollowUpDraft>(initialAutomationFollowUpDraft)
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(
    null,
  )
  const [expandedAutomationIds, setExpandedAutomationIds] = useState<string[]>(
    [],
  )
  const [isAddingRootCondition, setIsAddingRootCondition] =
    useState<boolean>(false)
  const [rootCondition, setRootCondition] = useState<AutomationCondition | ''>(
    '',
  )
  const [openConditionMenuId, setOpenConditionMenuId] = useState<string | null>(
    null,
  )
  const [confirmingDeleteAutomationId, setConfirmingDeleteAutomationId] =
    useState<string | null>(null)

  const openConditionMenuRef = useRef<HTMLDivElement | null>(null)
  const automationListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!openConditionMenuId) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !openConditionMenuRef.current?.contains(event.target)
      ) {
        setOpenConditionMenuId(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openConditionMenuId])

  useEffect(() => {
    if (isAddingRootCondition) {
      automationListRef.current?.scrollTo({ top: 0 })
    }
  }, [isAddingRootCondition])

  useEffect(() => {
    if (!readOnly) {
      return
    }

    if (activeTab === 'automation') {
      setActiveTab('information')
    }

    setEditingAutomationId(null)
    setOpenConditionMenuId(null)
    setConfirmingDeleteAutomationId(null)
    setIsAddingRootCondition(false)
    setRootCondition('')
  }, [activeTab, readOnly])

  const canConfirmFollowUp =
    isBusinessSelected &&
    Boolean(value.title.trim()) &&
    isFollowUpActionDraftValid(value.action) &&
    Boolean(value.dueAt)
  const rootConditionOptions =
    value.action.type === 'send_message'
      ? automationConditionOptions
      : automationConditionOptions.filter(
          (option) => option.value === 'deadlineReached',
        )
  const hasValidRootCondition = rootConditionOptions.some(
    (option) => option.value === rootCondition,
  )

  const labelStyle = {
    color: '#1f2937',
    fontSize: isMobile ? 17 / 1.3 : 13,
    fontWeight: 700,
  } as const
  const inputStyle = {
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
  const selectStyle = {
    ...inputStyle,
    fontWeight: 600,
  } as const

  const selectedValueOptions = automationAction
    ? automationValueOptions[automationAction]
    : undefined
  const selectedValueLabel = automationAction
    ? automationValueLabels[automationAction]
    : undefined
  const automationParent = automations.find(
    (automation) => automation.id === automationParentId,
  )
  const shouldUseWaitLabel =
    automationParent?.type === 'condition' &&
    isReplyCondition(automationParent.conditionType)
  const siblingActionTypes = new Set(
    automationParent?.type === 'condition'
      ? automations.flatMap((automation) =>
          automation.type === 'action' &&
          automation.parentId === automationParentId &&
          automation.id !== editingAutomationId &&
          automation.actionType !== 'createFollowUp'
            ? [automation.actionType]
            : [],
        )
      : [],
  )
  const availableActionOptions = automationActionOptions.filter(
    (option) =>
      option.value === 'createFollowUp' ||
      !siblingActionTypes.has(option.value),
  )
  const hasAvailableAction =
    !automationAction ||
    availableActionOptions.some((option) => option.value === automationAction)
  const parsedWaitTime = Number(automationWaitTime)
  const hasValidWait =
    automationExecutionTiming === 'immediately' ||
    (Number.isInteger(parsedWaitTime) && parsedWaitTime > 0)
  const hasValidAutomationFollowUp =
    Boolean(automationFollowUpDraft.title.trim()) &&
    isFollowUpActionDraftValid(automationFollowUpDraft.action) &&
    Boolean(automationFollowUpDraft.dueAt)
  const isMessageFollowUpAutomation = (
    automation: BusinessFollowUpAutomationItem | undefined,
  ): automation is AutomationActionItem =>
    automation?.type === 'action' &&
    automation.actionType === 'createFollowUp' &&
    automation.followUp?.action.type === 'send_message'
  const canAutomationHaveChildren = (
    automation: BusinessFollowUpAutomationItem | undefined,
  ) =>
    automation?.type === 'condition' || isMessageFollowUpAutomation(automation)

  let automationBaseDueAt = value.dueAt
  let automationAncestorId = automationParentId

  while (automationAncestorId) {
    const ancestor = automations.find(
      (automation) => automation.id === automationAncestorId,
    )

    if (
      ancestor?.type === 'action' &&
      ancestor.actionType === 'createFollowUp' &&
      ancestor.followUp?.dueAt
    ) {
      automationBaseDueAt = ancestor.followUp.dueAt
      break
    }

    automationAncestorId = ancestor?.parentId ?? ''
  }

  const automationBaseDate = parseApiDateToBrowserDate(automationBaseDueAt)
  const automationBaseDateLabel = automationBaseDate
    ? formatDateTime(automationBaseDate.toISOString())
    : '-'
  const canSaveAutomation = Boolean(
    automationAction &&
    hasAvailableAction &&
    automationBaseDate &&
    (!selectedValueOptions || automationValue) &&
    hasValidWait &&
    (automationAction !== 'createFollowUp' || hasValidAutomationFollowUp),
  )

  const updateComposerDraft = (
    nextDraft: Partial<BusinessFollowUpComposerDraft>,
  ) => {
    onChange({
      ...value,
      ...nextDraft,
    })
  }

  const handleCancelAutomation = () => {
    setAutomationParentId('')
    setAutomationAction('')
    setAutomationValue('')
    setAutomationExecutionTiming('immediately')
    setAutomationWaitTime('')
    setAutomationWaitUnit('minutes')
    setAutomationFollowUpDraft(initialAutomationFollowUpDraft)
    setEditingAutomationId(null)
    setActiveTab('automationList')
  }

  const handleSaveAutomation = () => {
    if (!canSaveAutomation || !automationAction || !hasAvailableAction) {
      return
    }

    const actionId = editingAutomationId ?? crypto.randomUUID()
    const baseDate = parseApiDateToBrowserDate(automationBaseDueAt)
    const waitTime =
      automationExecutionTiming === 'immediately' ? 0 : parsedWaitTime
    const waitMilliseconds =
      waitTime *
      (automationWaitUnit === 'days'
        ? 24 * 60 * 60 * 1000
        : automationWaitUnit === 'hours'
          ? 60 * 60 * 1000
          : 60 * 1000)
    const actionStep: AutomationActionItem = {
      id: actionId,
      parentId: automationParentId || null,
      type: 'action',
      actionType: automationAction,
      value: automationValue,
      waitTime,
      waitUnit: automationWaitUnit,
      scheduledAt: baseDate
        ? new Date(baseDate.getTime() + waitMilliseconds).toISOString()
        : null,
      followUp:
        automationAction === 'createFollowUp'
          ? {
              ...automationFollowUpDraft,
              title: automationFollowUpDraft.title.trim(),
              action: {
                ...automationFollowUpDraft.action,
                templateVariables: {
                  ...automationFollowUpDraft.action.templateVariables,
                },
                templateRequiredVariables: [
                  ...automationFollowUpDraft.action.templateRequiredVariables,
                ],
              },
            }
          : null,
    }

    onAutomationsChange(
      editingAutomationId
        ? automations.map((automation) =>
            automation.id === editingAutomationId ? actionStep : automation,
          )
        : [...automations, actionStep],
    )

    const parentExpansionIds: string[] = []
    let ancestorId = automationParentId

    while (ancestorId) {
      parentExpansionIds.push(ancestorId)
      ancestorId =
        automations.find((automation) => automation.id === ancestorId)
          ?.parentId ?? ''
    }

    setExpandedAutomationIds((currentIds) => [
      ...new Set([...currentIds, ...parentExpansionIds]),
    ])

    handleCancelAutomation()
  }

  const renderAutomationWaitTimeFields = () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={labelStyle}>Quando executar?</label>
      <select
        value={automationExecutionTiming}
        onChange={(event) =>
          setAutomationExecutionTiming(
            event.target.value as AutomationExecutionTiming,
          )
        }
        style={selectStyle}
      >
        <option value="immediately">Imediatamente</option>
        <option value="afterPeriod">
          {shouldUseWaitLabel ? 'Aguardar um período' : 'Após um período'}
        </option>
      </select>

      {automationExecutionTiming === 'afterPeriod' ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={labelStyle}>Tempo</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <select
              value={automationWaitUnit}
              onChange={(event) =>
                setAutomationWaitUnit(event.target.value as AutomationWaitUnit)
              }
              style={inputStyle}
            >
              {automationWaitUnitOptions.map((option) => (
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
              value={automationWaitTime}
              onChange={(event) => setAutomationWaitTime(event.target.value)}
              style={inputStyle}
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
              {automationBaseDateLabel}
            </strong>
          </div>
        </div>
      ) : null}
    </div>
  )

  const renderAutomationFollowUpFields = () => {
    if (automationAction !== 'createFollowUp') {
      return null
    }

    return (
      <>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={labelStyle}>Nome do Follow-up</label>
          <input
            type="text"
            placeholder="Nome do Follow-up"
            value={automationFollowUpDraft.title}
            onChange={(event) =>
              setAutomationFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
            style={inputStyle}
          />
        </div>

        <FollowUpActionFields
          value={automationFollowUpDraft.action}
          onChange={(action) =>
            setAutomationFollowUpDraft((currentDraft) => ({
              ...currentDraft,
              action,
            }))
          }
          leadSource={leadSource}
          leadEmail={leadEmail}
          leadPhone={leadPhone}
          isMobile={isMobile}
        />

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={labelStyle}>Data/Hora</label>
          <ComposerDateTimeInput
            value={automationFollowUpDraft.dueAt}
            onChange={(nextValue) =>
              setAutomationFollowUpDraft((currentDraft) => ({
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

  const renderAutomationSaveButton = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={handleCancelAutomation}
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
        onClick={handleSaveAutomation}
        disabled={!canSaveAutomation}
        style={{
          height: isMobile ? 46 : 42,
          border: 'none',
          borderRadius: 8,
          background: canSaveAutomation
            ? interactionTheme.primaryButtonBackground
            : '#e5e7eb',
          color: canSaveAutomation ? '#ffffff' : '#94a3b8',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: isMobile ? 14 : 13,
          fontWeight: 700,
          cursor: canSaveAutomation ? 'pointer' : 'not-allowed',
        }}
      >
        <Save size={16} />
        {editingAutomationId ? 'Salvar alterações' : 'Salvar'}
      </button>
    </div>
  )

  const renderAutomationList = () => {
    const getOptionLabel = <T extends string>(
      options: Array<{ value: T; label: string }>,
      optionValue: T,
    ) =>
      options.find((option) => option.value === optionValue)?.label ??
      optionValue

    const getWaitDescription = (automation: AutomationActionItem) => {
      if (automation.waitTime === 0) {
        return 'Imediatamente'
      }

      const parent = automations.find(
        (candidate) => candidate.id === automation.parentId,
      )
      const prefix =
        parent?.type === 'condition' && isReplyCondition(parent.conditionType)
          ? 'Aguardar'
          : 'Após'

      const unitLabels: Record<
        AutomationWaitUnit,
        [singular: string, plural: string]
      > = {
        minutes: ['minuto', 'minutos'],
        hours: ['hora', 'horas'],
        days: ['dia', 'dias'],
      }
      const [singular, plural] = unitLabels[automation.waitUnit]

      return `${prefix} ${automation.waitTime} ${automation.waitTime === 1 ? singular : plural}`
    }

    const getActionIcon = (automation: AutomationActionItem): TreeIcon => {
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

    const getActionTitle = (automation: AutomationActionItem) => {
      if (automation.actionType !== 'createFollowUp') {
        return getOptionLabel(automationActionOptions, automation.actionType)
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

    const getActionDetail = (automation: AutomationActionItem) => {
      if (automation.followUp) {
        return automation.followUp.title
      }

      const valueOptions = automationValueOptions[automation.actionType]
      if (!valueOptions || !automation.value) {
        return undefined
      }

      return (
        valueOptions.find((option) => option.value === automation.value)
          ?.label ?? automation.value
      )
    }

    const getActionDescription = (automation: AutomationActionItem) => {
      const waitDescription = getWaitDescription(automation)
      let baseDueAt = value.dueAt
      let ancestorId = automation.parentId

      while (ancestorId) {
        const ancestor = automations.find(
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
      automation: BusinessFollowUpAutomationItem,
      displayId: string,
    ): TreeNode => {
      const childNodes = automations
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
          automationConditionOptions,
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

    const automationTree = automations
      .filter(
        (automation) =>
          !automation.parentId ||
          !automations.some(
            (candidate) => candidate.id === automation.parentId,
          ),
      )
      .map((automation, index) =>
        buildAutomationNode(automation, `${index + 1}`),
      )

    const handleAddChildAutomation = (automationId: string) => {
      setEditingAutomationId(null)
      setAutomationParentId(automationId)
      setAutomationAction('')
      setAutomationValue('')
      setAutomationExecutionTiming('immediately')
      setAutomationWaitTime('')
      setAutomationWaitUnit('minutes')
      setAutomationFollowUpDraft(initialAutomationFollowUpDraft)
      setActiveTab('automation')
    }

    const handleEditAutomation = (automation: AutomationActionItem) => {
      setEditingAutomationId(automation.id)
      setAutomationParentId(automation.parentId ?? '')
      setAutomationAction(automation.actionType)
      setAutomationValue(automation.value)
      setAutomationExecutionTiming(
        automation.waitTime === 0 ? 'immediately' : 'afterPeriod',
      )
      setAutomationWaitTime(String(automation.waitTime))
      setAutomationWaitUnit(automation.waitUnit)
      setAutomationFollowUpDraft(
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
          : initialAutomationFollowUpDraft,
      )
      setActiveTab('automation')
    }

    const handleAddFollowUpCondition = (
      automationId: string,
      conditionType: AutomationCondition,
    ) => {
      const conditionId = crypto.randomUUID()

      onAutomationsChange([
        ...automations,
        {
          id: conditionId,
          parentId: automationId,
          type: 'condition',
          conditionType,
        },
      ])

      setExpandedAutomationIds((currentIds) => [
        ...new Set([...currentIds, automationId]),
      ])
      setOpenConditionMenuId(null)
    }

    const handleDeleteAutomation = (automationId: string) => {
      const automationIdsToDelete = new Set([automationId])
      let foundDescendant = true

      while (foundDescendant) {
        foundDescendant = false
        automations.forEach((automation) => {
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

      onAutomationsChange(
        automations.filter(
          (automation) => !automationIdsToDelete.has(automation.id),
        ),
      )
      setExpandedAutomationIds((currentIds) =>
        currentIds.filter((id) => !automationIdsToDelete.has(id)),
      )
      if (automationIdsToDelete.has(automationParentId)) {
        setAutomationParentId('')
      }
      setConfirmingDeleteAutomationId(null)
      setOpenConditionMenuId(null)
    }

    const handleSaveRootCondition = () => {
      if (!rootCondition || !hasValidRootCondition) {
        return
      }

      onAutomationsChange([
        ...automations,
        {
          id: crypto.randomUUID(),
          parentId: null,
          type: 'condition',
          conditionType: rootCondition,
        },
      ])

      setRootCondition('')
      setIsAddingRootCondition(false)
    }

    const toggleAutomationNode = (id: string) => {
      setExpandedAutomationIds((currentIds) =>
        currentIds.includes(id)
          ? currentIds.filter((currentId) => currentId !== id)
          : [...currentIds, id],
      )
    }

    const renderAutomationIcon = (icon: TreeIcon) => {
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
      return <MessageCircle {...iconProps} />
    }

    const renderAutomationNode = (node: TreeNode) => {
      const hasChildren = Boolean(node.children?.length)
      const isExpanded = expandedAutomationIds.includes(node.id)
      const sourceAutomation = automations.find(
        (automation) => automation.id === node.automationId,
      )
      const isAction = sourceAutomation?.type === 'action'
      const canHaveChildren = canAutomationHaveChildren(sourceAutomation)
      const statusPresentation =
        automationStatusPresentation[sourceAutomation?.status ?? 'pending']
      const isConfirmingDelete =
        !readOnly && confirmingDeleteAutomationId === node.id
      const automationTypeLabel = isAction ? 'Ação' : 'Condição'

      return (
        <div key={node.id}>
          <article
            style={{
              minHeight: isMobile ? 68 : 62,
              display: 'grid',
              gridTemplateColumns: `${hasChildren ? `${isMobile ? 22 : 26}px ` : ''}${
                isMobile ? 40 : 46
              }px minmax(0, 1fr) auto`,
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
                    onClick={() => setConfirmingDeleteAutomationId(null)}
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
                    openConditionMenuId === node.id
                      ? openConditionMenuRef
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
                  <span
                    style={{
                      borderRadius: 6,
                      padding: isMobile ? '5px 7px' : '6px 9px',
                      background: statusPresentation.background,
                      color: statusPresentation.color,
                      fontSize: isMobile ? 10 : 11,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusPresentation.label}
                  </span>
                  {!readOnly ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Deletar ${node.title}`}
                        title="Deletar"
                        onClick={() => setConfirmingDeleteAutomationId(node.id)}
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
                              setOpenConditionMenuId((currentId) =>
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
                    </>
                  ) : null}

                  {openConditionMenuId === node.id && !readOnly ? (
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
                      {automationConditionOptions.map((option) => (
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
                {readOnly
                  ? 'Visualize as automações e ramificações deste follow-up.'
                  : 'Visualize e gerencie suas automações e suas ramificações.'}
              </span>
            </span>

            {!readOnly ? (
              <button
                type="button"
                onClick={() => {
                  setOpenConditionMenuId(null)
                  if (!isAddingRootCondition) {
                    setRootCondition('')
                    setIsAddingRootCondition(true)
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
            ) : null}
          </header>

          <div
            ref={automationListRef}
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
            ) : !isAddingRootCondition ? (
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

            {isAddingRootCondition && !readOnly ? (
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
                  value={rootCondition}
                  onChange={(event) =>
                    setRootCondition(
                      event.target.value as AutomationCondition | '',
                    )
                  }
                  style={selectStyle}
                >
                  <option value="">Selecione a condição</option>
                  {rootConditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    aria-label="Cancelar adição de condição"
                    title="Cancelar"
                    onClick={() => {
                      setRootCondition('')
                      setIsAddingRootCondition(false)
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
                    disabled={!hasValidRootCondition}
                    onClick={handleSaveRootCondition}
                    style={{
                      width: isMobile ? 38 : 42,
                      height: isMobile ? 38 : 42,
                      border: 'none',
                      background: 'transparent',
                      color: hasValidRootCondition ? '#16a34a' : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: hasValidRootCondition ? 'pointer' : 'not-allowed',
                      opacity: hasValidRootCondition ? 1 : 0.6,
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

  const renderTabs = () => {
    const tabs: Array<{ key: ComposerTab; label: string }> = readOnly
      ? [
          { key: 'information', label: 'Dados' },
          { key: 'automationList', label: 'Automações' },
        ]
      : [
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
          const isActive = activeTab === tab.key
          const isAutomationListDisabled =
            !readOnly && tab.key === 'automationList' && !canConfirmFollowUp
          const isActionTab = !readOnly && tab.key === 'automation'
          const isDisabled = isActionTab || isAutomationListDisabled

          return (
            <button
              key={tab.key}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.key)}
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

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: isMobile ? 'auto' : '100%',
        minHeight: isMobile ? '100%' : 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: isMobile ? '0 18px 28px' : 0,
        overscrollBehavior: isMobile ? 'auto' : 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {renderTabs()}

      <div
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          flex: isMobile ? 'none' : 1,
          minHeight: 0,
          overflowY: isMobile ? 'visible' : 'auto',
          overflowX: isMobile ? 'visible' : 'hidden',
          paddingRight: isMobile ? 2 : 6,
        }}
      >
        {activeTab === 'information' ? (
          <>
            {businessField ?? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={labelStyle}>Negócio</label>
                <input
                  type="text"
                  value={businessTitle}
                  readOnly
                  disabled
                  style={{
                    ...inputStyle,
                    color: '#64748b',
                    background: '#f8fafc',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            )}

            {isBusinessSelected ? (
              <>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={labelStyle}>Título</label>
                  <input
                    type="text"
                    placeholder="Título do follow-up"
                    value={value.title}
                    onChange={(event) =>
                      updateComposerDraft({ title: event.target.value })
                    }
                    readOnly={readOnly}
                    disabled={readOnly}
                    style={{
                      ...inputStyle,
                      color: readOnly ? '#64748b' : '#111827',
                      background: readOnly ? '#f8fafc' : '#ffffff',
                      cursor: readOnly ? 'not-allowed' : 'text',
                    }}
                  />
                </div>

                {additionalInformationFields}

                <FollowUpActionFields
                  value={value.action}
                  onChange={(nextAction) =>
                    updateComposerDraft({ action: nextAction })
                  }
                  leadSource={leadSource}
                  leadEmail={leadEmail}
                  leadPhone={leadPhone}
                  isMobile={isMobile}
                  readOnly={readOnly}
                />

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={labelStyle}>Data/Hora</label>
                  <ComposerDateTimeInput
                    value={value.dueAt}
                    onChange={(nextValue) =>
                      updateComposerDraft({ dueAt: nextValue })
                    }
                    isMobile={isMobile}
                    readOnly={readOnly}
                  />
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
                Selecione um negócio para continuar.
              </p>
            )}
          </>
        ) : null}

        {activeTab === 'automationList' ? renderAutomationList() : null}

        {activeTab === 'automation' ? (
          <section
            style={{
              display: 'grid',
              gap: 14,
              padding: isMobile ? 12 : 14,
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <strong
                style={{
                  color: '#1f2937',
                  fontSize: isMobile ? 15 : 14,
                  fontWeight: 800,
                }}
              >
                {editingAutomationId ? 'Editar ação' : 'Nova ação'}
              </strong>
              <span style={{ color: '#64748b', fontSize: isMobile ? 12 : 11 }}>
                {automationParent?.type === 'condition'
                  ? `Condição pai: ${
                      automationConditionOptions.find(
                        (option) =>
                          option.value === automationParent.conditionType,
                      )?.label ?? '-'
                    }`
                  : automationParent
                    ? 'Ação pai selecionada'
                    : 'Sem nó pai'}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={labelStyle}>Ação</label>
              <select
                value={automationAction}
                onChange={(event) => {
                  setAutomationAction(
                    event.target.value as AutomationAction | '',
                  )
                  setAutomationValue('')
                }}
                style={selectStyle}
              >
                <option value="">Selecione</option>
                {availableActionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedValueOptions ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={labelStyle}>{selectedValueLabel}</label>
                <select
                  value={automationValue}
                  onChange={(event) => setAutomationValue(event.target.value)}
                  style={selectStyle}
                >
                  <option value="">Selecione</option>
                  {selectedValueOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {renderAutomationWaitTimeFields()}
            {renderAutomationFollowUpFields()}
            {renderAutomationSaveButton()}
          </section>
        ) : null}
      </div>
    </section>
  )
}
