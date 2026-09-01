import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  BriefcaseBusiness,
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  AlertCircle,
  CircleDollarSign,
  CircleUserRound,
  Compass,
  Clock4,
  Download,
  Eye,
  Facebook,
  Flame,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Package,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Save,
  Link2,
  Instagram,
  Star,
  Snowflake,
  Sun,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  FileText,
  User,
} from 'lucide-react'
import { useAtom } from 'jotai'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import Skeleton from 'react-loading-skeleton'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import 'react-day-picker/style.css'
import 'react-loading-skeleton/dist/skeleton.css'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { DelayedTooltip } from '../../core/components/DelayedTooltip'
import { FollowUpActionFields } from '../../core/components/FollowUpActionFields'
import {
  BusinessInformationSkeleton,
  BusinessTabsSkeleton,
  LeadActionsSkeleton,
  LeadChatTabSkeleton,
  LeadFollowUpTabSkeleton,
  LeadGeneralTabSkeleton,
  LeadHeaderSkeleton,
  LeadTabsSkeleton,
} from '../../core/components/LeadDetailsSkeleton'
import {
  fromFollowUpActionResponse,
  initialFollowUpActionDraft,
  isFollowUpActionDraftValid,
  toFollowUpActionPayload,
} from '../../core/components/followUpActionDraft'
import type { FollowUpActionDraft } from '../../core/components/followUpActionDraft'
import { getFollowUpStatusPresentation } from '../../core/components/followUpStatusPresentation'
import { getLeadSourceTagPresentation } from '../../core/components/leadSourceTagPresentation'
import { getMoneyInputStyle } from '../../core/styles/moneyInputStyle'
import {
  formatLeadPhoneInput,
  formatStoredLeadPhoneInput,
  isLeadPhoneComplete,
  isLeadPhoneValidForSource,
  toPersistedLeadPhone,
} from '../../core/utils/leadPhone'
import {
  formatDate,
  formatDateTime,
  getApiDateTimestamp,
  parsePersistedUtcClockToBrowserDate,
} from '../../core/utils/dateTime'
import { LeadChatTab } from '../../features/webhook/components/LeadChatTab'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import {
  initialOpenedBusinessState,
  openedBusinessAtom,
  openedBusinessAttachmentsAtom,
  openedBusinessCostsAtom,
  openedBusinessPaymentsAtom,
} from '../../features/webhook/state/openedBusinessAtom'
import type {
  CreateNegotiationPayload,
  LeadFollowUpResponse,
  LeadResponse,
  LeadSocialLinkKey,
  LeadStage,
  LeadRuntimeMode,
  NegotiationFollowUpResponse,
  NegotiationCostType,
  NegotiationNote,
  NegotiationPaymentMethod,
  NegotiationPaymentStatus,
  NegotiationResponse,
  NegotiationStatus,
  NegotiationTemperature,
  NegotiationType,
  UpdateNegotiationPayload,
} from '../../features/webhook/types/webhook.types'

type LeadTabKey = 'geral' | 'negocios' | 'followups' | 'chat' | 'notas'
type FollowUpVisualStatus = 'overdue' | 'today' | 'scheduled' | 'completed'
type TagPresentation = {
  label: string
  textColor: string
  icon?: ReactNode
}

type LeadPageProps = {
  onLeadUpdated?: () => void
  onLeadCreated?: () => void
}

type LeadPageLocationState = {
  initialLeadTab?: LeadTabKey
  initialBusinessId?: string
  initialBusinessTab?: BusinessInnerTabKey
  initialBusinessFollowUpId?: string
  focusMessageId?: string | null
}

const initialLeadInfoDraft = {
  name: '',
  phone: '',
  email: '',
  source: '',
  location: '',
  leadQualification: '' as '' | 'qualify' | 'not qualify',
  qualification: '',
  socialLinks: {
    instagram: '',
    facebook: '',
    url: '',
  },
  selectedSocialLinks: [] as LeadSocialLinkKey[],
}

const leadSourceOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'direct', label: 'Direct' },
  { value: 'Meta Ads', label: 'Meta Ads' },
  { value: 'googleads', label: 'Google Ads' },
  { value: 'indicacao', label: 'Indicação' },
] as const

const createLeadSourceOptions = leadSourceOptions.filter(
  ({ value }) => value !== 'messenger' && value !== 'direct',
)

const resolveLeadSourceOptionValue = (source: string): string => {
  const normalizedSource = source
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
  return normalizedSource === 'metaads'
    ? 'Meta Ads'
    : source.trim().toLowerCase()
}

const leadTabs: Array<{ key: LeadTabKey; label: string }> = [
  { key: 'geral', label: 'Geral' },
  { key: 'negocios', label: 'Negócios' },
  { key: 'followups', label: 'Agenda' },
  { key: 'notas', label: 'Anotações' },
  { key: 'chat', label: 'Chat' },
]

type NewBusinessDraft = {
  negotiationType: '' | NegotiationType
  title: string
  stage: LeadStage
  temperature: '' | NegotiationTemperature
  value: string
  notes: string
}

type BusinessDetailDraft = {
  title: string
  negotiationType: '' | NegotiationType
  stage: LeadStage
  temperature: '' | NegotiationTemperature
  value: string
  notes: string
}

type BusinessOverviewQuickField =
  | 'negotiationType'
  | 'stage'
  | 'status'
  | 'temperature'

type BusinessOverviewQuickSelectProps = {
  ariaLabel: string
  background: string
  color: string
  disabled: boolean
  emptyDisplayLabel?: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  value: string
}

const BusinessOverviewQuickSelect = ({
  ariaLabel,
  background,
  color,
  disabled,
  emptyDisplayLabel,
  onChange,
  options,
  value,
}: BusinessOverviewQuickSelectProps) => {
  const selectedLabel =
    value === '' && emptyDisplayLabel !== undefined
      ? emptyDisplayLabel
      : (options.find((option) => option.value === value)?.label ?? '-')

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        minHeight: 28,
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: '6px 10px',
        background,
        color,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <span aria-hidden="true" style={{ textAlign: 'center' }}>
        {selectedLabel}
      </span>
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  )
}

type NewBusinessNoteDraft = {
  title: string
  description: string
}

type NewLeadTabNoteDraft = {
  businessId: string
  title: string
  description: string
}

type NewBusinessFollowUpDraft = {
  title: string
  action: FollowUpActionDraft
  dueAt: string
  status: LeadFollowUpResponse['status']
}

type AgendaFollowUpDraft = {
  negotiationId: string
  title: string
  action: FollowUpActionDraft
  dueAt: string
}

type BusinessInnerTabKey =
  | 'informacoes'
  | 'financeiro'
  | 'followups'
  | 'arquivos'
  | 'notas'

type FinancialSectionKey = 'summary' | 'sale' | 'costs' | 'payment'

const initialFinancialSaleDraft = {
  saleAmount: '',
  discountAmount: '',
}

const initialFinancialCostDraft = {
  description: '',
  type: 'PRODUCT' as NegotiationCostType,
  amount: '',
}

const emptyFinancialPaymentDraft = {
  amount: '',
  paymentMethod: '' as NegotiationPaymentMethod | '',
  dueDate: '',
  installmentCount: '1',
}

const financialCostTypeLabels: Record<NegotiationCostType, string> = {
  PRODUCT: 'Produto',
  SERVICE: 'Serviço',
  COMMISSION: 'Comissão',
  TAX: 'Imposto',
  FREIGHT: 'Frete',
  FEE: 'Taxa',
  OTHER: 'Outro',
}

const financialPaymentStatusLabels: Record<NegotiationPaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
  CANCELED: 'Cancelado',
}

const financialPaymentMethodLabels: Record<NegotiationPaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  OTHER: 'Outro',
}

const installmentPaymentMethods: NegotiationPaymentMethod[] = [
  'CREDIT_CARD',
  'DEBIT_CARD',
]

const financialPaymentStatusColors: Record<
  NegotiationPaymentStatus,
  { background: string; textColor: string }
> = {
  PENDING: { background: '#fef3c7', textColor: '#b45309' },
  PAID: { background: '#dcfce7', textColor: '#166534' },
  OVERDUE: { background: '#fee2e2', textColor: '#b91c1c' },
  CANCELED: { background: '#e2e8f0', textColor: '#475569' },
}

const getFollowUpChannelTagPresentation = (
  actions: NegotiationFollowUpResponse['actions'],
) => {
  const channel = actions.find(
    (action) => action.type === 'send_message',
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

  if (actions.some((action) => action.type === 'send_email')) {
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

const initialNewBusinessDraft: NewBusinessDraft = {
  negotiationType: '',
  title: '',
  stage: 'NEW',
  temperature: '',
  value: '',
  notes: '',
}

const initialNewBusinessNoteDraft: NewBusinessNoteDraft = {
  title: '',
  description: '',
}

const initialNewLeadTabNoteDraft: NewLeadTabNoteDraft = {
  businessId: '',
  title: '',
  description: '',
}

const initialNewBusinessFollowUpDraft: NewBusinessFollowUpDraft = {
  title: '',
  action: initialFollowUpActionDraft,
  dueAt: '',
  status: 'pending',
}

const initialAgendaFollowUpDraft: AgendaFollowUpDraft = {
  negotiationId: '',
  title: '',
  action: initialFollowUpActionDraft,
  dueAt: '',
}

const attachmentInputAccept =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip,.rar,.7z'

type FollowUpDateTimeInputProps = {
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

function FollowUpDateTimeInput({
  value,
  onChange,
  isMobile,
}: FollowUpDateTimeInputProps) {
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false)
  const [draftTime, setDraftTime] = useState<string>('09:00')
  const [desktopPickerPosition, setDesktopPickerPosition] = useState({
    left: 0,
    top: 8,
  })
  const pickerContainerRef = useRef<HTMLDivElement | null>(null)
  const pickerPopoverRef = useRef<HTMLDivElement | null>(null)
  const parsedValue = parseDateTimeLocalValue(value)

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

      if (
        pickerContainerRef.current.contains(event.target as Node) ||
        pickerPopoverRef.current?.contains(event.target as Node)
      ) {
        return
      }

      setIsPickerOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (!isPickerOpen || isMobile) {
      return
    }

    const container = pickerContainerRef.current
    const popover = pickerPopoverRef.current
    if (!container || !popover) {
      return
    }

    if (typeof popover.showPopover === 'function') {
      popover.showPopover()
    }

    const updatePosition = () => {
      const containerRect = container.getBoundingClientRect()
      const popoverWidth = popover.offsetWidth
      const popoverHeight = popover.offsetHeight

      setDesktopPickerPosition({
        left: Math.min(
          Math.max(8, containerRect.left),
          window.innerWidth - popoverWidth - 8,
        ),
        top: Math.max(8, containerRect.top - popoverHeight - 8),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)

      if (popover.matches(':popover-open')) {
        popover.hidePopover()
      }
    }
  }, [isMobile, isPickerOpen])

  const pickerCalendar = (
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
  )

  return (
    <div
      ref={pickerContainerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={() => setIsPickerOpen((current) => !current)}
        style={{
          flex: 1,
          minWidth: 0,
          height: isMobile ? 46 : 42,
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
        <CalendarDays size={16} color="#6b7280" />
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
          width: isMobile ? 112 : 104,
          height: isMobile ? 46 : 42,
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

      {isPickerOpen && isMobile ? (
        <div
          ref={pickerPopoverRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            padding: 12,
            zIndex: 30,
          }}
        >
          {pickerCalendar}
        </div>
      ) : null}

      {isPickerOpen && !isMobile
        ? createPortal(
            <div
              ref={pickerPopoverRef}
              popover="manual"
              style={{
                position: 'fixed',
                left: desktopPickerPosition.left,
                top: desktopPickerPosition.top,
                margin: 0,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                background: '#ffffff',
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
                padding: 12,
                zIndex: 2147483647,
              }}
            >
              {pickerCalendar}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

type PaymentDatePickerInputProps = {
  value: string
  onChange: (nextValue: string) => void
  isMobile: boolean
  ariaLabel: string
}

const parseDateOnlyValue = (value: string): Date | null => {
  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return null
  }

  const [yearRaw, monthRaw, dayRaw] = normalizedValue.split('-')
  if (!yearRaw || !monthRaw || !dayRaw) {
    return null
  }

  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null
  }

  const parsedDate = new Date(year, month - 1, day)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const buildDateOnlyValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function PaymentDatePickerInput({
  value,
  onChange,
  isMobile,
  ariaLabel,
}: PaymentDatePickerInputProps) {
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false)
  const [desktopPickerPosition, setDesktopPickerPosition] = useState({
    left: 0,
    top: 8,
  })
  const pickerContainerRef = useRef<HTMLDivElement | null>(null)
  const pickerPopoverRef = useRef<HTMLDivElement | null>(null)
  const selectedDate = parseDateOnlyValue(value)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!pickerContainerRef.current) {
        return
      }

      if (
        pickerContainerRef.current.contains(event.target as Node) ||
        pickerPopoverRef.current?.contains(event.target as Node)
      ) {
        return
      }

      setIsPickerOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (!isPickerOpen || isMobile) {
      return
    }

    const container = pickerContainerRef.current
    const popover = pickerPopoverRef.current
    if (!container || !popover) {
      return
    }

    if (typeof popover.showPopover === 'function') {
      popover.showPopover()
    }

    const updatePosition = () => {
      const containerRect = container.getBoundingClientRect()
      const popoverWidth = popover.offsetWidth
      const popoverHeight = popover.offsetHeight

      setDesktopPickerPosition({
        left: Math.min(
          Math.max(8, containerRect.left),
          window.innerWidth - popoverWidth - 8,
        ),
        top: Math.max(8, containerRect.top - popoverHeight - 8),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)

      if (popover.matches(':popover-open')) {
        popover.hidePopover()
      }
    }
  }, [isMobile, isPickerOpen])

  const pickerCalendar = (
    <DayPicker
      mode="single"
      selected={selectedDate ?? undefined}
      onSelect={(selectedDay) => {
        if (!selectedDay) {
          onChange('')
          return
        }

        onChange(buildDateOnlyValue(selectedDay))
        setIsPickerOpen(false)
      }}
      weekStartsOn={1}
      showOutsideDays
    />
  )

  return (
    <div ref={pickerContainerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsPickerOpen((current) => !current)}
        style={{
          width: '100%',
          minWidth: 0,
          height: isMobile ? 46 : 42,
          border: '1px solid #d7dce4',
          borderRadius: 10,
          padding: '0 12px',
          color: selectedDate ? '#111827' : '#6b7280',
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
        aria-label={ariaLabel}
      >
        <CalendarDays size={16} color="#6b7280" />
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {formatDatePickerLabel(selectedDate)}
        </span>
      </button>

      {isPickerOpen && isMobile ? (
        <div
          ref={pickerPopoverRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            padding: 12,
            zIndex: 30,
          }}
        >
          {pickerCalendar}
        </div>
      ) : null}

      {isPickerOpen && !isMobile
        ? createPortal(
            <div
              ref={pickerPopoverRef}
              popover="manual"
              style={{
                position: 'fixed',
                left: desktopPickerPosition.left,
                top: desktopPickerPosition.top,
                margin: 0,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                background: '#ffffff',
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
                padding: 12,
                zIndex: 2147483647,
              }}
            >
              {pickerCalendar}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

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

const tagIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginRight: 4,
  lineHeight: 0,
  verticalAlign: 'middle' as const,
}

const tagContentStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 1,
  verticalAlign: 'middle' as const,
}

const formatPhoneNumber = (value: string): string => {
  const formattedPhone = formatStoredLeadPhoneInput(value)
  if (
    !formattedPhone ||
    !isLeadPhoneValidForSource(formattedPhone, 'whatsapp')
  ) {
    return '-'
  }
  return formattedPhone
}

const getTemperatureTagPresentation = (
  temperature: string,
): TagPresentation => {
  const normalizedTemperature = temperature.trim().toLowerCase()

  if (normalizedTemperature === 'hot') {
    return {
      label: 'Quente',
      textColor: '#dc2626',
      icon: <Flame size={12} />,
    }
  }

  if (normalizedTemperature === 'cold') {
    return {
      label: 'Frio',
      textColor: '#0ea5e9',
      icon: <Snowflake size={12} />,
    }
  }

  if (normalizedTemperature === 'warm') {
    return {
      label: 'Morno',
      textColor: '#ea580c',
      icon: <Sun size={12} />,
    }
  }

  return {
    label: 'Sem temperatura',
    textColor: '#6b7280',
  }
}

const getLeadQualificationTagPresentation = (
  value?: 'qualify' | 'not qualify' | null,
): { label: string; textColor: string; background: string } => {
  if (value === 'qualify') {
    return {
      label: 'Qualificado',
      textColor: '#166534',
      background: '#dcfce7',
    }
  }

  if (value === 'not qualify') {
    return {
      label: 'Não qualificado',
      textColor: '#b91c1c',
      background: '#fee2e2',
    }
  }

  return {
    label: '-',
    textColor: '#475569',
    background: '#e2e8f0',
  }
}

const getBusinessTypeTagPresentation = (
  value?: NegotiationType | '' | null,
): { label: string; textColor: string; background: string } => {
  if (value === 'service') {
    return {
      label: 'Serviço',
      textColor: '#7c3aed',
      background: '#ede9fe',
    }
  }

  if (value === 'product') {
    return {
      label: 'Produto',
      textColor: '#7c3aed',
      background: '#ede9fe',
    }
  }

  return {
    label: '-',
    textColor: '#475569',
    background: '#e2e8f0',
  }
}

const getBusinessLifecycleTagPresentation = (
  status?: NegotiationStatus | string | null,
): { label: string; textColor: string; background: string } => {
  if (status === 'WON') {
    return {
      label: 'Ganho',
      textColor: '#166534',
      background: '#dcfce7',
    }
  }

  if (status === 'LOST') {
    return {
      label: 'Perdido',
      textColor: '#b91c1c',
      background: '#fee2e2',
    }
  }

  return {
    label: 'Em Aberto',
    textColor: '#1d4ed8',
    background: '#dbeafe',
  }
}

const getDefaultTagStyle = (textColor: string, background: string) => ({
  fontSize: 12,
  fontWeight: 700,
  color: textColor,
  whiteSpace: 'nowrap' as const,
  background,
  borderRadius: 6,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '7px 12px',
  lineHeight: 1.1,
  width: 'fit-content',
})

const leadStageLabelMap: Record<LeadStage, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  PROPOSAL_SENT: 'Proposta enviada',
  NEGOTIATION: 'Negociação',
  WON: 'Ganho',
  LOST: 'Perdido',
}

const leadStageOptions: LeadStage[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
]

const formatDateOnly = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  return formatDate(value)
}

const formatLastMessageSummary = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  return formatDateTime(value)
}

const sanitizeLeadValueInput = (value: string): string => {
  const compact = value.replace(/\s+/g, '')
  let hasComma = false
  let decimalDigits = 0
  let sanitized = ''

  for (const character of compact) {
    if (/\d/.test(character)) {
      if (hasComma && decimalDigits >= 2) {
        continue
      }

      sanitized += character
      if (hasComma) decimalDigits += 1
      continue
    }

    if (character === ',' && !hasComma) {
      sanitized += character
      hasComma = true
    }
  }

  return sanitized
}

const parseLeadValueToNumber = (value?: string | null): number | null => {
  if (typeof value === 'undefined' || value === null) {
    return null
  }

  const compact = value.replace(/\s+/g, '').trim()
  if (!compact) {
    return null
  }

  let normalized = ''

  if (compact.includes(',')) {
    const [rawIntegerPart, ...rawFractionParts] = compact.split(',')
    const integerDigits = rawIntegerPart.replace(/\D/g, '')
    const fractionDigits = rawFractionParts
      .join('')
      .replace(/\D/g, '')
      .slice(0, 2)

    if (!integerDigits && !fractionDigits) {
      return null
    }

    if (!fractionDigits) {
      normalized = integerDigits || '0'
    } else {
      normalized = `${integerDigits || '0'}.${fractionDigits}`
    }
  } else if (compact.includes('.')) {
    const dotCount = (compact.match(/\./g) ?? []).length

    if (dotCount === 1) {
      const [rawIntegerPart, rawFractionPart = ''] = compact.split('.')
      const integerDigits = rawIntegerPart.replace(/\D/g, '')
      const fractionDigits = rawFractionPart.replace(/\D/g, '')

      if (!integerDigits && !fractionDigits) {
        return null
      }

      if (fractionDigits.length > 0 && fractionDigits.length <= 2) {
        normalized = `${integerDigits || '0'}.${fractionDigits}`
      } else {
        normalized = `${integerDigits}${fractionDigits}`
      }
    } else {
      normalized = compact.replace(/\D/g, '')
    }
  } else {
    normalized = compact.replace(/\D/g, '')
  }

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatLeadValue = (value?: string | null): string => {
  const parsed = parseLeadValueToNumber(value)

  if (parsed === null) {
    return '-'
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed)
}

const formatLeadValueInputField = (value?: string | null): string => {
  const formatted = formatLeadValue(value)
  return formatted === '-' ? '' : sanitizeLeadValueInput(formatted)
}

const parseLeadValueInput = (value: string): string | null => {
  const normalizedInput = sanitizeLeadValueInput(value)
  if (!normalizedInput) {
    return null
  }

  const [rawIntegerPart, rawFractionPart = ''] = normalizedInput.split(',')
  const integerDigits = rawIntegerPart.replace(/\D/g, '')

  if (!integerDigits && !rawFractionPart) {
    return null
  }

  if (!rawFractionPart) {
    return String(Number(integerDigits || '0'))
  }

  const centsDigits = rawFractionPart
    .replace(/\D/g, '')
    .slice(0, 2)
    .padEnd(2, '0')

  if (centsDigits === '00') {
    return String(Number(integerDigits || '0'))
  }

  return `${Number(integerDigits || '0')}.${centsDigits}`
}

const formatNegotiationNotes = (notes?: NegotiationNote[] | null): string => {
  if (!notes || notes.length === 0) {
    return ''
  }

  return notes
    .map((note) => {
      const title = note.title.trim()
      const description = note.description.trim()

      if (!title) {
        return description
      }

      if (!description) {
        return title
      }

      return `${title}: ${description}`
    })
    .filter(Boolean)
    .join('\n')
}

const formatBusinessNotePreview = (value?: string | null): string => {
  if (!value) {
    return '-'
  }

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return '-'
  }

  return lines[0]
}

const getLeadStageLabel = (stage?: string | null): string => {
  if (!stage) {
    return 'Novo'
  }

  return leadStageLabelMap[stage as LeadStage] ?? stage
}

export default function LeadPage({
  onLeadUpdated,
  onLeadCreated,
}: LeadPageProps) {
  const { isMobile } = useViewportBreakpoint()
  const { leadId } = useParams<{ leadId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isCreateLeadMode = leadId === 'new'
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [followUpsError, setFollowUpsError] = useState<string | null>(null)
  const [leadData, setLeadData] = useState<LeadResponse | null>(null)
  const [followUpsTotalItems, setFollowUpsTotalItems] = useState<number>(0)
  const [isCreatingAgendaFollowUp, setIsCreatingAgendaFollowUp] =
    useState<boolean>(false)
  const [agendaFollowUpDraft, setAgendaFollowUpDraft] =
    useState<AgendaFollowUpDraft>(initialAgendaFollowUpDraft)
  const [infoDraft, setInfoDraft] = useState<{
    name: string
    phone: string
    email: string
    source: string
    location: string
    leadQualification: '' | 'qualify' | 'not qualify'
    qualification: string
    socialLinks: {
      instagram: string
      facebook: string
      url: string
    }
    selectedSocialLinks: LeadSocialLinkKey[]
  }>(initialLeadInfoDraft)
  const [isGeneralActionsOpen, setIsGeneralActionsOpen] =
    useState<boolean>(false)
  const [isEditingLeadInfo, setIsEditingLeadInfo] = useState<boolean>(false)
  const [isConfirmingLeadDelete, setIsConfirmingLeadDelete] =
    useState<boolean>(false)
  const [isConfirmingLeadArchive, setIsConfirmingLeadArchive] =
    useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<LeadTabKey>('geral')
  const leadTabBeforeEditRef = useRef<LeadTabKey>('geral')
  const [, setNotesDraft] = useState<string>('')
  const [selectedLeadNotesBusinessId, setSelectedLeadNotesBusinessId] =
    useState<string>('')
  const [isCreatingBusinessNote, setIsCreatingBusinessNote] =
    useState<boolean>(false)
  const [viewingBusinessNoteIndex, setViewingBusinessNoteIndex] = useState<
    number | null
  >(null)
  const [editingBusinessNoteIndex, setEditingBusinessNoteIndex] = useState<
    number | null
  >(null)
  const [isConfirmingBusinessNoteDelete, setIsConfirmingBusinessNoteDelete] =
    useState<boolean>(false)
  const [newBusinessNoteDraft, setNewBusinessNoteDraft] =
    useState<NewBusinessNoteDraft>(initialNewBusinessNoteDraft)
  const [isCreatingLeadTabNote, setIsCreatingLeadTabNote] =
    useState<boolean>(false)
  const [newLeadTabNoteDraft, setNewLeadTabNoteDraft] =
    useState<NewLeadTabNoteDraft>(initialNewLeadTabNoteDraft)
  const [leadTabNotesError, setLeadTabNotesError] = useState<string | null>(
    null,
  )
  const [hoveredLeadTab, setHoveredLeadTab] = useState<LeadTabKey | null>(null)
  const [hoveredBusinessTab, setHoveredBusinessTab] =
    useState<BusinessInnerTabKey | null>(null)
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(
    null,
  )
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  )
  const selectedBusinessIdRef = useRef<string | null>(null)
  const activeBusinessTabRef = useRef<BusinessInnerTabKey>('informacoes')
  const requestedBusinessTabRef = useRef<BusinessInnerTabKey | null>(null)
  const requestedBusinessNoteIndexRef = useRef<number | null>(null)
  const requestedBusinessFollowUpIdRef = useRef<string | null>(null)
  const [isBusinessActionsOpen, setIsBusinessActionsOpen] =
    useState<boolean>(false)
  const [isConfirmingBusinessDelete, setIsConfirmingBusinessDelete] =
    useState<boolean>(false)
  const [isConfirmingBusinessClose, setIsConfirmingBusinessClose] =
    useState<boolean>(false)
  const [isEditingBusiness, setIsEditingBusiness] = useState<boolean>(false)
  const [activeFinancialSection, setActiveFinancialSection] =
    useState<FinancialSectionKey>('summary')
  const [editingFinancialSection, setEditingFinancialSection] = useState<
    'sale' | null
  >(null)
  const [financialSaleDraft, setFinancialSaleDraft] = useState(
    initialFinancialSaleDraft,
  )
  const [openedBusiness, setOpenedBusiness] = useAtom(openedBusinessAtom)
  const [financialCosts, setFinancialCosts] = useAtom(openedBusinessCostsAtom)
  const [isFinancialCostsLoading, setIsFinancialCostsLoading] =
    useState<boolean>(false)
  const [isCreatingFinancialCost, setIsCreatingFinancialCost] =
    useState<boolean>(false)
  const [editingFinancialCostId, setEditingFinancialCostId] = useState<
    string | null
  >(null)
  const [confirmingDeleteFinancialCostId, setConfirmingDeleteFinancialCostId] =
    useState<string | null>(null)
  const [isSavingFinancialCost, setIsSavingFinancialCost] =
    useState<boolean>(false)
  const [isDeletingFinancialCost, setIsDeletingFinancialCost] =
    useState<boolean>(false)
  const [financialCostDraft, setFinancialCostDraft] = useState(
    initialFinancialCostDraft,
  )
  const [financialPaymentDraft, setFinancialPaymentDraft] = useState(
    emptyFinancialPaymentDraft,
  )
  const [financialPayments, setFinancialPayments] = useAtom(
    openedBusinessPaymentsAtom,
  )
  const [isFinancialPaymentsLoading, setIsFinancialPaymentsLoading] =
    useState<boolean>(false)
  const [isCreatingFinancialPayment, setIsCreatingFinancialPayment] =
    useState<boolean>(false)
  const [editingFinancialPaymentId, setEditingFinancialPaymentId] = useState<
    string | null
  >(null)
  const [
    confirmingDeleteFinancialPaymentId,
    setConfirmingDeleteFinancialPaymentId,
  ] = useState<string | null>(null)
  const [isSavingFinancialPayment, setIsSavingFinancialPayment] =
    useState<boolean>(false)
  const [isDeletingFinancialPayment, setIsDeletingFinancialPayment] =
    useState<boolean>(false)
  const [
    updatingFinancialPaymentStatusId,
    setUpdatingFinancialPaymentStatusId,
  ] = useState<string | null>(null)
  const [isCreatingBusinessFollowUp, setIsCreatingBusinessFollowUp] =
    useState<boolean>(false)
  const [newBusinessFollowUpDraft, setNewBusinessFollowUpDraft] =
    useState<NewBusinessFollowUpDraft>(initialNewBusinessFollowUpDraft)
  const [viewingBusinessFollowUpId, setViewingBusinessFollowUpId] = useState<
    string | null
  >(null)
  const [editingBusinessFollowUpId, setEditingBusinessFollowUpId] = useState<
    string | null
  >(null)
  const [
    isConfirmingViewedBusinessFollowUpDelete,
    setIsConfirmingViewedBusinessFollowUpDelete,
  ] = useState<boolean>(false)
  const [hoveredBusinessNoteIndex, setHoveredBusinessNoteIndex] = useState<
    number | null
  >(null)
  const [
    confirmingDeleteBusinessFollowUpId,
    setConfirmingDeleteBusinessFollowUpId,
  ] = useState<string | null>(null)
  const [hoveredAgendaFollowUpId, setHoveredAgendaFollowUpId] = useState<
    string | null
  >(null)
  const [hoveredBusinessFollowUpId, setHoveredBusinessFollowUpId] = useState<
    string | null
  >(null)
  const [hoveredBusinessFileId, setHoveredBusinessFileId] = useState<
    string | null
  >(null)
  const [businessAttachments, setBusinessAttachments] = useAtom(
    openedBusinessAttachmentsAtom,
  )
  const [isBusinessAttachmentsLoading, setIsBusinessAttachmentsLoading] =
    useState<boolean>(false)
  const [isUploadingBusinessAttachment, setIsUploadingBusinessAttachment] =
    useState<boolean>(false)
  const [
    confirmingDeleteBusinessAttachmentId,
    setConfirmingDeleteBusinessAttachmentId,
  ] = useState<string | null>(null)
  const [deletingBusinessAttachmentId, setDeletingBusinessAttachmentId] =
    useState<string | null>(null)
  const [downloadingBusinessAttachmentId, setDownloadingBusinessAttachmentId] =
    useState<string | null>(null)
  const businessAttachmentInputRef = useRef<HTMLInputElement | null>(null)
  const paymentProofInputRef = useRef<HTMLInputElement | null>(null)
  const paymentProofTargetIdRef = useRef<string | null>(null)
  const openedBusinessLoadSequenceRef = useRef<number>(0)
  const hydratedBusinessIdRef = useRef<string | null>(null)
  const [uploadingPaymentProofId, setUploadingPaymentProofId] = useState<
    string | null
  >(null)
  const [leadNegotiations, setLeadNegotiations] = useState<
    NegotiationResponse[]
  >([])
  const leadNegotiationsRef = useRef<NegotiationResponse[]>([])
  const [negotiationFollowUps, setNegotiationFollowUps] = useState<
    NegotiationFollowUpResponse[]
  >([])
  const [businessesError, setBusinessesError] = useState<string | null>(null)
  const [updatingBusinessOverviewField, setUpdatingBusinessOverviewField] =
    useState<BusinessOverviewQuickField | null>(null)
  const generalActionsRef = useRef<HTMLDivElement | null>(null)
  const [businessDetailDraft, setBusinessDetailDraft] =
    useState<BusinessDetailDraft | null>(null)
  const businessActionsRef = useRef<HTMLDivElement | null>(null)
  const [activeBusinessTab, setActiveBusinessTab] =
    useState<BusinessInnerTabKey>('informacoes')
  const [isCreatingBusiness, setIsCreatingBusiness] = useState<boolean>(false)
  const [newBusinessDraft, setNewBusinessDraft] = useState<NewBusinessDraft>(
    initialNewBusinessDraft,
  )
  const [isUpdatingRuntimeMode, setIsUpdatingRuntimeMode] =
    useState<boolean>(false)
  const [focusedChatMessageId, setFocusedChatMessageId] = useState<
    string | null
  >(null)
  const notesDraftRef = useRef<string>('')
  const lastSavedNotesRef = useRef<string>('')
  const isSavingNotesRef = useRef<boolean>(false)
  const locationState = location.state as LeadPageLocationState | null
  const requestedInitialTab =
    locationState?.initialLeadTab ??
    (location.pathname.startsWith('/conversas') ? 'chat' : 'geral')
  const requestedInitialBusinessId = locationState?.initialBusinessId ?? null
  const requestedInitialBusinessTab = locationState?.initialBusinessTab ?? null
  const requestedInitialBusinessFollowUpId =
    locationState?.initialBusinessFollowUpId ?? null
  const requestedFocusMessageId = locationState?.focusMessageId ?? null
  const isRequestedAgendaFollowUp =
    location.pathname.startsWith('/agenda') &&
    requestedInitialTab === 'negocios' &&
    requestedInitialBusinessTab === 'followups' &&
    Boolean(requestedInitialBusinessFollowUpId)
  const closeLeadPath = location.pathname.startsWith('/negocios')
    ? '/negocios'
    : location.pathname.startsWith('/agenda')
      ? '/agenda'
      : location.pathname.startsWith('/arquivos')
        ? '/arquivos'
        : location.pathname.startsWith('/conversas')
          ? '/conversas'
          : location.pathname.startsWith('/arquivados')
            ? '/arquivados'
            : '/leads'
  const isManagingBusinessFollowUp =
    isCreatingBusinessFollowUp ||
    editingBusinessFollowUpId !== null ||
    viewingBusinessFollowUpId !== null
  const shouldLockMobileFormBackground =
    isMobile &&
    (isCreatingAgendaFollowUp ||
      isManagingBusinessFollowUp ||
      isCreatingBusiness ||
      isCreatingLeadTabNote ||
      isCreatingBusinessNote)
  const formatFollowUpDate = (dateValue: string): string => {
    return dateValue ? formatDateTime(dateValue) : '-'
  }

  const getFollowUpVisualStatus = (
    followUp: LeadFollowUpResponse,
  ): FollowUpVisualStatus => {
    if (followUp.status !== 'pending') {
      return 'completed'
    }

    const parsedDate = parsePersistedUtcClockToBrowserDate(followUp.dueAt)
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

  const getFollowUpDateTagColors = (status: FollowUpVisualStatus) => {
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

  const handleCreateNegotiationFollowUp = async (
    negotiationId: string,
    title: string,
    dueAt: string,
    action: FollowUpActionDraft,
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    setBusinessesError(null)
    await WebhookService.createNegotiationFollowUp({
      negotiationId,
      title,
      actions: [toFollowUpActionPayload(action)],
      dueAt,
    })
    await refreshLeadNegotiations(leadId)
    onLeadUpdated?.()
  }

  const handleCreateAgendaFollowUp = async () => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    if (
      !agendaFollowUpDraft.negotiationId ||
      !agendaFollowUpDraft.title.trim() ||
      !isFollowUpActionDraftValid(agendaFollowUpDraft.action) ||
      !agendaFollowUpDraft.dueAt
    ) {
      setFollowUpsError('Preencha negócio, título, ação e data/hora.')
      return
    }

    try {
      setFollowUpsError(null)
      await WebhookService.createNegotiationFollowUp({
        negotiationId: agendaFollowUpDraft.negotiationId,
        title: agendaFollowUpDraft.title.trim(),
        actions: [toFollowUpActionPayload(agendaFollowUpDraft.action)],
        dueAt: agendaFollowUpDraft.dueAt,
      })

      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()

      setAgendaFollowUpDraft((currentDraft) => ({
        ...currentDraft,
        title: '',
        action: initialFollowUpActionDraft,
        dueAt: '',
      }))
      setIsCreatingAgendaFollowUp(false)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao criar follow-up.'
      setFollowUpsError(message)
    }
  }

  const handleCancelAgendaFollowUpCreation = () => {
    setIsCreatingAgendaFollowUp(false)
    setFollowUpsError(null)
    setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
  }

  const handleUpdateNegotiationFollowUp = async (
    followUpId: string,
    title: string,
    dueAt: string,
    action: FollowUpActionDraft,
    status?: LeadFollowUpResponse['status'],
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    try {
      setBusinessesError(null)
      await WebhookService.updateNegotiationFollowUp(followUpId, {
        title,
        dueAt,
        actions: [toFollowUpActionPayload(action)],
        status,
      })
      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar follow-up.'
      setBusinessesError(message)
      throw new Error(message)
    }
  }

  const handleDeleteNegotiationFollowUp = async (followUpId: string) => {
    if (!leadId) return

    try {
      setBusinessesError(null)
      await WebhookService.deleteNegotiationFollowUp(followUpId)
      if (editingBusinessFollowUpId === followUpId) {
        setEditingBusinessFollowUpId(null)
      }
      if (confirmingDeleteBusinessFollowUpId === followUpId) {
        setConfirmingDeleteBusinessFollowUpId(null)
      }
      setIsConfirmingViewedBusinessFollowUpDelete(false)
      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao excluir follow-up.'
      setBusinessesError(message)
    }
  }

  const handleToggleNegotiationFollowUpStatus = async (
    followUpId: string,
    currentStatus: LeadFollowUpResponse['status'],
  ) => {
    if (!leadId) return

    try {
      setBusinessesError(null)

      if (currentStatus === 'done') {
        await WebhookService.updateNegotiationFollowUp(followUpId, {
          status: 'pending',
          completedAt: null,
        })
      } else {
        await WebhookService.updateNegotiationFollowUp(followUpId, {
          status: 'done',
          completedAt: new Date().toISOString(),
        })
      }

      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar status do follow-up.'
      setBusinessesError(message)
    }
  }

  const loadBusinessAttachments = async (negotiationId: string) => {
    setIsBusinessAttachmentsLoading(true)

    try {
      const attachments =
        await WebhookService.loadNegotiationAttachments(negotiationId)
      setBusinessAttachments(attachments)
      setBusinessesError(null)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao carregar arquivos do negocio.'

      setBusinessesError(message)
      setBusinessAttachments([])
    } finally {
      setIsBusinessAttachmentsLoading(false)
    }
  }

  const handleCreateNegotiationCost = async (negotiationId: string) => {
    const description = financialCostDraft.description.trim()
    const amount = parseLeadValueInput(financialCostDraft.amount)

    if (!description || amount === null) return

    setIsSavingFinancialCost(true)

    try {
      const cost = await WebhookService.createNegotiationCost(negotiationId, {
        description,
        type: financialCostDraft.type,
        amount,
      })

      setFinancialCosts((current) => [cost, ...current])
      setFinancialCostDraft(initialFinancialCostDraft)
      setIsCreatingFinancialCost(false)
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao adicionar custo ao negócio.'

      setBusinessesError(message)
    } finally {
      setIsSavingFinancialCost(false)
    }
  }

  const handleCreateNegotiationPayment = async (negotiationId: string) => {
    const amount = parseLeadValueInput(financialPaymentDraft.amount)
    const paymentMethod = financialPaymentDraft.paymentMethod

    if (amount === null || !financialPaymentDraft.dueDate || !paymentMethod) {
      return
    }

    const requiresInstallments =
      installmentPaymentMethods.includes(paymentMethod)
    const installmentCount = Number(financialPaymentDraft.installmentCount)

    if (
      requiresInstallments &&
      (!Number.isInteger(installmentCount) || installmentCount < 1)
    ) {
      return
    }

    setIsSavingFinancialPayment(true)

    try {
      const createdPayments = requiresInstallments
        ? await WebhookService.createNegotiationPaymentInstallments(
            negotiationId,
            {
              amount,
              paymentMethod,
              dueDate: financialPaymentDraft.dueDate,
              installmentCount,
            },
          )
        : [
            await WebhookService.createNegotiationPayment(negotiationId, {
              amount,
              paymentMethod,
              dueDate: financialPaymentDraft.dueDate,
              paidAt: null,
              status: 'PENDING',
            }),
          ]

      setFinancialPayments((current) =>
        [...current, ...createdPayments].sort((firstItem, secondItem) =>
          firstItem.dueDate.localeCompare(secondItem.dueDate),
        ),
      )
      setFinancialPaymentDraft(emptyFinancialPaymentDraft)
      setIsCreatingFinancialPayment(false)
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao adicionar pagamento ao negócio.'

      setBusinessesError(message)
    } finally {
      setIsSavingFinancialPayment(false)
    }
  }

  const handleUpdateNegotiationPayment = async (
    negotiationId: string,
    paymentId: string,
  ) => {
    const amount = parseLeadValueInput(financialPaymentDraft.amount)
    const paymentMethod = financialPaymentDraft.paymentMethod

    if (amount === null || !financialPaymentDraft.dueDate || !paymentMethod) {
      return
    }

    setIsSavingFinancialPayment(true)

    try {
      const updatedPayment = await WebhookService.updateNegotiationPayment(
        negotiationId,
        paymentId,
        {
          amount,
          paymentMethod,
          dueDate: financialPaymentDraft.dueDate,
        },
      )

      setFinancialPayments((current) =>
        current
          .map((payment) =>
            payment.id === paymentId ? updatedPayment : payment,
          )
          .sort((firstItem, secondItem) =>
            firstItem.dueDate.localeCompare(secondItem.dueDate),
          ),
      )
      setFinancialPaymentDraft(emptyFinancialPaymentDraft)
      setEditingFinancialPaymentId(null)
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao editar pagamento do negócio.'

      setBusinessesError(message)
    } finally {
      setIsSavingFinancialPayment(false)
    }
  }

  const handleUpdateNegotiationPaymentStatus = async (
    negotiationId: string,
    paymentId: string,
    status: 'PENDING' | 'PAID' | 'CANCELED',
  ) => {
    setUpdatingFinancialPaymentStatusId(paymentId)

    try {
      const updatedPayment = await WebhookService.updateNegotiationPayment(
        negotiationId,
        paymentId,
        {
          status,
          paidAt: status === 'PAID' ? new Date().toISOString() : null,
        },
      )

      setFinancialPayments((current) =>
        current.map((payment) =>
          payment.id === paymentId ? updatedPayment : payment,
        ),
      )
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar status do pagamento.'

      setBusinessesError(message)
    } finally {
      setUpdatingFinancialPaymentStatusId(null)
    }
  }

  const handleDeleteNegotiationPayment = async (
    negotiationId: string,
    paymentId: string,
  ) => {
    setIsDeletingFinancialPayment(true)

    try {
      await WebhookService.deleteNegotiationPayment(negotiationId, paymentId)
      setFinancialPayments((current) =>
        current.filter((payment) => payment.id !== paymentId),
      )
      setConfirmingDeleteFinancialPaymentId(null)
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao excluir pagamento do negócio.'

      setBusinessesError(message)
    } finally {
      setIsDeletingFinancialPayment(false)
    }
  }

  const handleUpdateNegotiationCost = async (
    negotiationId: string,
    costId: string,
  ) => {
    const description = financialCostDraft.description.trim()
    const amount = parseLeadValueInput(financialCostDraft.amount)

    if (!description || amount === null) return

    setIsSavingFinancialCost(true)

    try {
      const updatedCost = await WebhookService.updateNegotiationCost(
        negotiationId,
        costId,
        {
          description,
          type: financialCostDraft.type,
          amount,
        },
      )

      setFinancialCosts((current) =>
        current.map((cost) => (cost.id === costId ? updatedCost : cost)),
      )
      setFinancialCostDraft(initialFinancialCostDraft)
      setEditingFinancialCostId(null)
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao editar custo do negócio.'

      setBusinessesError(message)
    } finally {
      setIsSavingFinancialCost(false)
    }
  }

  const handleDeleteNegotiationCost = async (
    negotiationId: string,
    costId: string,
  ) => {
    setIsDeletingFinancialCost(true)

    try {
      await WebhookService.deleteNegotiationCost(negotiationId, costId)
      setFinancialCosts((current) =>
        current.filter((cost) => cost.id !== costId),
      )
      setConfirmingDeleteFinancialCostId(null)
      setBusinessesError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao excluir custo do negócio.'

      setBusinessesError(message)
    } finally {
      setIsDeletingFinancialCost(false)
    }
  }

  const handleUploadBusinessAttachment = async (
    negotiationId: string,
    file: File,
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    setIsUploadingBusinessAttachment(true)

    try {
      setBusinessesError(null)
      await WebhookService.uploadNegotiationAttachment(negotiationId, file)
      await loadBusinessAttachments(negotiationId)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao enviar arquivo do negocio.'

      setBusinessesError(message)
    } finally {
      setIsUploadingBusinessAttachment(false)
    }
  }

  const handleUploadPaymentProof = async (
    negotiationId: string,
    paymentId: string,
    file: File,
  ) => {
    setUploadingPaymentProofId(paymentId)

    try {
      setBusinessesError(null)
      const attachment = await WebhookService.uploadNegotiationAttachment(
        negotiationId,
        file,
      )
      const updatedPayment = await WebhookService.updateNegotiationPayment(
        negotiationId,
        paymentId,
        { proofAttachmentId: attachment.id },
      )

      setFinancialPayments((current) =>
        current.map((payment) =>
          payment.id === paymentId ? updatedPayment : payment,
        ),
      )
      setBusinessAttachments((current) =>
        current.some((item) => item.id === attachment.id)
          ? current
          : [attachment, ...current],
      )
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao associar comprovante ao pagamento.'

      setBusinessesError(message)
    } finally {
      setUploadingPaymentProofId(null)
      paymentProofTargetIdRef.current = null
    }
  }

  const handleDownloadBusinessAttachment = async (attachmentId: string) => {
    setDownloadingBusinessAttachmentId(attachmentId)

    try {
      setBusinessesError(null)
      const response =
        await WebhookService.getNegotiationAttachmentDownloadUrl(attachmentId)

      window.open(response.url, '_blank', 'noopener,noreferrer')
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao gerar link de download do arquivo.'

      setBusinessesError(message)
    } finally {
      setDownloadingBusinessAttachmentId(null)
    }
  }

  const handleDeleteBusinessAttachment = async (
    attachmentId: string,
    negotiationId: string,
  ) => {
    setDeletingBusinessAttachmentId(attachmentId)

    try {
      setBusinessesError(null)
      await WebhookService.deleteNegotiationAttachment(attachmentId)
      await loadBusinessAttachments(negotiationId)
      setFinancialPayments((current) =>
        current.map((payment) =>
          payment.proofAttachmentId === attachmentId
            ? { ...payment, proofAttachmentId: null }
            : payment,
        ),
      )
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao excluir arquivo do negocio.'

      setBusinessesError(message)
    } finally {
      setConfirmingDeleteBusinessAttachmentId(null)
      setDeletingBusinessAttachmentId(null)
    }
  }

  const applyActionHoverBackground = (
    isHovered: boolean,
    target: HTMLButtonElement,
  ) => {
    target.style.background = isHovered
      ? interactionTheme.clickableCardHoverBackground
      : '#ffffff'
  }

  const syncInfoDraftFromLead = () => {
    const instagramValue = leadData?.socialLinks?.instagram?.trim() ?? ''
    const facebookValue = leadData?.socialLinks?.facebook?.trim() ?? ''
    const urlValue = leadData?.socialLinks?.url?.trim() ?? ''
    const selectedSocialLinks: LeadSocialLinkKey[] = []

    if (instagramValue) {
      selectedSocialLinks.push('instagram')
    }

    if (facebookValue) {
      selectedSocialLinks.push('facebook')
    }

    if (urlValue) {
      selectedSocialLinks.push('url')
    }

    setInfoDraft({
      name: leadData?.name?.trim() ?? '',
      phone: formatStoredLeadPhoneInput(leadData?.phone?.trim() ?? ''),
      email: leadData?.email?.trim() ?? '',
      source: leadData?.source?.trim() ?? '',
      location: leadData?.location?.trim() ?? '',
      leadQualification: leadData?.leadQualification ?? '',
      qualification: leadData?.initialContext?.trim() ?? '',
      socialLinks: {
        instagram: instagramValue,
        facebook: facebookValue,
        url: urlValue,
      },
      selectedSocialLinks,
    })
  }

  const saveLeadNotes = async () => {
    if (!leadId || !leadData || isSavingNotesRef.current) return

    const currentNotes = notesDraftRef.current
    const persistedNotes = leadData.initialContext ?? ''

    if (
      currentNotes === persistedNotes ||
      currentNotes === lastSavedNotesRef.current
    ) {
      return
    }

    try {
      isSavingNotesRef.current = true

      const updatedLead = await WebhookService.updateLead(leadId, {
        initialContext: currentNotes,
      })

      lastSavedNotesRef.current = updatedLead.initialContext ?? currentNotes
      setLeadData(updatedLead)
      setInfoDraft((current) => ({
        ...current,
        qualification: updatedLead.initialContext?.trim() ?? '',
      }))
      setError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao salvar notas.'
      setError(message)
    } finally {
      isSavingNotesRef.current = false
    }
  }

  const canSaveLeadInfo = Boolean(
    infoDraft.name.trim() &&
    isLeadPhoneValidForSource(infoDraft.phone, infoDraft.source),
  )

  const handleSaveLeadInfo = async () => {
    if (!leadId || !leadData) return

    try {
      if (!isLeadPhoneValidForSource(infoDraft.phone, infoDraft.source)) {
        setError('Telefone inválido. Informe DDD + número com 8 ou 9 dígitos.')
        return
      }

      const trimmedEmail = infoDraft.email.trim()
      const persistedPhone = toPersistedLeadPhone(infoDraft.phone)
      const trimmedInstagram = infoDraft.socialLinks.instagram.trim()
      const trimmedFacebook = infoDraft.socialLinks.facebook.trim()
      const trimmedUrl = infoDraft.socialLinks.url.trim()
      const socialLinksPayload: Partial<Record<LeadSocialLinkKey, string>> = {}

      if (
        infoDraft.selectedSocialLinks.includes('instagram') &&
        trimmedInstagram
      ) {
        socialLinksPayload.instagram = trimmedInstagram
      }

      if (
        infoDraft.selectedSocialLinks.includes('facebook') &&
        trimmedFacebook
      ) {
        socialLinksPayload.facebook = trimmedFacebook
      }

      if (infoDraft.selectedSocialLinks.includes('url') && trimmedUrl) {
        socialLinksPayload.url = trimmedUrl
      }

      const hasSocialLinks = Object.keys(socialLinksPayload).length > 0

      const payload = {
        name: infoDraft.name.trim(),
        phone: persistedPhone,
        email: trimmedEmail || undefined,
        source: infoDraft.source.trim(),
        location: infoDraft.location.trim() || undefined,
        socialLinks: hasSocialLinks ? socialLinksPayload : null,
        leadQualification: infoDraft.leadQualification || null,
        initialContext: infoDraft.qualification.trim() || undefined,
      }

      const updatedLead = await WebhookService.updateLead(leadId, payload)
      setLeadData(updatedLead)
      setError(null)
      onLeadUpdated?.()
      setIsEditingLeadInfo(false)
      setIsGeneralActionsOpen(false)
      setIsConfirmingLeadDelete(false)
      setIsConfirmingLeadArchive(false)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar informações do lead.'
      setError(message)
    }
  }

  const handleCreateLead = async () => {
    const trimmedName = infoDraft.name.trim()
    const persistedPhone = toPersistedLeadPhone(infoDraft.phone)
    const trimmedEmail = infoDraft.email.trim()
    const trimmedSource = infoDraft.source.trim()
    const trimmedInstagram = infoDraft.socialLinks.instagram.trim()
    const trimmedFacebook = infoDraft.socialLinks.facebook.trim()
    const trimmedUrl = infoDraft.socialLinks.url.trim()
    const socialLinksPayload: Partial<Record<LeadSocialLinkKey, string>> = {}

    if (
      infoDraft.selectedSocialLinks.includes('instagram') &&
      trimmedInstagram
    ) {
      socialLinksPayload.instagram = trimmedInstagram
    }

    if (infoDraft.selectedSocialLinks.includes('facebook') && trimmedFacebook) {
      socialLinksPayload.facebook = trimmedFacebook
    }

    if (infoDraft.selectedSocialLinks.includes('url') && trimmedUrl) {
      socialLinksPayload.url = trimmedUrl
    }

    const hasSocialLinks = Object.keys(socialLinksPayload).length > 0

    if (!trimmedName) {
      setError('Preencha o nome do lead.')
      return
    }

    if (!isLeadPhoneComplete(infoDraft.phone)) {
      setError('Telefone inválido. Informe DDD + número com 8 ou 9 dígitos.')
      return
    }

    try {
      const createdLead = await WebhookService.createLead({
        name: trimmedName,
        phone: persistedPhone,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(trimmedSource ? { source: trimmedSource } : {}),
        ...(infoDraft.location.trim()
          ? { location: infoDraft.location.trim() }
          : {}),
        ...(hasSocialLinks ? { socialLinks: socialLinksPayload } : {}),
        leadQualification: infoDraft.leadQualification || null,
      })

      setError(null)
      onLeadCreated?.()
      onLeadUpdated?.()
      navigate(`/leads/${createdLead.id}${location.search}`, { replace: true })
    } catch (exception: unknown) {
      const message =
        exception instanceof Error ? exception.message : 'Falha ao criar lead.'
      setError(message)
    }
  }

  const handleStartLeadInfoEdit = () => {
    leadTabBeforeEditRef.current = activeTab
    handleLeadTabChange('geral')
    syncInfoDraftFromLead()
    setIsEditingLeadInfo(true)
    setIsConfirmingLeadDelete(false)
    setIsConfirmingLeadArchive(false)
    setIsGeneralActionsOpen(false)
  }

  const handleCancelLeadInfoEdit = () => {
    syncInfoDraftFromLead()
    setIsEditingLeadInfo(false)

    if (leadTabBeforeEditRef.current !== activeTab) {
      handleLeadTabChange(leadTabBeforeEditRef.current)
    }
  }

  const handleDeleteLead = async () => {
    if (!leadId) return

    try {
      await WebhookService.deleteLead(leadId)
      onLeadUpdated?.()
      navigate(closeLeadPath)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao deletar lead.'
      setError(message)
    }
  }

  const handleToggleLeadFavorite = async () => {
    if (!leadId || !leadData) return

    const nextFavoriteState = !(leadData.isFavorite ?? false)

    try {
      await WebhookService.toggleFavoriteLead(leadId, nextFavoriteState)
      setLeadData((currentLead) => {
        if (!currentLead) return currentLead

        return {
          ...currentLead,
          isFavorite: nextFavoriteState,
        }
      })
      onLeadUpdated?.()
      setIsGeneralActionsOpen(false)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar favorito.'
      setError(message)
    }
  }

  const handleToggleLeadArchive = async () => {
    if (!leadId || !leadData) return

    const isArchived = (leadData.state ?? 'active') === 'archived'
    const nextState: 'active' | 'archived' = isArchived ? 'active' : 'archived'

    try {
      await WebhookService.setLeadArchiveState(leadId, nextState)
      setLeadData((currentLead) => {
        if (!currentLead) return currentLead

        return {
          ...currentLead,
          state: nextState,
        }
      })
      onLeadUpdated?.()
      setIsGeneralActionsOpen(false)
      setIsConfirmingLeadArchive(false)
      navigate(`${closeLeadPath}${location.search}`)
    } catch (exception: unknown) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao atualizar arquivamento do lead.'
      setError(message)
    }
  }

  const refreshLeadNegotiations = async (targetLeadId: string) => {
    const [leadRelatedNegotiations, followUps] = await Promise.all([
      WebhookService.loadNegotiations(targetLeadId),
      WebhookService.loadNegotiationFollowUps(),
    ])

    const leadNegotiationIds = new Set(
      leadRelatedNegotiations.map((negotiation) => negotiation.id),
    )
    const leadRelatedFollowUps = followUps.filter((followUp) =>
      leadNegotiationIds.has(followUp.negotiationId),
    )

    setLeadNegotiations(leadRelatedNegotiations)
    setNegotiationFollowUps(leadRelatedFollowUps)
    setFollowUpsTotalItems(leadRelatedFollowUps.length)
    setBusinessesError(null)
  }

  const isLeadSkeletonVisible = isLoading

  useEffect(() => {
    activeBusinessTabRef.current = activeBusinessTab
  }, [activeBusinessTab])

  useEffect(() => {
    leadNegotiationsRef.current = leadNegotiations
  }, [leadNegotiations])

  useEffect(() => {
    if (!selectedBusinessId) {
      openedBusinessLoadSequenceRef.current += 1
      hydratedBusinessIdRef.current = null
      setOpenedBusiness(initialOpenedBusinessState)
      setIsFinancialCostsLoading(false)
      setIsFinancialPaymentsLoading(false)
      setIsBusinessAttachmentsLoading(false)
      return
    }

    const selectedBusiness = leadNegotiations.find(
      (business) => business.id === selectedBusinessId,
    )

    if (!selectedBusiness) {
      return
    }

    if (hydratedBusinessIdRef.current === selectedBusinessId) {
      setOpenedBusiness((current) =>
        current.business?.id === selectedBusinessId
          ? { ...current, business: selectedBusiness }
          : current,
      )
      return
    }

    hydratedBusinessIdRef.current = selectedBusinessId
    const loadSequence = openedBusinessLoadSequenceRef.current + 1
    openedBusinessLoadSequenceRef.current = loadSequence

    setOpenedBusiness({
      business: selectedBusiness,
      costs: [],
      payments: [],
      attachments: [],
      status: 'loading',
      error: null,
    })
    setIsFinancialCostsLoading(true)
    setIsFinancialPaymentsLoading(true)
    setIsBusinessAttachmentsLoading(true)

    const loadOpenedBusiness = async () => {
      try {
        const [costs, payments, attachments] = await Promise.all([
          selectedBusiness.financial
            ? WebhookService.loadNegotiationCosts(selectedBusinessId)
            : Promise.resolve([]),
          selectedBusiness.financial
            ? WebhookService.loadNegotiationPayments(selectedBusinessId)
            : Promise.resolve([]),
          WebhookService.loadNegotiationAttachments(selectedBusinessId),
        ])

        if (openedBusinessLoadSequenceRef.current !== loadSequence) {
          return
        }

        setOpenedBusiness((current) => ({
          business:
            current.business?.id === selectedBusinessId
              ? current.business
              : selectedBusiness,
          costs,
          payments,
          attachments,
          status: 'ready',
          error: null,
        }))
        setBusinessesError(null)
      } catch (exception: unknown) {
        if (openedBusinessLoadSequenceRef.current !== loadSequence) {
          return
        }

        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao carregar dados do negócio.'

        setOpenedBusiness((current) => ({
          business:
            current.business?.id === selectedBusinessId
              ? current.business
              : selectedBusiness,
          costs: [],
          payments: [],
          attachments: [],
          status: 'error',
          error: message,
        }))
        setBusinessesError(message)
      } finally {
        if (openedBusinessLoadSequenceRef.current === loadSequence) {
          setIsFinancialCostsLoading(false)
          setIsFinancialPaymentsLoading(false)
          setIsBusinessAttachmentsLoading(false)
        }
      }
    }

    void loadOpenedBusiness()
  }, [leadNegotiations, selectedBusinessId, setOpenedBusiness])

  useEffect(
    () => () => {
      openedBusinessLoadSequenceRef.current += 1
      setOpenedBusiness(initialOpenedBusinessState)
    },
    [setOpenedBusiness],
  )

  useEffect(() => {
    if (!leadId || isCreateLeadMode) return

    const refreshInterval = window.setInterval(() => {
      if (activeBusinessTabRef.current === 'financeiro') return

      void refreshLeadNegotiations(leadId)
    }, 60_000)

    return () => window.clearInterval(refreshInterval)
  }, [isCreateLeadMode, leadId])

  const handleLeadTabChange = (nextTab: LeadTabKey) => {
    setHoveredAgendaFollowUpId(null)

    if (nextTab === activeTab) return

    if (activeTab === 'notas' && nextTab !== 'notas') {
      void saveLeadNotes()
    }

    if (activeTab === 'followups' && nextTab !== 'followups') {
      handleCancelAgendaFollowUpCreation()
    }

    setActiveTab(nextTab)
    if (nextTab !== 'negocios') {
      setIsCreatingBusiness(false)
      setIsCreatingBusinessFollowUp(false)
      setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
      setSelectedBusinessId(null)
      requestedBusinessTabRef.current = null
      setIsBusinessActionsOpen(false)
      setIsConfirmingBusinessDelete(false)
      setIsConfirmingBusinessClose(false)
      setIsEditingBusiness(false)
      setBusinessDetailDraft(null)
      setActiveBusinessTab('informacoes')
      setNewBusinessDraft(initialNewBusinessDraft)
    }
    setIsGeneralActionsOpen(false)
    setIsEditingLeadInfo(false)
    setIsConfirmingLeadDelete(false)
    setIsConfirmingLeadArchive(false)

    if (nextTab === 'followups' && leadId) {
      void refreshLeadNegotiations(leadId)
    }
  }

  const openFollowUpChat = (followUp: NegotiationFollowUpResponse) => {
    const replyMessageId =
      followUp.actions.find((action) => action.replyMessageId)
        ?.replyMessageId ?? null

    setFocusedChatMessageId(replyMessageId)
    handleLeadTabChange('chat')
  }

  useEffect(() => {
    setActiveTab(requestedInitialTab)
    setFocusedChatMessageId(requestedFocusMessageId)
  }, [leadId, requestedFocusMessageId, requestedInitialTab])

  useEffect(() => {
    const nextNotesDraft = leadData?.initialContext ?? ''
    setNotesDraft(nextNotesDraft)
    notesDraftRef.current = nextNotesDraft
    lastSavedNotesRef.current = nextNotesDraft
    setInfoDraft((current) => ({
      ...current,
      qualification: leadData?.initialContext?.trim() ?? '',
    }))
  }, [leadData?.id, leadData?.initialContext])

  useEffect(() => {
    if (requestedInitialTab !== 'negocios' || !requestedInitialBusinessId) {
      return
    }

    requestedBusinessTabRef.current =
      requestedInitialBusinessTab ?? 'informacoes'
    requestedBusinessFollowUpIdRef.current =
      requestedInitialBusinessTab === 'followups'
        ? requestedInitialBusinessFollowUpId
        : null
    setIsCreatingBusiness(false)
    setSelectedBusinessId(requestedInitialBusinessId)
  }, [
    leadId,
    requestedInitialBusinessFollowUpId,
    requestedInitialBusinessId,
    requestedInitialBusinessTab,
    requestedInitialTab,
    location.key,
  ])

  useEffect(() => {
    const shouldOpenRequestedBusiness =
      requestedInitialTab === 'negocios' && Boolean(requestedInitialBusinessId)

    setIsCreatingBusiness(false)
    setIsCreatingBusinessFollowUp(false)
    setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
    setViewingBusinessFollowUpId(null)
    setSelectedBusinessId(
      shouldOpenRequestedBusiness ? requestedInitialBusinessId : null,
    )
    // Keep ref cleared so the selected-business effect can apply initial tab state.
    selectedBusinessIdRef.current = null
    requestedBusinessTabRef.current = shouldOpenRequestedBusiness
      ? (requestedInitialBusinessTab ?? 'informacoes')
      : null
    requestedBusinessFollowUpIdRef.current =
      shouldOpenRequestedBusiness && requestedInitialBusinessTab === 'followups'
        ? requestedInitialBusinessFollowUpId
        : null
    setIsBusinessActionsOpen(false)
    setIsConfirmingBusinessDelete(false)
    setIsConfirmingBusinessClose(false)
    setIsEditingBusiness(false)
    setViewingBusinessFollowUpId(null)
    setEditingBusinessFollowUpId(null)
    setConfirmingDeleteBusinessFollowUpId(null)
    setHoveredBusinessFollowUpId(null)
    setBusinessDetailDraft(null)
    setLeadNegotiations([])
    setNegotiationFollowUps([])
    setBusinessAttachments([])
    setIsBusinessAttachmentsLoading(false)
    setIsUploadingBusinessAttachment(false)
    setConfirmingDeleteBusinessAttachmentId(null)
    setDeletingBusinessAttachmentId(null)
    setDownloadingBusinessAttachmentId(null)
    setHoveredBusinessFileId(null)
    setBusinessesError(null)
    setActiveBusinessTab(
      shouldOpenRequestedBusiness
        ? (requestedInitialBusinessTab ?? 'informacoes')
        : 'informacoes',
    )
    setNewBusinessDraft(initialNewBusinessDraft)
    setIsGeneralActionsOpen(false)
    setIsEditingLeadInfo(false)
    setIsConfirmingLeadDelete(false)
    setIsConfirmingLeadArchive(false)
  }, [
    leadId,
    requestedInitialBusinessFollowUpId,
    requestedInitialBusinessId,
    requestedInitialBusinessTab,
    requestedInitialTab,
    setBusinessAttachments,
  ])

  useEffect(() => {
    if (!isGeneralActionsOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!generalActionsRef.current) {
        return
      }

      const clickedNode = event.target as Node | null
      if (clickedNode && !generalActionsRef.current.contains(clickedNode)) {
        setIsGeneralActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isGeneralActionsOpen])

  useEffect(() => {
    const shouldPreserveRequestedBusiness =
      requestedInitialTab === 'negocios' && Boolean(requestedInitialBusinessId)

    if (!selectedBusinessId) {
      setIsBusinessActionsOpen(false)
      setIsConfirmingBusinessDelete(false)
      setIsConfirmingBusinessClose(false)
      setIsCreatingBusinessNote(false)
      setIsCreatingBusinessFollowUp(false)
      setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
      setViewingBusinessNoteIndex(null)
      setEditingBusinessNoteIndex(null)
      setIsConfirmingBusinessNoteDelete(false)
      setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
      setIsEditingBusiness(false)
      setHoveredBusinessNoteIndex(null)
      if (!shouldPreserveRequestedBusiness) {
        requestedBusinessNoteIndexRef.current = null
        requestedBusinessFollowUpIdRef.current = null
      }
      setViewingBusinessFollowUpId(null)
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
      setHoveredBusinessFollowUpId(null)
      setBusinessAttachments([])
      setIsBusinessAttachmentsLoading(false)
      setIsUploadingBusinessAttachment(false)
      setConfirmingDeleteBusinessAttachmentId(null)
      setDeletingBusinessAttachmentId(null)
      setDownloadingBusinessAttachmentId(null)
      setHoveredBusinessFileId(null)
      setBusinessDetailDraft(null)

      if (shouldPreserveRequestedBusiness) {
        setActiveBusinessTab(requestedInitialBusinessTab ?? 'informacoes')
        requestedBusinessTabRef.current =
          requestedInitialBusinessTab ?? 'informacoes'
        requestedBusinessFollowUpIdRef.current =
          requestedInitialBusinessTab === 'followups'
            ? requestedInitialBusinessFollowUpId
            : null
      } else {
        setActiveBusinessTab('informacoes')
        requestedBusinessTabRef.current = null
      }

      selectedBusinessIdRef.current = null
      return
    }

    const selectedBusiness = leadNegotiations.find(
      (business) => business.id === selectedBusinessId,
    )

    if (!selectedBusiness) {
      setBusinessDetailDraft(null)
      return
    }

    setBusinessDetailDraft({
      title: selectedBusiness.title ?? '',
      negotiationType: selectedBusiness.negotiationType ?? '',
      stage: selectedBusiness.stage,
      temperature: selectedBusiness.temperature ?? '',
      value: formatLeadValueInputField(selectedBusiness.financial?.saleAmount),
      notes: formatNegotiationNotes(selectedBusiness.notes),
    })

    const hasRequestedBusinessNote =
      requestedBusinessTabRef.current === 'notas' &&
      requestedBusinessNoteIndexRef.current !== null
    const hasRequestedBusinessFollowUp =
      requestedBusinessTabRef.current === 'followups' &&
      requestedBusinessFollowUpIdRef.current !== null

    if (
      selectedBusinessIdRef.current !== selectedBusinessId ||
      hasRequestedBusinessNote ||
      hasRequestedBusinessFollowUp
    ) {
      const requestedBusinessTab =
        requestedBusinessTabRef.current ?? 'informacoes'
      setActiveBusinessTab(requestedBusinessTab)
      setViewingBusinessFollowUpId(null)
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
      setHoveredBusinessFollowUpId(null)

      if (hasRequestedBusinessNote) {
        setViewingBusinessNoteIndex(requestedBusinessNoteIndexRef.current)
        setIsConfirmingBusinessNoteDelete(false)
      } else if (hasRequestedBusinessFollowUp) {
        setViewingBusinessNoteIndex(null)
        setIsConfirmingBusinessNoteDelete(false)
        setViewingBusinessFollowUpId(requestedBusinessFollowUpIdRef.current)
      } else {
        setViewingBusinessNoteIndex(null)
        setIsConfirmingBusinessNoteDelete(false)
        setViewingBusinessFollowUpId(null)
      }

      requestedBusinessTabRef.current = null
      requestedBusinessNoteIndexRef.current = null
      requestedBusinessFollowUpIdRef.current = null
    }

    selectedBusinessIdRef.current = selectedBusinessId
    setIsCreatingBusinessNote(false)
    setIsCreatingBusinessFollowUp(false)
    setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
    setEditingBusinessNoteIndex(null)
    setIsConfirmingBusinessNoteDelete(false)
    setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
    setIsEditingBusiness(false)
    setHoveredBusinessNoteIndex(null)
    setIsBusinessActionsOpen(false)
    setIsConfirmingBusinessDelete(false)
    setIsConfirmingBusinessClose(false)
  }, [
    selectedBusinessId,
    leadNegotiations,
    requestedInitialBusinessFollowUpId,
    requestedInitialBusinessId,
    requestedInitialBusinessTab,
    requestedInitialTab,
    setBusinessAttachments,
  ])

  useEffect(() => {
    if (!leadNegotiations.length) {
      if (selectedLeadNotesBusinessId) {
        setSelectedLeadNotesBusinessId('')
      }
      setIsCreatingLeadTabNote(false)
      setNewLeadTabNoteDraft(initialNewLeadTabNoteDraft)
      setLeadTabNotesError(null)
      return
    }

    const hasSelectedBusiness = leadNegotiations.some(
      (business) => business.id === selectedLeadNotesBusinessId,
    )

    if (!hasSelectedBusiness && selectedLeadNotesBusinessId) {
      setSelectedLeadNotesBusinessId('')
    }
  }, [leadNegotiations, selectedLeadNotesBusinessId])

  useEffect(() => {
    if (activeBusinessTab === 'notas') {
      return
    }

    setIsCreatingBusinessNote(false)
    setViewingBusinessNoteIndex(null)
    setEditingBusinessNoteIndex(null)
    setIsConfirmingBusinessNoteDelete(false)
    setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
    setHoveredBusinessNoteIndex(null)
    requestedBusinessNoteIndexRef.current = null
  }, [activeBusinessTab])

  useEffect(() => {
    if (activeTab === 'notas') {
      return
    }

    setIsCreatingLeadTabNote(false)
    setNewLeadTabNoteDraft(initialNewLeadTabNoteDraft)
    setLeadTabNotesError(null)
  }, [activeTab])

  useEffect(() => {
    if (activeBusinessTab === 'followups') {
      return
    }

    setIsCreatingBusinessFollowUp(false)
    setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
    setViewingBusinessFollowUpId(null)
  }, [activeBusinessTab])

  useEffect(() => {
    if (activeBusinessTab !== 'financeiro') return

    setActiveFinancialSection('summary')
    setEditingFinancialSection(null)
    setIsCreatingFinancialCost(false)
    setEditingFinancialCostId(null)
    setConfirmingDeleteFinancialCostId(null)
    setFinancialCostDraft(initialFinancialCostDraft)
    setIsCreatingFinancialPayment(false)
    setEditingFinancialPaymentId(null)
    setConfirmingDeleteFinancialPaymentId(null)
    setFinancialPaymentDraft(emptyFinancialPaymentDraft)
  }, [activeBusinessTab, selectedBusinessId])

  useEffect(() => {
    if (!shouldLockMobileFormBackground) {
      return
    }

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
  }, [shouldLockMobileFormBackground])

  useEffect(() => {
    if (!isBusinessActionsOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!businessActionsRef.current) {
        return
      }

      const clickedNode = event.target as Node | null
      if (clickedNode && !businessActionsRef.current.contains(clickedNode)) {
        setIsBusinessActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isBusinessActionsOpen])

  const renderGeneralTab = () => {
    const leadStateLabel =
      leadData?.state?.trim().toLowerCase() === 'archived'
        ? 'Arquivado'
        : 'Ativo'
    const leadStateStyle =
      leadStateLabel === 'Arquivado'
        ? {
            color: '#b45309',
            background: '#fef3c7',
          }
        : {
            color: '#16a34a',
            background: '#dcfce7',
          }
    const formattedPhone = formatPhoneNumber(leadData?.phone?.trim() || '')
    const createdAtLabel = formatDateOnly(leadData?.createdAt)
    const lastMessageSummaryLabel = formatLastMessageSummary(
      leadData?.lastMessageAt ?? null,
    )
    const totalFollowUpsLabel = Number(followUpsTotalItems ?? 0)
    const totalBusinessesLabel = leadNegotiations.length

    const parseNegotiationValue = (value?: string | null): number => {
      const parsed = parseLeadValueToNumber(value)
      return parsed ?? 0
    }

    const getEstimatedProfit = (negotiation: NegotiationResponse): number => {
      const saleAmount = parseNegotiationValue(
        negotiation.financial?.saleAmount,
      )
      const discountAmount = parseNegotiationValue(
        negotiation.financial?.discountAmount,
      )
      const totalCosts = (negotiation.financial?.costs ?? []).reduce(
        (sum, cost) => sum + parseNegotiationValue(cost.amount),
        0,
      )

      return saleAmount - discountAmount - totalCosts
    }

    const totalBusinessValue = leadNegotiations.reduce((sum, negotiation) => {
      if (negotiation.status === 'LOST') {
        return sum
      }

      return sum + getEstimatedProfit(negotiation)
    }, 0)

    const totalReceivedValue = leadNegotiations.reduce((sum, negotiation) => {
      if (negotiation.status === 'LOST') {
        return sum
      }

      const receivedValue = (negotiation.financial?.payments ?? []).reduce(
        (paymentSum, payment) =>
          payment.status === 'PAID'
            ? paymentSum + parseNegotiationValue(payment.amount)
            : paymentSum,
        0,
      )

      return sum + receivedValue
    }, 0)

    const totalLostValue = leadNegotiations.reduce((sum, negotiation) => {
      if (negotiation.status !== 'LOST') {
        return sum
      }

      return sum + getEstimatedProfit(negotiation)
    }, 0)

    const totalBusinessValueLabel = formatLeadValue(
      totalBusinessValue.toFixed(2),
    )
    const totalReceivedValueLabel = formatLeadValue(
      totalReceivedValue.toFixed(2),
    )
    const totalLostValueLabel = formatLeadValue(totalLostValue.toFixed(2))
    const renderFinancialMetricHelp = (content: string, label: string) => (
      <DelayedTooltip content={content} delayMs={0}>
        <button
          type="button"
          aria-label={label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: '#6b7280',
            cursor: 'help',
          }}
        >
          <AlertCircle size={14} />
        </button>
      </DelayedTooltip>
    )
    const emailLabel = leadData?.email?.trim() || '-'
    const instagramLabel = leadData?.socialLinks?.instagram?.trim() || '-'
    const facebookLabel = leadData?.socialLinks?.facebook?.trim() || '-'
    const urlLabel = leadData?.socialLinks?.url?.trim() || '-'
    const leadQualificationTagPresentation =
      getLeadQualificationTagPresentation(leadData?.leadQualification ?? null)

    const sourceTagPresentation = getLeadSourceTagPresentation(leadData?.source)
    const leadEditFieldLabelStyle = {
      color: '#1f2937',
      fontSize: isMobile ? 17 / 1.3 : 13,
      fontWeight: 700,
    } as const
    const leadEditInputStyle = {
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
    const leadEditSelectStyle = {
      ...leadEditInputStyle,
      fontWeight: 600,
    } as const

    return (
      <section
        className="mobile-tabs-scrollbar-hidden"
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 10,
          height: isMobile ? '100%' : 'auto',
          width: '100%',
          minWidth: 0,
          minHeight: isMobile ? 0 : '100%',
          overflowY: isMobile ? 'auto' : 'visible',
          paddingRight: isMobile ? 0 : 4,
          boxSizing: 'border-box',
        }}
      >
        {isConfirmingLeadDelete ? (
          <article
            style={{
              border: '1px solid #fecaca',
              borderRadius: 16,
              padding: 24,
              background: '#fff7f7',
              display: 'grid',
              gap: 18,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#b91c1c',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              Deseja deletar esse lead?
            </h3>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingLeadDelete(false)
                }}
                style={{
                  minWidth: 96,
                  height: 34,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleDeleteLead()
                }}
                style={{
                  minWidth: 96,
                  height: 34,
                  border: 'none',
                  borderRadius: 8,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Deletar
              </button>
            </div>
          </article>
        ) : null}

        {isConfirmingLeadArchive ? (
          <article
            style={{
              border: '1px solid #fde68a',
              borderRadius: 16,
              padding: 24,
              background: '#fffbeb',
              display: 'grid',
              gap: 18,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#92400e',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              Deseja arquivar esse lead?
            </h3>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingLeadArchive(false)
                }}
                style={{
                  minWidth: 96,
                  height: 34,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleToggleLeadArchive()
                }}
                style={{
                  minWidth: 96,
                  height: 34,
                  border: 'none',
                  borderRadius: 8,
                  background: '#b45309',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Arquivar
              </button>
            </div>
          </article>
        ) : null}

        {!isEditingLeadInfo &&
        !isConfirmingLeadDelete &&
        !isConfirmingLeadArchive ? (
          <article
            style={{
              display: 'grid',
              gap: 14,
              width: '100%',
              minWidth: 0,
              padding: isMobile ? 16 : 18,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <section style={{ display: 'grid', gap: 8 }}>
              <div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    color: '#16a34a',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <FileText size={15} />
                </span>
                <h3
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 30 / 2,
                    fontWeight: 700,
                  }}
                >
                  Resumo
                </h3>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Clock4 size={14} /> Última mensagem
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {lastMessageSummaryLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CalendarClock size={14} /> Follow-ups
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {totalFollowUpsLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 2px',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <BriefcaseBusiness size={14} /> Total de negócios
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {totalBusinessesLabel}
                  </span>
                </div>
              </div>
            </section>
          </article>
        ) : null}

        {!isEditingLeadInfo &&
        !isConfirmingLeadDelete &&
        !isConfirmingLeadArchive ? (
          <article
            style={{
              display: 'grid',
              gap: 10,
              width: '100%',
              minWidth: 0,
              padding: isMobile ? 16 : 18,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <section style={{ display: 'grid', gap: 10 }}>
              <div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    color: '#16a34a',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <TrendingUp size={15} />
                </span>
                <h3
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 30 / 2,
                    fontWeight: 700,
                  }}
                >
                  Negócios
                </h3>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CircleDollarSign size={14} /> Valor total
                    {renderFinancialMetricHelp(
                      'Soma do lucro estimado dos negócios ganhos ou em aberto.',
                      'Como o valor total é calculado',
                    )}
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}
                  >
                    {totalBusinessValueLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={14} /> Valor recebido
                    {renderFinancialMetricHelp(
                      'Soma dos pagamentos recebidos nos negócios ganhos ou em aberto.',
                      'Como o valor recebido é calculado',
                    )}
                  </span>
                  <span
                    style={{ color: '#15803d', fontSize: 14, fontWeight: 800 }}
                  >
                    {totalReceivedValueLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 2px',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <XCircle size={14} /> Valor perdido
                    {renderFinancialMetricHelp(
                      'Soma do lucro estimado dos negócios perdidos.',
                      'Como o valor perdido é calculado',
                    )}
                  </span>
                  <span
                    style={{ color: '#dc2626', fontSize: 14, fontWeight: 800 }}
                  >
                    {totalLostValueLabel}
                  </span>
                </div>
              </div>
            </section>
          </article>
        ) : null}

        {!isConfirmingLeadDelete && !isConfirmingLeadArchive ? (
          <article
            style={{
              width: '100%',
              minWidth: 0,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: isMobile ? 16 : 18,
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            {!isEditingLeadInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <CircleUserRound size={15} />
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      color: '#0f172a',
                      fontSize: 30 / 2,
                      fontWeight: 700,
                    }}
                  >
                    Informações
                  </h3>
                </div>
              </div>
            ) : null}

            {isEditingLeadInfo ? (
              <div
                style={{
                  marginTop: 0,
                  display: 'grid',
                  gap: 16,
                  width: '100%',
                }}
              >
                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Nome</span>
                  <input
                    type="text"
                    value={infoDraft.name}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    style={leadEditInputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Telefone</span>
                  <input
                    type="text"
                    value={infoDraft.phone}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        phone: formatLeadPhoneInput(event.target.value),
                      }))
                    }
                    autoComplete="new-password"
                    maxLength={14}
                    inputMode="numeric"
                    style={leadEditInputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Email</span>
                  <input
                    type="email"
                    value={infoDraft.email}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    style={leadEditInputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Origem</span>
                  <select
                    value={resolveLeadSourceOptionValue(infoDraft.source)}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        source: event.target.value,
                      }))
                    }
                    style={leadEditSelectStyle}
                  >
                    {leadSourceOptions.map((sourceOption) => (
                      <option
                        key={sourceOption.value}
                        value={sourceOption.value}
                      >
                        {sourceOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Localização</span>
                  <input
                    type="text"
                    value={infoDraft.location}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    style={leadEditInputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Qualificação</span>
                  <select
                    value={infoDraft.leadQualification}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        leadQualification: event.target.value as
                          | ''
                          | 'qualify'
                          | 'not qualify',
                      }))
                    }
                    style={leadEditSelectStyle}
                  >
                    <option value="">Não definido</option>
                    <option value="qualify">Qualificado</option>
                    <option value="not qualify">Não qualificado</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={leadEditFieldLabelStyle}>Links</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      flexWrap: 'wrap',
                    }}
                  >
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#334155',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={infoDraft.selectedSocialLinks.includes(
                          'instagram',
                        )}
                        onChange={() => {
                          setInfoDraft((current) => {
                            const isSelected =
                              current.selectedSocialLinks.includes('instagram')

                            if (isSelected) {
                              return {
                                ...current,
                                selectedSocialLinks:
                                  current.selectedSocialLinks.filter(
                                    (item) => item !== 'instagram',
                                  ),
                                socialLinks: {
                                  ...current.socialLinks,
                                  instagram: '',
                                },
                              }
                            }

                            return {
                              ...current,
                              selectedSocialLinks: [
                                ...current.selectedSocialLinks,
                                'instagram',
                              ],
                            }
                          })
                        }}
                      />
                      Instagram
                    </label>

                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#334155',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={infoDraft.selectedSocialLinks.includes(
                          'facebook',
                        )}
                        onChange={() => {
                          setInfoDraft((current) => {
                            const isSelected =
                              current.selectedSocialLinks.includes('facebook')

                            if (isSelected) {
                              return {
                                ...current,
                                selectedSocialLinks:
                                  current.selectedSocialLinks.filter(
                                    (item) => item !== 'facebook',
                                  ),
                                socialLinks: {
                                  ...current.socialLinks,
                                  facebook: '',
                                },
                              }
                            }

                            return {
                              ...current,
                              selectedSocialLinks: [
                                ...current.selectedSocialLinks,
                                'facebook',
                              ],
                            }
                          })
                        }}
                      />
                      Facebook
                    </label>

                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#334155',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={infoDraft.selectedSocialLinks.includes('url')}
                        onChange={() => {
                          setInfoDraft((current) => {
                            const isSelected =
                              current.selectedSocialLinks.includes('url')

                            if (isSelected) {
                              return {
                                ...current,
                                selectedSocialLinks:
                                  current.selectedSocialLinks.filter(
                                    (item) => item !== 'url',
                                  ),
                                socialLinks: {
                                  ...current.socialLinks,
                                  url: '',
                                },
                              }
                            }

                            return {
                              ...current,
                              selectedSocialLinks: [
                                ...current.selectedSocialLinks,
                                'url',
                              ],
                            }
                          })
                        }}
                      />
                      URL
                    </label>
                  </div>
                </div>

                {infoDraft.selectedSocialLinks.includes('instagram') ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span style={leadEditFieldLabelStyle}>Instagram</span>
                    <input
                      type="text"
                      value={infoDraft.socialLinks.instagram}
                      onChange={(event) =>
                        setInfoDraft((current) => ({
                          ...current,
                          socialLinks: {
                            ...current.socialLinks,
                            instagram: event.target.value,
                          },
                        }))
                      }
                      placeholder="@usuario ou link"
                      style={leadEditInputStyle}
                    />
                  </div>
                ) : null}

                {infoDraft.selectedSocialLinks.includes('facebook') ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span style={leadEditFieldLabelStyle}>Facebook</span>
                    <input
                      type="text"
                      value={infoDraft.socialLinks.facebook}
                      onChange={(event) =>
                        setInfoDraft((current) => ({
                          ...current,
                          socialLinks: {
                            ...current.socialLinks,
                            facebook: event.target.value,
                          },
                        }))
                      }
                      placeholder="Perfil ou link"
                      style={leadEditInputStyle}
                    />
                  </div>
                ) : null}

                {infoDraft.selectedSocialLinks.includes('url') ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span style={leadEditFieldLabelStyle}>URL</span>
                    <input
                      type="text"
                      value={infoDraft.socialLinks.url}
                      onChange={(event) =>
                        setInfoDraft((current) => ({
                          ...current,
                          socialLinks: {
                            ...current.socialLinks,
                            url: event.target.value,
                          },
                        }))
                      }
                      placeholder="https://"
                      style={leadEditInputStyle}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <User size={14} /> Nome
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {leadData?.name?.trim() || '-'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Phone size={14} /> Telefone
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {formattedPhone}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Mail size={14} /> Email
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {emailLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Instagram size={14} /> Instagram
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {instagramLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Facebook size={14} /> Facebook
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {facebookLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Link2 size={14} /> URL
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {urlLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Compass size={14} /> Origem
                  </span>
                  {sourceTagPresentation.label === '-' ? (
                    <span
                      style={{
                        color: '#111827',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      -
                    </span>
                  ) : (
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
                        padding: '6px 10px',
                        lineHeight: 1.1,
                        width: 'fit-content',
                      }}
                    >
                      {sourceTagPresentation.icon ? (
                        <span style={tagIconStyle}>
                          {sourceTagPresentation.icon}
                        </span>
                      ) : null}
                      <span style={tagContentStyle}>
                        {sourceTagPresentation.label}
                      </span>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <MapPin size={14} /> Localização
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {leadData?.location?.trim() || '-'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <BadgeCheck size={14} /> Qualificação
                  </span>
                  {leadQualificationTagPresentation.label === '-' ? (
                    <span
                      style={{
                        color: '#111827',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      -
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: leadQualificationTagPresentation.textColor,
                        whiteSpace: 'nowrap',
                        background: leadQualificationTagPresentation.background,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 10px',
                        lineHeight: 1.1,
                      }}
                    >
                      {leadQualificationTagPresentation.label}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={14} /> Status
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: leadStateStyle.color,
                      background: leadStateStyle.background,
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 10px',
                      lineHeight: 1.1,
                    }}
                  >
                    {leadStateLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 2px',
                  }}
                >
                  <span
                    style={{
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CalendarDays size={14} /> Criado em
                  </span>
                  <span
                    style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}
                  >
                    {createdAtLabel}
                  </span>
                </div>
              </div>
            )}
          </article>
        ) : null}
      </section>
    )
  }

  const renderFollowUpsTab = () => {
    const hasSelectedAgendaBusiness = Boolean(agendaFollowUpDraft.negotiationId)
    const canCreateAgendaFollowUp =
      Boolean(agendaFollowUpDraft.negotiationId) &&
      Boolean(agendaFollowUpDraft.title.trim()) &&
      isFollowUpActionDraftValid(agendaFollowUpDraft.action) &&
      Boolean(agendaFollowUpDraft.dueAt)
    const shouldShowDesktopCreateOnly = !isMobile && isCreatingAgendaFollowUp
    const businessNameById = new Map(
      leadNegotiations.map((business) => [
        business.id,
        business.title?.trim() || 'Negócio sem nome',
      ]),
    )
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
    const startOfNextWeek = new Date(startOfToday)
    const daysUntilNextMonday = (8 - startOfToday.getDay()) % 7 || 7
    startOfNextWeek.setDate(startOfNextWeek.getDate() + daysUntilNextMonday)
    const startOfFollowingWeek = new Date(startOfNextWeek)
    startOfFollowingWeek.setDate(startOfFollowingWeek.getDate() + 7)
    const sortedAgendaFollowUps = [...negotiationFollowUps].sort(
      (firstItem, secondItem) =>
        getApiDateTimestamp(firstItem.dueAt) -
        getApiDateTimestamp(secondItem.dueAt),
    )
    const agendaGroups = sortedAgendaFollowUps.reduce<
      Array<{
        dateKey: string
        date: Date | null
        followUps: NegotiationFollowUpResponse[]
      }>
    >((groups, followUp) => {
      const date = parsePersistedUtcClockToBrowserDate(followUp.dueAt)
      const dateKey = date
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        : 'without-date'
      const currentGroup = groups.at(-1)

      if (currentGroup?.dateKey === dateKey) {
        currentGroup.followUps.push(followUp)
      } else {
        groups.push({ dateKey, date, followUps: [followUp] })
      }

      return groups
    }, [])
    const agendaSections = [
      {
        title: 'Esta semana',
        groups: agendaGroups.filter(
          (group) => group.date === null || group.date < startOfNextWeek,
        ),
      },
      {
        title: 'Próxima semana',
        groups: agendaGroups.filter(
          (group) =>
            group.date !== null &&
            group.date >= startOfNextWeek &&
            group.date < startOfFollowingWeek,
        ),
      },
      {
        title: 'Agendado',
        groups: agendaGroups.filter(
          (group) => group.date !== null && group.date >= startOfFollowingWeek,
        ),
      },
    ].filter((section) => section.groups.length > 0)

    const getAgendaGroupHeading = (date: Date | null) => {
      if (!date) {
        return { title: 'Sem data', detail: '' }
      }

      const dateStart = new Date(date)
      dateStart.setHours(0, 0, 0, 0)
      const title =
        dateStart.getTime() === startOfToday.getTime()
          ? 'Hoje'
          : dateStart.getTime() === startOfTomorrow.getTime()
            ? 'Amanhã'
            : new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
              }).format(dateStart)
      const normalizedTitle = title.charAt(0).toUpperCase() + title.slice(1)
      const detail = new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
      }).format(dateStart)

      return { title: normalizedTitle, detail }
    }

    const navigateToAgendaFollowUp = (
      followUp: NegotiationFollowUpResponse,
    ) => {
      setHoveredAgendaFollowUpId(null)
      setIsCreatingBusiness(false)
      setIsEditingBusiness(false)
      setIsBusinessActionsOpen(false)
      setIsConfirmingBusinessDelete(false)
      setIsConfirmingBusinessClose(false)
      requestedBusinessTabRef.current = 'followups'
      requestedBusinessFollowUpIdRef.current = followUp.id
      setViewingBusinessFollowUpId(followUp.id)
      setSelectedBusinessId(followUp.negotiationId)
      setActiveBusinessTab('followups')
      setActiveTab('negocios')
    }
    const agendaFollowUpCreateForm = (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          background: '#ffffff',
        }}
      >
        {isMobile ? (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#ffffff',
              paddingTop: 22,
              paddingBottom: 6,
              paddingLeft: 18,
              paddingRight: 18,
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Novo follow-up
            </h3>

            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <button
                type="button"
                aria-label="Salvar follow-up"
                title="Salvar follow-up"
                onClick={() => void handleCreateAgendaFollowUp()}
                disabled={!canCreateAgendaFollowUp}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: canCreateAgendaFollowUp ? '#6b7280' : '#cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: canCreateAgendaFollowUp ? 'pointer' : 'not-allowed',
                }}
              >
                <Save size={18} />
              </button>
              <button
                type="button"
                aria-label="Fechar criação de follow-up"
                title="Fechar criação"
                onClick={handleCancelAgendaFollowUpCreation}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#6b7280',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                X
              </button>
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            alignContent: 'start',
            gap: 16,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '0 18px 28px' : 0,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <label
              style={{
                color: '#1f2937',
                fontSize: isMobile ? 17 / 1.3 : 13,
                fontWeight: 700,
              }}
            >
              Negócio
            </label>
            <select
              value={agendaFollowUpDraft.negotiationId}
              onChange={(event) =>
                setAgendaFollowUpDraft((currentDraft) => ({
                  ...currentDraft,
                  negotiationId: event.target.value,
                }))
              }
              style={{
                width: '100%',
                height: isMobile ? 46 : 42,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: agendaFollowUpDraft.negotiationId
                  ? '#111827'
                  : '#6b7280',
                fontSize: isMobile ? 17 / 1.2 : 14,
                fontWeight: 600,
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            >
              <option value="">Selecione</option>
              {leadNegotiations.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.title ?? 'Negócio sem nome'}
                </option>
              ))}
            </select>
          </div>

          {hasSelectedAgendaBusiness ? (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: isMobile ? 17 / 1.3 : 13,
                    fontWeight: 700,
                  }}
                >
                  Título
                </label>
                <input
                  type="text"
                  placeholder="Título do follow-up"
                  value={agendaFollowUpDraft.title}
                  onChange={(event) =>
                    setAgendaFollowUpDraft((currentDraft) => ({
                      ...currentDraft,
                      title: event.target.value,
                    }))
                  }
                  style={{
                    height: isMobile ? 46 : 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: isMobile ? 17 / 1.2 : 14,
                    boxSizing: 'border-box',
                  }}
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
                leadSource={leadData?.source}
                leadEmail={leadData?.email}
                leadPhone={leadData?.phone}
                isMobile={isMobile}
              />

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: isMobile ? 17 / 1.3 : 13,
                    fontWeight: 700,
                  }}
                >
                  Data/Hora
                </label>
                <FollowUpDateTimeInput
                  value={agendaFollowUpDraft.dueAt}
                  onChange={(nextValue) =>
                    setAgendaFollowUpDraft((currentDraft) => ({
                      ...currentDraft,
                      dueAt: nextValue,
                    }))
                  }
                  isMobile={isMobile}
                />
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
              Selecione um negócio para continuar.
            </p>
          )}
        </div>
      </section>
    )

    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: !isMobile && isCreatingAgendaFollowUp ? 16 : 8,
          marginTop: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        {followUpsError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{followUpsError}</p>
        ) : null}

        {!shouldShowDesktopCreateOnly ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {!isCreatingAgendaFollowUp || isMobile ? (
              <button
                type="button"
                onClick={() => {
                  setAgendaFollowUpDraft({
                    ...initialAgendaFollowUpDraft,
                    negotiationId: '',
                  })
                  setIsCreatingAgendaFollowUp(true)
                }}
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
                  lineHeight: 1.2,
                }}
              >
                + Adicionar Follow-up
              </button>
            ) : null}

            <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
              {negotiationFollowUps.length} follow-up
              {negotiationFollowUps.length === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}

        {!isMobile && isCreatingAgendaFollowUp ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <button
                  type="button"
                  aria-label="Salvar follow-up"
                  title="Salvar follow-up"
                  onClick={() => void handleCreateAgendaFollowUp()}
                  disabled={!canCreateAgendaFollowUp}
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    background: 'transparent',
                    color: canCreateAgendaFollowUp ? '#6b7280' : '#cbd5e1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: canCreateAgendaFollowUp ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Save size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleCancelAgendaFollowUpCreation}
                  title="Fechar criação"
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    background: 'transparent',
                    color: '#6b7280',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1,
                    order: 4,
                  }}
                  aria-label="Fechar criação de follow-up"
                >
                  X
                </button>
              </div>
            </div>

            <article
              style={{
                border: 'none',
                borderRadius: 0,
                padding: 0,
                background: 'transparent',
                display: 'grid',
                gap: 18,
                maxWidth: '100%',
                flex: 1,
                minHeight: 0,
              }}
            >
              {agendaFollowUpCreateForm}
            </article>
          </>
        ) : null}

        {isMobile && isCreatingAgendaFollowUp ? (
          <>
            <button
              type="button"
              aria-label="Fechar criação de follow-up"
              onClick={handleCancelAgendaFollowUpCreation}
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
                background: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)',
              }}
            >
              {agendaFollowUpCreateForm}
            </aside>
          </>
        ) : null}

        {!shouldShowDesktopCreateOnly ? (
          <div
            style={{
              display: 'grid',
              gap: 10,
              overflowY: 'auto',
              padding: '2px',
              minHeight: 0,
            }}
          >
            {agendaSections.map((section) => (
              <section
                key={section.title}
                style={{
                  display: 'grid',
                  gap: 10,
                  padding: isMobile ? 10 : 12,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {section.title}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {section.groups.map((group) => {
                    const heading = getAgendaGroupHeading(group.date)

                    return (
                      <section
                        key={group.dateKey}
                        style={{ display: 'grid', gap: 6 }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 6,
                            color: '#475569',
                            fontSize: 12,
                          }}
                        >
                          <strong style={{ color: '#334155', fontWeight: 800 }}>
                            {heading.title}
                          </strong>
                          {heading.detail ? (
                            <span>• {heading.detail}</span>
                          ) : null}
                        </div>

                        <div
                          style={{
                            overflow: isMobile ? 'visible' : 'hidden',
                            border: isMobile ? 'none' : '1px solid #e5e7eb',
                            borderRadius: 7,
                            background: isMobile ? 'transparent' : '#ffffff',
                            display: isMobile ? 'grid' : undefined,
                            gap: isMobile ? 14 : undefined,
                          }}
                        >
                          {group.followUps.map((followUp, followUpIndex) => {
                            const date = parsePersistedUtcClockToBrowserDate(
                              followUp.dueAt,
                            )
                            const visualStatus = getFollowUpVisualStatus({
                              ...followUp,
                              leadId: leadId ?? '',
                            })
                            const indicatorColors =
                              getFollowUpDateTagColors(visualStatus)
                            const statusPresentation =
                              getFollowUpStatusPresentation(
                                followUp.status,
                                followUp.actions,
                                visualStatus === 'overdue',
                              )
                            const channelPresentation =
                              getFollowUpChannelTagPresentation(
                                followUp.actions,
                              )
                            const isHovered =
                              hoveredAgendaFollowUpId === followUp.id

                            return (
                              <article
                                key={followUp.id}
                                onClick={() =>
                                  navigateToAgendaFollowUp(followUp)
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.target === event.currentTarget &&
                                    (event.key === 'Enter' || event.key === ' ')
                                  ) {
                                    event.preventDefault()
                                    navigateToAgendaFollowUp(followUp)
                                  }
                                }}
                                onMouseEnter={() =>
                                  setHoveredAgendaFollowUpId(followUp.id)
                                }
                                onMouseLeave={() =>
                                  setHoveredAgendaFollowUpId(null)
                                }
                                role="button"
                                tabIndex={0}
                                style={{
                                  width: '100%',
                                  minHeight: isMobile ? 0 : 64,
                                  border: isMobile
                                    ? '1px solid #f1f5f9'
                                    : 'none',
                                  borderTop: isMobile
                                    ? '1px solid #f1f5f9'
                                    : followUpIndex === 0
                                      ? 'none'
                                      : '1px solid #eef2f7',
                                  borderRadius: isMobile ? 18 : 0,
                                  boxShadow: isMobile
                                    ? '0 12px 26px rgba(15, 23, 42, 0.06)'
                                    : 'none',
                                  background: isHovered
                                    ? interactionTheme.clickableCardHoverBackground
                                    : '#ffffff',
                                  padding: isMobile ? 16 : '12px 14px',
                                  display: 'grid',
                                  gridTemplateColumns: isMobile
                                    ? 'auto auto minmax(0, 1fr) auto'
                                    : 'minmax(0, 1fr) 72px 112px 112px 84px',
                                  alignItems: 'center',
                                  columnGap: isMobile ? 8 : 10,
                                  rowGap: isMobile ? 18 : 8,
                                  color: '#111827',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'background-color 120ms ease',
                                }}
                              >
                                <span
                                  style={{
                                    minWidth: 0,
                                    display: 'grid',
                                    gap: isMobile ? 8 : 4,
                                    gridColumn: isMobile ? '1 / 4' : undefined,
                                    gridRow: isMobile ? '1' : undefined,
                                  }}
                                >
                                  <strong
                                    style={{
                                      color: '#1f2937',
                                      fontSize: isMobile ? 18 : 13,
                                      lineHeight: isMobile ? 1.2 : '16px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <span
                                      aria-hidden="true"
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background:
                                          followUp.status === 'done'
                                            ? '#22c55e'
                                            : visualStatus === 'overdue'
                                              ? '#ef4444'
                                              : visualStatus === 'scheduled'
                                                ? '#3b82f6'
                                                : indicatorColors.textColor,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {followUp.title || 'Follow-up sem nome'}
                                    </span>
                                  </strong>
                                  <span
                                    style={{
                                      color: '#64748b',
                                      fontSize: isMobile ? 14 : 11,
                                      lineHeight: 1.25,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {businessNameById.get(
                                      followUp.negotiationId,
                                    ) ?? 'Negócio sem nome'}
                                  </span>
                                </span>

                                <span
                                  style={{
                                    gridColumn: isMobile ? '1' : undefined,
                                    gridRow: isMobile ? '2' : undefined,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minWidth: 0,
                                    color: '#334155',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    padding: isMobile ? '7px 12px' : 0,
                                    borderRadius: isMobile ? 6 : 0,
                                    background: isMobile
                                      ? '#f1f5f9'
                                      : 'transparent',
                                  }}
                                >
                                  {date
                                    ? date.toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '--:--'}
                                </span>

                                <span
                                  style={{
                                    gridColumn: isMobile ? '2' : undefined,
                                    gridRow: isMobile ? '2' : undefined,
                                    display: 'flex',
                                    justifyContent: isMobile
                                      ? 'stretch'
                                      : 'center',
                                    alignItems: 'center',
                                    minWidth: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 'auto',
                                      padding: isMobile
                                        ? '7px 12px'
                                        : '5px 8px',
                                      borderRadius: isMobile ? 6 : 5,
                                      background: statusPresentation.background,
                                      color: statusPresentation.textColor,
                                      fontSize: isMobile ? 12 : 11,
                                      fontWeight: 700,
                                      lineHeight: 1,
                                      textAlign: 'center',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    {statusPresentation.label}
                                  </span>
                                </span>

                                <span
                                  style={{
                                    gridColumn: isMobile ? '3 / 5' : undefined,
                                    gridRow: isMobile ? '2' : undefined,
                                    display: 'flex',
                                    justifyContent: isMobile
                                      ? 'stretch'
                                      : 'center',
                                    alignItems: 'center',
                                    minWidth: 0,
                                  }}
                                >
                                  {channelPresentation ? (
                                    <span
                                      style={{
                                        width: 'auto',
                                        padding: isMobile
                                          ? '7px 12px'
                                          : '5px 8px',
                                        borderRadius: isMobile ? 6 : 5,
                                        background:
                                          channelPresentation.backgroundColor,
                                        color: channelPresentation.textColor,
                                        fontSize: isMobile ? 12 : 11,
                                        fontWeight: 700,
                                        lineHeight: 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        boxSizing: 'border-box',
                                      }}
                                    >
                                      {channelPresentation.icon}
                                      {channelPresentation.label}
                                    </span>
                                  ) : (
                                    <span aria-hidden="true" />
                                  )}
                                </span>

                                <span
                                  style={{
                                    gridColumn: isMobile ? '4' : undefined,
                                    gridRow: isMobile ? '1' : undefined,
                                    alignSelf: isMobile ? 'start' : undefined,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 4,
                                    minWidth: 0,
                                  }}
                                >
                                  <button
                                    type="button"
                                    aria-label={
                                      followUp.actions.some(
                                        (action) => action.replyMessageId,
                                      )
                                        ? 'Abrir resposta no chat'
                                        : 'Abrir chat'
                                    }
                                    title={
                                      followUp.actions.some(
                                        (action) => action.replyMessageId,
                                      )
                                        ? 'Abrir resposta no chat'
                                        : 'Abrir chat'
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openFollowUpChat(followUp)
                                    }}
                                    style={{
                                      width: isMobile ? 34 : 24,
                                      height: isMobile ? 34 : 24,
                                      border: isMobile
                                        ? '1px solid #e5e7eb'
                                        : 'none',
                                      borderRadius: isMobile ? 8 : 0,
                                      background: isMobile
                                        ? '#ffffff'
                                        : 'transparent',
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
                                  {confirmingDeleteBusinessFollowUpId ===
                                  followUp.id ? (
                                    <>
                                      <button
                                        type="button"
                                        aria-label="Cancelar exclusão de follow-up"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          setConfirmingDeleteBusinessFollowUpId(
                                            null,
                                          )
                                        }}
                                        style={{
                                          width: isMobile ? 32 : 26,
                                          height: isMobile ? 32 : 26,
                                          border: '1px solid #e5e7eb',
                                          borderRadius: isMobile ? 8 : 6,
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
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void handleDeleteNegotiationFollowUp(
                                            followUp.id,
                                          )
                                        }}
                                        style={{
                                          width: isMobile ? 32 : 26,
                                          height: isMobile ? 32 : 26,
                                          border: '1px solid #e5e7eb',
                                          borderRadius: isMobile ? 8 : 6,
                                          background: '#ffffff',
                                          color: '#4b5563',
                                          padding: 0,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        ✓
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        aria-label="Excluir follow-up"
                                        title="Excluir follow-up"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          setConfirmingDeleteBusinessFollowUpId(
                                            followUp.id,
                                          )
                                        }}
                                        style={{
                                          width: isMobile ? 34 : 24,
                                          height: isMobile ? 34 : 24,
                                          border: isMobile
                                            ? '1px solid #e5e7eb'
                                            : 'none',
                                          borderRadius: isMobile ? 8 : 0,
                                          background: isMobile
                                            ? '#ffffff'
                                            : 'transparent',
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
                                      <button
                                        type="button"
                                        aria-label={
                                          followUp.status === 'done'
                                            ? 'Desfazer conclusão do follow-up'
                                            : 'Concluir follow-up'
                                        }
                                        title={
                                          followUp.status === 'done'
                                            ? 'Desfazer conclusão'
                                            : 'Concluir follow-up'
                                        }
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void handleToggleNegotiationFollowUpStatus(
                                            followUp.id,
                                            followUp.status,
                                          )
                                        }}
                                        style={{
                                          width: isMobile ? 34 : 24,
                                          height: isMobile ? 34 : 24,
                                          border: isMobile
                                            ? '1px solid #e5e7eb'
                                            : 'none',
                                          borderRadius: isMobile ? 8 : 0,
                                          background: isMobile
                                            ? '#ffffff'
                                            : 'transparent',
                                          color:
                                            followUp.status === 'done'
                                              ? '#16a34a'
                                              : '#4b5563',
                                          padding: 0,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        ✓
                                      </button>
                                    </>
                                  )}
                                </span>
                              </article>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                </div>
              </section>
            ))}

            {agendaGroups.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  color: '#6b7280',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Nenhum follow-up encontrado.
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    )
  }

  const renderBusinessFollowUpsTab = (businessId: string) => {
    const followUpsColumns = 'minmax(0,1fr) minmax(0,130px) 112px 156px 84px'
    const followUpsRowMinHeight = 50
    const viewedBusinessFollowUp = viewingBusinessFollowUpId
      ? (negotiationFollowUps.find(
          (followUp) => followUp.id === viewingBusinessFollowUpId,
        ) ?? null)
      : null
    const editingBusinessFollowUp = editingBusinessFollowUpId
      ? (negotiationFollowUps.find(
          (followUp) => followUp.id === editingBusinessFollowUpId,
        ) ?? null)
      : null
    const isManagingBusinessFollowUp =
      isCreatingBusinessFollowUp ||
      editingBusinessFollowUp !== null ||
      viewedBusinessFollowUp !== null
    const shouldShowDesktopCreateOnly = !isMobile && isManagingBusinessFollowUp
    const shouldShowLegacyBusinessFollowUpLists = false
    const selectedFollowUpBusiness =
      leadNegotiations.find((business) => business.id === businessId) ?? null
    const selectedFollowUpBusinessTitle =
      selectedFollowUpBusiness?.title?.trim() || 'Negócio sem nome'
    const canCreateBusinessFollowUp =
      Boolean(newBusinessFollowUpDraft.title.trim()) &&
      isFollowUpActionDraftValid(newBusinessFollowUpDraft.action) &&
      Boolean(newBusinessFollowUpDraft.dueAt)
    const viewedBusinessFollowUpAction = fromFollowUpActionResponse(
      viewedBusinessFollowUp?.actions[0],
    )
    const viewedBusinessFollowUpReply = viewedBusinessFollowUp?.actions[0]
    const handleOpenViewedBusinessFollowUpChat = () => {
      if (viewedBusinessFollowUp) openFollowUpChat(viewedBusinessFollowUp)
    }
    const businessFollowUps = negotiationFollowUps
      .filter((followUp) => followUp.negotiationId === businessId)
      .sort((firstItem, secondItem) => {
        const firstDate = getApiDateTimestamp(firstItem.dueAt)
        const secondDate = getApiDateTimestamp(secondItem.dueAt)
        return firstDate - secondDate
      })
    const businessFollowUpStartOfToday = new Date()
    businessFollowUpStartOfToday.setHours(0, 0, 0, 0)
    const businessFollowUpStartOfTomorrow = new Date(
      businessFollowUpStartOfToday,
    )
    businessFollowUpStartOfTomorrow.setDate(
      businessFollowUpStartOfTomorrow.getDate() + 1,
    )
    const businessFollowUpStartOfNextWeek = new Date(
      businessFollowUpStartOfToday,
    )
    const businessFollowUpDaysUntilNextMonday =
      (8 - businessFollowUpStartOfToday.getDay()) % 7 || 7
    businessFollowUpStartOfNextWeek.setDate(
      businessFollowUpStartOfNextWeek.getDate() +
        businessFollowUpDaysUntilNextMonday,
    )
    const businessFollowUpStartOfFollowingWeek = new Date(
      businessFollowUpStartOfNextWeek,
    )
    businessFollowUpStartOfFollowingWeek.setDate(
      businessFollowUpStartOfFollowingWeek.getDate() + 7,
    )
    const businessFollowUpGroups = businessFollowUps.reduce<
      Array<{
        dateKey: string
        date: Date | null
        followUps: NegotiationFollowUpResponse[]
      }>
    >((groups, followUp) => {
      const date = parsePersistedUtcClockToBrowserDate(followUp.dueAt)
      const dateKey = date
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        : 'without-date'
      const currentGroup = groups.at(-1)

      if (currentGroup?.dateKey === dateKey) {
        currentGroup.followUps.push(followUp)
      } else {
        groups.push({ dateKey, date, followUps: [followUp] })
      }

      return groups
    }, [])
    const businessFollowUpSections = [
      {
        title: 'Esta semana',
        groups: businessFollowUpGroups.filter(
          (group) =>
            group.date === null || group.date < businessFollowUpStartOfNextWeek,
        ),
      },
      {
        title: 'Próxima semana',
        groups: businessFollowUpGroups.filter(
          (group) =>
            group.date !== null &&
            group.date >= businessFollowUpStartOfNextWeek &&
            group.date < businessFollowUpStartOfFollowingWeek,
        ),
      },
      {
        title: 'Agendado',
        groups: businessFollowUpGroups.filter(
          (group) =>
            group.date !== null &&
            group.date >= businessFollowUpStartOfFollowingWeek,
        ),
      },
    ].filter((section) => section.groups.length > 0)

    const getBusinessFollowUpGroupHeading = (date: Date | null) => {
      if (!date) {
        return { title: 'Sem data', detail: '' }
      }

      const dateStart = new Date(date)
      dateStart.setHours(0, 0, 0, 0)
      const title =
        dateStart.getTime() === businessFollowUpStartOfToday.getTime()
          ? 'Hoje'
          : dateStart.getTime() === businessFollowUpStartOfTomorrow.getTime()
            ? 'Amanhã'
            : new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
              }).format(dateStart)
      const normalizedTitle = title.charAt(0).toUpperCase() + title.slice(1)
      const detail = new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
      }).format(dateStart)

      return { title: normalizedTitle, detail }
    }

    const handleCancelBusinessFollowUpCreation = () => {
      const editedFollowUpId = editingBusinessFollowUp?.id ?? null

      setIsCreatingBusinessFollowUp(false)
      setEditingBusinessFollowUpId(null)
      setIsConfirmingViewedBusinessFollowUpDelete(false)
      setViewingBusinessFollowUpId(editedFollowUpId)
      setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
      setBusinessesError(null)
    }

    const handleStartEditingViewedBusinessFollowUp = () => {
      if (!viewedBusinessFollowUp) {
        return
      }

      setIsCreatingBusinessFollowUp(false)
      setIsConfirmingViewedBusinessFollowUpDelete(false)
      setNewBusinessFollowUpDraft({
        title: viewedBusinessFollowUp.title ?? '',
        action: fromFollowUpActionResponse(viewedBusinessFollowUp.actions[0]),
        dueAt: viewedBusinessFollowUp.dueAt ?? '',
        status: viewedBusinessFollowUp.status ?? 'pending',
      })
      setViewingBusinessFollowUpId(null)
      setEditingBusinessFollowUpId(viewedBusinessFollowUp.id)
    }

    const handleSubmitBusinessFollowUp = async () => {
      if (!canCreateBusinessFollowUp) {
        setBusinessesError(
          'Preencha o nome, a ação e a data/hora do follow-up.',
        )
        return
      }

      try {
        setBusinessesError(null)
        if (editingBusinessFollowUp) {
          await handleUpdateNegotiationFollowUp(
            editingBusinessFollowUp.id,
            newBusinessFollowUpDraft.title.trim(),
            newBusinessFollowUpDraft.dueAt,
            newBusinessFollowUpDraft.action,
            newBusinessFollowUpDraft.status,
          )
        } else {
          await handleCreateNegotiationFollowUp(
            businessId,
            newBusinessFollowUpDraft.title.trim(),
            newBusinessFollowUpDraft.dueAt,
            newBusinessFollowUpDraft.action,
          )
        }
        setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
        setIsCreatingBusinessFollowUp(false)
        setEditingBusinessFollowUpId(null)
      } catch {
        // Error message is already handled in service flow.
      }
    }

    const businessFollowUpCreateForm = (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          height: isMobile ? 'auto' : '100%',
          minHeight: isMobile ? '100%' : 0,
          overflowY: isMobile ? 'visible' : 'auto',
          overflowX: isMobile ? 'visible' : 'hidden',
          paddingRight: isMobile ? 2 : 6,
          boxSizing: 'border-box',
          padding: isMobile ? '0 18px 28px' : 0,
          overscrollBehavior: isMobile ? 'auto' : 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <label
            style={{
              color: '#1f2937',
              fontSize: isMobile ? 17 / 1.3 : 13,
              fontWeight: 700,
            }}
          >
            Negócio
          </label>
          <input
            type="text"
            value={selectedFollowUpBusinessTitle}
            readOnly
            disabled
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#64748b',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box',
              background: '#f8fafc',
              cursor: 'not-allowed',
            }}
          />
        </div>

        {editingBusinessFollowUp ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <label
              style={{
                color: '#1f2937',
                fontSize: isMobile ? 17 / 1.3 : 13,
                fontWeight: 700,
              }}
            >
              Status
            </label>
            <select
              value={newBusinessFollowUpDraft.status}
              onChange={(event) =>
                setNewBusinessFollowUpDraft((current) => ({
                  ...current,
                  status: event.target.value as LeadFollowUpResponse['status'],
                }))
              }
              style={{
                width: '100%',
                height: isMobile ? 46 : 42,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '0 14px',
                color: '#111827',
                fontSize: isMobile ? 17 / 1.2 : 14,
                fontWeight: 600,
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            >
              <option value="pending">Pendente</option>
              <option value="done">Concluído</option>
              <option value="canceled">Cancelado</option>
              <option value="skipped">Ignorado</option>
            </select>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <label
            style={{
              color: '#1f2937',
              fontSize: isMobile ? 17 / 1.3 : 13,
              fontWeight: 700,
            }}
          >
            Título
          </label>
          <input
            type="text"
            placeholder="Título do follow-up"
            value={newBusinessFollowUpDraft.title}
            onChange={(event) =>
              setNewBusinessFollowUpDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <FollowUpActionFields
          value={newBusinessFollowUpDraft.action}
          onChange={(action) =>
            setNewBusinessFollowUpDraft((current) => ({ ...current, action }))
          }
          leadSource={leadData?.source}
          leadEmail={leadData?.email}
          leadPhone={leadData?.phone}
          isMobile={isMobile}
        />

        <div style={{ display: 'grid', gap: 8 }}>
          <label
            style={{
              color: '#1f2937',
              fontSize: isMobile ? 17 / 1.3 : 13,
              fontWeight: 700,
            }}
          >
            Data/Hora
          </label>
          <FollowUpDateTimeInput
            value={newBusinessFollowUpDraft.dueAt}
            onChange={(nextValue) =>
              setNewBusinessFollowUpDraft((current) => ({
                ...current,
                dueAt: nextValue,
              }))
            }
            isMobile={isMobile}
          />
        </div>
      </section>
    )

    const viewedBusinessFollowUpStatusTag = viewedBusinessFollowUp
      ? getFollowUpStatusPresentation(
          viewedBusinessFollowUp.status,
          viewedBusinessFollowUp.actions,
        )
      : null
    const mobileBusinessFollowUpHeader = isMobile ? (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#ffffff',
          padding: '22px 18px 10px',
          flexShrink: 0,
        }}
      >
        <h3
          style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 700 }}
        >
          {viewedBusinessFollowUp
            ? 'Follow-up'
            : editingBusinessFollowUp
              ? 'Editar follow-up'
              : 'Novo follow-up'}
        </h3>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {viewedBusinessFollowUp &&
          !isConfirmingViewedBusinessFollowUpDelete ? (
            <>
              <button
                type="button"
                aria-label="Editar follow-up"
                title="Editar follow-up"
                onClick={handleStartEditingViewedBusinessFollowUp}
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
                  order: 3,
                }}
              >
                <Pencil size={18} />
              </button>
              <button
                type="button"
                aria-label="Abrir conversa do lead"
                title="Abrir conversa"
                onClick={handleOpenViewedBusinessFollowUpChat}
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
                  order: 2,
                }}
              >
                <MessageCircle size={18} />
              </button>
              <button
                type="button"
                aria-label="Excluir follow-up"
                title="Excluir follow-up"
                onClick={() => {
                  setIsConfirmingViewedBusinessFollowUpDelete(true)
                  setBusinessesError(null)
                }}
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
                  order: 1,
                }}
              >
                <Trash2 size={18} />
              </button>
            </>
          ) : null}
          {editingBusinessFollowUp || isCreatingBusinessFollowUp ? (
            <button
              type="button"
              aria-label="Salvar follow-up"
              title="Salvar follow-up"
              onClick={() => void handleSubmitBusinessFollowUp()}
              disabled={!canCreateBusinessFollowUp}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: canCreateBusinessFollowUp ? '#6b7280' : '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: canCreateBusinessFollowUp ? 'pointer' : 'not-allowed',
              }}
            >
              <Save size={18} />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={
              viewedBusinessFollowUp
                ? 'Fechar visualização de follow-up'
                : 'Fechar criação de follow-up'
            }
            title={editingBusinessFollowUp ? 'Cancelar edição' : 'Fechar'}
            onClick={handleCancelBusinessFollowUpCreation}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: '#6b7280',
              padding: 0,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
              order: 4,
            }}
          >
            X
          </button>
        </div>
      </div>
    ) : null

    const businessFollowUpViewContent = viewedBusinessFollowUp ? (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          height: isMobile ? 'auto' : '100%',
          minHeight: isMobile ? '100%' : 0,
          overflowY: isMobile ? 'visible' : 'auto',
          overflowX: isMobile ? 'visible' : 'hidden',
          paddingRight: isMobile ? 2 : 6,
          boxSizing: 'border-box',
          padding: isMobile ? '0 18px 28px' : 0,
          overscrollBehavior: isMobile ? 'auto' : 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isConfirmingViewedBusinessFollowUpDelete ? (
          <article
            style={{
              border: '1px solid #fecaca',
              borderRadius: 16,
              padding: 24,
              background: '#fff7f7',
              display: 'grid',
              gap: 18,
              marginTop: 2,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#b91c1c',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              Deseja deletar esse follow-up?
            </h3>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}
            >
              <button
                type="button"
                onClick={() =>
                  setIsConfirmingViewedBusinessFollowUpDelete(false)
                }
                style={{
                  minWidth: 96,
                  height: 34,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDeleteNegotiationFollowUp(
                    viewedBusinessFollowUp.id,
                  )
                }
                style={{
                  minWidth: 96,
                  height: 34,
                  border: 'none',
                  borderRadius: 8,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Deletar
              </button>
            </div>
          </article>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              <label
                style={{
                  color: '#1f2937',
                  fontSize: isMobile ? 17 / 1.3 : 13,
                  fontWeight: 700,
                }}
              >
                Negócio
              </label>
              <input
                type="text"
                value={selectedFollowUpBusinessTitle}
                readOnly
                disabled
                style={{
                  height: isMobile ? 46 : 42,
                  border: '1px solid #d7dce4',
                  borderRadius: 10,
                  padding: '0 14px',
                  color: '#64748b',
                  fontSize: isMobile ? 17 / 1.2 : 14,
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label
                style={{
                  color: '#1f2937',
                  fontSize: isMobile ? 17 / 1.3 : 13,
                  fontWeight: 700,
                }}
              >
                Título
              </label>
              <input
                type="text"
                value={viewedBusinessFollowUp.title ?? ''}
                readOnly
                disabled
                style={{
                  height: isMobile ? 46 : 42,
                  border: '1px solid #d7dce4',
                  borderRadius: 10,
                  padding: '0 14px',
                  color: '#64748b',
                  fontSize: isMobile ? 17 / 1.2 : 14,
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label
                style={{
                  color: '#1f2937',
                  fontSize: isMobile ? 17 / 1.3 : 13,
                  fontWeight: 700,
                }}
              >
                Status
              </label>
              <input
                type="text"
                value={viewedBusinessFollowUpStatusTag?.label ?? ''}
                readOnly
                disabled
                style={{
                  height: isMobile ? 46 : 42,
                  border: '1px solid #d7dce4',
                  borderRadius: 10,
                  padding: '0 14px',
                  color: '#64748b',
                  fontSize: isMobile ? 17 / 1.2 : 14,
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <FollowUpActionFields
              value={viewedBusinessFollowUpAction}
              onChange={() => undefined}
              leadSource={leadData?.source}
              leadEmail={leadData?.email}
              leadPhone={leadData?.phone}
              isMobile={isMobile}
              readOnly
            />

            {viewedBusinessFollowUpReply?.replyMessageId ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: isMobile ? 17 / 1.3 : 13,
                    fontWeight: 700,
                  }}
                >
                  Resposta do cliente
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFocusedChatMessageId(
                      viewedBusinessFollowUpReply.replyMessageId,
                    )
                    handleLeadTabChange('chat')
                  }}
                  style={{
                    width: '100%',
                    minHeight: isMobile ? 46 : 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    background: '#ffffff',
                    color: '#111827',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: isMobile ? 17 / 1.2 : 14,
                    lineHeight: 1.4,
                  }}
                >
                  <MessageCircle size={18} style={{ flexShrink: 0 }} />
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    {viewedBusinessFollowUpReply.replyContent?.trim() ||
                      'Mensagem sem texto'}
                  </span>
                </button>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 8 }}>
              <label
                style={{
                  color: '#1f2937',
                  fontSize: isMobile ? 17 / 1.3 : 13,
                  fontWeight: 700,
                }}
              >
                Data/Hora
              </label>
              <input
                type="text"
                value={formatFollowUpDate(viewedBusinessFollowUp.dueAt)}
                readOnly
                disabled
                style={{
                  height: isMobile ? 46 : 42,
                  border: '1px solid #d7dce4',
                  borderRadius: 10,
                  padding: '0 14px',
                  color: '#64748b',
                  fontSize: isMobile ? 17 / 1.2 : 14,
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </>
        )}
      </section>
    ) : null

    const businessFollowUpAgendaList = (
      <div
        style={{
          display: 'grid',
          gap: 10,
          overflowY: 'auto',
          padding: 2,
          minHeight: 0,
        }}
      >
        {businessFollowUpSections.map((section) => (
          <section
            key={section.title}
            style={{
              display: 'grid',
              gap: 10,
              padding: isMobile ? 10 : 12,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                color: '#475569',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {section.title}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {section.groups.map((group) => {
                const heading = getBusinessFollowUpGroupHeading(group.date)

                return (
                  <section
                    key={group.dateKey}
                    style={{ display: 'grid', gap: 6 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        color: '#475569',
                        fontSize: 12,
                      }}
                    >
                      <strong style={{ color: '#334155', fontWeight: 800 }}>
                        {heading.title}
                      </strong>
                      {heading.detail ? <span>• {heading.detail}</span> : null}
                    </div>

                    <div
                      style={{
                        overflow: isMobile ? 'visible' : 'hidden',
                        border: isMobile ? 'none' : '1px solid #e5e7eb',
                        borderRadius: 7,
                        background: isMobile ? 'transparent' : '#ffffff',
                        display: isMobile ? 'grid' : undefined,
                        gap: isMobile ? 14 : undefined,
                      }}
                    >
                      {group.followUps.map((followUp, followUpIndex) => {
                        const date = parsePersistedUtcClockToBrowserDate(
                          followUp.dueAt,
                        )
                        const visualStatus = getFollowUpVisualStatus({
                          ...followUp,
                          leadId: leadId ?? '',
                        })
                        const indicatorColors =
                          getFollowUpDateTagColors(visualStatus)
                        const statusPresentation =
                          getFollowUpStatusPresentation(
                            followUp.status,
                            followUp.actions,
                            visualStatus === 'overdue',
                          )
                        const channelPresentation =
                          getFollowUpChannelTagPresentation(followUp.actions)
                        const isHovered =
                          hoveredBusinessFollowUpId === followUp.id

                        return (
                          <article
                            key={followUp.id}
                            onClick={() => {
                              setConfirmingDeleteBusinessFollowUpId(null)
                              setEditingBusinessFollowUpId(null)
                              setIsConfirmingViewedBusinessFollowUpDelete(false)
                              setViewingBusinessFollowUpId(followUp.id)
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.target === event.currentTarget &&
                                (event.key === 'Enter' || event.key === ' ')
                              ) {
                                event.preventDefault()
                                setConfirmingDeleteBusinessFollowUpId(null)
                                setEditingBusinessFollowUpId(null)
                                setIsConfirmingViewedBusinessFollowUpDelete(
                                  false,
                                )
                                setViewingBusinessFollowUpId(followUp.id)
                              }
                            }}
                            onMouseEnter={() =>
                              setHoveredBusinessFollowUpId(followUp.id)
                            }
                            onMouseLeave={() =>
                              setHoveredBusinessFollowUpId(null)
                            }
                            role="button"
                            tabIndex={0}
                            style={{
                              width: '100%',
                              minHeight: isMobile ? 0 : 64,
                              border: isMobile ? '1px solid #f1f5f9' : 'none',
                              borderTop: isMobile
                                ? '1px solid #f1f5f9'
                                : followUpIndex === 0
                                  ? 'none'
                                  : '1px solid #eef2f7',
                              borderRadius: isMobile ? 18 : 0,
                              boxShadow: isMobile
                                ? '0 12px 26px rgba(15, 23, 42, 0.06)'
                                : 'none',
                              background: isHovered
                                ? interactionTheme.clickableCardHoverBackground
                                : '#ffffff',
                              padding: isMobile ? 16 : '12px 14px',
                              display: 'grid',
                              gridTemplateColumns: isMobile
                                ? 'auto auto minmax(0, 1fr) auto'
                                : 'minmax(0, 1fr) 72px 112px 112px 84px',
                              alignItems: 'center',
                              columnGap: isMobile ? 8 : 10,
                              rowGap: isMobile ? 18 : 8,
                              color: '#111827',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background-color 120ms ease',
                            }}
                          >
                            <span
                              style={{
                                minWidth: 0,
                                display: 'grid',
                                gap: isMobile ? 8 : 4,
                                gridColumn: isMobile ? '1 / 4' : undefined,
                                gridRow: isMobile ? '1' : undefined,
                              }}
                            >
                              <strong
                                style={{
                                  color: '#1f2937',
                                  fontSize: isMobile ? 18 : 13,
                                  lineHeight: isMobile ? 1.2 : '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span
                                  aria-hidden="true"
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background:
                                      followUp.status === 'done'
                                        ? '#22c55e'
                                        : visualStatus === 'overdue'
                                          ? '#ef4444'
                                          : visualStatus === 'scheduled'
                                            ? '#3b82f6'
                                            : indicatorColors.textColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {followUp.title || 'Follow-up sem nome'}
                                </span>
                              </strong>
                              <span
                                style={{
                                  color: '#64748b',
                                  fontSize: isMobile ? 14 : 11,
                                  lineHeight: 1.25,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {selectedFollowUpBusinessTitle}
                              </span>
                            </span>

                            <span
                              style={{
                                gridColumn: isMobile ? '1' : undefined,
                                gridRow: isMobile ? '2' : undefined,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: 0,
                                color: '#334155',
                                fontSize: 12,
                                fontWeight: 800,
                                lineHeight: 1,
                                padding: isMobile ? '7px 12px' : 0,
                                borderRadius: isMobile ? 6 : 0,
                                background: isMobile
                                  ? '#f1f5f9'
                                  : 'transparent',
                              }}
                            >
                              {date
                                ? date.toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--:--'}
                            </span>

                            <span
                              style={{
                                gridColumn: isMobile ? '2' : undefined,
                                gridRow: isMobile ? '2' : undefined,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  width: 'auto',
                                  padding: isMobile ? '7px 12px' : '5px 8px',
                                  borderRadius: isMobile ? 6 : 5,
                                  background: statusPresentation.background,
                                  color: statusPresentation.textColor,
                                  fontSize: isMobile ? 12 : 11,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  boxSizing: 'border-box',
                                }}
                              >
                                {statusPresentation.label}
                              </span>
                            </span>

                            <span
                              style={{
                                gridColumn: isMobile ? '3 / 5' : undefined,
                                gridRow: isMobile ? '2' : undefined,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: 0,
                              }}
                            >
                              {channelPresentation ? (
                                <span
                                  style={{
                                    width: 'auto',
                                    padding: isMobile ? '7px 12px' : '5px 8px',
                                    borderRadius: isMobile ? 6 : 5,
                                    background:
                                      channelPresentation.backgroundColor,
                                    color: channelPresentation.textColor,
                                    fontSize: isMobile ? 12 : 11,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {channelPresentation.icon}
                                  {channelPresentation.label}
                                </span>
                              ) : (
                                <span aria-hidden="true" />
                              )}
                            </span>

                            <span
                              style={{
                                gridColumn: isMobile ? '4' : undefined,
                                gridRow: isMobile ? '1' : undefined,
                                alignSelf: isMobile ? 'start' : undefined,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 4,
                                minWidth: 0,
                              }}
                            >
                              <button
                                type="button"
                                aria-label={
                                  followUp.actions.some(
                                    (action) => action.replyMessageId,
                                  )
                                    ? 'Abrir resposta no chat'
                                    : 'Abrir chat'
                                }
                                title={
                                  followUp.actions.some(
                                    (action) => action.replyMessageId,
                                  )
                                    ? 'Abrir resposta no chat'
                                    : 'Abrir chat'
                                }
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openFollowUpChat(followUp)
                                }}
                                style={{
                                  width: isMobile ? 34 : 24,
                                  height: isMobile ? 34 : 24,
                                  border: isMobile
                                    ? '1px solid #e5e7eb'
                                    : 'none',
                                  borderRadius: isMobile ? 8 : 0,
                                  background: isMobile
                                    ? '#ffffff'
                                    : 'transparent',
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
                              {confirmingDeleteBusinessFollowUpId ===
                              followUp.id ? (
                                <>
                                  <button
                                    type="button"
                                    aria-label="Cancelar exclusão de follow-up"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setConfirmingDeleteBusinessFollowUpId(
                                        null,
                                      )
                                    }}
                                    style={{
                                      width: isMobile ? 32 : 26,
                                      height: isMobile ? 32 : 26,
                                      border: '1px solid #e5e7eb',
                                      borderRadius: isMobile ? 8 : 6,
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
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleDeleteNegotiationFollowUp(
                                        followUp.id,
                                      )
                                    }}
                                    style={{
                                      width: isMobile ? 32 : 26,
                                      height: isMobile ? 32 : 26,
                                      border: '1px solid #e5e7eb',
                                      borderRadius: isMobile ? 8 : 6,
                                      background: '#ffffff',
                                      color: '#4b5563',
                                      padding: 0,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✓
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    aria-label="Excluir follow-up"
                                    title="Excluir follow-up"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setConfirmingDeleteBusinessFollowUpId(
                                        followUp.id,
                                      )
                                    }}
                                    style={{
                                      width: isMobile ? 34 : 24,
                                      height: isMobile ? 34 : 24,
                                      border: isMobile
                                        ? '1px solid #e5e7eb'
                                        : 'none',
                                      borderRadius: isMobile ? 8 : 0,
                                      background: isMobile
                                        ? '#ffffff'
                                        : 'transparent',
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
                                  <button
                                    type="button"
                                    aria-label={
                                      followUp.status === 'done'
                                        ? 'Desfazer conclusão do follow-up'
                                        : 'Concluir follow-up'
                                    }
                                    title={
                                      followUp.status === 'done'
                                        ? 'Desfazer conclusão'
                                        : 'Concluir follow-up'
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleToggleNegotiationFollowUpStatus(
                                        followUp.id,
                                        followUp.status,
                                      )
                                    }}
                                    style={{
                                      width: isMobile ? 34 : 24,
                                      height: isMobile ? 34 : 24,
                                      border: isMobile
                                        ? '1px solid #e5e7eb'
                                        : 'none',
                                      borderRadius: isMobile ? 8 : 0,
                                      background: isMobile
                                        ? '#ffffff'
                                        : 'transparent',
                                      color:
                                        followUp.status === 'done'
                                          ? '#16a34a'
                                          : '#4b5563',
                                      padding: 0,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✓
                                  </button>
                                </>
                              )}
                            </span>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </section>
        ))}

        {businessFollowUpGroups.length === 0 ? (
          <div
            style={{
              padding: 24,
              color: '#6b7280',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Nenhum follow-up cadastrado.
          </div>
        ) : null}
      </div>
    )

    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: !isMobile && isManagingBusinessFollowUp ? 16 : 8,
          marginTop: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        {businessesError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p>
        ) : null}

        {!shouldShowDesktopCreateOnly ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {!isManagingBusinessFollowUp || isMobile ? (
              <button
                type="button"
                onClick={() => {
                  setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
                  setBusinessesError(null)
                  setEditingBusinessFollowUpId(null)
                  setIsCreatingBusinessFollowUp(true)
                }}
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
                  lineHeight: 1.2,
                }}
              >
                + Adicionar follow-up
              </button>
            ) : null}

            <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
              {businessFollowUps.length} follow-up
              {businessFollowUps.length === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}

        {!isMobile && isManagingBusinessFollowUp ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              {viewedBusinessFollowUp ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
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
                    Follow-up
                  </h2>
                  {viewedBusinessFollowUpStatusTag ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: viewedBusinessFollowUpStatusTag.textColor,
                        background: viewedBusinessFollowUpStatusTag.background,
                        borderRadius: 999,
                        padding: '6px 10px',
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {viewedBusinessFollowUpStatusTag.label}
                    </span>
                  ) : null}
                </div>
              ) : (
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 26,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {editingBusinessFollowUp
                    ? 'Editar follow-up'
                    : 'Novo follow-up'}
                </h2>
              )}

              <div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {viewedBusinessFollowUp &&
                !isConfirmingViewedBusinessFollowUpDelete ? (
                  <>
                    <button
                      type="button"
                      aria-label="Editar follow-up"
                      title="Editar follow-up"
                      onClick={handleStartEditingViewedBusinessFollowUp}
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
                        order: 3,
                      }}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Abrir conversa do lead"
                      title="Abrir conversa"
                      onClick={handleOpenViewedBusinessFollowUpChat}
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
                        order: 2,
                      }}
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir follow-up"
                      title="Excluir follow-up"
                      onClick={() => {
                        setIsConfirmingViewedBusinessFollowUpDelete(true)
                        setBusinessesError(null)
                      }}
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
                        order: 1,
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : null}
                {editingBusinessFollowUp || isCreatingBusinessFollowUp ? (
                  <button
                    type="button"
                    aria-label="Salvar follow-up"
                    title="Salvar follow-up"
                    onClick={() => void handleSubmitBusinessFollowUp()}
                    disabled={!canCreateBusinessFollowUp}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: canCreateBusinessFollowUp ? '#6b7280' : '#cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: canCreateBusinessFollowUp
                        ? 'pointer'
                        : 'not-allowed',
                    }}
                  >
                    <Save size={18} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleCancelBusinessFollowUpCreation}
                  title="Fechar"
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    background: 'transparent',
                    color: '#6b7280',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1,
                    order: 4,
                  }}
                  aria-label="Fechar criação de follow-up"
                >
                  X
                </button>
              </div>
            </div>

            <article
              style={{
                border: 'none',
                borderRadius: 0,
                padding: 0,
                background: 'transparent',
                display: 'grid',
                gap: 18,
                maxWidth: 760,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: 6,
                boxSizing: 'border-box',
              }}
            >
              {viewedBusinessFollowUp
                ? businessFollowUpViewContent
                : businessFollowUpCreateForm}
            </article>
          </div>
        ) : null}

        {isMobile && isManagingBusinessFollowUp ? (
          <>
            <button
              type="button"
              aria-label="Fechar criação de follow-up"
              onClick={handleCancelBusinessFollowUpCreation}
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
                background: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)',
              }}
            >
              {mobileBusinessFollowUpHeader}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {viewedBusinessFollowUp
                  ? businessFollowUpViewContent
                  : businessFollowUpCreateForm}
              </div>
            </aside>
          </>
        ) : null}

        {!shouldShowDesktopCreateOnly ? businessFollowUpAgendaList : null}

        {shouldShowLegacyBusinessFollowUpLists &&
        !shouldShowDesktopCreateOnly &&
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {businessFollowUps.length === 0 ? (
              <div
                style={{
                  color: '#6b7280',
                  fontSize: 14,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                Nenhum follow-up cadastrado.
              </div>
            ) : (
              businessFollowUps.map((followUp) => {
                const visualStatus = getFollowUpVisualStatus({
                  ...followUp,
                  leadId: leadId ?? '',
                })
                const lifecycleStatusTag = getFollowUpStatusPresentation(
                  followUp.status,
                  followUp.actions,
                )
                const followUpDateTagColors =
                  getFollowUpDateTagColors(visualStatus)
                const channelTagPresentation =
                  getFollowUpChannelTagPresentation(followUp.actions)
                const isHovered = hoveredBusinessFollowUpId === followUp.id

                if (editingBusinessFollowUpId === followUp.id) {
                  return null
                }

                if (confirmingDeleteBusinessFollowUpId === followUp.id) {
                  return (
                    <article
                      key={followUp.id}
                      style={{
                        background:
                          interactionTheme.clickableCardHoverBackground,
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Cancelar exclusão de follow-up"
                          onClick={() =>
                            setConfirmingDeleteBusinessFollowUpId(null)
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
                          X
                        </button>
                        <button
                          type="button"
                          aria-label="Confirmar exclusão de follow-up"
                          onClick={() =>
                            void handleDeleteNegotiationFollowUp(followUp.id)
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
                    key={followUp.id}
                    onClick={() => {
                      setConfirmingDeleteBusinessFollowUpId(null)
                      setEditingBusinessFollowUpId(null)
                      setIsConfirmingViewedBusinessFollowUpDelete(false)
                      setViewingBusinessFollowUpId(followUp.id)
                    }}
                    onMouseEnter={() =>
                      setHoveredBusinessFollowUpId(followUp.id)
                    }
                    onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
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
                          {followUp.title || 'Follow-up sem nome'}
                        </h2>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Excluir follow-up"
                          onClick={(event) => {
                            event.stopPropagation()
                            setViewingBusinessFollowUpId(null)
                            setEditingBusinessFollowUpId(null)
                            setConfirmingDeleteBusinessFollowUpId(followUp.id)
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
                          <Trash2 size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label={
                            followUp.status === 'done'
                              ? 'Desfazer conclusão do follow-up'
                              : 'Concluir follow-up'
                          }
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleToggleNegotiationFollowUpStatus(
                              followUp.id,
                              followUp.status,
                            )
                          }}
                          style={{
                            height: 34,
                            width: 34,
                            border:
                              followUp.status === 'done'
                                ? '1px solid #86efac'
                                : '1px solid #e5e7eb',
                            borderRadius: 8,
                            background:
                              followUp.status === 'done'
                                ? '#ecfdf3'
                                : '#ffffff',
                            color:
                              followUp.status === 'done'
                                ? '#16a34a'
                                : '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: followUpDateTagColors.textColor,
                          whiteSpace: 'nowrap',
                          background: followUpDateTagColors.background,
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
                          {formatFollowUpDate(followUp.dueAt)}
                        </span>
                      </span>

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
                          color: lifecycleStatusTag.textColor,
                          whiteSpace: 'nowrap',
                          background: lifecycleStatusTag.background,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        <span
                          style={{
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {lifecycleStatusTag.label}
                        </span>
                      </span>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        ) : null}

        {shouldShowLegacyBusinessFollowUpLists &&
        !shouldShowDesktopCreateOnly &&
        !isMobile ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eeeeee',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: followUpsColumns,
                alignItems: 'center',
                justifyItems: 'start',
                columnGap: 8,
                background: '#f3f4f6',
                borderBottom: '1px solid #ececec',
                padding: '10px 12px',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Título
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'center',
                }}
              >
                Canal
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Status
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Data/Hora
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'center',
                }}
              >
                Ações
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
              {businessFollowUps.length === 0 ? (
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ margin: 0, color: '#555555', fontSize: 13 }}>
                    Nenhum follow-up cadastrado.
                  </p>
                </div>
              ) : (
                businessFollowUps.map((followUp) => {
                  const visualStatus = getFollowUpVisualStatus({
                    ...followUp,
                    leadId: leadId ?? '',
                  })
                  const lifecycleStatusTag = getFollowUpStatusPresentation(
                    followUp.status,
                    followUp.actions,
                  )
                  const followUpDateTagColors =
                    getFollowUpDateTagColors(visualStatus)
                  const channelTagPresentation =
                    getFollowUpChannelTagPresentation(followUp.actions)
                  const rowBorder = '1px solid #f0f0f0'
                  const rowBackground =
                    hoveredBusinessFollowUpId === followUp.id
                      ? interactionTheme.clickableCardHoverBackground
                      : '#ffffff'

                  if (editingBusinessFollowUpId === followUp.id) {
                    return null
                  }

                  if (confirmingDeleteBusinessFollowUpId === followUp.id) {
                    return (
                      <div
                        key={followUp.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: followUpsColumns,
                          alignItems: 'center',
                          justifyItems: 'start',
                          columnGap: 8,
                          borderBottom: rowBorder,
                          padding: '0 12px',
                          background: rowBackground,
                          minHeight: followUpsRowMinHeight,
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={() =>
                          setHoveredBusinessFollowUpId(followUp.id)
                        }
                        onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.2,
                            color: '#2f2f2f',
                          }}
                        >
                          Deletar Follow-up?
                        </p>
                        <span />
                        <span />
                        <span />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            justifySelf: 'center',
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Cancelar exclusão de follow-up"
                            onClick={() =>
                              setConfirmingDeleteBusinessFollowUpId(null)
                            }
                            onMouseEnter={(event) =>
                              applyActionHoverBackground(
                                true,
                                event.currentTarget,
                              )
                            }
                            onMouseLeave={(event) =>
                              applyActionHoverBackground(
                                false,
                                event.currentTarget,
                              )
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
                            }}
                          >
                            X
                          </button>
                          <button
                            type="button"
                            aria-label="Confirmar exclusão de follow-up"
                            onClick={() =>
                              void handleDeleteNegotiationFollowUp(followUp.id)
                            }
                            onMouseEnter={(event) =>
                              applyActionHoverBackground(
                                true,
                                event.currentTarget,
                              )
                            }
                            onMouseLeave={(event) =>
                              applyActionHoverBackground(
                                false,
                                event.currentTarget,
                              )
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
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={followUp.id}
                      onClick={() => {
                        setConfirmingDeleteBusinessFollowUpId(null)
                        setEditingBusinessFollowUpId(null)
                        setIsConfirmingViewedBusinessFollowUpDelete(false)
                        setViewingBusinessFollowUpId(followUp.id)
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: followUpsColumns,
                        alignItems: 'center',
                        justifyItems: 'start',
                        columnGap: 8,
                        borderBottom: rowBorder,
                        padding: '0 12px',
                        background: rowBackground,
                        minHeight: followUpsRowMinHeight,
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={() =>
                        setHoveredBusinessFollowUpId(followUp.id)
                      }
                      onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                    >
                      <div style={{ minWidth: 0, width: '100%' }}>
                        <DelayedTooltip content={followUp.title}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 600,
                              lineHeight: 1.2,
                              color: '#2f2f2f',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {followUp.title}
                          </span>
                        </DelayedTooltip>
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'center',
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
                      </div>

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: lifecycleStatusTag.textColor,
                          whiteSpace: 'nowrap',
                          background: lifecycleStatusTag.background,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                          justifySelf: 'start',
                        }}
                      >
                        {lifecycleStatusTag.label}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: followUpDateTagColors.textColor,
                          whiteSpace: 'nowrap',
                          background: followUpDateTagColors.background,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                          justifySelf: 'start',
                        }}
                      >
                        {formatFollowUpDate(followUp.dueAt)}
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          justifySelf: 'center',
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Excluir follow-up"
                          onClick={(event) => {
                            event.stopPropagation()
                            setViewingBusinessFollowUpId(null)
                            setEditingBusinessFollowUpId(null)
                            setConfirmingDeleteBusinessFollowUpId(followUp.id)
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

                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleToggleNegotiationFollowUpStatus(
                              followUp.id,
                              followUp.status,
                            )
                          }}
                          aria-label={
                            followUp.status === 'done'
                              ? 'Desfazer conclusão do follow-up'
                              : 'Concluir follow-up'
                          }
                          style={{
                            height: 24,
                            width: 24,
                            border: 'none',
                            background: 'transparent',
                            color:
                              followUp.status === 'done'
                                ? '#16a34a'
                                : '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </section>
    )
  }

  const renderBusinessFilesTab = (negotiationId: string) => {
    const filesColumns = '40% 15% 15% 15% 15%'
    const filesRowMinHeight = 50

    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (isUploadingBusinessAttachment) {
                return
              }

              businessAttachmentInputRef.current?.click()
            }}
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
              lineHeight: 1.2,
              opacity: isUploadingBusinessAttachment ? 0.7 : 1,
            }}
          >
            {isUploadingBusinessAttachment
              ? 'Enviando...'
              : '+ Adicionar arquivo'}
          </button>

          <input
            ref={businessAttachmentInputRef}
            type="file"
            accept={attachmentInputAccept}
            style={{ display: 'none' }}
            onChange={(event) => {
              const selectedFile = event.target.files?.[0]

              if (!selectedFile) {
                return
              }

              void handleUploadBusinessAttachment(negotiationId, selectedFile)
              event.target.value = ''
            }}
          />

          <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
            {businessAttachments.length} arquivo
            {businessAttachments.length === 1 ? '' : 's'}
          </span>
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isBusinessAttachmentsLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <article
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 18,
                    padding: 16,
                    display: 'grid',
                    gridTemplateColumns: '40px minmax(0, 1fr) 28px',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Skeleton width={40} height={40} borderRadius={10} />
                  <span style={{ display: 'grid', gap: 7 }}>
                    <Skeleton
                      width={index === 1 ? '72%' : '86%'}
                      height={14}
                      borderRadius={6}
                    />
                    <Skeleton width="52%" height={11} borderRadius={6} />
                  </span>
                  <Skeleton circle width={28} height={28} />
                </article>
              ))
            ) : businessAttachments.length === 0 ? (
              <div
                style={{
                  color: '#6b7280',
                  fontSize: 14,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                Nenhum arquivo cadastrado.
              </div>
            ) : (
              businessAttachments.map((file) => {
                const isHovered = hoveredBusinessFileId === file.id

                if (confirmingDeleteBusinessAttachmentId === file.id) {
                  return (
                    <article
                      key={file.id}
                      onMouseEnter={() => setHoveredBusinessFileId(file.id)}
                      onMouseLeave={() => setHoveredBusinessFileId(null)}
                      style={{
                        background:
                          interactionTheme.clickableCardHoverBackground,
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
                        Deletar arquivo?
                      </strong>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Cancelar exclusão de arquivo"
                          onClick={() =>
                            setConfirmingDeleteBusinessAttachmentId(null)
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
                          X
                        </button>
                        <button
                          type="button"
                          aria-label="Confirmar exclusão de arquivo"
                          onClick={() =>
                            void handleDeleteBusinessAttachment(
                              file.id,
                              negotiationId,
                            )
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
                    key={file.id}
                    onMouseEnter={() => setHoveredBusinessFileId(file.id)}
                    onMouseLeave={() => setHoveredBusinessFileId(null)}
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
                      <div style={{ minWidth: 0, display: 'grid', gap: 8 }}>
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
                          title={file.originalName}
                        >
                          <FileText
                            size={18}
                            color="#4b5563"
                            style={{
                              flexShrink: 0,
                              verticalAlign: '-3px',
                              marginRight: 8,
                            }}
                          />
                          {file.originalName}
                        </h2>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Baixar arquivo"
                          onClick={() =>
                            void handleDownloadBusinessAttachment(file.id)
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
                          <Download size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir arquivo"
                          onClick={() =>
                            setConfirmingDeleteBusinessAttachmentId(file.id)
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

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#4b5563',
                          whiteSpace: 'nowrap',
                          background: '#f1f5f9',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        {file.extension?.toUpperCase() || '-'}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          background: '#e2e8f0',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        {formatFileSize(file.size)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#7c2d12',
                          whiteSpace: 'nowrap',
                          background: '#ffedd5',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        {formatDate(file.createdAt)}
                      </span>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        ) : (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eeeeee',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: filesColumns,
                alignItems: 'center',
                justifyItems: 'start',
                columnGap: 8,
                background: '#f3f4f6',
                borderBottom: '1px solid #ececec',
                padding: '10px 12px',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Nome
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Tipo
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Tamanho
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Enviado em
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5563',
                  justifySelf: 'start',
                }}
              >
                Ações
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
              {isBusinessAttachmentsLoading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: filesColumns,
                      alignItems: 'center',
                      columnGap: 8,
                      padding: '0 12px',
                      minHeight: filesRowMinHeight,
                      borderBottom: index === 3 ? 'none' : '1px solid #f0f0f0',
                    }}
                  >
                    <Skeleton
                      width={index % 2 === 0 ? '82%' : '68%'}
                      height={13}
                      borderRadius={6}
                    />
                    <Skeleton width={56} height={13} borderRadius={6} />
                    <Skeleton width={48} height={13} borderRadius={6} />
                    <Skeleton width={82} height={13} borderRadius={6} />
                    <Skeleton circle width={26} height={26} />
                  </div>
                ))
              ) : businessAttachments.length === 0 ? (
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, color: '#555555', fontSize: 13 }}>
                    Nenhum arquivo cadastrado.
                  </p>
                </div>
              ) : (
                businessAttachments.map((file) => {
                  const rowBackground =
                    hoveredBusinessFileId === file.id
                      ? interactionTheme.clickableCardHoverBackground
                      : '#ffffff'

                  if (confirmingDeleteBusinessAttachmentId === file.id) {
                    return (
                      <div
                        key={file.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: filesColumns,
                          alignItems: 'center',
                          justifyItems: 'start',
                          columnGap: 8,
                          borderBottom: '1px solid #f0f0f0',
                          padding: '0 12px',
                          background: rowBackground,
                          minHeight: filesRowMinHeight,
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={() => setHoveredBusinessFileId(file.id)}
                        onMouseLeave={() => setHoveredBusinessFileId(null)}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.2,
                            color: '#2f2f2f',
                          }}
                        >
                          Deletar arquivo?
                        </p>
                        <span />
                        <span />
                        <span />

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            justifySelf: 'start',
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Cancelar exclusão de arquivo"
                            onClick={() =>
                              setConfirmingDeleteBusinessAttachmentId(null)
                            }
                            onMouseEnter={(event) =>
                              applyActionHoverBackground(
                                true,
                                event.currentTarget,
                              )
                            }
                            onMouseLeave={(event) =>
                              applyActionHoverBackground(
                                false,
                                event.currentTarget,
                              )
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
                            }}
                          >
                            X
                          </button>

                          <button
                            type="button"
                            aria-label="Confirmar exclusão de arquivo"
                            disabled={deletingBusinessAttachmentId === file.id}
                            onClick={() =>
                              void handleDeleteBusinessAttachment(
                                file.id,
                                negotiationId,
                              )
                            }
                            onMouseEnter={(event) =>
                              applyActionHoverBackground(
                                true,
                                event.currentTarget,
                              )
                            }
                            onMouseLeave={(event) =>
                              applyActionHoverBackground(
                                false,
                                event.currentTarget,
                              )
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
                              opacity:
                                deletingBusinessAttachmentId === file.id
                                  ? 0.7
                                  : 1,
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={file.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: filesColumns,
                        alignItems: 'center',
                        justifyItems: 'start',
                        columnGap: 8,
                        borderBottom: '1px solid #f0f0f0',
                        padding: '0 12px',
                        background: rowBackground,
                        minHeight: filesRowMinHeight,
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={() => setHoveredBusinessFileId(file.id)}
                      onMouseLeave={() => setHoveredBusinessFileId(null)}
                    >
                      <p
                        style={{
                          margin: 0,
                          width: '100%',
                          justifySelf: 'stretch',
                          minWidth: 0,
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          color: '#2f2f2f',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.originalName}
                      </p>

                      <span
                        style={{
                          fontSize: 12,
                          color: '#4b5563',
                          fontWeight: 700,
                        }}
                      >
                        {file.extension.toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#4b5563',
                          fontWeight: 700,
                        }}
                      >
                        {formatFileSize(file.size)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#4b5563',
                          fontWeight: 700,
                        }}
                      >
                        {formatDate(file.createdAt)}
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          justifySelf: 'start',
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Baixar arquivo"
                          disabled={downloadingBusinessAttachmentId === file.id}
                          onClick={() =>
                            void handleDownloadBusinessAttachment(file.id)
                          }
                          style={{
                            height: 24,
                            width: 24,
                            border: 'none',
                            background: 'transparent',
                            color: '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                            opacity:
                              downloadingBusinessAttachmentId === file.id
                                ? 0.7
                                : 1,
                          }}
                        >
                          <Download size={14} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir arquivo"
                          onClick={() => {
                            setConfirmingDeleteBusinessAttachmentId(file.id)
                          }}
                          style={{
                            height: 24,
                            width: 24,
                            border: 'none',
                            background: 'transparent',
                            color: '#4b5563',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </section>
    )
  }

  const renderBusinessesTab = () => {
    const businesses = leadNegotiations
    const selectedBusiness = selectedBusinessId
      ? (businesses.find((business) => business.id === selectedBusinessId) ??
        null)
      : null

    const resetBusinessDetailDraft = (business: NegotiationResponse) => {
      setBusinessDetailDraft({
        title: business.title ?? '',
        negotiationType: business.negotiationType ?? '',
        stage: business.stage,
        temperature: business.temperature ?? '',
        value: formatLeadValueInputField(business.financial?.saleAmount),
        notes: formatNegotiationNotes(business.notes),
      })
    }

    const openBusinessFromList = (businessId: string) => {
      setIsCreatingBusiness(false)
      setIsEditingBusiness(false)
      setIsConfirmingBusinessDelete(false)
      setIsConfirmingBusinessClose(false)
      setIsBusinessActionsOpen(false)
      setViewingBusinessFollowUpId(null)
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
      setHoveredBusinessFollowUpId(null)
      requestedBusinessTabRef.current = null
      requestedBusinessFollowUpIdRef.current = null
      setSelectedBusinessId(businessId)
      setActiveBusinessTab('informacoes')
    }

    if (selectedBusiness) {
      const selectedBusinessTitle =
        (isEditingBusiness
          ? businessDetailDraft?.title
          : selectedBusiness.title) ?? ''
      const selectedBusinessType =
        businessDetailDraft?.negotiationType ??
        selectedBusiness.negotiationType ??
        ''
      const selectedBusinessStage =
        businessDetailDraft?.stage ?? selectedBusiness.stage
      const selectedBusinessTemperature =
        businessDetailDraft?.temperature ?? selectedBusiness.temperature ?? ''
      const financialSaleAmount = Number(
        selectedBusiness.financial?.saleAmount ?? 0,
      )
      const financialDiscountAmount = Number(
        selectedBusiness.financial?.discountAmount ?? 0,
      )
      const financialTotalCosts = financialCosts.reduce(
        (total, cost) => total + Number(cost.amount),
        0,
      )
      const financialNetSale = financialSaleAmount - financialDiscountAmount
      const financialProfit = financialNetSale - financialTotalCosts
      const financialProfitMargin =
        financialNetSale > 0 ? (financialProfit / financialNetSale) * 100 : 0
      const financialTotalReceived = financialPayments.reduce(
        (total, payment) =>
          payment.status === 'PAID' ? total + Number(payment.amount) : total,
        0,
      )
      const financialTotalReceivable = financialPayments.reduce(
        (total, payment) =>
          payment.status === 'PENDING' || payment.status === 'OVERDUE'
            ? total + Number(payment.amount)
            : total,
        0,
      )
      const financialTotalOverdue = financialPayments.reduce(
        (total, payment) =>
          payment.status === 'OVERDUE' ? total + Number(payment.amount) : total,
        0,
      )
      const financialReceiptProgress =
        financialNetSale > 0
          ? (financialTotalReceived / financialNetSale) * 100
          : 0
      const financialReceiptProgressWidth = Math.min(
        Math.max(financialReceiptProgress, 0),
        100,
      )
      const financialInlineInputStyle = {
        width: isMobile ? 148 : 180,
        height: 34,
        border: '1px solid #d7dce4',
        borderRadius: 8,
        padding: '0 10px',
        color: '#111827',
        fontSize: 13,
        fontWeight: 600,
        background: '#ffffff',
        boxSizing: 'border-box',
      } as const
      const moneyInputStyle = getMoneyInputStyle(isMobile)
      const saleDraftAmount = parseLeadValueInput(financialSaleDraft.saleAmount)
      const saleDraftDiscount = parseLeadValueInput(
        financialSaleDraft.discountAmount,
      )
      const canSaveFinancialSale =
        saleDraftAmount !== null && saleDraftDiscount !== null
      const financialCostAmount = parseLeadValueInput(financialCostDraft.amount)
      const canSaveFinancialCost =
        financialCostDraft.description.trim() !== '' &&
        financialCostAmount !== null
      const financialPaymentAmount = parseLeadValueInput(
        financialPaymentDraft.amount,
      )
      const financialPaymentRequiresInstallments =
        financialPaymentDraft.paymentMethod !== '' &&
        installmentPaymentMethods.includes(financialPaymentDraft.paymentMethod)
      const financialPaymentInstallmentCount = Number(
        financialPaymentDraft.installmentCount,
      )
      const isEditingFinancialPayment = editingFinancialPaymentId !== null
      const editingFinancialPayment = editingFinancialPaymentId
        ? (financialPayments.find(
            (payment) => payment.id === editingFinancialPaymentId,
          ) ?? null)
        : null
      const isFinancialPaymentFormOpen =
        isCreatingFinancialPayment || isEditingFinancialPayment
      const canSaveFinancialPayment =
        financialPaymentAmount !== null &&
        financialPaymentDraft.dueDate !== '' &&
        financialPaymentDraft.paymentMethod !== '' &&
        (isEditingFinancialPayment ||
          !financialPaymentRequiresInstallments ||
          (Number.isInteger(financialPaymentInstallmentCount) &&
            financialPaymentInstallmentCount >= 1))
      const selectedBusinessNotes = (selectedBusiness.notes ?? [])
        .map((note, originalIndex) => ({ note, originalIndex }))
        .sort((firstItem, secondItem) => {
          const firstTimestamp = firstItem.note.createdAt
            ? new Date(firstItem.note.createdAt).getTime()
            : 0
          const secondTimestamp = secondItem.note.createdAt
            ? new Date(secondItem.note.createdAt).getTime()
            : 0

          return secondTimestamp - firstTimestamp
        })
      const viewedBusinessNote =
        viewingBusinessNoteIndex !== null
          ? ((selectedBusiness.notes ?? [])[viewingBusinessNoteIndex] ?? null)
          : null
      const selectedBusinessClosedAtLabel = formatDateOnly(
        selectedBusiness.closedAt,
      )
      const selectedBusinessCreatedAtLabel = formatDateOnly(
        selectedBusiness.createdAt,
      )
      const selectedBusinessUpdatedAtLabel = formatDateOnly(
        selectedBusiness.updatedAt,
      )
      const isBusinessClosed = selectedBusiness.status !== 'OPEN'
      const businessStatusTag = getBusinessLifecycleTagPresentation(
        selectedBusiness.status,
      )
      const isEditBusinessDisabled = isBusinessClosed
      const selectedBusinessTypeTagPresentation =
        getBusinessTypeTagPresentation(selectedBusinessType)
      const temperatureTagPresentation = getTemperatureTagPresentation(
        selectedBusinessTemperature,
      )
      const businessLeadSourceTagPresentation = getLeadSourceTagPresentation(
        leadData?.source,
      )
      const shouldShowBusinessInformationTab =
        isEditingBusiness || activeBusinessTab === 'informacoes'
      const shouldShowDeleteBusinessConfirmation = isConfirmingBusinessDelete
      const shouldShowCloseBusinessConfirmation = isConfirmingBusinessClose
      const businessEditFieldLabelStyle = {
        color: '#1f2937',
        fontSize: isMobile ? 17 / 1.3 : 13,
        fontWeight: 700,
      } as const
      const businessEditInputStyle = {
        width: '100%',
        height: isMobile ? 46 : 42,
        border: '1px solid #d7dce4',
        borderRadius: 10,
        padding: '0 14px',
        color: '#111827',
        fontSize: isMobile ? 17 / 1.2 : 14,
        boxSizing: 'border-box',
        background: 'rgb(252, 253, 255)',
      } as const
      const businessEditSelectStyle = {
        ...businessEditInputStyle,
        padding: '0 36px 0 14px',
        fontWeight: 600,
        appearance: 'none',
      } as const
      const canSaveBusiness = Boolean(businessDetailDraft?.title.trim())

      const handleCancelBusinessEdit = () => {
        resetBusinessDetailDraft(selectedBusiness)
        setIsEditingBusiness(false)
      }

      const handleBusinessOverviewFieldChange = async (
        field: BusinessOverviewQuickField,
        value: string,
      ) => {
        if (!selectedBusinessId) return

        const payload =
          field === 'negotiationType'
            ? { negotiationType: (value || null) as NegotiationType | null }
            : field === 'stage'
              ? { stage: value as LeadStage }
              : field === 'status'
                ? { status: value as NegotiationStatus }
                : {
                    temperature: (value ||
                      null) as NegotiationTemperature | null,
                  }

        setUpdatingBusinessOverviewField(field)
        setBusinessesError(null)

        try {
          await WebhookService.updateNegotiation(selectedBusinessId, payload)
          await refreshLeadNegotiations(leadId ?? '')
          onLeadUpdated?.()
        } catch (exception: unknown) {
          const message =
            exception instanceof Error
              ? exception.message
              : 'Falha ao atualizar negócio.'
          setBusinessesError(message)
        } finally {
          setUpdatingBusinessOverviewField(null)
        }
      }

      const handleSaveBusinessEdit = async () => {
        if (!selectedBusinessId || !businessDetailDraft) return

        const saleAmount = parseLeadValueInput(businessDetailDraft.value)
        const payload: UpdateNegotiationPayload = {
          title: businessDetailDraft.title,
          negotiationType: businessDetailDraft.negotiationType || null,
          stage: businessDetailDraft.stage,
          temperature: (businessDetailDraft.temperature ||
            null) as NegotiationTemperature | null,
          notes: businessDetailDraft.notes.trim()
            ? businessDetailDraft.notes.trim() ===
              formatNegotiationNotes(selectedBusiness.notes).trim()
              ? (selectedBusiness.notes ?? []).map((note) => ({
                  title: note.title,
                  description: note.description,
                  createdAt: note.createdAt ?? new Date().toISOString(),
                }))
              : [
                  {
                    title: 'Nota',
                    description: businessDetailDraft.notes.trim(),
                    createdAt:
                      selectedBusiness.notes?.[0]?.createdAt ??
                      new Date().toISOString(),
                  },
                ]
            : [],
        }

        try {
          await WebhookService.updateNegotiation(selectedBusinessId, payload)
          if (saleAmount === null && selectedBusiness.financial) {
            await WebhookService.deleteNegotiationFinancial(selectedBusinessId)
          } else if (saleAmount !== null && selectedBusiness.financial) {
            await WebhookService.updateNegotiationFinancial(
              selectedBusinessId,
              { saleAmount },
            )
          } else if (saleAmount !== null) {
            await WebhookService.createNegotiationFinancial(
              selectedBusinessId,
              { saleAmount },
            )
          }
          await refreshLeadNegotiations(leadId ?? '')
          onLeadUpdated?.()
          setIsEditingBusiness(false)
          setBusinessesError(null)
        } catch (exception: unknown) {
          const message =
            exception instanceof Error
              ? exception.message
              : 'Falha ao atualizar negócio.'
          setBusinessesError(message)
        }
      }

      return (
        <section
          style={{
            display: 'grid',
            alignContent: 'start',
            gap: 0,
            height: '100%',
            minHeight: 0,
            overflowY: isEditingBusiness
              ? 'hidden'
              : activeBusinessTab === 'financeiro' ||
                  (!isMobile &&
                    (activeBusinessTab === 'followups' ||
                      activeBusinessTab === 'arquivos' ||
                      activeBusinessTab === 'notas'))
                ? 'hidden'
                : 'auto',
            overflowX: 'hidden',
            paddingRight: isMobile ? 0 : 4,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isEditingBusiness ? 16 : 0,
              width: '100%',
              height: '100%',
              minWidth: 0,
              minHeight: 0,
              overflow:
                isEditingBusiness || activeBusinessTab === 'financeiro'
                  ? 'hidden'
                  : 'visible',
              boxSizing: 'border-box',
            }}
          >
            {!isMobile && !selectedHeaderBusiness ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                {activeBusinessTab === 'informacoes' ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        color: '#0f172a',
                        fontSize: 26,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {selectedBusinessTitle || 'Negócio sem nome'}
                    </h2>
                  </div>
                ) : null}

                {!isEditingBusiness && activeBusinessTab === 'informacoes' ? (
                  <div
                    ref={businessActionsRef}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setIsBusinessActionsOpen((current) => !current)
                      }
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
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Abrir ações do negócio"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isBusinessActionsOpen ? (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 34,
                          minWidth: 188,
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 10,
                          boxShadow: '0 8px 24px rgba(2, 6, 23, 0.12)',
                          padding: 6,
                          zIndex: 2,
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <button
                          type="button"
                          disabled={isEditBusinessDisabled}
                          onClick={() => {
                            if (isEditBusinessDisabled) return
                            setIsEditingBusiness(true)
                            setIsConfirmingBusinessDelete(false)
                            setIsConfirmingBusinessClose(false)
                            setActiveBusinessTab('informacoes')
                            setIsBusinessActionsOpen(false)
                          }}
                          style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            borderRadius: 8,
                            color: isEditBusinessDisabled
                              ? '#94a3b8'
                              : '#0f172a',
                            fontSize: 14,
                            fontWeight: 600,
                            textAlign: 'left',
                            padding: '10px 12px',
                            cursor: isEditBusinessDisabled
                              ? 'not-allowed'
                              : 'pointer',
                          }}
                        >
                          Editar negócio
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsConfirmingBusinessDelete(true)
                            setIsConfirmingBusinessClose(false)
                            setIsBusinessActionsOpen(false)
                          }}
                          style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            borderRadius: 8,
                            color: '#dc2626',
                            fontSize: 14,
                            fontWeight: 600,
                            textAlign: 'left',
                            padding: '10px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Deletar negócio
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isEditingBusiness ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: isMobile ? 24 : 26,
                    fontWeight: isMobile ? 700 : 800,
                    lineHeight: 1,
                  }}
                >
                  Editar negócio
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
                    aria-label="Salvar negócio"
                    title="Salvar negócio"
                    onClick={() => void handleSaveBusinessEdit()}
                    disabled={!canSaveBusiness}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: canSaveBusiness ? '#6b7280' : '#cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: canSaveBusiness ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Save size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar edição do negócio"
                    title="Cancelar edição"
                    onClick={handleCancelBusinessEdit}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#6b7280',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    X
                  </button>
                </div>
              </div>
            ) : null}

            {businessesError ? (
              <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p>
            ) : null}

            {!isEditingBusiness &&
            !shouldShowDeleteBusinessConfirmation &&
            !shouldShowCloseBusinessConfirmation &&
            activeBusinessTab === 'followups'
              ? renderBusinessFollowUpsTab(selectedBusiness.id)
              : null}

            {!isEditingBusiness &&
            !shouldShowDeleteBusinessConfirmation &&
            !shouldShowCloseBusinessConfirmation &&
            activeBusinessTab === 'arquivos'
              ? renderBusinessFilesTab(selectedBusiness.id)
              : null}

            {!isEditingBusiness &&
            !shouldShowDeleteBusinessConfirmation &&
            !shouldShowCloseBusinessConfirmation &&
            activeBusinessTab === 'financeiro' ? (
              <article
                style={{
                  border: 'none',
                  borderRadius: 0,
                  padding: 0,
                  background: 'transparent',
                  display: 'grid',
                  gridTemplateRows: 'auto minmax(0, 1fr)',
                  gap: 16,
                  flex: 1,
                  width: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: 4,
                    width: '100%',
                    padding: 4,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#f8fafc',
                    boxSizing: 'border-box',
                  }}
                >
                  {(
                    [
                      { key: 'summary', label: 'Resumo' },
                      { key: 'sale', label: 'Venda' },
                      { key: 'costs', label: 'Custos' },
                      { key: 'payment', label: 'Pagamentos' },
                    ] as const
                  ).map((section) => {
                    const isActive = activeFinancialSection === section.key

                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => {
                          setActiveFinancialSection(section.key)
                          setEditingFinancialSection(null)
                          setIsCreatingFinancialCost(false)
                          setEditingFinancialCostId(null)
                          setConfirmingDeleteFinancialCostId(null)
                          setFinancialCostDraft(initialFinancialCostDraft)
                          setIsCreatingFinancialPayment(false)
                          setEditingFinancialPaymentId(null)
                          setConfirmingDeleteFinancialPaymentId(null)
                          setFinancialPaymentDraft(emptyFinancialPaymentDraft)
                        }}
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
                          cursor: 'pointer',
                        }}
                      >
                        {section.label}
                      </button>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: 'grid',
                    alignContent: 'start',
                    gap: 16,
                    minWidth: 0,
                    minHeight: 0,
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    paddingRight: isMobile ? 0 : 4,
                    boxSizing: 'border-box',
                  }}
                >
                  <section
                    style={{
                      display:
                        activeFinancialSection === 'summary' ? 'grid' : 'none',
                      gap: 22,
                      width: '100%',
                      minWidth: 0,
                      padding: isMobile ? 18 : 22,
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: '#16a34a',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <TrendingUp size={16} />
                      </span>
                      <h3
                        style={{
                          margin: 0,
                          color: '#0f172a',
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        Resultado
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gap: 18 }}>
                      {[
                        {
                          label: 'Receita bruta',
                          description: 'Valor do negócio - Desconto',
                          value: formatLeadValue(financialNetSale.toFixed(2)),
                          color: '#111827',
                        },
                        {
                          label: 'Custos totais',
                          description: 'Soma de todos os custos',
                          value: formatLeadValue(
                            financialTotalCosts.toFixed(2),
                          ),
                          color: '#dc2626',
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span style={{ display: 'grid', gap: 3 }}>
                            <span
                              style={{
                                color: '#334155',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {metric.label}
                            </span>
                            <span style={{ color: '#64748b', fontSize: 12 }}>
                              {metric.description}
                            </span>
                          </span>
                          <span
                            style={{
                              color: metric.color,
                              fontSize: 14,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {metric.value}
                          </span>
                        </div>
                      ))}

                      <div style={{ borderTop: '1px solid #e5e7eb' }} />

                      {[
                        {
                          label: 'Receita líquida',
                          description: 'Receita bruta - Custos totais',
                          value: formatLeadValue(financialProfit.toFixed(2)),
                        },
                        {
                          label: 'Margem estimada',
                          description: 'Receita líquida / Receita bruta',
                          value: `${financialProfitMargin.toLocaleString(
                            'pt-BR',
                            {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            },
                          )}%`,
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span style={{ display: 'grid', gap: 3 }}>
                            <span
                              style={{
                                color: '#334155',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {metric.label}
                            </span>
                            <span style={{ color: '#64748b', fontSize: 12 }}>
                              {metric.description}
                            </span>
                          </span>
                          <span
                            style={{
                              color: '#15803d',
                              fontSize: 14,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {metric.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section
                    style={{
                      display:
                        activeFinancialSection === 'summary' ? 'grid' : 'none',
                      gap: 22,
                      width: '100%',
                      minWidth: 0,
                      padding: isMobile ? 18 : 22,
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: '#16a34a',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <CircleDollarSign size={16} />
                      </span>
                      <h3
                        style={{
                          margin: 0,
                          color: '#0f172a',
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        Recebimentos
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gap: 18 }}>
                      {[
                        {
                          label: 'Total recebido',
                          description: 'Soma dos pagamentos recebidos',
                          value: formatLeadValue(
                            financialTotalReceived.toFixed(2),
                          ),
                          color: '#15803d',
                        },
                        {
                          label: 'Total a receber',
                          description: 'Soma dos pagamentos pendentes',
                          value: formatLeadValue(
                            financialTotalReceivable.toFixed(2),
                          ),
                          color: '#d97706',
                        },
                        {
                          label: 'Total em atraso',
                          description: 'Soma dos pagamentos vencidos',
                          value: formatLeadValue(
                            financialTotalOverdue.toFixed(2),
                          ),
                          color: '#dc2626',
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span style={{ display: 'grid', gap: 3 }}>
                            <span
                              style={{
                                color: '#334155',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {metric.label}
                            </span>
                            <span style={{ color: '#64748b', fontSize: 12 }}>
                              {metric.description}
                            </span>
                          </span>
                          <span
                            style={{
                              color: metric.color,
                              fontSize: 14,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {metric.value}
                          </span>
                        </div>
                      ))}

                      <div style={{ borderTop: '1px solid #e5e7eb' }} />

                      <div style={{ display: 'grid', gap: 10 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              color: '#334155',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Progresso de recebimentos
                          </span>
                          <span
                            style={{
                              color: '#15803d',
                              fontSize: 12,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {financialReceiptProgress.toLocaleString('pt-BR', {
                              maximumFractionDigits: 1,
                            })}
                            % recebido
                          </span>
                        </div>
                        <div
                          style={{
                            height: 12,
                            overflow: 'hidden',
                            borderRadius: 999,
                            background: '#e8edf2',
                          }}
                        >
                          <div
                            style={{
                              width: `${financialReceiptProgressWidth}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: '#16a34a',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            color: '#64748b',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {formatLeadValue(financialTotalReceived.toFixed(2))}{' '}
                          de {formatLeadValue(financialNetSale.toFixed(2))}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section
                    style={{
                      display:
                        activeFinancialSection === 'sale' ? 'grid' : 'none',
                      gap: 8,
                      width: '100%',
                      minWidth: 0,
                      padding: isMobile ? '16px' : '18px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            color: '#16a34a',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <CircleDollarSign size={15} />
                        </span>
                        <h3
                          style={{
                            margin: 0,
                            color: '#0f172a',
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          Venda
                        </h3>
                      </div>
                      {editingFinancialSection === 'sale' ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Salvar venda"
                            title="Salvar venda"
                            disabled={!canSaveFinancialSale}
                            onClick={async () => {
                              if (
                                !canSaveFinancialSale ||
                                saleDraftAmount === null ||
                                saleDraftDiscount === null
                              ) {
                                return
                              }

                              try {
                                setBusinessesError(null)
                                if (selectedBusiness.financial) {
                                  await WebhookService.updateNegotiationFinancial(
                                    selectedBusiness.id,
                                    {
                                      saleAmount: saleDraftAmount,
                                      discountAmount: saleDraftDiscount,
                                    },
                                  )
                                } else {
                                  await WebhookService.createNegotiationFinancial(
                                    selectedBusiness.id,
                                    {
                                      saleAmount: saleDraftAmount,
                                      discountAmount: saleDraftDiscount,
                                    },
                                  )
                                }
                                await refreshLeadNegotiations(leadId ?? '')
                                setEditingFinancialSection(null)
                                onLeadUpdated?.()
                              } catch (exception: unknown) {
                                const message =
                                  exception instanceof Error
                                    ? exception.message
                                    : 'Falha ao salvar dados da venda.'
                                setBusinessesError(message)
                              }
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              border: 'none',
                              borderRadius: 6,
                              background: 'transparent',
                              color: canSaveFinancialSale
                                ? '#4b5563'
                                : '#cbd5e1',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              cursor: canSaveFinancialSale
                                ? 'pointer'
                                : 'not-allowed',
                            }}
                          >
                            <Save size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancelar edição da venda"
                            title="Cancelar"
                            onClick={() => {
                              setFinancialSaleDraft({
                                saleAmount: formatLeadValueInputField(
                                  selectedBusiness.financial?.saleAmount,
                                ),
                                discountAmount: formatLeadValueInputField(
                                  selectedBusiness.financial?.discountAmount ??
                                    '0',
                                ),
                              })
                              setEditingFinancialSection(null)
                            }}
                            style={{
                              width: 28,
                              height: 28,
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
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Editar venda"
                          title="Editar venda"
                          disabled={isBusinessClosed}
                          onClick={() => {
                            if (isBusinessClosed) return

                            setFinancialSaleDraft({
                              saleAmount: formatLeadValueInputField(
                                selectedBusiness.financial?.saleAmount,
                              ),
                              discountAmount: formatLeadValueInputField(
                                selectedBusiness.financial?.discountAmount ??
                                  '0',
                              ),
                            })
                            setEditingFinancialSection('sale')
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            border: 'none',
                            borderRadius: 6,
                            background: 'transparent',
                            color: isBusinessClosed ? '#cbd5e1' : '#6b7280',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            cursor: isBusinessClosed
                              ? 'not-allowed'
                              : 'pointer',
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Valor do negócio
                        </span>
                        {editingFinancialSection === 'sale' ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-label="Valor do negócio"
                            value={financialSaleDraft.saleAmount}
                            onChange={(event) =>
                              setFinancialSaleDraft((current) => ({
                                ...current,
                                saleAmount: sanitizeLeadValueInput(
                                  event.target.value,
                                ),
                              }))
                            }
                            style={{
                              ...moneyInputStyle,
                              width: isMobile ? 148 : 180,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              color: '#111827',
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {formatLeadValue(
                              selectedBusiness.financial?.saleAmount,
                            )}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Desconto
                        </span>
                        {editingFinancialSection === 'sale' ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-label="Desconto"
                            value={financialSaleDraft.discountAmount}
                            onChange={(event) =>
                              setFinancialSaleDraft((current) => ({
                                ...current,
                                discountAmount: sanitizeLeadValueInput(
                                  event.target.value,
                                ),
                              }))
                            }
                            style={{
                              ...moneyInputStyle,
                              width: isMobile ? 148 : 180,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              color: '#b45309',
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {formatLeadValue(
                              selectedBusiness.financial?.discountAmount,
                            )}
                          </span>
                        )}
                      </div>
                      {editingFinancialSection !== 'sale' ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 2px',
                          }}
                        >
                          <span
                            style={{
                              color: '#475569',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Receita bruta
                          </span>
                          <span
                            style={{
                              color: '#111827',
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {formatLeadValue(financialNetSale.toFixed(2))}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section
                    style={{
                      display:
                        activeFinancialSection === 'costs' ? 'grid' : 'none',
                      gap: 8,
                      width: '100%',
                      minWidth: 0,
                      padding: isMobile ? '16px' : '18px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            color: '#16a34a',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Package size={15} />
                        </span>
                        <h3
                          style={{
                            margin: 0,
                            color: '#0f172a',
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          Custos
                        </h3>
                      </div>
                      <button
                        type="button"
                        aria-label="Adicionar custo"
                        title="Adicionar custo"
                        disabled={isBusinessClosed}
                        onClick={() => {
                          if (isBusinessClosed) return

                          setFinancialCostDraft(initialFinancialCostDraft)
                          setEditingFinancialCostId(null)
                          setConfirmingDeleteFinancialCostId(null)
                          setIsCreatingFinancialCost(true)
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          border: 'none',
                          borderRadius: 6,
                          background: 'transparent',
                          color: isBusinessClosed ? '#cbd5e1' : '#6b7280',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          cursor: isBusinessClosed ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Plus size={17} />
                      </button>
                    </div>

                    {isCreatingFinancialCost ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile
                            ? '1fr'
                            : 'minmax(0, 1fr) 150px 140px auto',
                          gap: 8,
                          padding: '12px 0',
                          borderTop: '1px solid #e5e7eb',
                        }}
                      >
                        <input
                          type="text"
                          aria-label="Descrição do custo"
                          placeholder="Descrição"
                          value={financialCostDraft.description}
                          onChange={(event) =>
                            setFinancialCostDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          style={{
                            ...financialInlineInputStyle,
                            width: '100%',
                            height: moneyInputStyle.height,
                          }}
                        />
                        <select
                          aria-label="Tipo do custo"
                          value={financialCostDraft.type}
                          onChange={(event) =>
                            setFinancialCostDraft((current) => ({
                              ...current,
                              type: event.target.value as NegotiationCostType,
                            }))
                          }
                          style={{
                            ...financialInlineInputStyle,
                            width: '100%',
                            height: moneyInputStyle.height,
                          }}
                        >
                          {Object.entries(financialCostTypeLabels).map(
                            ([type, label]) => (
                              <option key={type} value={type}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Valor do custo"
                          placeholder="0,00"
                          value={financialCostDraft.amount}
                          onChange={(event) =>
                            setFinancialCostDraft((current) => ({
                              ...current,
                              amount: sanitizeLeadValueInput(
                                event.target.value,
                              ),
                            }))
                          }
                          style={{
                            ...moneyInputStyle,
                            width: '100%',
                          }}
                        />
                        <div
                          style={{
                            display: 'inline-flex',
                            justifyContent: isMobile ? 'flex-end' : 'center',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Salvar custo"
                            title="Salvar custo"
                            disabled={
                              !canSaveFinancialCost || isSavingFinancialCost
                            }
                            onClick={() =>
                              void handleCreateNegotiationCost(
                                selectedBusiness.id,
                              )
                            }
                            style={{
                              width: 28,
                              height: 28,
                              border: 'none',
                              background: 'transparent',
                              color:
                                canSaveFinancialCost && !isSavingFinancialCost
                                  ? '#4b5563'
                                  : '#cbd5e1',
                              padding: 0,
                              cursor:
                                canSaveFinancialCost && !isSavingFinancialCost
                                  ? 'pointer'
                                  : 'not-allowed',
                            }}
                          >
                            <Save size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancelar novo custo"
                            title="Cancelar"
                            onClick={() => {
                              setFinancialCostDraft(initialFinancialCostDraft)
                              setIsCreatingFinancialCost(false)
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              border: 'none',
                              background: 'transparent',
                              color: '#6b7280',
                              padding: 0,
                              cursor: 'pointer',
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      {isFinancialCostsLoading ? (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            padding: '18px 2px',
                            color: '#64748b',
                            fontSize: 13,
                            textAlign: 'center',
                          }}
                        >
                          Carregando custos...
                        </div>
                      ) : null}
                      {!isFinancialCostsLoading &&
                      financialCosts.length === 0 ? (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            padding: '18px 2px',
                            color: '#64748b',
                            fontSize: 13,
                            textAlign: 'center',
                          }}
                        >
                          Nenhum custo cadastrado.
                        </div>
                      ) : null}
                      {financialCosts.map((cost) => {
                        if (
                          !isBusinessClosed &&
                          confirmingDeleteFinancialCostId === cost.id
                        ) {
                          return (
                            <div
                              key={cost.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'minmax(0, 1fr) 112px 60px',
                                alignItems: 'center',
                                gap: 12,
                                minHeight: 59,
                                padding: '12px 2px',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <span
                                style={{
                                  gridColumn: '1 / 3',
                                  color: '#111827',
                                  fontSize: 14,
                                  fontWeight: 700,
                                }}
                              >
                                Deseja deletar o custo?
                              </span>
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
                                  aria-label="Cancelar exclusão de custo"
                                  title="Cancelar"
                                  onClick={() =>
                                    setConfirmingDeleteFinancialCostId(null)
                                  }
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
                                  <X size={16} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Confirmar exclusão de custo"
                                  title="Confirmar exclusão"
                                  disabled={isDeletingFinancialCost}
                                  onClick={() =>
                                    void handleDeleteNegotiationCost(
                                      selectedBusiness.id,
                                      cost.id,
                                    )
                                  }
                                  style={{
                                    height: 24,
                                    width: 24,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#4b5563',
                                    padding: 0,
                                    cursor: isDeletingFinancialCost
                                      ? 'not-allowed'
                                      : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Check size={16} />
                                </button>
                              </div>
                            </div>
                          )
                        }

                        if (
                          !isBusinessClosed &&
                          editingFinancialCostId === cost.id
                        ) {
                          return (
                            <div
                              key={cost.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile
                                  ? '1fr'
                                  : 'minmax(0, 1fr) 150px 140px auto',
                                gap: 8,
                                padding: '12px 0',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <input
                                type="text"
                                aria-label="Descrição do custo"
                                placeholder="Descrição"
                                value={financialCostDraft.description}
                                onChange={(event) =>
                                  setFinancialCostDraft((current) => ({
                                    ...current,
                                    description: event.target.value,
                                  }))
                                }
                                style={{
                                  ...financialInlineInputStyle,
                                  width: '100%',
                                  height: moneyInputStyle.height,
                                }}
                              />
                              <select
                                aria-label="Tipo do custo"
                                value={financialCostDraft.type}
                                onChange={(event) =>
                                  setFinancialCostDraft((current) => ({
                                    ...current,
                                    type: event.target
                                      .value as NegotiationCostType,
                                  }))
                                }
                                style={{
                                  ...financialInlineInputStyle,
                                  width: '100%',
                                  height: moneyInputStyle.height,
                                }}
                              >
                                {Object.entries(financialCostTypeLabels).map(
                                  ([type, label]) => (
                                    <option key={type} value={type}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label="Valor do custo"
                                placeholder="0,00"
                                value={financialCostDraft.amount}
                                onChange={(event) =>
                                  setFinancialCostDraft((current) => ({
                                    ...current,
                                    amount: sanitizeLeadValueInput(
                                      event.target.value,
                                    ),
                                  }))
                                }
                                style={{
                                  ...moneyInputStyle,
                                  width: '100%',
                                }}
                              />
                              <div
                                style={{
                                  display: 'inline-flex',
                                  justifyContent: isMobile
                                    ? 'flex-end'
                                    : 'center',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label="Salvar custo"
                                  title="Salvar custo"
                                  disabled={
                                    !canSaveFinancialCost ||
                                    isSavingFinancialCost
                                  }
                                  onClick={() =>
                                    void handleUpdateNegotiationCost(
                                      selectedBusiness.id,
                                      cost.id,
                                    )
                                  }
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: 'none',
                                    background: 'transparent',
                                    color:
                                      canSaveFinancialCost &&
                                      !isSavingFinancialCost
                                        ? '#4b5563'
                                        : '#cbd5e1',
                                    padding: 0,
                                    cursor:
                                      canSaveFinancialCost &&
                                      !isSavingFinancialCost
                                        ? 'pointer'
                                        : 'not-allowed',
                                  }}
                                >
                                  <Save size={15} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Cancelar edição do custo"
                                  title="Cancelar"
                                  onClick={() => {
                                    setFinancialCostDraft(
                                      initialFinancialCostDraft,
                                    )
                                    setEditingFinancialCostId(null)
                                  }}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    padding: 0,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={cost.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isBusinessClosed
                                ? 'minmax(0, 1fr) 112px'
                                : 'minmax(0, 1fr) 112px 60px',
                              alignItems: 'center',
                              gap: 12,
                              minHeight: 59,
                              padding: '12px 2px',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <span
                              style={{
                                display: 'grid',
                                gap: 3,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  color: '#111827',
                                  fontSize: 14,
                                  fontWeight: 700,
                                }}
                              >
                                {cost.description}
                              </span>
                              <span
                                style={{
                                  color: '#64748b',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {financialCostTypeLabels[cost.type]}
                              </span>
                            </span>
                            <span
                              style={{
                                color: '#b91c1c',
                                fontSize: 14,
                                fontWeight: 700,
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatLeadValue(cost.amount)}
                            </span>
                            {!isBusinessClosed ? (
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
                                  aria-label="Editar custo"
                                  title="Editar custo"
                                  onClick={() => {
                                    setIsCreatingFinancialCost(false)
                                    setConfirmingDeleteFinancialCostId(null)
                                    setFinancialCostDraft({
                                      description: cost.description,
                                      type: cost.type,
                                      amount: formatLeadValueInputField(
                                        cost.amount,
                                      ),
                                    })
                                    setEditingFinancialCostId(cost.id)
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
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Excluir custo"
                                  title="Excluir custo"
                                  onClick={() => {
                                    setIsCreatingFinancialCost(false)
                                    setEditingFinancialCostId(null)
                                    setConfirmingDeleteFinancialCostId(cost.id)
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
                            ) : null}
                          </div>
                        )
                      })}
                      {!isFinancialCostsLoading && financialCosts.length > 0 ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isBusinessClosed
                              ? 'minmax(0, 1fr) 112px'
                              : 'minmax(0, 1fr) 112px 60px',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 2px',
                          }}
                        >
                          <span
                            style={{
                              color: '#475569',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Total
                          </span>
                          <span
                            style={{
                              color: '#111827',
                              fontSize: 14,
                              fontWeight: 700,
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatLeadValue(financialTotalCosts.toFixed(2))}
                          </span>
                          {!isBusinessClosed ? (
                            <span aria-hidden="true" />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section
                    style={{
                      display:
                        activeFinancialSection === 'payment' ? 'grid' : 'none',
                      gap: 8,
                      width: '100%',
                      minWidth: 0,
                      padding: isMobile ? 16 : 18,
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            color: '#16a34a',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <BadgeCheck size={15} />
                        </span>
                        <h3
                          style={{
                            margin: 0,
                            color: '#0f172a',
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          {isEditingFinancialPayment
                            ? 'Editar Pagamento'
                            : isCreatingFinancialPayment
                              ? 'Adicionar Pagamento'
                              : 'Pagamentos'}
                        </h3>
                      </div>
                      {isFinancialPaymentFormOpen ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Salvar pagamento"
                            title="Salvar pagamento"
                            disabled={
                              !canSaveFinancialPayment ||
                              isSavingFinancialPayment
                            }
                            onClick={() => {
                              if (editingFinancialPaymentId) {
                                void handleUpdateNegotiationPayment(
                                  selectedBusiness.id,
                                  editingFinancialPaymentId,
                                )
                                return
                              }

                              void handleCreateNegotiationPayment(
                                selectedBusiness.id,
                              )
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              border: 'none',
                              borderRadius: 6,
                              background: 'transparent',
                              color:
                                canSaveFinancialPayment &&
                                !isSavingFinancialPayment
                                  ? '#4b5563'
                                  : '#cbd5e1',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              cursor:
                                canSaveFinancialPayment &&
                                !isSavingFinancialPayment
                                  ? 'pointer'
                                  : 'not-allowed',
                            }}
                          >
                            <Save size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancelar novo pagamento"
                            title="Cancelar"
                            onClick={() => {
                              setFinancialPaymentDraft(
                                emptyFinancialPaymentDraft,
                              )
                              setIsCreatingFinancialPayment(false)
                              setEditingFinancialPaymentId(null)
                              setConfirmingDeleteBusinessAttachmentId(null)
                            }}
                            style={{
                              width: 28,
                              height: 28,
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
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Adicionar pagamento"
                          title="Adicionar pagamento"
                          disabled={isBusinessClosed}
                          onClick={() => {
                            if (isBusinessClosed) return

                            setFinancialPaymentDraft(emptyFinancialPaymentDraft)
                            setEditingFinancialPaymentId(null)
                            setConfirmingDeleteFinancialPaymentId(null)
                            setIsCreatingFinancialPayment(true)
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            border: 'none',
                            borderRadius: 6,
                            background: 'transparent',
                            color: isBusinessClosed ? '#cbd5e1' : '#6b7280',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            cursor: isBusinessClosed
                              ? 'not-allowed'
                              : 'pointer',
                          }}
                        >
                          <Plus size={17} />
                        </button>
                      )}
                    </div>

                    {isFinancialPaymentFormOpen ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr)',
                          gap: 10,
                          padding: '16px 0 4px',
                          borderTop: '1px solid #e5e7eb',
                        }}
                      >
                        <span style={businessEditFieldLabelStyle}>
                          Forma de pagamento
                        </span>
                        <select
                          aria-label="Forma de pagamento"
                          value={financialPaymentDraft.paymentMethod}
                          onChange={(event) =>
                            setFinancialPaymentDraft((current) => ({
                              ...current,
                              paymentMethod: event.target
                                .value as NegotiationPaymentMethod,
                            }))
                          }
                          style={businessEditInputStyle}
                        >
                          <option value="">Selecione</option>
                          {Object.entries(financialPaymentMethodLabels).map(
                            ([method, label]) => (
                              <option key={method} value={method}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>

                        {!isEditingFinancialPayment &&
                        financialPaymentDraft.paymentMethod &&
                        installmentPaymentMethods.includes(
                          financialPaymentDraft.paymentMethod,
                        ) ? (
                          <>
                            <span style={businessEditFieldLabelStyle}>
                              Parcelas
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              aria-label="Parcelas"
                              value={financialPaymentDraft.installmentCount}
                              onChange={(event) =>
                                setFinancialPaymentDraft((current) => ({
                                  ...current,
                                  installmentCount: event.target.value,
                                }))
                              }
                              style={businessEditInputStyle}
                            />
                          </>
                        ) : null}

                        <span style={businessEditFieldLabelStyle}>Valor</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Valor do pagamento"
                          placeholder="0,00"
                          value={financialPaymentDraft.amount}
                          onChange={(event) =>
                            setFinancialPaymentDraft((current) => ({
                              ...current,
                              amount: sanitizeLeadValueInput(
                                event.target.value,
                              ),
                            }))
                          }
                          style={moneyInputStyle}
                        />

                        <span style={businessEditFieldLabelStyle}>
                          Vencimento
                        </span>
                        <PaymentDatePickerInput
                          ariaLabel="Selecionar data de vencimento"
                          value={financialPaymentDraft.dueDate}
                          onChange={(nextValue) =>
                            setFinancialPaymentDraft((current) => ({
                              ...current,
                              dueDate: nextValue,
                            }))
                          }
                          isMobile={isMobile}
                        />

                        {editingFinancialPayment?.proofAttachmentId ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              gap: 4,
                            }}
                          >
                            <span style={businessEditFieldLabelStyle}>
                              Comprovante
                            </span>
                            <button
                              type="button"
                              aria-label="Visualizar comprovante"
                              title="Visualizar comprovante"
                              disabled={
                                downloadingBusinessAttachmentId ===
                                editingFinancialPayment.proofAttachmentId
                              }
                              onClick={() =>
                                void handleDownloadBusinessAttachment(
                                  editingFinancialPayment.proofAttachmentId as string,
                                )
                              }
                              style={{
                                width: 28,
                                height: 28,
                                flex: '0 0 auto',
                                border: 'none',
                                borderRadius: 6,
                                background: 'transparent',
                                color: '#2563eb',
                                padding: 0,
                                cursor:
                                  downloadingBusinessAttachmentId ===
                                  editingFinancialPayment.proofAttachmentId
                                    ? 'not-allowed'
                                    : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Eye size={15} />
                            </button>
                            {confirmingDeleteBusinessAttachmentId ===
                            editingFinancialPayment.proofAttachmentId ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label="Cancelar exclusão do comprovante"
                                  title="Cancelar"
                                  onClick={() =>
                                    setConfirmingDeleteBusinessAttachmentId(
                                      null,
                                    )
                                  }
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: 'none',
                                    borderRadius: 6,
                                    background: 'transparent',
                                    color: '#6b7280',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <X size={15} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Confirmar exclusão do comprovante"
                                  title="Confirmar exclusão"
                                  disabled={
                                    deletingBusinessAttachmentId ===
                                    editingFinancialPayment.proofAttachmentId
                                  }
                                  onClick={() =>
                                    void handleDeleteBusinessAttachment(
                                      editingFinancialPayment.proofAttachmentId as string,
                                      selectedBusiness.id,
                                    )
                                  }
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: 'none',
                                    borderRadius: 6,
                                    background: 'transparent',
                                    color: '#16a34a',
                                    padding: 0,
                                    cursor:
                                      deletingBusinessAttachmentId ===
                                      editingFinancialPayment.proofAttachmentId
                                        ? 'not-allowed'
                                        : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Check size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                aria-label="Excluir comprovante"
                                title="Excluir comprovante"
                                onClick={() =>
                                  setConfirmingDeleteBusinessAttachmentId(
                                    editingFinancialPayment.proofAttachmentId,
                                  )
                                }
                                style={{
                                  width: 28,
                                  height: 28,
                                  flex: '0 0 auto',
                                  border: 'none',
                                  borderRadius: 6,
                                  background: 'transparent',
                                  color: '#dc2626',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: isMobile ? 'grid' : 'block',
                          gap: isMobile ? 14 : 0,
                          paddingTop: isMobile ? 14 : 0,
                          borderTop: '1px solid #e5e7eb',
                        }}
                      >
                        {isFinancialPaymentsLoading ? (
                          <div
                            style={{
                              padding: '18px 2px',
                              color: '#64748b',
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          >
                            Carregando pagamentos...
                          </div>
                        ) : null}
                        {!isFinancialPaymentsLoading &&
                        financialPayments.length === 0 ? (
                          <div
                            style={{
                              padding: '18px 2px',
                              color: '#64748b',
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          >
                            Nenhum pagamento cadastrado.
                          </div>
                        ) : null}
                        <input
                          ref={paymentProofInputRef}
                          type="file"
                          accept={attachmentInputAccept}
                          style={{ display: 'none' }}
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0]
                            const paymentId = paymentProofTargetIdRef.current

                            if (selectedFile && paymentId) {
                              void handleUploadPaymentProof(
                                selectedBusiness.id,
                                paymentId,
                                selectedFile,
                              )
                            } else {
                              paymentProofTargetIdRef.current = null
                            }

                            event.target.value = ''
                          }}
                        />
                        {financialPayments.map((payment) => {
                          if (
                            !isBusinessClosed &&
                            !isMobile &&
                            confirmingDeleteFinancialPaymentId === payment.id
                          ) {
                            return (
                              <div
                                key={payment.id}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: isMobile
                                    ? 'minmax(0, 1fr) auto'
                                    : 'minmax(0, 1fr) 112px',
                                  alignItems: 'center',
                                  gap: 12,
                                  minHeight: 59,
                                  padding: isMobile ? 16 : '12px 2px',
                                  border: isMobile
                                    ? '1px solid #e5e7eb'
                                    : 'none',
                                  borderBottom: isMobile
                                    ? '1px solid #e5e7eb'
                                    : '1px solid #f1f5f9',
                                  borderRadius: isMobile ? 18 : 0,
                                  background: isMobile
                                    ? interactionTheme.clickableCardHoverBackground
                                    : 'transparent',
                                  boxShadow: isMobile
                                    ? '0 12px 26px rgba(15, 23, 42, 0.06)'
                                    : 'none',
                                }}
                              >
                                <span
                                  style={{
                                    color: '#111827',
                                    fontSize: 14,
                                    fontWeight: 700,
                                  }}
                                >
                                  Deseja deletar o pagamento?
                                </span>
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
                                    aria-label="Cancelar exclusão de pagamento"
                                    title="Cancelar"
                                    onClick={() =>
                                      setConfirmingDeleteFinancialPaymentId(
                                        null,
                                      )
                                    }
                                    style={{
                                      height: isMobile ? 32 : 24,
                                      width: isMobile ? 32 : 24,
                                      border: isMobile
                                        ? '1px solid #e5e7eb'
                                        : 'none',
                                      borderRadius: isMobile ? 8 : 0,
                                      background: isMobile
                                        ? '#ffffff'
                                        : 'transparent',
                                      color: '#4b5563',
                                      padding: 0,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <X size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Confirmar exclusão de pagamento"
                                    title="Confirmar exclusão"
                                    disabled={isDeletingFinancialPayment}
                                    onClick={() =>
                                      void handleDeleteNegotiationPayment(
                                        selectedBusiness.id,
                                        payment.id,
                                      )
                                    }
                                    style={{
                                      height: isMobile ? 32 : 24,
                                      width: isMobile ? 32 : 24,
                                      border: isMobile
                                        ? '1px solid #e5e7eb'
                                        : 'none',
                                      borderRadius: isMobile ? 8 : 0,
                                      background: isMobile
                                        ? '#ffffff'
                                        : 'transparent',
                                      color: '#4b5563',
                                      padding: 0,
                                      cursor: isDeletingFinancialPayment
                                        ? 'not-allowed'
                                        : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Check size={16} />
                                  </button>
                                </div>
                              </div>
                            )
                          }

                          const statusColors =
                            financialPaymentStatusColors[payment.status]

                          return (
                            <div
                              key={payment.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile
                                  ? 'minmax(0, 1fr) auto'
                                  : isBusinessClosed
                                    ? 'max-content max-content minmax(112px, 1fr) 24px'
                                    : 'max-content max-content minmax(112px, 1fr) 140px',
                                gridTemplateRows: isMobile
                                  ? 'auto auto auto'
                                  : 'auto auto',
                                columnGap: isMobile ? 12 : 8,
                                rowGap: isMobile ? 14 : 4,
                                minHeight: 59,
                                padding: isMobile ? 16 : '12px 2px',
                                border: isMobile ? '1px solid #f1f5f9' : 'none',
                                borderBottom: isMobile
                                  ? '1px solid #f1f5f9'
                                  : '1px solid #f1f5f9',
                                borderRadius: isMobile ? 18 : 0,
                                background: '#ffffff',
                                boxShadow: isMobile
                                  ? '0 12px 26px rgba(15, 23, 42, 0.06)'
                                  : 'none',
                              }}
                            >
                              <span
                                style={{
                                  gridColumn: 1,
                                  gridRow: isMobile ? 2 : '1 / 3',
                                  alignSelf: 'center',
                                  color: '#111827',
                                  fontSize: isMobile ? 13 : 14,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Vencimento {formatDateOnly(payment.dueDate)}
                              </span>

                              <span
                                style={{
                                  gridColumn: 2,
                                  gridRow: isMobile ? 2 : '1 / 3',
                                  alignSelf: 'center',
                                  justifySelf: isMobile ? 'end' : 'start',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <span
                                  style={getDefaultTagStyle(
                                    statusColors.textColor,
                                    statusColors.background,
                                  )}
                                >
                                  {financialPaymentStatusLabels[payment.status]}
                                </span>
                              </span>

                              <span
                                style={{
                                  gridColumn: isMobile ? 1 : 3,
                                  gridRow: 1,
                                  color: '#111827',
                                  fontSize: isMobile ? 15 : 12,
                                  fontWeight: isMobile ? 700 : 600,
                                  textAlign: isMobile ? 'left' : 'right',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {
                                  financialPaymentMethodLabels[
                                    payment.paymentMethod
                                  ]
                                }
                              </span>

                              <span
                                style={{
                                  gridColumn: isMobile ? 2 : 3,
                                  gridRow: isMobile ? 1 : 2,
                                  color: '#111827',
                                  fontSize: isMobile ? 18 : 14,
                                  fontWeight: isMobile ? 800 : 700,
                                  textAlign: 'right',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatLeadValue(payment.amount)}
                              </span>

                              <div
                                style={{
                                  gridColumn: isMobile ? '1 / -1' : 4,
                                  gridRow: isMobile ? 3 : '1 / 3',
                                  alignSelf: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent:
                                    isMobile &&
                                    confirmingDeleteFinancialPaymentId ===
                                      payment.id
                                      ? 'space-between'
                                      : isMobile
                                        ? 'flex-end'
                                        : 'center',
                                  gap: isMobile ? 8 : 4,
                                  paddingTop: isMobile ? 12 : 0,
                                  borderTop: isMobile
                                    ? '1px solid #f1f5f9'
                                    : 'none',
                                }}
                              >
                                {isMobile &&
                                !isBusinessClosed &&
                                confirmingDeleteFinancialPaymentId ===
                                  payment.id ? (
                                  <>
                                    <span
                                      style={{
                                        color: '#111827',
                                        fontSize: 13,
                                        fontWeight: 700,
                                      }}
                                    >
                                      Deseja deletar o pagamento?
                                    </span>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flexShrink: 0,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        aria-label="Cancelar exclusão de pagamento"
                                        title="Cancelar"
                                        onClick={() =>
                                          setConfirmingDeleteFinancialPaymentId(
                                            null,
                                          )
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
                                        <X size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Confirmar exclusão de pagamento"
                                        title="Confirmar exclusão"
                                        disabled={isDeletingFinancialPayment}
                                        onClick={() =>
                                          void handleDeleteNegotiationPayment(
                                            selectedBusiness.id,
                                            payment.id,
                                          )
                                        }
                                        style={{
                                          height: 34,
                                          width: 34,
                                          border: '1px solid #e5e7eb',
                                          borderRadius: 8,
                                          background: '#ffffff',
                                          color: '#4b5563',
                                          padding: 0,
                                          cursor: isDeletingFinancialPayment
                                            ? 'not-allowed'
                                            : 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <Check size={16} />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      aria-label="Editar pagamento"
                                      title="Editar pagamento"
                                      onClick={() => {
                                        setIsCreatingFinancialPayment(false)
                                        setConfirmingDeleteFinancialPaymentId(
                                          null,
                                        )
                                        setFinancialPaymentDraft({
                                          amount: formatLeadValueInputField(
                                            payment.amount,
                                          ),
                                          paymentMethod: payment.paymentMethod,
                                          dueDate: payment.dueDate.slice(0, 10),
                                          installmentCount: '1',
                                        })
                                        setConfirmingDeleteBusinessAttachmentId(
                                          null,
                                        )
                                        setEditingFinancialPaymentId(payment.id)
                                      }}
                                      style={{
                                        height: isMobile ? 34 : 24,
                                        width: isMobile ? 34 : 24,
                                        border: isMobile
                                          ? '1px solid #e5e7eb'
                                          : 'none',
                                        borderRadius: isMobile ? 8 : 0,
                                        background: isMobile
                                          ? '#ffffff'
                                          : 'transparent',
                                        color: '#4b5563',
                                        padding: 0,
                                        cursor: 'pointer',
                                        display: isBusinessClosed
                                          ? 'none'
                                          : 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={
                                        payment.proofAttachmentId
                                          ? 'Visualizar comprovante'
                                          : 'Anexar comprovante'
                                      }
                                      title={
                                        payment.proofAttachmentId
                                          ? 'Visualizar comprovante'
                                          : 'Anexar comprovante'
                                      }
                                      disabled={
                                        uploadingPaymentProofId ===
                                          payment.id ||
                                        (payment.proofAttachmentId !== null &&
                                          downloadingBusinessAttachmentId ===
                                            payment.proofAttachmentId)
                                      }
                                      onClick={() => {
                                        if (payment.proofAttachmentId) {
                                          void handleDownloadBusinessAttachment(
                                            payment.proofAttachmentId,
                                          )
                                          return
                                        }

                                        paymentProofTargetIdRef.current =
                                          payment.id
                                        paymentProofInputRef.current?.click()
                                      }}
                                      style={{
                                        height: isMobile ? 34 : 24,
                                        width: isMobile ? 34 : 24,
                                        border: isMobile
                                          ? payment.proofAttachmentId
                                            ? '1px solid #2563eb'
                                            : '1px solid #e5e7eb'
                                          : 'none',
                                        borderRadius: isMobile ? 8 : 0,
                                        background: isMobile
                                          ? payment.proofAttachmentId
                                            ? '#eff6ff'
                                            : '#ffffff'
                                          : 'transparent',
                                        color: payment.proofAttachmentId
                                          ? '#2563eb'
                                          : '#4b5563',
                                        padding: 0,
                                        cursor:
                                          uploadingPaymentProofId ===
                                            payment.id ||
                                          (payment.proofAttachmentId !== null &&
                                            downloadingBusinessAttachmentId ===
                                              payment.proofAttachmentId)
                                            ? 'not-allowed'
                                            : 'pointer',
                                        opacity:
                                          uploadingPaymentProofId === payment.id
                                            ? 0.6
                                            : 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {payment.proofAttachmentId ? (
                                        <Eye size={14} />
                                      ) : (
                                        <Paperclip size={14} />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Excluir pagamento"
                                      title="Excluir pagamento"
                                      onClick={() => {
                                        setIsCreatingFinancialPayment(false)
                                        setEditingFinancialPaymentId(null)
                                        setFinancialPaymentDraft(
                                          emptyFinancialPaymentDraft,
                                        )
                                        setConfirmingDeleteFinancialPaymentId(
                                          payment.id,
                                        )
                                      }}
                                      style={{
                                        height: isMobile ? 34 : 24,
                                        width: isMobile ? 34 : 24,
                                        border: isMobile
                                          ? '1px solid #e5e7eb'
                                          : 'none',
                                        borderRadius: isMobile ? 8 : 0,
                                        background: isMobile
                                          ? '#ffffff'
                                          : 'transparent',
                                        color: '#4b5563',
                                        padding: 0,
                                        cursor: 'pointer',
                                        display: isBusinessClosed
                                          ? 'none'
                                          : 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Cancelar pagamento"
                                      title="Cancelar pagamento"
                                      disabled={
                                        updatingFinancialPaymentStatusId ===
                                        payment.id
                                      }
                                      onClick={() =>
                                        void handleUpdateNegotiationPaymentStatus(
                                          selectedBusiness.id,
                                          payment.id,
                                          payment.status === 'CANCELED'
                                            ? 'PENDING'
                                            : 'CANCELED',
                                        )
                                      }
                                      style={{
                                        height: isMobile ? 34 : 24,
                                        width: isMobile ? 34 : 24,
                                        border: isMobile
                                          ? payment.status === 'CANCELED'
                                            ? '1px solid #dc2626'
                                            : '1px solid #e5e7eb'
                                          : 'none',
                                        borderRadius: isMobile ? 8 : 0,
                                        background: isMobile
                                          ? payment.status === 'CANCELED'
                                            ? '#fef2f2'
                                            : '#ffffff'
                                          : 'transparent',
                                        color:
                                          payment.status === 'CANCELED'
                                            ? '#dc2626'
                                            : '#4b5563',
                                        padding: 0,
                                        cursor:
                                          updatingFinancialPaymentStatusId ===
                                          payment.id
                                            ? 'not-allowed'
                                            : 'pointer',
                                        display: isBusinessClosed
                                          ? 'none'
                                          : 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <X size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Confirmar pagamento"
                                      title="Confirmar pagamento"
                                      disabled={
                                        updatingFinancialPaymentStatusId ===
                                        payment.id
                                      }
                                      onClick={() =>
                                        void handleUpdateNegotiationPaymentStatus(
                                          selectedBusiness.id,
                                          payment.id,
                                          payment.status === 'PAID'
                                            ? 'PENDING'
                                            : 'PAID',
                                        )
                                      }
                                      style={{
                                        height: isMobile ? 34 : 24,
                                        width: isMobile ? 34 : 24,
                                        border: isMobile
                                          ? payment.status === 'PAID'
                                            ? '1px solid #16a34a'
                                            : '1px solid #e5e7eb'
                                          : 'none',
                                        borderRadius: isMobile ? 8 : 0,
                                        background: isMobile
                                          ? payment.status === 'PAID'
                                            ? '#f0fdf4'
                                            : '#ffffff'
                                          : 'transparent',
                                        color:
                                          payment.status === 'PAID'
                                            ? '#16a34a'
                                            : '#4b5563',
                                        padding: 0,
                                        cursor:
                                          updatingFinancialPaymentStatusId ===
                                          payment.id
                                            ? 'not-allowed'
                                            : 'pointer',
                                        display: isBusinessClosed
                                          ? 'none'
                                          : 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Check size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </article>
            ) : null}

            {!isEditingBusiness && shouldShowDeleteBusinessConfirmation ? (
              <article
                style={{
                  border: '1px solid #fecaca',
                  borderRadius: 16,
                  padding: 24,
                  background: '#fff7f7',
                  display: 'grid',
                  gap: 18,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: '#b91c1c',
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  Deseja deletar esse negócio?
                </h3>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingBusinessDelete(false)
                      setIsConfirmingBusinessClose(false)
                    }}
                    style={{
                      minWidth: 96,
                      height: 34,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBusinessId) return

                      void (async () => {
                        try {
                          await WebhookService.deleteNegotiation(
                            selectedBusinessId,
                          )
                          await refreshLeadNegotiations(leadId ?? '')
                          onLeadUpdated?.()
                          setSelectedBusinessId(null)
                          setIsBusinessActionsOpen(false)
                          setIsConfirmingBusinessDelete(false)
                          setIsConfirmingBusinessClose(false)
                          setIsEditingBusiness(false)
                          setActiveBusinessTab('informacoes')
                          setBusinessesError(null)
                        } catch (exception: unknown) {
                          const message =
                            exception instanceof Error
                              ? exception.message
                              : 'Falha ao deletar negócio.'
                          setBusinessesError(message)
                        }
                      })()
                    }}
                    style={{
                      minWidth: 96,
                      height: 34,
                      border: 'none',
                      borderRadius: 8,
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Deletar
                  </button>
                </div>
              </article>
            ) : null}

            {shouldShowBusinessInformationTab &&
            !shouldShowDeleteBusinessConfirmation &&
            !shouldShowCloseBusinessConfirmation ? (
              isEditingBusiness ? (
                <article
                  style={{
                    border: 'none',
                    borderRadius: 0,
                    padding: 0,
                    background: 'transparent',
                    display: 'grid',
                    marginTop: 0,
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingRight: isMobile ? 2 : 6,
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      marginTop: 0,
                      display: 'grid',
                      gap: 16,
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <span style={businessEditFieldLabelStyle}>Nome</span>
                      <input
                        type="text"
                        value={businessDetailDraft?.title ?? ''}
                        onChange={(event) =>
                          setBusinessDetailDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  title: event.target.value,
                                }
                              : current,
                          )
                        }
                        autoComplete="new-password"
                        style={businessEditInputStyle}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <span style={businessEditFieldLabelStyle}>Tipo</span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={selectedBusinessType}
                          onChange={(event) =>
                            setBusinessDetailDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    negotiationType: event.target.value as
                                      | ''
                                      | NegotiationType,
                                  }
                                : current,
                            )
                          }
                          style={{
                            ...businessEditSelectStyle,
                            color: selectedBusinessType ? '#111827' : '#6b7280',
                          }}
                        >
                          <option value="">Selecione</option>
                          <option value="service">Serviço</option>
                          <option value="product">Produto</option>
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
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <span style={businessEditFieldLabelStyle}>Etapa</span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={
                            businessDetailDraft?.stage ?? selectedBusiness.stage
                          }
                          onChange={(event) =>
                            setBusinessDetailDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    stage: event.target.value as LeadStage,
                                  }
                                : current,
                            )
                          }
                          style={businessEditSelectStyle}
                        >
                          {leadStageOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {getLeadStageLabel(stage)}
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
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <span style={businessEditFieldLabelStyle}>
                        Temperatura
                      </span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={
                            businessDetailDraft?.temperature ??
                            selectedBusiness.temperature ??
                            ''
                          }
                          onChange={(event) =>
                            setBusinessDetailDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    temperature: event.target.value as
                                      | ''
                                      | NegotiationTemperature,
                                  }
                                : current,
                            )
                          }
                          style={businessEditSelectStyle}
                        >
                          <option value="">Sem temperatura</option>
                          <option value="hot">Quente</option>
                          <option value="warm">Morno</option>
                          <option value="cold">Frio</option>
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
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <span style={businessEditFieldLabelStyle}>Valor</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={businessDetailDraft?.value ?? ''}
                        onChange={(event) =>
                          setBusinessDetailDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  value: sanitizeLeadValueInput(
                                    event.target.value,
                                  ),
                                }
                              : current,
                          )
                        }
                        autoComplete="new-password"
                        style={moneyInputStyle}
                      />
                    </div>
                  </div>
                </article>
              ) : (
                <>
                  <section
                    style={{
                      display: 'grid',
                      gap: 8,
                      width: '100%',
                      minWidth: 0,
                      padding: isMobile ? '16px 16px 6px' : '18px 18px 6px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: '#16a34a',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <CircleUserRound size={15} />
                      </span>
                      <h3
                        style={{
                          margin: 0,
                          color: '#0f172a',
                          fontSize: 30 / 2,
                          fontWeight: 700,
                        }}
                      >
                        Visão Geral
                      </h3>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <User size={14} /> Lead
                        </span>
                        <span
                          style={{
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {leadData?.name?.trim() || '-'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <CircleDollarSign size={14} /> Lucro Estimado
                        </span>
                        <span
                          style={{
                            color: '#15803d',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {formatLeadValue(financialProfit.toFixed(2))}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <CircleDollarSign size={14} /> Valor Recebido
                        </span>
                        <span
                          style={{
                            color: '#15803d',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {formatLeadValue(financialTotalReceived.toFixed(2))}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <BriefcaseBusiness size={14} /> Tipo
                        </span>
                        <BusinessOverviewQuickSelect
                          ariaLabel="Alterar tipo do negócio"
                          background={
                            selectedBusinessTypeTagPresentation.background
                          }
                          color={selectedBusinessTypeTagPresentation.textColor}
                          disabled={updatingBusinessOverviewField !== null}
                          emptyDisplayLabel="-"
                          value={selectedBusinessType}
                          options={[
                            { value: '', label: 'Sem tipo' },
                            { value: 'service', label: 'Serviço' },
                            { value: 'product', label: 'Produto' },
                          ]}
                          onChange={(value) =>
                            void handleBusinessOverviewFieldChange(
                              'negotiationType',
                              value,
                            )
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <TrendingUp size={14} /> Etapa
                        </span>
                        <BusinessOverviewQuickSelect
                          ariaLabel="Alterar etapa do negócio"
                          background="#dbeafe"
                          color="#2563eb"
                          disabled={updatingBusinessOverviewField !== null}
                          value={selectedBusinessStage}
                          options={Object.entries(leadStageLabelMap).map(
                            ([value, label]) => ({ value, label }),
                          )}
                          onChange={(value) =>
                            void handleBusinessOverviewFieldChange(
                              'stage',
                              value,
                            )
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <BadgeCheck size={14} /> Status
                        </span>
                        <BusinessOverviewQuickSelect
                          ariaLabel="Alterar status do negócio"
                          background={businessStatusTag.background}
                          color={businessStatusTag.textColor}
                          disabled={updatingBusinessOverviewField !== null}
                          value={selectedBusiness.status}
                          options={[
                            { value: 'OPEN', label: 'Em Aberto' },
                            { value: 'WON', label: 'Ganho' },
                            { value: 'LOST', label: 'Perdido' },
                          ]}
                          onChange={(value) =>
                            void handleBusinessOverviewFieldChange(
                              'status',
                              value,
                            )
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Flame size={14} /> Temperatura
                        </span>
                        <BusinessOverviewQuickSelect
                          ariaLabel="Alterar temperatura do negócio"
                          background={`${temperatureTagPresentation.textColor}44`}
                          color={temperatureTagPresentation.textColor}
                          disabled={updatingBusinessOverviewField !== null}
                          emptyDisplayLabel="-"
                          value={selectedBusinessTemperature}
                          options={[
                            { value: '', label: 'Sem temperatura' },
                            { value: 'hot', label: 'Quente' },
                            { value: 'warm', label: 'Morno' },
                            { value: 'cold', label: 'Frio' },
                          ]}
                          onChange={(value) =>
                            void handleBusinessOverviewFieldChange(
                              'temperature',
                              value,
                            )
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Compass size={14} /> Origem
                        </span>
                        {businessLeadSourceTagPresentation.label === '-' ? (
                          <span
                            style={{
                              color: '#111827',
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            -
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                businessLeadSourceTagPresentation.textColor,
                              whiteSpace: 'nowrap',
                              background:
                                businessLeadSourceTagPresentation.backgroundColor,
                              border: `1px solid ${businessLeadSourceTagPresentation.borderColor}`,
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 10px',
                              lineHeight: 1.1,
                              width: 'fit-content',
                            }}
                          >
                            {businessLeadSourceTagPresentation.icon ? (
                              <span style={tagIconStyle}>
                                {businessLeadSourceTagPresentation.icon}
                              </span>
                            ) : null}
                            <span style={tagContentStyle}>
                              {businessLeadSourceTagPresentation.label}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  <section
                    style={{
                      display: 'grid',
                      gap: 8,
                      width: '100%',
                      minWidth: 0,
                      marginTop: 16,
                      padding: isMobile ? '16px 16px 6px' : '18px 18px 6px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: '#16a34a',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <CalendarClock size={15} />
                      </span>
                      <h3
                        style={{
                          margin: 0,
                          color: '#0f172a',
                          fontSize: 30 / 2,
                          fontWeight: 700,
                        }}
                      >
                        Histórico
                      </h3>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <CalendarClock size={14} /> Criado em
                        </span>
                        <span
                          style={{
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {selectedBusinessCreatedAtLabel}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Clock4 size={14} /> Atualizado em
                        </span>
                        <span
                          style={{
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {selectedBusinessUpdatedAtLabel}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 2px',
                        }}
                      >
                        <span
                          style={{
                            color: '#475569',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <CalendarDays size={14} /> Data de fechamento
                        </span>
                        <span
                          style={{
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {selectedBusinessClosedAtLabel}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )
            ) : null}

            {!isEditingBusiness &&
            !shouldShowDeleteBusinessConfirmation &&
            activeBusinessTab === 'notas' ? (
              <article
                style={{
                  border: 'none',
                  borderRadius: 0,
                  padding: 0,
                  background: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  height: '100%',
                  minHeight: 0,
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isMobile && isCreatingBusinessNote ? (
                  <button
                    type="button"
                    aria-label="Fechar criação de nota"
                    onClick={() => {
                      const noteToRestore = editingBusinessNoteIndex
                      setIsCreatingBusinessNote(false)
                      setViewingBusinessNoteIndex(noteToRestore)
                      setEditingBusinessNoteIndex(null)
                      setIsConfirmingBusinessNoteDelete(false)
                      setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                      setBusinessesError(null)
                    }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      border: 'none',
                      background: 'rgba(15, 23, 42, 0.18)',
                      zIndex: 40,
                      cursor: 'default',
                    }}
                  />
                ) : null}

                {!isCreatingBusinessNote && !viewedBusinessNote ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingBusinessNote(true)
                          setViewingBusinessNoteIndex(null)
                          setIsConfirmingBusinessNoteDelete(false)
                          setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                          setBusinessesError(null)
                        }}
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
                          lineHeight: 1.2,
                        }}
                      >
                        + Adicionar nota
                      </button>

                      <span
                        style={{
                          color: '#6b7280',
                          fontSize: 13,
                          padding: '0 8px',
                        }}
                      >
                        {selectedBusiness.notes?.length ?? 0} nota
                        {(selectedBusiness.notes?.length ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        minHeight: 0,
                        flex: 1,
                        overflowY: isMobile
                          ? isCreatingBusinessNote
                            ? 'hidden'
                            : 'visible'
                          : 'auto',
                      }}
                    >
                      {selectedBusinessNotes.length === 0 ? (
                        <p
                          style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}
                        >
                          Nenhuma nota cadastrada.
                        </p>
                      ) : (
                        selectedBusinessNotes.map(
                          ({ note, originalIndex }, noteIndex) => (
                            <article
                              key={`${selectedBusiness.id}-note-${noteIndex}`}
                              onClick={() => {
                                setViewingBusinessNoteIndex(originalIndex)
                                setIsConfirmingBusinessNoteDelete(false)
                                setBusinessesError(null)
                              }}
                              onMouseEnter={() =>
                                setHoveredBusinessNoteIndex(originalIndex)
                              }
                              onMouseLeave={() =>
                                setHoveredBusinessNoteIndex(null)
                              }
                              style={{
                                position: 'relative',
                                width: '100%',
                                border:
                                  hoveredBusinessNoteIndex === originalIndex
                                    ? '1px solid #bfd6cb'
                                    : '1px solid #dbe3ef',
                                borderRadius: 18,
                                background:
                                  hoveredBusinessNoteIndex === originalIndex
                                    ? '#f8fffb'
                                    : '#ffffff',
                                padding: '10px 28px',
                                minHeight: 90,
                                boxSizing: 'border-box',
                                display: 'grid',
                                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                                alignItems: 'center',
                                columnGap: 20,
                                overflow: 'hidden',
                                boxShadow:
                                  hoveredBusinessNoteIndex === originalIndex
                                    ? '0 12px 28px rgba(15, 23, 42, 0.09)'
                                    : '0 8px 24px rgba(15, 23, 42, 0.05)',
                                cursor: 'pointer',
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: 0,
                                  height: 0,
                                  borderTop: '52px solid #2ecc71',
                                  borderRight: '52px solid transparent',
                                }}
                              />

                              <div
                                style={{
                                  width: 46,
                                  height: 46,
                                  borderRadius: '50%',
                                  background: '#eafaf0',
                                  color: '#16a34a',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  alignSelf: 'center',
                                }}
                              >
                                <FileText size={18} />
                              </div>

                              <div
                                style={{
                                  minWidth: 0,
                                  display: 'grid',
                                  gap: 4,
                                  paddingTop: 2,
                                  alignSelf: 'center',
                                }}
                              >
                                <span
                                  style={{
                                    color: '#0f172a',
                                    fontSize: 17,
                                    fontWeight: 800,
                                    lineHeight: 1.2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {note.title?.trim() || 'Destacada'}
                                </span>

                                <span
                                  style={{
                                    color: '#64748b',
                                    fontSize: 15,
                                    fontWeight: 500,
                                    lineHeight: 1.35,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '70%',
                                    maxWidth: '70%',
                                  }}
                                >
                                  {formatBusinessNotePreview(note.description)}
                                </span>
                              </div>

                              <span
                                style={{
                                  color: '#111827',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap',
                                  justifySelf: 'end',
                                  alignSelf: 'start',
                                }}
                              >
                                {formatDateOnly(note.createdAt) || '-'}
                              </span>
                            </article>
                          ),
                        )
                      )}
                    </div>
                  </>
                ) : null}

                {isCreatingBusinessNote ? (
                  <section
                    style={{
                      display: 'grid',
                      alignContent: 'start',
                      gap: 16,
                      height: isMobile ? 'auto' : '100%',
                      minHeight: isMobile ? '72vh' : 0,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      paddingRight: isMobile ? 2 : 6,
                      boxSizing: 'border-box',
                      padding: isMobile ? '22px 18px 28px' : 0,
                      overscrollBehavior: 'contain',
                      WebkitOverflowScrolling: 'touch',
                      touchAction: 'pan-y',
                      position: isMobile ? 'fixed' : 'relative',
                      left: isMobile ? 0 : 'auto',
                      right: isMobile ? 0 : 'auto',
                      bottom: isMobile ? 0 : 'auto',
                      top: isMobile ? 'auto' : 'auto',
                      maxHeight: isMobile ? '86vh' : 'none',
                      zIndex: isMobile ? 45 : 'auto',
                      borderRadius: isMobile ? '22px 22px 0 0' : 0,
                      background: isMobile ? '#ffffff' : 'transparent',
                      boxShadow: isMobile
                        ? '0 -18px 36px rgba(15, 23, 42, 0.18)'
                        : 'none',
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    {isMobile ? (
                      <div
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          background: '#ffffff',
                          paddingBottom: 6,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: '#0f172a',
                            fontSize: 24,
                            fontWeight: 700,
                          }}
                        >
                          {editingBusinessNoteIndex === null
                            ? 'Nova nota'
                            : 'Editar nota'}
                        </h3>

                        <button
                          type="button"
                          onClick={() => {
                            const noteToRestore = editingBusinessNoteIndex
                            setIsCreatingBusinessNote(false)
                            setViewingBusinessNoteIndex(noteToRestore)
                            setEditingBusinessNoteIndex(null)
                            setIsConfirmingBusinessNoteDelete(false)
                            setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                            setBusinessesError(null)
                          }}
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
                            lineHeight: 1,
                          }}
                          aria-label="Fechar criação de nota"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
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
                          {editingBusinessNoteIndex === null
                            ? 'Nova nota'
                            : 'Editar Nota'}
                        </h2>

                        <button
                          type="button"
                          onClick={() => {
                            const noteToRestore = editingBusinessNoteIndex
                            setIsCreatingBusinessNote(false)
                            setViewingBusinessNoteIndex(noteToRestore)
                            setEditingBusinessNoteIndex(null)
                            setIsConfirmingBusinessNoteDelete(false)
                            setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                            setBusinessesError(null)
                          }}
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
                            lineHeight: 1,
                          }}
                          aria-label="Fechar criação de nota"
                        >
                          X
                        </button>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        alignContent: 'start',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'grid', gap: 8 }}>
                        <label
                          style={{
                            color: '#1f2937',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Negócio
                        </label>
                        <input
                          type="text"
                          value={
                            selectedBusiness.title?.trim() || 'Negócio sem nome'
                          }
                          readOnly
                          disabled
                          style={{
                            height: 42,
                            border: '1px solid #d7dce4',
                            borderRadius: 10,
                            padding: '0 14px',
                            color: '#64748b',
                            fontSize: 14,
                            boxSizing: 'border-box',
                            background: '#f8fafc',
                            cursor: 'not-allowed',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 8 }}>
                        <label
                          style={{
                            color: '#1f2937',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Título
                        </label>
                        <input
                          type="text"
                          placeholder="Título da nota"
                          autoComplete="off"
                          name="business-note-title"
                          value={newBusinessNoteDraft.title}
                          onChange={(event) =>
                            setNewBusinessNoteDraft((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          style={{
                            height: isMobile ? 46 : 42,
                            border: '1px solid #d7dce4',
                            borderRadius: 10,
                            padding: '0 14px',
                            color: '#111827',
                            fontSize: isMobile ? 17 / 1.2 : 14,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 8 }}>
                        <label
                          style={{
                            color: '#1f2937',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Descrição
                        </label>
                        <textarea
                          placeholder="Escreva a descrição da nota..."
                          value={newBusinessNoteDraft.description}
                          onChange={(event) =>
                            setNewBusinessNoteDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            minHeight: 132,
                            border: '1px solid #d7dce4',
                            borderRadius: 10,
                            padding: '12px 14px',
                            color: '#111827',
                            fontSize: isMobile ? 17 / 1.2 : 14,
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 12,
                          marginTop: 2,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const noteToRestore = editingBusinessNoteIndex
                            setIsCreatingBusinessNote(false)
                            setViewingBusinessNoteIndex(noteToRestore)
                            setEditingBusinessNoteIndex(null)
                            setIsConfirmingBusinessNoteDelete(false)
                            setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                            setBusinessesError(null)
                          }}
                          style={{
                            minWidth: 120,
                            height: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trimmedTitle =
                              newBusinessNoteDraft.title.trim()
                            const trimmedDescription =
                              newBusinessNoteDraft.description.trim()

                            if (
                              !selectedBusinessId ||
                              !trimmedTitle ||
                              !trimmedDescription
                            ) {
                              return
                            }

                            const currentNotes = selectedBusiness.notes ?? []
                            const isEditingExistingNote =
                              editingBusinessNoteIndex !== null
                            const payload: UpdateNegotiationPayload = {
                              notes: isEditingExistingNote
                                ? currentNotes.map((note, index) =>
                                    index === editingBusinessNoteIndex
                                      ? {
                                          title: trimmedTitle,
                                          description: trimmedDescription,
                                          createdAt:
                                            note.createdAt ??
                                            new Date().toISOString(),
                                        }
                                      : note,
                                  )
                                : [
                                    ...currentNotes,
                                    {
                                      title: trimmedTitle,
                                      description: trimmedDescription,
                                      createdAt: new Date().toISOString(),
                                    },
                                  ],
                            }

                            void (async () => {
                              try {
                                await WebhookService.updateNegotiation(
                                  selectedBusinessId,
                                  payload,
                                )
                                await refreshLeadNegotiations(leadId ?? '')
                                onLeadUpdated?.()
                                const noteToRestore = editingBusinessNoteIndex
                                setIsCreatingBusinessNote(false)
                                setViewingBusinessNoteIndex(noteToRestore)
                                setEditingBusinessNoteIndex(null)
                                setIsConfirmingBusinessNoteDelete(false)
                                setNewBusinessNoteDraft(
                                  initialNewBusinessNoteDraft,
                                )
                                setBusinessesError(null)
                              } catch (exception: unknown) {
                                const message =
                                  exception instanceof Error
                                    ? exception.message
                                    : isEditingExistingNote
                                      ? 'Falha ao editar nota.'
                                      : 'Falha ao criar nota.'
                                setBusinessesError(message)
                              }
                            })()
                          }}
                          disabled={
                            !newBusinessNoteDraft.title.trim() ||
                            !newBusinessNoteDraft.description.trim()
                          }
                          style={{
                            minWidth: 120,
                            height: 42,
                            border: 'none',
                            borderRadius: 8,
                            background: '#1f7a4d',
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor:
                              newBusinessNoteDraft.title.trim() &&
                              newBusinessNoteDraft.description.trim()
                                ? 'pointer'
                                : 'not-allowed',
                          }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {!isCreatingBusinessNote && viewedBusinessNote ? (
                  <section
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      flex: 1,
                      minHeight: 0,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
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
                        Nota
                      </h2>

                      <button
                        type="button"
                        onClick={() => {
                          setViewingBusinessNoteIndex(null)
                          setIsConfirmingBusinessNoteDelete(false)
                        }}
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
                          lineHeight: 1,
                        }}
                        aria-label="Fechar visualização da nota"
                      >
                        X
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        alignContent: 'start',
                        gap: 16,
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: isMobile ? 0 : 6,
                        boxSizing: 'border-box',
                      }}
                    >
                      {isConfirmingBusinessNoteDelete ? (
                        <article
                          style={{
                            border: '1px solid #fecaca',
                            borderRadius: 16,
                            padding: 24,
                            background: '#fff7f7',
                            display: 'grid',
                            gap: 18,
                            marginTop: 2,
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              color: '#b91c1c',
                              fontSize: 15,
                              fontWeight: 800,
                            }}
                          >
                            Deseja deletar essa nota?
                          </h3>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 12,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setIsConfirmingBusinessNoteDelete(false)
                              }
                              style={{
                                minWidth: 96,
                                height: 34,
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                background: '#ffffff',
                                color: '#0f172a',
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  viewingBusinessNoteIndex === null ||
                                  !selectedBusinessId
                                ) {
                                  return
                                }

                                const currentNotes =
                                  selectedBusiness.notes ?? []
                                const payload: UpdateNegotiationPayload = {
                                  notes: currentNotes.filter(
                                    (_, index) =>
                                      index !== viewingBusinessNoteIndex,
                                  ),
                                }

                                void (async () => {
                                  try {
                                    await WebhookService.updateNegotiation(
                                      selectedBusinessId,
                                      payload,
                                    )
                                    await refreshLeadNegotiations(leadId ?? '')
                                    onLeadUpdated?.()
                                    setViewingBusinessNoteIndex(null)
                                    setEditingBusinessNoteIndex(null)
                                    setIsCreatingBusinessNote(false)
                                    setNewBusinessNoteDraft(
                                      initialNewBusinessNoteDraft,
                                    )
                                    setIsConfirmingBusinessNoteDelete(false)
                                    setBusinessesError(null)
                                  } catch (exception: unknown) {
                                    const message =
                                      exception instanceof Error
                                        ? exception.message
                                        : 'Falha ao deletar nota.'
                                    setBusinessesError(message)
                                  }
                                })()
                              }}
                              style={{
                                minWidth: 96,
                                height: 34,
                                border: 'none',
                                borderRadius: 8,
                                background: '#dc2626',
                                color: '#ffffff',
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Deletar
                            </button>
                          </div>
                        </article>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gap: 8 }}>
                            <label
                              style={{
                                color: '#1f2937',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              Negócio
                            </label>
                            <input
                              type="text"
                              value={
                                selectedBusiness.title?.trim() ||
                                'Negócio sem nome'
                              }
                              readOnly
                              disabled
                              style={{
                                height: 42,
                                border: '1px solid #d7dce4',
                                borderRadius: 10,
                                padding: '0 14px',
                                color: '#64748b',
                                fontSize: 14,
                                boxSizing: 'border-box',
                                background: '#f8fafc',
                                cursor: 'not-allowed',
                              }}
                            />
                          </div>

                          <div style={{ display: 'grid', gap: 8 }}>
                            <label
                              style={{
                                color: '#1f2937',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              Título
                            </label>
                            <div
                              style={{
                                minHeight: 42,
                                border: '1px solid #d7dce4',
                                borderRadius: 10,
                                padding: '10px 14px',
                                background: '#f8fafc',
                                color: '#111827',
                                fontSize: 14,
                                lineHeight: 1.4,
                                display: 'flex',
                                alignItems: 'center',
                                boxSizing: 'border-box',
                              }}
                            >
                              {viewedBusinessNote.title?.trim() || '-'}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: 8 }}>
                            <label
                              style={{
                                color: '#1f2937',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              Descrição
                            </label>
                            <div
                              style={{
                                width: '100%',
                                minHeight: 132,
                                border: '1px solid #d7dce4',
                                borderRadius: 10,
                                padding: '12px 14px',
                                background: '#f8fafc',
                                color: '#111827',
                                fontSize: 14,
                                lineHeight: 1.5,
                                whiteSpace: 'pre-line',
                                boxSizing: 'border-box',
                              }}
                            >
                              {viewedBusinessNote.description?.trim() || '-'}
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 12,
                              marginTop: 2,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsConfirmingBusinessNoteDelete(true)
                                setBusinessesError(null)
                              }}
                              style={{
                                minWidth: 120,
                                height: 42,
                                border: 'none',
                                borderRadius: 8,
                                background: '#dc2626',
                                color: '#ffffff',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Excluir
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (viewingBusinessNoteIndex === null) {
                                  return
                                }

                                setEditingBusinessNoteIndex(
                                  viewingBusinessNoteIndex,
                                )
                                setNewBusinessNoteDraft({
                                  title: viewedBusinessNote.title ?? '',
                                  description:
                                    viewedBusinessNote.description ?? '',
                                })
                                setViewingBusinessNoteIndex(null)
                                setIsCreatingBusinessNote(true)
                                setIsConfirmingBusinessNoteDelete(false)
                                setBusinessesError(null)
                              }}
                              style={{
                                minWidth: 120,
                                height: 42,
                                border: 'none',
                                borderRadius: 8,
                                background: '#1f7a4d',
                                color: '#ffffff',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                ) : null}
              </article>
            ) : null}
          </div>
        </section>
      )
    }

    const canCreateBusiness = Boolean(newBusinessDraft.title.trim() && leadId)
    const handleCreateBusiness = async () => {
      if (!leadId || !newBusinessDraft.title.trim()) {
        return
      }

      const saleAmount = parseLeadValueInput(newBusinessDraft.value)
      const payload: CreateNegotiationPayload = {
        leadId,
        title: newBusinessDraft.title || undefined,
        stage: newBusinessDraft.stage,
        status: 'OPEN',
        temperature: newBusinessDraft.temperature || undefined,
        negotiationType: newBusinessDraft.negotiationType || undefined,
        notes: newBusinessDraft.notes.trim()
          ? [
              {
                title: 'Nota',
                description: newBusinessDraft.notes.trim(),
                createdAt: new Date().toISOString(),
              },
            ]
          : undefined,
      }

      try {
        const createdBusiness = await WebhookService.createNegotiation(payload)
        if (saleAmount !== null) {
          await WebhookService.createNegotiationFinancial(createdBusiness.id, {
            saleAmount,
          })
        }
        await refreshLeadNegotiations(leadId)
        onLeadUpdated?.()
        setIsCreatingBusiness(false)
        setNewBusinessDraft(initialNewBusinessDraft)
        setBusinessesError(null)
      } catch (exception: unknown) {
        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao criar negócio.'
        setBusinessesError(message)
      }
    }

    const businessCreateContent = (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          height: isMobile ? 'auto' : '100%',
          minHeight: isMobile ? 'auto' : 0,
          overflow: 'hidden',
          padding: isMobile ? '22px 18px 28px' : 0,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <h2
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Novo negócio
            </h2>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              aria-label="Salvar negócio"
              title="Salvar negócio"
              onClick={() => void handleCreateBusiness()}
              disabled={!canCreateBusiness}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: canCreateBusiness ? '#6b7280' : '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: canCreateBusiness ? 'pointer' : 'not-allowed',
              }}
            >
              <Save size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingBusiness(false)
                setNewBusinessDraft(initialNewBusinessDraft)
                setBusinessesError(null)
              }}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: '#6b7280',
                padding: 0,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1,
              }}
              aria-label="Fechar criação de negócio"
              title="Fechar criação"
            >
              X
            </button>
          </div>
        </div>

        {businessesError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p>
        ) : null}

        <article
          style={{
            border: 'none',
            borderRadius: 0,
            padding: 0,
            background: 'transparent',
            display: 'grid',
            gap: 18,
            maxWidth: isMobile ? 'none' : 760,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: isMobile ? 2 : 6,
            boxSizing: 'border-box',
          }}
        >
          {isMobile ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: 17 / 1.3,
                    fontWeight: 700,
                  }}
                >
                  Tipo
                </label>
                <select
                  value={newBusinessDraft.negotiationType}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      negotiationType: event.target.value as
                        | ''
                        | NegotiationType,
                    }))
                  }
                  style={{
                    width: '100%',
                    height: 46,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: newBusinessDraft.negotiationType
                      ? '#111827'
                      : '#6b7280',
                    fontSize: 17 / 1.2,
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="">Selecione</option>
                  <option value="service">Serviço</option>
                  <option value="product">Produto</option>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: 17 / 1.3,
                    fontWeight: 700,
                  }}
                >
                  Nome
                </label>
                <input
                  type="text"
                  placeholder="Nome"
                  autoComplete="off"
                  name="business-title"
                  value={newBusinessDraft.title}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  style={{
                    height: 46,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: 17 / 1.2,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: 17 / 1.3,
                    fontWeight: 700,
                  }}
                >
                  Etapa
                </label>
                <select
                  value={newBusinessDraft.stage}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      stage: event.target.value as LeadStage,
                    }))
                  }
                  style={{
                    width: '100%',
                    height: 46,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: 17 / 1.2,
                    fontWeight: 700,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="NEW">Novo</option>
                  <option value="CONTACTED">Contatado</option>
                  <option value="QUALIFIED">Qualificado</option>
                  <option value="PROPOSAL_SENT">Proposta enviada</option>
                  <option value="NEGOTIATION">Negociação</option>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: 17 / 1.3,
                    fontWeight: 700,
                  }}
                >
                  Temperatura
                </label>
                <select
                  value={newBusinessDraft.temperature}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      temperature: event.target.value as
                        | ''
                        | NegotiationTemperature,
                    }))
                  }
                  style={{
                    width: '100%',
                    height: 46,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: newBusinessDraft.temperature ? '#111827' : '#6b7280',
                    fontSize: 17 / 1.2,
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="">Selecione</option>
                  <option value="hot">Quente</option>
                  <option value="warm">Morno</option>
                  <option value="cold">Frio</option>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{
                    color: '#1f2937',
                    fontSize: 17 / 1.3,
                    fontWeight: 700,
                  }}
                >
                  Valor (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  autoComplete="new-password"
                  name="business-value"
                  inputMode="decimal"
                  value={newBusinessDraft.value}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      value: sanitizeLeadValueInput(event.target.value),
                    }))
                  }
                  style={getMoneyInputStyle(true)}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}
                >
                  Tipo
                </label>
                <select
                  value={newBusinessDraft.negotiationType}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      negotiationType: event.target.value as
                        | ''
                        | NegotiationType,
                    }))
                  }
                  style={{
                    width: '100%',
                    height: 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: newBusinessDraft.negotiationType
                      ? '#111827'
                      : '#6b7280',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="">Selecione</option>
                  <option value="service">Serviço</option>
                  <option value="product">Produto</option>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}
                >
                  Nome
                </label>
                <input
                  type="text"
                  placeholder="Nome"
                  autoComplete="off"
                  name="business-title"
                  value={newBusinessDraft.title}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}
                >
                  Etapa
                </label>
                <select
                  value={newBusinessDraft.stage}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      stage: event.target.value as LeadStage,
                    }))
                  }
                  style={{
                    width: '100%',
                    height: 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="NEW">Novo</option>
                  <option value="CONTACTED">Contatado</option>
                  <option value="QUALIFIED">Qualificado</option>
                  <option value="PROPOSAL_SENT">Proposta enviada</option>
                  <option value="NEGOTIATION">Negociação</option>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}
                >
                  Temperatura
                </label>
                <select
                  value={newBusinessDraft.temperature}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      temperature: event.target.value as
                        | ''
                        | NegotiationTemperature,
                    }))
                  }
                  style={{
                    width: '100%',
                    height: 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: newBusinessDraft.temperature ? '#111827' : '#6b7280',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="">Selecione</option>
                  <option value="hot">Quente</option>
                  <option value="warm">Morno</option>
                  <option value="cold">Frio</option>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label
                  style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}
                >
                  Valor (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  autoComplete="new-password"
                  name="business-value"
                  inputMode="decimal"
                  value={newBusinessDraft.value}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      value: sanitizeLeadValueInput(event.target.value),
                    }))
                  }
                  style={getMoneyInputStyle(false)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            <label
              style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}
            >
              Notas
            </label>
            <textarea
              placeholder="Escreva uma observação..."
              value={newBusinessDraft.notes}
              onChange={(event) =>
                setNewBusinessDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              style={{
                width: '100%',
                minHeight: 132,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#111827',
                fontSize: 17 / 1.2,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </article>
      </section>
    )
    if (isCreatingBusiness && !isMobile) {
      return businessCreateContent
    }

    return (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 14,
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: 4,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsCreatingBusiness(true)
            }}
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
              lineHeight: 1.2,
            }}
          >
            + Novo negócio
          </button>

          <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
            {businesses.length} negócio{businesses.length === 1 ? '' : 's'}
          </span>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {businesses.length === 0 ? (
            <div
              style={{
                borderRadius: 12,
                padding: '14px 16px',
                background: '#ffffff',
                color: '#6b7280',
              }}
            >
              Nenhum negócio encontrado.
            </div>
          ) : (
            businesses.map((business) => {
              const isHovered = hoveredBusinessId === business.id
              const isSelected = selectedBusinessId === business.id
              const businessTypeLabel =
                business.negotiationType === 'service'
                  ? 'Serviço'
                  : business.negotiationType === 'product'
                    ? 'Produto'
                    : 'Sem tipo'
              const temperatureTagPresentation = getTemperatureTagPresentation(
                business.temperature ?? '',
              )
              const hasBusinessTemperature = Boolean(
                business.temperature?.trim(),
              )
              const formattedBusinessValue = formatLeadValue(
                business.financial?.saleAmount,
              )
              const hasBusinessValue = formattedBusinessValue !== '-'
              const desktopBusinessMetadataColumnCount =
                3 + Number(hasBusinessTemperature) + Number(hasBusinessValue)
              const businessLifecycleTagPresentation =
                getBusinessLifecycleTagPresentation(business.status)
              const businessTypeIcon =
                business.negotiationType === 'product' ? (
                  <Package size={18} />
                ) : (
                  <BriefcaseBusiness size={18} />
                )

              if (isMobile) {
                return (
                  <article
                    key={business.id}
                    onClick={() => {
                      openBusinessFromList(business.id)
                    }}
                    onMouseEnter={() => setHoveredBusinessId(business.id)}
                    onMouseLeave={() => setHoveredBusinessId(null)}
                    style={{
                      background:
                        isHovered || isSelected
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: 18,
                      boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                      padding: 16,
                      display: 'grid',
                      gap: 14,
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
                      <h3
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
                        {business.title ?? 'Negócio sem nome'}
                      </h3>

                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#f0fdf4',
                          color: '#1f7a4d',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {businessTypeIcon}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#2563eb',
                          whiteSpace: 'nowrap',
                          background: '#dbeafe',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        <span style={tagContentStyle}>
                          {isMobile
                            ? `Etapa: ${getLeadStageLabel(business.stage)}`
                            : getLeadStageLabel(business.stage)}
                        </span>
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: businessLifecycleTagPresentation.textColor,
                          whiteSpace: 'nowrap',
                          background:
                            businessLifecycleTagPresentation.background,
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          lineHeight: 1.1,
                        }}
                      >
                        <span style={tagContentStyle}>
                          {isMobile
                            ? `Status: ${businessLifecycleTagPresentation.label}`
                            : businessLifecycleTagPresentation.label}
                        </span>
                      </span>

                      {businessTypeLabel === 'Sem tipo' ? null : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#7c3aed',
                            whiteSpace: 'nowrap',
                            background: '#ede9fe',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1,
                          }}
                        >
                          <span style={tagContentStyle}>
                            {businessTypeLabel}
                          </span>
                        </span>
                      )}

                      {temperatureTagPresentation.label === '-' ? null : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: temperatureTagPresentation.textColor,
                            whiteSpace: 'nowrap',
                            background: `${temperatureTagPresentation.textColor}44`,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1,
                          }}
                        >
                          {temperatureTagPresentation.icon ? (
                            <span style={tagIconStyle}>
                              {temperatureTagPresentation.icon}
                            </span>
                          ) : null}
                          <span style={tagContentStyle}>
                            {temperatureTagPresentation.label}
                          </span>
                        </span>
                      )}

                      {formatLeadValue(business.financial?.saleAmount) ===
                      '-' ? (
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
                            lineHeight: 1.1,
                          }}
                        >
                          <span style={tagContentStyle}>
                            Valor não informado
                          </span>
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#166534',
                            whiteSpace: 'nowrap',
                            background: '#dcfce7',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1,
                          }}
                        >
                          <span style={tagContentStyle}>
                            {formatLeadValue(business.financial?.saleAmount)}
                          </span>
                        </span>
                      )}
                    </div>
                  </article>
                )
              }

              return (
                <article
                  key={business.id}
                  onClick={() => {
                    openBusinessFromList(business.id)
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '4px minmax(0, 1fr)',
                    border: '1px solid #f3f4f6',
                    borderRadius: 12,
                    background:
                      isHovered || isSelected
                        ? interactionTheme.clickableCardHoverBackground
                        : '#ffffff',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                  }}
                  onMouseEnter={() => setHoveredBusinessId(business.id)}
                  onMouseLeave={() => setHoveredBusinessId(null)}
                >
                  <div
                    style={{
                      background: businessLifecycleTagPresentation.textColor,
                    }}
                  />

                  <div
                    style={{
                      padding: '14px 16px',
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: '#111827',
                            fontSize: 34 / 2,
                            fontWeight: 800,
                            lineHeight: 1.2,
                          }}
                        >
                          {business.title ?? 'Negócio sem nome'}
                        </h3>

                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: '#f0fdf4',
                            color: '#1f7a4d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {businessTypeIcon}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${desktopBusinessMetadataColumnCount}, minmax(0, 1fr))`,
                          gap: 10,
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span
                            style={{
                              color: '#6b7280',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Etapa
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#2563eb',
                              whiteSpace: 'nowrap',
                              background: '#dbeafe',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '7px 12px',
                              lineHeight: 1.1,
                              width: '100%',
                            }}
                          >
                            <span style={tagContentStyle}>
                              {getLeadStageLabel(business.stage)}
                            </span>
                          </span>
                        </div>

                        <div style={{ display: 'grid', gap: 4 }}>
                          <span
                            style={{
                              color: '#6b7280',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Status
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: businessLifecycleTagPresentation.textColor,
                              whiteSpace: 'nowrap',
                              background:
                                businessLifecycleTagPresentation.background,
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '7px 12px',
                              lineHeight: 1.1,
                              width: '100%',
                            }}
                          >
                            <span style={tagContentStyle}>
                              {businessLifecycleTagPresentation.label}
                            </span>
                          </span>
                        </div>

                        <div style={{ display: 'grid', gap: 4 }}>
                          <span
                            style={{
                              color: '#6b7280',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Tipo
                          </span>
                          {businessTypeLabel === 'Sem tipo' ? (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#9ca3af',
                                background: '#f3f4f6',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                lineHeight: 1.1,
                                width: '100%',
                              }}
                            >
                              -
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#7c3aed',
                                whiteSpace: 'nowrap',
                                background: '#ede9fe',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                lineHeight: 1.1,
                                width: '100%',
                              }}
                            >
                              <span style={tagContentStyle}>
                                {businessTypeLabel}
                              </span>
                            </span>
                          )}
                        </div>

                        {hasBusinessTemperature ? (
                          <div style={{ display: 'grid', gap: 4 }}>
                            <span
                              style={{
                                color: '#6b7280',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              Temperatura
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: temperatureTagPresentation.textColor,
                                whiteSpace: 'nowrap',
                                background: `${temperatureTagPresentation.textColor}44`,
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                lineHeight: 1.1,
                                width: '100%',
                              }}
                            >
                              {temperatureTagPresentation.icon ? (
                                <span style={tagIconStyle}>
                                  {temperatureTagPresentation.icon}
                                </span>
                              ) : null}
                              <span style={tagContentStyle}>
                                {temperatureTagPresentation.label}
                              </span>
                            </span>
                          </div>
                        ) : null}

                        {hasBusinessValue ? (
                          <div style={{ display: 'grid', gap: 4 }}>
                            <span
                              style={{
                                color: '#6b7280',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              Valor
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#166534',
                                whiteSpace: 'nowrap',
                                background: '#dcfce7',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '7px 12px',
                                lineHeight: 1.1,
                                width: '100%',
                              }}
                            >
                              <span style={tagContentStyle}>
                                {formattedBusinessValue}
                              </span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>

        {isMobile && isCreatingBusiness ? (
          <>
            <button
              type="button"
              aria-label="Fechar criação de negócio"
              onClick={() => {
                setIsCreatingBusiness(false)
                setNewBusinessDraft(initialNewBusinessDraft)
                setBusinessesError(null)
              }}
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
                background: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)',
              }}
            >
              {businessCreateContent}
            </aside>
          </>
        ) : null}

        {businessesError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p>
        ) : null}
      </section>
    )
  }

  const renderNotesTab = () => {
    const notesBusinesses = leadNegotiations
    const defaultNotesBusiness =
      notesBusinesses.find((business) => (business.notes ?? []).length > 0) ??
      notesBusinesses[0] ??
      null
    const selectedNotesBusiness =
      notesBusinesses.find(
        (business) => business.id === selectedLeadNotesBusinessId,
      ) ?? defaultNotesBusiness
    const selectedNotesBusinessNotes = (selectedNotesBusiness?.notes ?? [])
      .map((note, originalIndex) => ({ note, originalIndex }))
      .sort((firstItem, secondItem) => {
        const firstTimestamp = firstItem.note.createdAt
          ? new Date(firstItem.note.createdAt).getTime()
          : 0
        const secondTimestamp = secondItem.note.createdAt
          ? new Date(secondItem.note.createdAt).getTime()
          : 0

        return secondTimestamp - firstTimestamp
      })

    const notesTotal = selectedNotesBusinessNotes.length
    const canOpenCreateLeadTabNote = notesBusinesses.length > 0
    const canCreateLeadTabNote = Boolean(
      newLeadTabNoteDraft.businessId.trim() &&
      newLeadTabNoteDraft.title.trim() &&
      newLeadTabNoteDraft.description.trim(),
    )

    const handleCloseLeadTabCreateNote = () => {
      setIsCreatingLeadTabNote(false)
      setNewLeadTabNoteDraft(initialNewLeadTabNoteDraft)
      setLeadTabNotesError(null)
    }

    const handleCreateLeadTabNote = async () => {
      const targetBusinessId = newLeadTabNoteDraft.businessId.trim()
      const trimmedTitle = newLeadTabNoteDraft.title.trim()
      const trimmedDescription = newLeadTabNoteDraft.description.trim()

      if (
        !leadId ||
        !targetBusinessId ||
        !trimmedTitle ||
        !trimmedDescription
      ) {
        return
      }

      const targetBusiness = leadNegotiations.find(
        (business) => business.id === targetBusinessId,
      )
      if (!targetBusiness) {
        setLeadTabNotesError('Negócio não encontrado para salvar a nota.')
        return
      }

      const currentNotes = targetBusiness.notes ?? []
      const payload: UpdateNegotiationPayload = {
        notes: [
          ...currentNotes,
          {
            title: trimmedTitle,
            description: trimmedDescription,
            createdAt: new Date().toISOString(),
          },
        ],
      }

      try {
        await WebhookService.updateNegotiation(targetBusinessId, payload)
        await refreshLeadNegotiations(leadId)
        onLeadUpdated?.()
        setSelectedLeadNotesBusinessId(targetBusinessId)
        handleCloseLeadTabCreateNote()
      } catch (exception: unknown) {
        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao criar nota.'
        setLeadTabNotesError(message)
      }
    }

    const leadTabNoteCreateForm = (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isMobile ? 2 : 6,
          boxSizing: 'border-box',
          padding: isMobile ? '22px 18px 28px' : 0,
        }}
      >
        {isMobile ? (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#ffffff',
              paddingBottom: 6,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Nova nota
            </h3>

            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <button
                type="button"
                aria-label="Salvar nota"
                title="Salvar nota"
                onClick={() => void handleCreateLeadTabNote()}
                disabled={!canCreateLeadTabNote}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: canCreateLeadTabNote ? '#6b7280' : '#cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: canCreateLeadTabNote ? 'pointer' : 'not-allowed',
                }}
              >
                <Save size={18} />
              </button>
              <button
                type="button"
                aria-label="Fechar criação de nota"
                title="Fechar criação"
                onClick={handleCloseLeadTabCreateNote}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#6b7280',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                X
              </button>
            </div>
          </div>
        ) : null}

        {leadTabNotesError ? (
          <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>
            {leadTabNotesError}
          </p>
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <label
            style={{
              color: '#1f2937',
              fontSize: isMobile ? 17 / 1.3 : 13,
              fontWeight: 700,
            }}
          >
            Negócio
          </label>
          <select
            value={newLeadTabNoteDraft.businessId}
            onChange={(event) =>
              setNewLeadTabNoteDraft((current) => ({
                ...current,
                businessId: event.target.value,
              }))
            }
            style={{
              width: '100%',
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: newLeadTabNoteDraft.businessId ? '#111827' : '#6b7280',
              fontSize: isMobile ? 17 / 1.2 : 14,
              fontWeight: 600,
              boxSizing: 'border-box',
              background: '#ffffff',
            }}
          >
            <option value="">Selecione</option>
            {notesBusinesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.title?.trim() || 'Negócio sem nome'}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label
            style={{
              color: '#1f2937',
              fontSize: isMobile ? 17 / 1.3 : 13,
              fontWeight: 700,
            }}
          >
            Título
          </label>
          <input
            type="text"
            placeholder="Título da nota"
            autoComplete="off"
            value={newLeadTabNoteDraft.title}
            onChange={(event) =>
              setNewLeadTabNoteDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label
            style={{
              color: '#1f2937',
              fontSize: isMobile ? 17 / 1.3 : 13,
              fontWeight: 700,
            }}
          >
            Descrição
          </label>
          <textarea
            placeholder="Escreva a descrição da nota..."
            value={newLeadTabNoteDraft.description}
            onChange={(event) =>
              setNewLeadTabNoteDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            style={{
              width: '100%',
              minHeight: 132,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '12px 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </section>
    )

    const shouldShowDesktopCreateOnly = !isMobile && isCreatingLeadTabNote

    return (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          height: '100%',
          minHeight: 0,
          overflowY: isMobile ? 'auto' : 'hidden',
          paddingRight: isMobile ? 0 : 4,
          boxSizing: 'border-box',
        }}
      >
        {!shouldShowDesktopCreateOnly ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!canOpenCreateLeadTabNote) {
                    return
                  }

                  setIsCreatingLeadTabNote(true)
                  setLeadTabNotesError(null)
                  setNewLeadTabNoteDraft({
                    businessId:
                      selectedLeadNotesBusinessId ||
                      selectedNotesBusiness?.id ||
                      defaultNotesBusiness?.id ||
                      '',
                    title: '',
                    description: '',
                  })
                }}
                disabled={!canOpenCreateLeadTabNote}
                style={{
                  width: 'fit-content',
                  border: 'none',
                  borderRadius: 8,
                  background: '#ffffff',
                  height: 42,
                  padding: '0 14px',
                  textAlign: 'left',
                  color: '#555555',
                  cursor: canOpenCreateLeadTabNote ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: 1.2,
                  opacity: canOpenCreateLeadTabNote ? 1 : 0.65,
                }}
              >
                + Adicionar nota
              </button>

              <span
                style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}
              >
                {notesTotal} nota{notesTotal === 1 ? '' : 's'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 8,
                width: '100%',
                maxWidth: isMobile ? 'none' : 320,
              }}
            >
              <label
                style={{ color: '#1f2937', fontSize: 14, fontWeight: 700 }}
              >
                Negocio
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedLeadNotesBusinessId}
                  onChange={(event) =>
                    setSelectedLeadNotesBusinessId(event.target.value)
                  }
                  disabled={notesBusinesses.length === 0}
                  style={{
                    width: '100%',
                    height: 38,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 36px 0 10px',
                    color: '#111827',
                    fontSize: 14,
                    fontWeight: 600,
                    appearance: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor:
                      notesBusinesses.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="">Selecione</option>
                  {notesBusinesses.length > 0
                    ? notesBusinesses.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.title?.trim() || 'Negócio sem nome'}
                        </option>
                      ))
                    : null}
                </select>
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280',
                    pointerEvents: 'none',
                  }}
                >
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
          </>
        ) : null}

        {!isMobile && isCreatingLeadTabNote ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
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
                Nova nota
              </h2>

              <div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <button
                  type="button"
                  aria-label="Salvar nota"
                  title="Salvar nota"
                  onClick={() => void handleCreateLeadTabNote()}
                  disabled={!canCreateLeadTabNote}
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    background: 'transparent',
                    color: canCreateLeadTabNote ? '#6b7280' : '#cbd5e1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: canCreateLeadTabNote ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Save size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseLeadTabCreateNote}
                  title="Fechar criação"
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    background: 'transparent',
                    color: '#6b7280',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                  aria-label="Fechar criação de nota"
                >
                  X
                </button>
              </div>
            </div>

            <article
              style={{
                border: 'none',
                borderRadius: 0,
                padding: 0,
                background: 'transparent',
                display: 'grid',
                gap: 18,
                maxWidth: 760,
              }}
            >
              {leadTabNoteCreateForm}
            </article>
          </>
        ) : null}

        {!shouldShowDesktopCreateOnly ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 0,
              flex: 1,
              overflowY: isMobile ? 'visible' : 'auto',
            }}
          >
            {!selectedNotesBusiness ? (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Nenhum negócio cadastrado para este lead.
              </p>
            ) : selectedNotesBusinessNotes.length === 0 ? (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
                Nenhuma nota cadastrada.
              </p>
            ) : (
              selectedNotesBusinessNotes.map(
                ({ note, originalIndex }, noteIndex) => (
                  <article
                    key={`${selectedNotesBusiness.id}-lead-note-${noteIndex}`}
                    onClick={() => {
                      setActiveTab('negocios')
                      setIsCreatingBusinessNote(false)
                      setEditingBusinessNoteIndex(null)
                      setNewBusinessNoteDraft(initialNewBusinessNoteDraft)

                      if (selectedBusinessId === selectedNotesBusiness.id) {
                        setActiveBusinessTab('notas')
                        setViewingBusinessNoteIndex(originalIndex)
                      } else {
                        requestedBusinessTabRef.current = 'notas'
                        requestedBusinessNoteIndexRef.current = originalIndex
                        setSelectedBusinessId(selectedNotesBusiness.id)
                      }
                    }}
                    onMouseEnter={() =>
                      setHoveredBusinessNoteIndex(originalIndex)
                    }
                    onMouseLeave={() => setHoveredBusinessNoteIndex(null)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      border:
                        hoveredBusinessNoteIndex === originalIndex
                          ? '1px solid #bfd6cb'
                          : '1px solid #dbe3ef',
                      borderRadius: 18,
                      background:
                        hoveredBusinessNoteIndex === originalIndex
                          ? '#f8fffb'
                          : '#ffffff',
                      padding: '10px 28px',
                      minHeight: 90,
                      boxSizing: 'border-box',
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                      alignItems: 'center',
                      columnGap: 20,
                      overflow: 'hidden',
                      boxShadow:
                        hoveredBusinessNoteIndex === originalIndex
                          ? '0 12px 28px rgba(15, 23, 42, 0.09)'
                          : '0 8px 24px rgba(15, 23, 42, 0.05)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 0,
                        height: 0,
                        borderTop: '52px solid #2ecc71',
                        borderRight: '52px solid transparent',
                      }}
                    />

                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        background: '#eafaf0',
                        color: '#16a34a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        alignSelf: 'center',
                      }}
                    >
                      <FileText size={18} />
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        display: 'grid',
                        gap: 4,
                        paddingTop: 2,
                        alignSelf: 'center',
                      }}
                    >
                      <span
                        style={{
                          color: '#0f172a',
                          fontSize: 17,
                          fontWeight: 800,
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {note.title?.trim() || 'Destacada'}
                      </span>

                      <span
                        style={{
                          color: '#64748b',
                          fontSize: 15,
                          fontWeight: 500,
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '70%',
                          maxWidth: '70%',
                        }}
                      >
                        {formatBusinessNotePreview(note.description)}
                      </span>
                    </div>

                    <span
                      style={{
                        color: '#111827',
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        justifySelf: 'end',
                        alignSelf: 'start',
                      }}
                    >
                      {formatDateOnly(note.createdAt) || '-'}
                    </span>
                  </article>
                ),
              )
            )}
          </div>
        ) : null}

        {isMobile && isCreatingLeadTabNote ? (
          <>
            <button
              type="button"
              aria-label="Fechar criação de nota"
              onClick={handleCloseLeadTabCreateNote}
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
                background: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)',
              }}
            >
              {leadTabNoteCreateForm}
            </aside>
          </>
        ) : null}
      </section>
    )
  }

  const renderChatTab = () => {
    if (!leadId) {
      return <p style={{ margin: 0, color: '#b91c1c' }}>Lead não informado.</p>
    }

    const currentRuntimeMode: LeadRuntimeMode =
      leadData?.runtimeMode ?? 'AUTOMATION'
    const isHumanMode = currentRuntimeMode === 'HUMAN'

    const handleToggleRuntimeMode = async () => {
      if (!leadId || isUpdatingRuntimeMode) return

      const nextRuntimeMode: LeadRuntimeMode = isHumanMode
        ? 'AUTOMATION'
        : 'HUMAN'

      try {
        setIsUpdatingRuntimeMode(true)

        const updatedRuntimeMode = await WebhookService.updateLeadRuntimeMode(
          leadId,
          nextRuntimeMode,
        )

        setLeadData((currentLead) => {
          if (!currentLead) return currentLead

          return {
            ...currentLead,
            runtimeMode: updatedRuntimeMode,
          }
        })
      } catch (exception: unknown) {
        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao atualizar modo de atendimento.'

        console.error(message)
      } finally {
        setIsUpdatingRuntimeMode(false)
      }
    }

    return (
      <LeadChatTab
        leadId={leadId}
        leadSource={leadData?.source}
        focusMessageId={focusedChatMessageId}
        runtimeMode={currentRuntimeMode}
        isUpdatingRuntimeMode={isUpdatingRuntimeMode}
        onToggleRuntimeMode={handleToggleRuntimeMode}
      />
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'geral':
        return renderGeneralTab()
      case 'negocios':
        return renderBusinessesTab()
      case 'followups':
        return renderFollowUpsTab()
      case 'chat':
        return renderChatTab()
      case 'notas':
        return renderNotesTab()
      default:
        return null
    }
  }

  const shouldHideLeadTabs =
    activeTab === 'negocios' && Boolean(selectedBusinessId)
  const shouldShowAgendaFollowUpTabSkeleton =
    isRequestedAgendaFollowUp && isLeadSkeletonVisible
  const shouldShowBusinessInformationSkeleton =
    activeTab === 'negocios' &&
    Boolean(selectedBusinessId) &&
    (isLeadSkeletonVisible ||
      openedBusiness.business?.id !== selectedBusinessId ||
      openedBusiness.status === 'loading')
  const shouldShowDirectChatSkeleton =
    activeTab === 'chat' && isLeadSkeletonVisible

  useEffect(() => {
    if (isCreateLeadMode) {
      setIsLoading(false)
      setError(null)
      setFollowUpsError(null)
      setBusinessesError(null)
      setLeadData(null)
      setFollowUpsTotalItems(0)
      setIsCreatingAgendaFollowUp(false)
      setAgendaFollowUpDraft(initialAgendaFollowUpDraft)
      setInfoDraft(initialLeadInfoDraft)
      setIsGeneralActionsOpen(false)
      setIsEditingLeadInfo(false)
      setIsConfirmingLeadDelete(false)
      setIsConfirmingLeadArchive(false)
      setActiveTab('geral')
      setNotesDraft('')
      notesDraftRef.current = ''
      lastSavedNotesRef.current = ''
      setHoveredLeadTab(null)
      setHoveredBusinessTab(null)
      setHoveredBusinessId(null)
      setSelectedBusinessId(null)
      selectedBusinessIdRef.current = null
      requestedBusinessTabRef.current = null
      setIsBusinessActionsOpen(false)
      setIsConfirmingBusinessDelete(false)
      setIsConfirmingBusinessClose(false)
      setIsEditingBusiness(false)
      setIsCreatingBusinessFollowUp(false)
      setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
      setHoveredBusinessFollowUpId(null)
      setLeadNegotiations([])
      setNegotiationFollowUps([])
      setBusinessDetailDraft(null)
      setActiveBusinessTab('informacoes')
      setIsCreatingBusiness(false)
      setIsUpdatingRuntimeMode(false)
      return
    }

    if (!leadId) {
      setError('Lead não informado.')
      setFollowUpsError(null)
      setBusinessesError(null)
      setLeadData(null)
      setLeadNegotiations([])
      setNegotiationFollowUps([])
      setFollowUpsTotalItems(0)
      setIsUpdatingRuntimeMode(false)
      setNotesDraft('')
      notesDraftRef.current = ''
      lastSavedNotesRef.current = ''
      setIsLoading(false)
      return
    }

    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setFollowUpsError(null)
        setIsUpdatingRuntimeMode(false)
        const lead = await WebhookService.loadLead(leadId)
        setLeadData(lead)
        await refreshLeadNegotiations(leadId)
      } catch (exception: unknown) {
        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao carregar lead.'
        setLeadData(null)
        setLeadNegotiations([])
        setNegotiationFollowUps([])
        setFollowUpsTotalItems(0)
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [isCreateLeadMode, leadId])

  if (isCreateLeadMode) {
    const canCreateLead = Boolean(
      infoDraft.name.trim() && isLeadPhoneComplete(infoDraft.phone),
    )
    const createLeadFieldLabelStyle = {
      color: '#1f2937',
      fontSize: isMobile ? 17 / 1.3 : 13,
      fontWeight: 700,
    } as const
    const createLeadInputStyle = {
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
    const createLeadSelectStyle = {
      ...createLeadInputStyle,
      fontWeight: 600,
    } as const

    return (
      <section
        style={{
          height: '100%',
          minHeight: 0,
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
          background: '#fcfdff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <h2
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: isMobile ? 24 : 26,
                fontWeight: isMobile ? 700 : 800,
                lineHeight: 1,
              }}
            >
              Novo lead
            </h2>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              aria-label="Salvar lead"
              title="Salvar lead"
              onClick={() => void handleCreateLead()}
              disabled={!canCreateLead}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: canCreateLead ? '#6b7280' : '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: canCreateLead ? 'pointer' : 'not-allowed',
              }}
            >
              <Save size={18} />
            </button>
            <button
              type="button"
              aria-label="Fechar criação de lead"
              title="Fechar criação"
              onClick={() => navigate(`${closeLeadPath}${location.search}`)}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: '#6b7280',
                padding: 0,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              X
            </button>
          </div>
        </div>

        {error ? <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p> : null}

        {!isMobile ? (
          <div
            style={{
              borderBottom: '1px solid #e5e7eb',
            }}
          />
        ) : null}

        <article
          style={{
            border: 'none',
            borderRadius: 0,
            padding: 0,
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            maxWidth: 'none',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: isMobile ? 2 : 6,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: 10,
              alignContent: 'start',
            }}
          >
            <span style={createLeadFieldLabelStyle}>Nome</span>
            <input
              type="text"
              value={infoDraft.name}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              autoComplete="new-password"
              style={createLeadInputStyle}
            />

            <span style={createLeadFieldLabelStyle}>Telefone</span>
            <input
              type="text"
              value={infoDraft.phone}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  phone: formatLeadPhoneInput(event.target.value),
                }))
              }
              autoComplete="new-password"
              maxLength={14}
              inputMode="numeric"
              style={createLeadInputStyle}
            />

            <span style={createLeadFieldLabelStyle}>Email</span>
            <input
              type="email"
              value={infoDraft.email}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              autoComplete="new-password"
              style={createLeadInputStyle}
            />

            <span style={createLeadFieldLabelStyle}>Localização</span>
            <input
              type="text"
              value={infoDraft.location}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              autoComplete="new-password"
              style={createLeadInputStyle}
            />

            <span style={createLeadFieldLabelStyle}>Origem</span>
            <select
              value={resolveLeadSourceOptionValue(infoDraft.source)}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
              style={createLeadSelectStyle}
            >
              <option value="">Selecione</option>
              {createLeadSourceOptions.map((sourceOption) => (
                <option key={sourceOption.value} value={sourceOption.value}>
                  {sourceOption.label}
                </option>
              ))}
            </select>

            <span style={createLeadFieldLabelStyle}>Qualificação</span>
            <select
              value={infoDraft.leadQualification}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  leadQualification: event.target.value as
                    | ''
                    | 'qualify'
                    | 'not qualify',
                }))
              }
              style={createLeadSelectStyle}
            >
              <option value="">Não definido</option>
              <option value="qualify">Qualificado</option>
              <option value="not qualify">Não qualificado</option>
            </select>

            <span style={createLeadFieldLabelStyle}>Links</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                flexWrap: 'wrap',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#334155',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={infoDraft.selectedSocialLinks.includes('instagram')}
                  onChange={() => {
                    setInfoDraft((current) => {
                      const isSelected =
                        current.selectedSocialLinks.includes('instagram')

                      if (isSelected) {
                        return {
                          ...current,
                          selectedSocialLinks:
                            current.selectedSocialLinks.filter(
                              (item) => item !== 'instagram',
                            ),
                          socialLinks: {
                            ...current.socialLinks,
                            instagram: '',
                          },
                        }
                      }

                      return {
                        ...current,
                        selectedSocialLinks: [
                          ...current.selectedSocialLinks,
                          'instagram',
                        ],
                      }
                    })
                  }}
                />
                Instagram
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#334155',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={infoDraft.selectedSocialLinks.includes('facebook')}
                  onChange={() => {
                    setInfoDraft((current) => {
                      const isSelected =
                        current.selectedSocialLinks.includes('facebook')

                      if (isSelected) {
                        return {
                          ...current,
                          selectedSocialLinks:
                            current.selectedSocialLinks.filter(
                              (item) => item !== 'facebook',
                            ),
                          socialLinks: {
                            ...current.socialLinks,
                            facebook: '',
                          },
                        }
                      }

                      return {
                        ...current,
                        selectedSocialLinks: [
                          ...current.selectedSocialLinks,
                          'facebook',
                        ],
                      }
                    })
                  }}
                />
                Facebook
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#334155',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={infoDraft.selectedSocialLinks.includes('url')}
                  onChange={() => {
                    setInfoDraft((current) => {
                      const isSelected =
                        current.selectedSocialLinks.includes('url')

                      if (isSelected) {
                        return {
                          ...current,
                          selectedSocialLinks:
                            current.selectedSocialLinks.filter(
                              (item) => item !== 'url',
                            ),
                          socialLinks: {
                            ...current.socialLinks,
                            url: '',
                          },
                        }
                      }

                      return {
                        ...current,
                        selectedSocialLinks: [
                          ...current.selectedSocialLinks,
                          'url',
                        ],
                      }
                    })
                  }}
                />
                URL
              </label>
            </div>

            {infoDraft.selectedSocialLinks.includes('instagram') ? (
              <>
                <span style={createLeadFieldLabelStyle}>Instagram</span>
                <input
                  type="text"
                  value={infoDraft.socialLinks.instagram}
                  onChange={(event) =>
                    setInfoDraft((current) => ({
                      ...current,
                      socialLinks: {
                        ...current.socialLinks,
                        instagram: event.target.value,
                      },
                    }))
                  }
                  placeholder="@usuario ou link"
                  style={createLeadInputStyle}
                />
              </>
            ) : null}

            {infoDraft.selectedSocialLinks.includes('facebook') ? (
              <>
                <span style={createLeadFieldLabelStyle}>Facebook</span>
                <input
                  type="text"
                  value={infoDraft.socialLinks.facebook}
                  onChange={(event) =>
                    setInfoDraft((current) => ({
                      ...current,
                      socialLinks: {
                        ...current.socialLinks,
                        facebook: event.target.value,
                      },
                    }))
                  }
                  placeholder="Perfil ou link"
                  style={createLeadInputStyle}
                />
              </>
            ) : null}

            {infoDraft.selectedSocialLinks.includes('url') ? (
              <>
                <span style={createLeadFieldLabelStyle}>URL</span>
                <input
                  type="text"
                  value={infoDraft.socialLinks.url}
                  onChange={(event) =>
                    setInfoDraft((current) => ({
                      ...current,
                      socialLinks: {
                        ...current.socialLinks,
                        url: event.target.value,
                      },
                    }))
                  }
                  placeholder="https://"
                  style={createLeadInputStyle}
                />
              </>
            ) : null}
          </div>
        </article>
      </section>
    )
  }

  const mobileLeadStateLabel =
    leadData?.state?.trim().toLowerCase() === 'archived' ? 'Arquivado' : 'Ativo'
  const isMobileLeadArchived = mobileLeadStateLabel === 'Arquivado'
  const isMobileLeadFavorite = Boolean(leadData?.isFavorite)
  const selectedHeaderBusiness =
    activeTab === 'negocios' && selectedBusinessId
      ? (leadNegotiations.find(
          (business) => business.id === selectedBusinessId,
        ) ?? null)
      : null
  const isSelectedHeaderBusinessClosed = selectedHeaderBusiness
    ? selectedHeaderBusiness.status !== 'OPEN'
    : false
  const selectedHeaderBusinessStatusLabel = selectedHeaderBusiness
    ? getBusinessLifecycleTagPresentation(selectedHeaderBusiness.status).label
    : null

  return (
    <section
      style={{
        height: '100%',
        minHeight: 0,
        padding: isMobile ? '18px 0 0' : '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 0 : 8,
        background: '#fcfdff',
      }}
    >
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 12,
          padding: isMobile ? '0 12px 18px' : '0 0 6px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
        >
          {isMobile || selectedHeaderBusiness ? (
            <button
              type="button"
              aria-label={
                viewingBusinessFollowUpId
                  ? 'Voltar para listagem de follow-ups'
                  : selectedHeaderBusiness
                    ? 'Voltar para o lead'
                    : 'Voltar para listagem de leads'
              }
              onClick={() => {
                if (selectedHeaderBusiness && viewingBusinessFollowUpId) {
                  setViewingBusinessFollowUpId(null)
                  setIsConfirmingViewedBusinessFollowUpDelete(false)
                  return
                }

                if (selectedHeaderBusiness) {
                  setSelectedBusinessId(null)
                  setIsBusinessActionsOpen(false)
                  setIsConfirmingBusinessDelete(false)
                  setIsConfirmingBusinessClose(false)
                  setIsEditingBusiness(false)
                  setActiveBusinessTab('informacoes')
                  return
                }

                navigate(`${closeLeadPath}${location.search}`)
              }}
              style={{
                height: 32,
                width: 32,
                border: 'none',
                borderRadius: 8,
                background: 'transparent',
                color: '#111827',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={22} />
            </button>
          ) : null}

          <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
            <span
              style={{
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {selectedHeaderBusinessStatusLabel
                ? `Negócio - ${selectedHeaderBusinessStatusLabel}`
                : 'Lead'}
            </span>
            <h1
              style={{
                margin: 0,
                color: '#111827',
                fontSize: 20,
                fontWeight: 800,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isLeadSkeletonVisible && !selectedHeaderBusiness ? (
                <LeadHeaderSkeleton isMobile={isMobile} />
              ) : (
                selectedHeaderBusiness?.title?.trim() ||
                leadData?.name?.trim() ||
                '-'
              )}
            </h1>
          </div>
          {!selectedHeaderBusiness && isMobileLeadFavorite ? (
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: '#fef9c3',
                color: '#f59e0b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Lead favoritado"
              title="Lead favoritado"
            >
              <Star size={14} fill="#f59e0b" />
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedHeaderBusiness ? (
            <div
              ref={businessActionsRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => setIsBusinessActionsOpen((current) => !current)}
                style={{
                  height: 32,
                  width: 32,
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  color: '#111827',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Abrir ações do negócio"
              >
                <MoreVertical size={20} />
              </button>

              {isBusinessActionsOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 38,
                    minWidth: 188,
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(2, 6, 23, 0.12)',
                    padding: 6,
                    zIndex: 10,
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    disabled={isSelectedHeaderBusinessClosed}
                    onClick={() => {
                      if (isSelectedHeaderBusinessClosed) return
                      setIsEditingBusiness(true)
                      setIsConfirmingBusinessDelete(false)
                      setIsConfirmingBusinessClose(false)
                      setActiveBusinessTab('informacoes')
                      setIsBusinessActionsOpen(false)
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: isSelectedHeaderBusinessClosed
                        ? '#94a3b8'
                        : '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: isSelectedHeaderBusinessClosed
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    Editar negócio
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingBusinessDelete(true)
                      setIsConfirmingBusinessClose(false)
                      setIsBusinessActionsOpen(false)
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: '#dc2626',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Deletar negócio
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              ref={generalActionsRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {isLeadSkeletonVisible ? (
                <LeadActionsSkeleton />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsGeneralActionsOpen((current) => !current)}
                  style={{
                    height: 32,
                    width: 32,
                    border: 'none',
                    borderRadius: 8,
                    background: 'transparent',
                    color: '#111827',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  aria-label="Abrir ações do lead"
                >
                  <MoreVertical size={20} />
                </button>
              )}

              {!isLeadSkeletonVisible && isGeneralActionsOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 38,
                    minWidth: 188,
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(2, 6, 23, 0.12)',
                    padding: 6,
                    zIndex: 10,
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleStartLeadInfoEdit}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggleLeadFavorite()}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {isMobileLeadFavorite ? 'Desfavoritar' : 'Favoritar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleLeadTabChange('geral')

                      if (isMobileLeadArchived) {
                        void handleToggleLeadArchive()
                        return
                      }

                      setIsConfirmingLeadArchive(true)
                      setIsConfirmingLeadDelete(false)
                      setIsEditingLeadInfo(false)
                      setIsGeneralActionsOpen(false)
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {isMobileLeadArchived ? 'Desarquivar' : 'Arquivar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleLeadTabChange('geral')
                      setIsConfirmingLeadDelete(true)
                      setIsEditingLeadInfo(false)
                      setIsGeneralActionsOpen(false)
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: '#dc2626',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Deletar
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </header>

      {selectedHeaderBusiness ||
      shouldShowAgendaFollowUpTabSkeleton ||
      shouldShowBusinessInformationSkeleton ? (
        <div style={{ display: 'grid', gap: 0 }}>
          <nav
            className={isMobile ? 'mobile-tabs-scrollbar-hidden' : undefined}
            style={{
              padding: isMobile ? '0 4px' : 0,
              overflowX: isMobile ? 'auto' : 'visible',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 10 : 4,
                minWidth: 0,
              }}
            >
              {shouldShowAgendaFollowUpTabSkeleton ||
              shouldShowBusinessInformationSkeleton ? (
                <BusinessTabsSkeleton isMobile={isMobile} />
              ) : (
                [
                  { key: 'informacoes' as const, label: 'Informações' },
                  { key: 'financeiro' as const, label: 'Financeiro' },
                  { key: 'followups' as const, label: 'FollowUps' },
                  { key: 'arquivos' as const, label: 'Arquivos' },
                  { key: 'notas' as const, label: 'Notas' },
                ].map((tab) => {
                  const isActive = activeBusinessTab === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        if (selectedHeaderBusiness) {
                          setBusinessDetailDraft({
                            title: selectedHeaderBusiness.title ?? '',
                            negotiationType:
                              selectedHeaderBusiness.negotiationType ?? '',
                            stage: selectedHeaderBusiness.stage,
                            temperature:
                              selectedHeaderBusiness.temperature ?? '',
                            value: formatLeadValueInputField(
                              selectedHeaderBusiness.financial?.saleAmount,
                            ),
                            notes: formatNegotiationNotes(
                              selectedHeaderBusiness.notes,
                            ),
                          })
                        }
                        setIsEditingBusiness(false)
                        setIsConfirmingBusinessDelete(false)
                        setIsConfirmingBusinessClose(false)
                        if (tab.key === 'financeiro') {
                          setActiveFinancialSection('summary')
                          setEditingFinancialSection(null)
                        }
                        setActiveBusinessTab(tab.key)
                        setIsBusinessActionsOpen(false)
                      }}
                      onMouseEnter={() => setHoveredBusinessTab(tab.key)}
                      onMouseLeave={() => setHoveredBusinessTab(null)}
                      style={{
                        border: 'none',
                        background:
                          isActive || hoveredBusinessTab === tab.key
                            ? isMobile
                              ? '#dcfce7'
                              : interactionTheme.clickableCardHoverBackground
                            : 'transparent',
                        borderRadius: isMobile ? 8 : 6,
                        padding: isMobile ? '12px 16px' : '8px 12px',
                        cursor: 'pointer',
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: isActive ? 700 : 600,
                        color:
                          isActive || hoveredBusinessTab === tab.key
                            ? isMobile
                              ? '#1f7a4d'
                              : interactionTheme.activeIconColor
                            : '#6b7280',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })
              )}
            </div>
          </nav>

          {!isMobile ? (
            <div
              style={{
                borderBottom: '1px solid #e5e7eb',
                marginTop: 8,
                marginBottom: 10,
              }}
            />
          ) : null}
        </div>
      ) : !shouldHideLeadTabs ? (
        <div style={{ display: 'grid', gap: 0 }}>
          <nav
            className={isMobile ? 'mobile-tabs-scrollbar-hidden' : undefined}
            style={{
              padding: isMobile ? '0 4px' : 0,
              overflowX: isMobile ? 'auto' : 'visible',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'flex-start' : 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 10 : 4,
                  minWidth: isMobile ? 'max-content' : 0,
                }}
              >
                {isLeadSkeletonVisible ? (
                  <LeadTabsSkeleton isMobile={isMobile} />
                ) : (
                  leadTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleLeadTabChange(tab.key)}
                      onMouseEnter={() => setHoveredLeadTab(tab.key)}
                      onMouseLeave={() => setHoveredLeadTab(null)}
                      style={{
                        border: 'none',
                        background:
                          activeTab === tab.key || hoveredLeadTab === tab.key
                            ? isMobile
                              ? '#dcfce7'
                              : interactionTheme.clickableCardHoverBackground
                            : 'transparent',
                        borderRadius: isMobile ? 8 : 6,
                        padding: isMobile ? '12px 16px' : '8px 12px',
                        cursor: 'pointer',
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: activeTab === tab.key ? 700 : 600,
                        color:
                          activeTab === tab.key || hoveredLeadTab === tab.key
                            ? isMobile
                              ? '#1f7a4d'
                              : interactionTheme.activeIconColor
                            : '#6b7280',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </nav>

          {!isMobile ? (
            <div
              style={{
                borderBottom: '1px solid #e5e7eb',
                marginTop: 8,
                marginBottom: 10,
              }}
            />
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: isEditingLeadInfo && activeTab === 'geral' ? 16 : 0,
          padding: isMobile ? '16px 12px 0' : 0,
        }}
      >
        {isEditingLeadInfo && activeTab === 'geral' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#ffffff',
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: isMobile ? 24 : 26,
                fontWeight: isMobile ? 700 : 800,
                lineHeight: 1,
              }}
            >
              Editar lead
            </h2>

            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <button
                type="button"
                aria-label="Salvar lead"
                title="Salvar lead"
                onClick={() => void handleSaveLeadInfo()}
                disabled={!canSaveLeadInfo}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: canSaveLeadInfo ? '#6b7280' : '#cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: canSaveLeadInfo ? 'pointer' : 'not-allowed',
                }}
              >
                <Save size={18} />
              </button>
              <button
                type="button"
                aria-label="Cancelar edição do lead"
                title="Cancelar edição"
                onClick={handleCancelLeadInfoEdit}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#6b7280',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                X
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={
            !isMobile && activeTab === 'geral' ? 'scrollbar-hidden' : undefined
          }
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: !isMobile && activeTab === 'geral' ? 'auto' : undefined,
          }}
        >
          {isLeadSkeletonVisible && activeTab === 'geral' ? (
            <LeadGeneralTabSkeleton isMobile={isMobile} />
          ) : null}
          {shouldShowAgendaFollowUpTabSkeleton ? (
            <LeadFollowUpTabSkeleton isMobile={isMobile} />
          ) : null}
          {shouldShowBusinessInformationSkeleton ? (
            <BusinessInformationSkeleton isMobile={isMobile} />
          ) : null}
          {shouldShowDirectChatSkeleton ? (
            <LeadChatTabSkeleton isMobile={isMobile} />
          ) : null}
          {isLeadSkeletonVisible &&
          activeTab !== 'geral' &&
          !shouldShowAgendaFollowUpTabSkeleton &&
          !shouldShowBusinessInformationSkeleton &&
          !shouldShowDirectChatSkeleton ? (
            <section
              style={{
                display: 'grid',
                gap: 18,
                padding: isMobile ? '6px 4px 24px' : '6px 0 24px',
              }}
            >
              <Skeleton
                width={isMobile ? 138 : 184}
                height={20}
                borderRadius={6}
              />
              {Array.from({ length: isMobile ? 4 : 5 }, (_, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 16,
                    minHeight: 44,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <Skeleton
                    width={index % 2 === 0 ? '58%' : '72%'}
                    height={14}
                    borderRadius={6}
                  />
                  <Skeleton width={64} height={14} borderRadius={6} />
                </div>
              ))}
            </section>
          ) : null}
          {error ? (
            <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>
          ) : null}
          {!isLeadSkeletonVisible &&
          !shouldShowAgendaFollowUpTabSkeleton &&
          !shouldShowBusinessInformationSkeleton &&
          !shouldShowDirectChatSkeleton &&
          !error
            ? renderTabContent()
            : null}
        </div>
      </div>
    </section>
  )
}
