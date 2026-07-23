import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Bot,
  BriefcaseBusiness,
  Brush,
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  CircleUserRound,
  Compass,
  Clock4,
  Download,
  Facebook,
  Flame,
  Handshake,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Package,
  Phone,
  Link2,
  Instagram,
  Star,
  Snowflake,
  Sun,
  Trash2,
  TrendingUp,
  XCircle,
  FileText,
  User
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import {
  formatDate,
  formatDateTime,
  getApiDateTimestamp,
  parsePersistedUtcClockToBrowserDate
} from '../../core/utils/dateTime'
import { LeadChatTab } from '../../features/webhook/components/LeadChatTab'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import type {
  CreateNegotiationPayload,
  FollowUpDateSortOrder,
  FollowUpSortFocus,
  LeadFollowUpResponse,
  LeadResponse,
  LeadSocialLinkKey,
  LeadStage,
  LeadRuntimeMode,
  MessageTemplateResponse,
  NegotiationFollowUpResponse,
  NegotiationAttachmentResponse,
  NegotiationNote,
  NegotiationResponse,
  NegotiationTemperature,
  NegotiationType,
  UpdateNegotiationPayload
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
    url: ''
  },
  selectedSocialLinks: [] as LeadSocialLinkKey[]
}

const leadTabs: Array<{ key: LeadTabKey; label: string }> = [
  { key: 'geral', label: 'Geral' },
  { key: 'negocios', label: 'Negócios' },
  { key: 'followups', label: 'Agenda' },
  { key: 'notas', label: 'Anotações' },
  { key: 'chat', label: 'Chat' }
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
  templateId: string
  templateVariables: Record<string, string>
  dueAt: string
  status: LeadFollowUpResponse['status']
}

type AgendaFollowUpDraft = {
  negotiationId: string
  title: string
  templateId: string
  templateVariables: Record<string, string>
  dueAt: string
}

type BusinessInnerTabKey = 'informacoes' | 'followups' | 'arquivos' | 'notas'

const initialNewBusinessDraft: NewBusinessDraft = {
  negotiationType: '',
  title: '',
  stage: 'NEW',
  temperature: '',
  value: '',
  notes: ''
}

const initialNewBusinessNoteDraft: NewBusinessNoteDraft = {
  title: '',
  description: ''
}

const initialNewLeadTabNoteDraft: NewLeadTabNoteDraft = {
  businessId: '',
  title: '',
  description: ''
}

const initialNewBusinessFollowUpDraft: NewBusinessFollowUpDraft = {
  title: '',
  templateId: '',
  templateVariables: {},
  dueAt: '',
  status: 'pending'
}

const initialAgendaFollowUpDraft: AgendaFollowUpDraft = {
  negotiationId: '',
  title: '',
  templateId: '',
  templateVariables: {},
  dueAt: ''
}

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

const normalizeTemplateVariableDraft = (
  variables?: Record<string, unknown> | null
): Record<string, string> => {
  if (!variables) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : value == null ? '' : String(value)
    ])
  )
}

const buildTemplateVariablesDraft = (
  template: MessageTemplateResponse | null | undefined,
  currentVariables?: Record<string, string>
): Record<string, string> => {
  if (!template?.variables?.length) {
    return {}
  }

  return Object.fromEntries(
    template.variables.map((variable) => [
      variable.key,
      currentVariables?.[variable.key] ?? ''
    ])
  )
}

const hasMissingRequiredTemplateVariables = (
  template: MessageTemplateResponse | null | undefined,
  variables: Record<string, string>
): boolean => {
  if (!template?.variables?.length) {
    return false
  }

  return template.variables.some(
    (variable) => variable.required && !String(variables[variable.key] ?? '').trim()
  )
}

const interpolateTemplateDescription = (
  description: string | null | undefined,
  variables?: Record<string, unknown> | null
): string => {
  if (!description) {
    return ''
  }

  return description.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, rawKey: string) => {
    const key = rawKey.trim()
    const value = variables?.[key]

    if (value === null || value === undefined) {
      return `{{${key}}}`
    }

    const text = String(value).trim()
    return text || `{{${key}}}`
  })
}

const tagIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginRight: 4,
  lineHeight: 0,
  verticalAlign: 'middle' as const
}

const tagContentStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 1,
  verticalAlign: 'middle' as const
}

const getLeadPhoneLocalDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2)
  }

  return digits.slice(0, 11)
}

const formatLeadPhoneInput = (value: string): string => {
  const localDigits = getLeadPhoneLocalDigits(value)

  if (!localDigits) {
    return ''
  }

  const ddd = localDigits.slice(0, 2)
  const numberPart = localDigits.slice(2)

  if (localDigits.length <= 2) {
    return `(${ddd}`
  }

  if (numberPart.length <= 4) {
    return `(${ddd})${numberPart}`
  }

  if (numberPart.length <= 8) {
    return `(${ddd})${numberPart.slice(0, 4)}-${numberPart.slice(4)}`
  }

  return `(${ddd})${numberPart.slice(0, 5)}-${numberPart.slice(5, 9)}`
}

const isLeadPhoneComplete = (value: string): boolean => {
  const localDigits = getLeadPhoneLocalDigits(value)
  return localDigits.length === 10 || localDigits.length === 11
}

const toPersistedLeadPhone = (value: string): string => {
  const localDigits = getLeadPhoneLocalDigits(value)
  return `55${localDigits}`
}

const formatPhoneNumber = (value: string): string => {
  const localDigits = getLeadPhoneLocalDigits(value)

  if (!localDigits) {
    return '-'
  }

  if (localDigits.length !== 10 && localDigits.length !== 11) {
    return '-'
  }

  return formatLeadPhoneInput(localDigits)
}

const getSourceTagPresentation = (source: string): TagPresentation => {
  const normalizedSource = source
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalizedSource === 'metaads') {
    return { label: 'Meta Ads', textColor: '#1877f2', icon: <Facebook size={12} /> }
  }

  if (normalizedSource === 'whatsapp') {
    return { label: 'WhatsApp', textColor: '#15803d', icon: <MessageCircle size={12} /> }
  }

  if (normalizedSource === 'indicacao') {
    return { label: 'Indicação', textColor: '#0f766e', icon: <Handshake size={12} /> }
  }

  return { label: source || '-', textColor: '#6b7280' }
}

const getTemperatureTagPresentation = (temperature: string): TagPresentation => {
  const normalizedTemperature = temperature.trim().toLowerCase()

  if (normalizedTemperature === 'hot') {
    return {
      label: 'Quente',
      textColor: '#dc2626',
      icon: <Flame size={12} />
    }
  }

  if (normalizedTemperature === 'cold') {
    return {
      label: 'Frio',
      textColor: '#0ea5e9',
      icon: <Snowflake size={12} />
    }
  }

  if (normalizedTemperature === 'warm') {
    return {
      label: 'Morno',
      textColor: '#ea580c',
      icon: <Sun size={12} />
    }
  }

  return {
    label: 'Sem temperatura',
    textColor: '#6b7280'
  }
}

const getLeadQualificationTagPresentation = (
  value?: 'qualify' | 'not qualify' | null
): { label: string; textColor: string; background: string } => {
  if (value === 'qualify') {
    return {
      label: 'Qualificado',
      textColor: '#166534',
      background: '#dcfce7'
    }
  }

  if (value === 'not qualify') {
    return {
      label: 'Não qualificado',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  return {
    label: '-',
    textColor: '#475569',
    background: '#e2e8f0'
  }
}

const getBusinessTypeTagPresentation = (
  value?: NegotiationType | '' | null
): { label: string; textColor: string; background: string } => {
  if (value === 'service') {
    return {
      label: 'Serviço',
      textColor: '#7c3aed',
      background: '#ede9fe'
    }
  }

  if (value === 'product') {
    return {
      label: 'Produto',
      textColor: '#7c3aed',
      background: '#ede9fe'
    }
  }

  return {
    label: '-',
    textColor: '#475569',
    background: '#e2e8f0'
  }
}

const getBusinessLifecycleTagPresentation = (
  stage?: LeadStage | string | null,
  closedAt?: string | null
): { label: string; textColor: string; background: string } => {
  const isClosed = Boolean(closedAt)

  if (stage === 'WON' && isClosed) {
    return {
      label: 'Faturado',
      textColor: '#166534',
      background: '#dcfce7'
    }
  }

  if (stage === 'LOST' && isClosed) {
    return {
      label: 'Perdido',
      textColor: '#b91c1c',
      background: '#fee2e2'
    }
  }

  return {
    label: 'Em Aberto',
    textColor: '#1d4ed8',
    background: '#dbeafe'
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
  width: 'fit-content'
})

const leadStageLabelMap: Record<LeadStage, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  PROPOSAL_SENT: 'Proposta enviada',
  NEGOTIATION: 'Negociação',
  WON: 'Ganho',
  LOST: 'Perdido'
}

const leadStageOptions: LeadStage[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST'
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
  let sanitized = ''

  for (const character of compact) {
    if (/\d/.test(character)) {
      sanitized += character
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
    const fractionDigits = rawFractionParts.join('').replace(/\D/g, '').slice(0, 2)

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
    maximumFractionDigits: 2
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

  const centsDigits = rawFractionPart.replace(/\D/g, '').slice(0, 2).padEnd(2, '0')

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

export default function LeadPage({ onLeadUpdated, onLeadCreated }: LeadPageProps) {
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
  const [statusSortFocus, setStatusSortFocus] = useState<FollowUpSortFocus>('overdue')
  const [dateSortOrder, setDateSortOrder] = useState<FollowUpDateSortOrder>('asc')
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplateResponse[]>([])
  const [hoveredFollowUpId, setHoveredFollowUpId] = useState<string | null>(null)
  const [isCreatingAgendaFollowUp, setIsCreatingAgendaFollowUp] = useState<boolean>(false)
  const [agendaFollowUpDraft, setAgendaFollowUpDraft] = useState<AgendaFollowUpDraft>(
    initialAgendaFollowUpDraft
  )
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
      url: string
    }
    selectedSocialLinks: LeadSocialLinkKey[]
  }>(initialLeadInfoDraft)
  const [isGeneralActionsOpen, setIsGeneralActionsOpen] = useState<boolean>(false)
  const [isEditingLeadInfo, setIsEditingLeadInfo] = useState<boolean>(false)
  const [isConfirmingLeadDelete, setIsConfirmingLeadDelete] = useState<boolean>(false)
  const [isConfirmingLeadArchive, setIsConfirmingLeadArchive] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<LeadTabKey>('geral')
  const [, setNotesDraft] = useState<string>('')
  const [selectedLeadNotesBusinessId, setSelectedLeadNotesBusinessId] = useState<string>('')
  const [isCreatingBusinessNote, setIsCreatingBusinessNote] = useState<boolean>(false)
  const [viewingBusinessNoteIndex, setViewingBusinessNoteIndex] = useState<number | null>(null)
  const [editingBusinessNoteIndex, setEditingBusinessNoteIndex] = useState<number | null>(null)
  const [isConfirmingBusinessNoteDelete, setIsConfirmingBusinessNoteDelete] = useState<boolean>(false)
  const [newBusinessNoteDraft, setNewBusinessNoteDraft] = useState<NewBusinessNoteDraft>(
    initialNewBusinessNoteDraft
  )
  const [isCreatingLeadTabNote, setIsCreatingLeadTabNote] = useState<boolean>(false)
  const [newLeadTabNoteDraft, setNewLeadTabNoteDraft] = useState<NewLeadTabNoteDraft>(
    initialNewLeadTabNoteDraft
  )
  const [leadTabNotesError, setLeadTabNotesError] = useState<string | null>(null)
  const [hoveredLeadTab, setHoveredLeadTab] = useState<LeadTabKey | null>(null)
  const [hoveredBusinessTab, setHoveredBusinessTab] = useState<BusinessInnerTabKey | null>(null)
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const selectedBusinessIdRef = useRef<string | null>(null)
  const requestedBusinessTabRef = useRef<BusinessInnerTabKey | null>(null)
  const requestedBusinessNoteIndexRef = useRef<number | null>(null)
  const requestedBusinessFollowUpIdRef = useRef<string | null>(null)
  const [isBusinessActionsOpen, setIsBusinessActionsOpen] = useState<boolean>(false)
  const [isConfirmingBusinessDelete, setIsConfirmingBusinessDelete] = useState<boolean>(false)
  const [isConfirmingBusinessClose, setIsConfirmingBusinessClose] = useState<boolean>(false)
  const [isEditingBusiness, setIsEditingBusiness] = useState<boolean>(false)
  const [isCreatingBusinessFollowUp, setIsCreatingBusinessFollowUp] = useState<boolean>(false)
  const [newBusinessFollowUpDraft, setNewBusinessFollowUpDraft] = useState<NewBusinessFollowUpDraft>(
    initialNewBusinessFollowUpDraft
  )
  const [viewingBusinessFollowUpId, setViewingBusinessFollowUpId] = useState<string | null>(null)
  const [editingBusinessFollowUpId, setEditingBusinessFollowUpId] = useState<string | null>(null)
  const [isConfirmingViewedBusinessFollowUpDelete, setIsConfirmingViewedBusinessFollowUpDelete] =
    useState<boolean>(false)
  const [hoveredBusinessNoteIndex, setHoveredBusinessNoteIndex] = useState<number | null>(null)
  const [confirmingDeleteBusinessFollowUpId, setConfirmingDeleteBusinessFollowUpId] = useState<string | null>(null)
  const [hoveredBusinessFollowUpId, setHoveredBusinessFollowUpId] = useState<string | null>(null)
  const [hoveredBusinessFileId, setHoveredBusinessFileId] = useState<string | null>(null)
  const [businessAttachments, setBusinessAttachments] = useState<NegotiationAttachmentResponse[]>([])
  const [isBusinessAttachmentsLoading, setIsBusinessAttachmentsLoading] = useState<boolean>(false)
  const [isUploadingBusinessAttachment, setIsUploadingBusinessAttachment] = useState<boolean>(false)
  const [confirmingDeleteBusinessAttachmentId, setConfirmingDeleteBusinessAttachmentId] = useState<string | null>(null)
  const [deletingBusinessAttachmentId, setDeletingBusinessAttachmentId] = useState<string | null>(null)
  const [downloadingBusinessAttachmentId, setDownloadingBusinessAttachmentId] = useState<string | null>(null)
  const businessAttachmentInputRef = useRef<HTMLInputElement | null>(null)
  const [leadNegotiations, setLeadNegotiations] = useState<NegotiationResponse[]>([])
  const [negotiationFollowUps, setNegotiationFollowUps] = useState<NegotiationFollowUpResponse[]>([])
  const [businessesError, setBusinessesError] = useState<string | null>(null)
  const generalActionsRef = useRef<HTMLDivElement | null>(null)
  const [businessDetailDraft, setBusinessDetailDraft] = useState<BusinessDetailDraft | null>(null)
  const businessActionsRef = useRef<HTMLDivElement | null>(null)
  const [activeBusinessTab, setActiveBusinessTab] = useState<BusinessInnerTabKey>('informacoes')
  const [isCreatingBusiness, setIsCreatingBusiness] = useState<boolean>(false)
  const [newBusinessDraft, setNewBusinessDraft] = useState<NewBusinessDraft>(
    initialNewBusinessDraft
  )
  const [isUpdatingRuntimeMode, setIsUpdatingRuntimeMode] = useState<boolean>(false)
  const [runtimeModeError, setRuntimeModeError] = useState<string | null>(null)
  const notesDraftRef = useRef<string>('')
  const lastSavedNotesRef = useRef<string>('')
  const isSavingNotesRef = useRef<boolean>(false)
  const locationState = location.state as LeadPageLocationState | null
  const requestedInitialTab = locationState?.initialLeadTab ?? 'geral'
  const requestedInitialBusinessId = locationState?.initialBusinessId ?? null
  const requestedInitialBusinessTab = locationState?.initialBusinessTab ?? null
  const requestedInitialBusinessFollowUpId = locationState?.initialBusinessFollowUpId ?? null
  const closeLeadPath = location.pathname.startsWith('/negocios')
    ? '/negocios'
    : location.pathname.startsWith('/agenda')
      ? '/agenda'
      : location.pathname.startsWith('/arquivados')
        ? '/arquivados'
      : '/leads'
  const isManagingBusinessFollowUp =
    isCreatingBusinessFollowUp || editingBusinessFollowUpId !== null || viewingBusinessFollowUpId !== null
  const shouldLockMobileFormBackground =
    isMobile &&
    (isCreatingAgendaFollowUp ||
      isManagingBusinessFollowUp ||
      isCreatingBusiness ||
      isCreatingLeadTabNote ||
      isCreatingBusinessNote)
  const getCurrentMonthStart = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  const [agendaCalendarMonth, setAgendaCalendarMonth] = useState<Date>(() => getCurrentMonthStart())

  const formatFollowUpDate = (dateValue: string): string => {
    return dateValue ? formatDateTime(dateValue) : '-'
  }

  const getFollowUpVisualStatus = (followUp: LeadFollowUpResponse): FollowUpVisualStatus => {
    if (followUp.status !== 'pending') {
      return 'completed'
    }

    const parsedDate = parsePersistedUtcClockToBrowserDate(followUp.dueAt)
    if (!parsedDate) {
      return 'scheduled'
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    if (parsedDate < startOfToday) {
      return 'overdue'
    }

    if (parsedDate <= endOfToday) {
      return 'today'
    }

    return 'scheduled'
  }

  const getFollowUpLifecycleStatusTag = (status: LeadFollowUpResponse['status']) => {
    if (status === 'done') {
      return {
        label: 'Concluído',
        textColor: '#166534',
        background: '#dcfce7'
      }
    }

    if (status === 'canceled') {
      return {
        label: 'Cancelado',
        textColor: '#b91c1c',
        background: '#fee2e2'
      }
    }

    if (status === 'skipped') {
      return {
        label: 'Ignorado',
        textColor: '#7c2d12',
        background: '#ffedd5'
      }
    }

    return {
      label: 'Pendente',
      textColor: '#1d4ed8',
      background: '#dbeafe'
    }
  }

  const getFollowUpDateTagColors = (status: FollowUpVisualStatus) => {
    if (status === 'overdue') {
      return {
        textColor: '#b91c1c',
        background: '#fee2e2'
      }
    }

    if (status === 'today') {
      return {
        textColor: '#b45309',
        background: '#fef3c7'
      }
    }

    if (status === 'completed') {
      return {
        textColor: '#166534',
        background: '#dcfce7'
      }
    }

    return {
      textColor: '#1d4ed8',
      background: '#dbeafe'
    }
  }

  const handleCreateNegotiationFollowUp = async (
    negotiationId: string,
    title: string,
    dueAt: string,
    templateId?: string,
    templateVariables?: Record<string, string>
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    setBusinessesError(null)
    await WebhookService.createNegotiationFollowUp({
      negotiationId,
      title,
      templateId: templateId?.trim() || null,
      templateVariables:
        templateId?.trim() && templateVariables
          ? Object.fromEntries(
              Object.entries(templateVariables).filter(([, value]) => String(value).trim())
            )
          : {},
      dueAt
    })
    await refreshLeadNegotiations(leadId)
    onLeadUpdated?.()
  }

  const handleCreateAgendaFollowUp = async () => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    const selectedTemplate = messageTemplates.find(
      (template) => template.id === agendaFollowUpDraft.templateId
    ) ?? null

    if (!agendaFollowUpDraft.negotiationId || !agendaFollowUpDraft.title.trim() || !agendaFollowUpDraft.dueAt) {
      setFollowUpsError('Preencha negócio, título e data/hora.')
      return
    }

    if (hasMissingRequiredTemplateVariables(selectedTemplate, agendaFollowUpDraft.templateVariables)) {
      setFollowUpsError('Preencha as variáveis obrigatórias do template.')
      return
    }

    try {
      setFollowUpsError(null)
      await WebhookService.createNegotiationFollowUp({
        negotiationId: agendaFollowUpDraft.negotiationId,
        title: agendaFollowUpDraft.title.trim(),
        templateId: agendaFollowUpDraft.templateId.trim() || null,
        templateVariables: agendaFollowUpDraft.templateId.trim()
          ? Object.fromEntries(
              Object.entries(agendaFollowUpDraft.templateVariables).filter(([, value]) => String(value).trim())
            )
          : {},
        dueAt: agendaFollowUpDraft.dueAt
      })

      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()

      setAgendaFollowUpDraft((currentDraft) => ({
        ...currentDraft,
        title: '',
        templateId: '',
        templateVariables: {},
        dueAt: ''
      }))
      setIsCreatingAgendaFollowUp(false)
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao criar follow-up.'
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
    templateId?: string,
    templateVariables?: Record<string, string>,
    status?: LeadFollowUpResponse['status']
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    try {
      setBusinessesError(null)
      await WebhookService.updateNegotiationFollowUp(followUpId, {
        title,
        templateId: templateId?.trim() || null,
        templateVariables:
          templateId?.trim() && templateVariables
            ? Object.fromEntries(
                Object.entries(templateVariables).filter(([, value]) => String(value).trim())
              )
            : {},
        dueAt,
        status
      })
      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao atualizar follow-up.'
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
      const message = exception instanceof Error ? exception.message : 'Falha ao excluir follow-up.'
      setBusinessesError(message)
    }
  }

  const handleToggleNegotiationFollowUpStatus = async (
    followUpId: string,
    currentStatus: LeadFollowUpResponse['status']
  ) => {
    if (!leadId) return

    try {
      setBusinessesError(null)

      if (currentStatus === 'done') {
        await WebhookService.updateNegotiationFollowUp(followUpId, {
          status: 'pending',
          completedAt: null
        })
      } else {
        await WebhookService.updateNegotiationFollowUp(followUpId, {
          status: 'done',
          completedAt: new Date().toISOString()
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
      const attachments = await WebhookService.loadNegotiationAttachments(negotiationId)
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

  const handleUploadBusinessAttachment = async (
    negotiationId: string,
    file: File
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

  const handleDownloadBusinessAttachment = async (attachmentId: string) => {
    setDownloadingBusinessAttachmentId(attachmentId)

    try {
      setBusinessesError(null)
      const response = await WebhookService.getNegotiationAttachmentDownloadUrl(
        attachmentId
      )

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
    negotiationId: string
  ) => {
    setDeletingBusinessAttachmentId(attachmentId)

    try {
      setBusinessesError(null)
      await WebhookService.deleteNegotiationAttachment(attachmentId)
      await loadBusinessAttachments(negotiationId)
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

  const applyActionHoverBackground = (isHovered: boolean, target: HTMLButtonElement) => {
    target.style.background = isHovered ? interactionTheme.clickableCardHoverBackground : '#ffffff'
  }

  const syncInfoDraftFromLead = () => {
    const instagramValue = leadData?.socialLinks?.instagram?.trim() ?? ''
    const urlValue = leadData?.socialLinks?.url?.trim() ?? ''
    const selectedSocialLinks: LeadSocialLinkKey[] = []

    if (instagramValue) {
      selectedSocialLinks.push('instagram')
    }

    if (urlValue) {
      selectedSocialLinks.push('url')
    }

    setInfoDraft({
      name: leadData?.name?.trim() ?? '',
      phone: formatLeadPhoneInput(leadData?.phone?.trim() ?? ''),
      email: leadData?.email?.trim() ?? '',
      source: leadData?.source?.trim() ?? '',
      location: leadData?.location?.trim() ?? '',
      leadQualification: leadData?.leadQualification ?? '',
      qualification: leadData?.initialContext?.trim() ?? '',
      socialLinks: {
        instagram: instagramValue,
        url: urlValue
      },
      selectedSocialLinks
    })
  }

  const saveLeadNotes = async () => {
    if (!leadId || !leadData || isSavingNotesRef.current) return

    const currentNotes = notesDraftRef.current
    const persistedNotes = leadData.initialContext ?? ''

    if (currentNotes === persistedNotes || currentNotes === lastSavedNotesRef.current) {
      return
    }

    try {
      isSavingNotesRef.current = true

      const updatedLead = await WebhookService.updateLead(leadId, {
        initialContext: currentNotes
      })

      lastSavedNotesRef.current = updatedLead.initialContext ?? currentNotes
      setLeadData(updatedLead)
      setInfoDraft((current) => ({
        ...current,
        qualification: updatedLead.initialContext?.trim() ?? ''
      }))
      setError(null)
      onLeadUpdated?.()
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao salvar notas.'
      setError(message)
    } finally {
      isSavingNotesRef.current = false
    }
  }

  const handleSaveLeadInfo = async () => {
    if (!leadId || !leadData) return

    try {
      if (!isLeadPhoneComplete(infoDraft.phone)) {
        setError('Telefone inválido. Informe DDD + número com 8 ou 9 dígitos.')
        return
      }

      const trimmedEmail = infoDraft.email.trim()
      const persistedPhone = toPersistedLeadPhone(infoDraft.phone)
      const trimmedInstagram = infoDraft.socialLinks.instagram.trim()
      const trimmedUrl = infoDraft.socialLinks.url.trim()
      const socialLinksPayload: Partial<Record<LeadSocialLinkKey, string>> = {}

      if (infoDraft.selectedSocialLinks.includes('instagram') && trimmedInstagram) {
        socialLinksPayload.instagram = trimmedInstagram
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
        initialContext: infoDraft.qualification.trim() || undefined
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
      const message = exception instanceof Error ? exception.message : 'Falha ao atualizar informações do lead.'
      setError(message)
    }
  }

  const handleCreateLead = async () => {
    const trimmedName = infoDraft.name.trim()
    const persistedPhone = toPersistedLeadPhone(infoDraft.phone)
    const trimmedEmail = infoDraft.email.trim()
    const trimmedSource = infoDraft.source.trim()
    const trimmedInstagram = infoDraft.socialLinks.instagram.trim()
    const trimmedUrl = infoDraft.socialLinks.url.trim()
    const socialLinksPayload: Partial<Record<LeadSocialLinkKey, string>> = {}

    if (infoDraft.selectedSocialLinks.includes('instagram') && trimmedInstagram) {
      socialLinksPayload.instagram = trimmedInstagram
    }

    if (infoDraft.selectedSocialLinks.includes('url') && trimmedUrl) {
      socialLinksPayload.url = trimmedUrl
    }

    const hasSocialLinks = Object.keys(socialLinksPayload).length > 0

    if (!trimmedName || !isLeadPhoneComplete(infoDraft.phone)) {
      setError('Preencha nome e telefone válido (DDD + 8 ou 9 dígitos).')
      return
    }

    try {
      const createdLead = await WebhookService.createLead({
        name: trimmedName,
        phone: persistedPhone,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(trimmedSource ? { source: trimmedSource } : {}),
        ...(infoDraft.location.trim() ? { location: infoDraft.location.trim() } : {}),
        ...(hasSocialLinks ? { socialLinks: socialLinksPayload } : {}),
        leadQualification: infoDraft.leadQualification || null
      })

      setError(null)
      onLeadCreated?.()
      onLeadUpdated?.()
      navigate(`/leads/${createdLead.id}${location.search}`, { replace: true })
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao criar lead.'
      setError(message)
    }
  }

  const handleStartLeadInfoEdit = () => {
    syncInfoDraftFromLead()
    setIsEditingLeadInfo(true)
    setIsConfirmingLeadDelete(false)
    setIsConfirmingLeadArchive(false)
    setIsGeneralActionsOpen(false)
  }

  const handleCancelLeadInfoEdit = () => {
    syncInfoDraftFromLead()
    setIsEditingLeadInfo(false)
  }

  const handleDeleteLead = async () => {
    if (!leadId) return

    try {
      await WebhookService.deleteLead(leadId)
      onLeadUpdated?.()
      navigate(closeLeadPath)
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao deletar lead.'
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
          isFavorite: nextFavoriteState
        }
      })
      onLeadUpdated?.()
      setIsGeneralActionsOpen(false)
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao atualizar favorito.'
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
          state: nextState
        }
      })
      onLeadUpdated?.()
      setIsGeneralActionsOpen(false)
      setIsConfirmingLeadArchive(false)
      navigate(`${closeLeadPath}${location.search}`)
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao atualizar arquivamento do lead.'
      setError(message)
    }
  }

  const resetFollowUpSorting = () => {
    setStatusSortFocus('overdue')
    setDateSortOrder('asc')
  }

  const refreshLeadNegotiations = async (targetLeadId: string) => {
    const [negotiations, followUps] = await Promise.all([
      WebhookService.loadNegotiations(),
      WebhookService.loadNegotiationFollowUps()
    ])

    const leadRelatedNegotiations = negotiations.filter(
      (negotiation) => negotiation.leadId === targetLeadId
    )

    const leadNegotiationIds = new Set(leadRelatedNegotiations.map((negotiation) => negotiation.id))
    const leadRelatedFollowUps = followUps.filter((followUp) => leadNegotiationIds.has(followUp.negotiationId))

    setLeadNegotiations(leadRelatedNegotiations)
    setNegotiationFollowUps(leadRelatedFollowUps)
    setFollowUpsTotalItems(leadRelatedFollowUps.length)
    setBusinessesError(null)
  }

  const handleLeadTabChange = (nextTab: LeadTabKey) => {
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
    resetFollowUpSorting()
    setIsGeneralActionsOpen(false)
    setIsEditingLeadInfo(false)
    setIsConfirmingLeadDelete(false)
    setIsConfirmingLeadArchive(false)

    if (nextTab === 'followups' && leadId) {
      void refreshLeadNegotiations(leadId)
    }
  }

  useEffect(() => {
    setActiveTab(requestedInitialTab)
  }, [leadId, requestedInitialTab])

  useEffect(() => {
    const nextNotesDraft = leadData?.initialContext ?? ''
    setNotesDraft(nextNotesDraft)
    notesDraftRef.current = nextNotesDraft
    lastSavedNotesRef.current = nextNotesDraft
    setInfoDraft((current) => ({
      ...current,
      qualification: leadData?.initialContext?.trim() ?? ''
    }))
  }, [leadData?.id, leadData?.initialContext])

  useEffect(() => {
    if (requestedInitialTab !== 'negocios' || !requestedInitialBusinessId) {
      return
    }

    requestedBusinessTabRef.current = requestedInitialBusinessTab ?? 'informacoes'
    requestedBusinessFollowUpIdRef.current =
      requestedInitialBusinessTab === 'followups' ? requestedInitialBusinessFollowUpId : null
    setIsCreatingBusiness(false)
    setSelectedBusinessId(requestedInitialBusinessId)
  }, [
    leadId,
    requestedInitialBusinessFollowUpId,
    requestedInitialBusinessId,
    requestedInitialBusinessTab,
    requestedInitialTab,
    location.key
  ])

  useEffect(() => {
    const shouldOpenRequestedBusiness =
      requestedInitialTab === 'negocios' &&
      Boolean(requestedInitialBusinessId)

    setIsCreatingBusiness(false)
    setIsCreatingBusinessFollowUp(false)
    setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
    setViewingBusinessFollowUpId(null)
    setSelectedBusinessId(shouldOpenRequestedBusiness ? requestedInitialBusinessId : null)
    // Keep ref cleared so the selected-business effect can apply initial tab state.
    selectedBusinessIdRef.current = null
    requestedBusinessTabRef.current = shouldOpenRequestedBusiness
      ? requestedInitialBusinessTab ?? 'informacoes'
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
        ? requestedInitialBusinessTab ?? 'informacoes'
        : 'informacoes'
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
    requestedInitialTab
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
      requestedInitialTab === 'negocios' &&
      Boolean(requestedInitialBusinessId)

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
        requestedBusinessTabRef.current = requestedInitialBusinessTab ?? 'informacoes'
        requestedBusinessFollowUpIdRef.current =
          requestedInitialBusinessTab === 'followups' ? requestedInitialBusinessFollowUpId : null
      } else {
        setActiveBusinessTab('informacoes')
        requestedBusinessTabRef.current = null
      }

      selectedBusinessIdRef.current = null
      return
    }

    const selectedBusiness = leadNegotiations.find((business) => business.id === selectedBusinessId)

    if (!selectedBusiness) {
      setBusinessDetailDraft(null)
      return
    }

    setBusinessDetailDraft({
      title: selectedBusiness.title ?? '',
      negotiationType: selectedBusiness.negotiationType ?? '',
      stage: selectedBusiness.stage,
      temperature: selectedBusiness.temperature ?? '',
      value: formatLeadValueInputField(selectedBusiness.value),
      notes: formatNegotiationNotes(selectedBusiness.notes)
    })

    const hasRequestedBusinessNote =
      requestedBusinessTabRef.current === 'notas' && requestedBusinessNoteIndexRef.current !== null
    const hasRequestedBusinessFollowUp =
      requestedBusinessTabRef.current === 'followups' && requestedBusinessFollowUpIdRef.current !== null

    if (selectedBusinessIdRef.current !== selectedBusinessId || hasRequestedBusinessNote || hasRequestedBusinessFollowUp) {
      const requestedBusinessTab = requestedBusinessTabRef.current ?? 'informacoes'
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
    requestedInitialTab
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
      (business) => business.id === selectedLeadNotesBusinessId
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
    if (activeBusinessTab !== 'arquivos' || !selectedBusinessId) {
      return
    }

    void loadBusinessAttachments(selectedBusinessId)
  }, [activeBusinessTab, selectedBusinessId])

  useEffect(() => {
    if (activeBusinessTab === 'followups') {
      return
    }

    setIsCreatingBusinessFollowUp(false)
    setNewBusinessFollowUpDraft(initialNewBusinessFollowUpDraft)
    setViewingBusinessFollowUpId(null)
  }, [activeBusinessTab])

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
      leadData?.state?.trim().toLowerCase() === 'archived' ? 'Arquivado' : 'Ativo'
    const isLeadArchived = leadStateLabel === 'Arquivado'
    const isLeadFavorite = Boolean(leadData?.isFavorite)
    const leadStateStyle =
      leadStateLabel === 'Arquivado'
        ? {
            color: '#b45309',
            background: '#fef3c7'
          }
        : {
            color: '#16a34a',
            background: '#dcfce7'
          }
    const formattedPhone = formatPhoneNumber(leadData?.phone?.trim() || '')
    const createdAtLabel = formatDateOnly(leadData?.createdAt)
    const lastMessageSummaryLabel = formatLastMessageSummary(leadData?.lastMessageAt ?? null)
    const totalFollowUpsLabel = Number(followUpsTotalItems ?? 0)
    const totalBusinessesLabel = leadNegotiations.length

    const parseNegotiationValue = (value?: string | null): number => {
      const parsed = parseLeadValueToNumber(value)
      return parsed ?? 0
    }

    const totalBusinessValue = leadNegotiations.reduce(
      (sum, negotiation) => sum + parseNegotiationValue(negotiation.value),
      0
    )

    const totalWonValue = leadNegotiations.reduce((sum, negotiation) => {
      if (negotiation.stage !== 'WON' || !negotiation.closedAt) {
        return sum
      }

      return sum + parseNegotiationValue(negotiation.value)
    }, 0)

    const totalLostValue = leadNegotiations.reduce((sum, negotiation) => {
      if (negotiation.stage !== 'LOST' || !negotiation.closedAt) {
        return sum
      }

      return sum + parseNegotiationValue(negotiation.value)
    }, 0)

    const totalBusinessValueLabel = formatLeadValue(totalBusinessValue.toFixed(2))
    const totalWonValueLabel = formatLeadValue(totalWonValue.toFixed(2))
    const totalLostValueLabel = formatLeadValue(totalLostValue.toFixed(2))
    const emailLabel = leadData?.email?.trim() || '-'
    const instagramLabel = leadData?.socialLinks?.instagram?.trim() || '-'
    const urlLabel = leadData?.socialLinks?.url?.trim() || '-'
    const leadQualificationTagPresentation = getLeadQualificationTagPresentation(
      leadData?.leadQualification ?? null
    )

    const sourceTagPresentation = getSourceTagPresentation(leadData?.source?.trim() || '')

    return (
      <section
        className="mobile-tabs-scrollbar-hidden"
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 10,
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: isMobile ? 0 : 4,
          boxSizing: 'border-box'
        }}
      >
        {!isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1
                  }}
                >
                  {leadData?.name?.trim() || '-'}
                </h2>
                {isLeadFavorite ? (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: '#fef9c3',
                      color: '#f59e0b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Lead favoritado"
                    title="Lead favoritado"
                  >
                    <Star size={13} fill="#f59e0b" />
                  </span>
                ) : null}
              </div>
            </div>

            <div ref={generalActionsRef} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsGeneralActionsOpen((current) => !current)}
                style={{
                  height: 28,
                  minWidth: 28,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#6b7280',
                  padding: '0 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1
                }}
                aria-label="Abrir ações do lead"
              >
                <MoreVertical size={16} />
              </button>

              {isGeneralActionsOpen ? (
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
                    gap: 4
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
                      cursor: 'pointer'
                    }}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleLeadFavorite()
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
                      cursor: 'pointer'
                    }}
                  >
                    {isLeadFavorite ? 'Desfavoritar' : 'Favoritar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isLeadArchived) {
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
                      cursor: 'pointer'
                    }}
                  >
                    {isLeadArchived ? 'Desarquivar' : 'Arquivar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
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
                      cursor: 'pointer'
                    }}
                  >
                    Deletar
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

          {isConfirmingLeadDelete ? (
            <article
              style={{
                border: '1px solid #fecaca',
                borderRadius: 16,
                padding: 24,
                background: '#fff7f7',
                display: 'grid',
                gap: 18
              }}
            >
              <h3 style={{ margin: 0, color: '#b91c1c', fontSize: 15, fontWeight: 800 }}>
                Deseja deletar esse lead?
              </h3>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
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
                gap: 18
              }}
            >
              <h3 style={{ margin: 0, color: '#92400e', fontSize: 15, fontWeight: 800 }}>
                Deseja arquivar esse lead?
              </h3>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
                  }}
                >
                  Arquivar
                </button>
              </div>
            </article>
          ) : null}

          {!isEditingLeadInfo && !isConfirmingLeadDelete && !isConfirmingLeadArchive ? (
            <article style={{ display: 'grid', gap: 14, marginTop: 6 }}>
              <section style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
                    <FileText size={15} />
                  </span>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Resumo</h3>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Clock4 size={14} /> Última mensagem
                    </span>
                    <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{lastMessageSummaryLabel}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CalendarClock size={14} /> Follow-ups
                    </span>
                    <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{totalFollowUpsLabel}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px' }}>
                    <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <BriefcaseBusiness size={14} /> Total de negócios
                    </span>
                    <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{totalBusinessesLabel}</span>
                  </div>
                </div>
              </section>
            </article>
          ) : null}

          {!isEditingLeadInfo && !isConfirmingLeadDelete && !isConfirmingLeadArchive ? (
            <article style={{ display: 'grid', gap: 10, marginTop: 6 }}>
              <section style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
                    <TrendingUp size={15} />
                  </span>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Financeiro</h3>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CircleDollarSign size={14} /> Valor total
                    </span>
                    <span style={{ color: '#111827', fontSize: 14, fontWeight: 800 }}>{totalBusinessValueLabel}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={14} /> Valor Faturado
                    </span>
                    <span style={{ color: '#15803d', fontSize: 14, fontWeight: 800 }}>{totalWonValueLabel}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px' }}>
                    <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <XCircle size={14} /> Valor Perdido
                    </span>
                    <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 800 }}>{totalLostValueLabel}</span>
                  </div>
                </div>
              </section>
            </article>
          ) : null}

          {!isConfirmingLeadDelete && !isConfirmingLeadArchive ? (
            <article
              style={{
                border: 'none',
                borderRadius: 0,
                padding: 0,
                marginTop: 10,
                background: '#ffffff'
              }}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
                  <CircleUserRound size={15} />
                </span>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Informações</h3>
              </div>
            </div>

            {isEditingLeadInfo ? (
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gap: 14,
                  maxWidth: 520
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Nome</span>
                  <input
                    type="text"
                    value={infoDraft.name}
                    onChange={(event) =>
                      setInfoDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 16,
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Telefone</span>
                  <input
                    type="text"
                    value={infoDraft.phone}
                    onChange={(event) =>
                      setInfoDraft((current) => ({ ...current, phone: formatLeadPhoneInput(event.target.value) }))
                    }
                    autoComplete="new-password"
                    maxLength={14}
                    inputMode="numeric"
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 16,
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Email</span>
                  <input
                    type="email"
                    value={infoDraft.email}
                    onChange={(event) =>
                      setInfoDraft((current) => ({ ...current, email: event.target.value }))
                    }
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 16,
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Origem</span>
                  <select
                    value={infoDraft.source.toLowerCase()}
                    onChange={(event) =>
                      setInfoDraft((current) => ({ ...current, source: event.target.value }))
                    }
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 14,
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="metaads">MetaAds</option>
                    <option value="indicacao">Indicação</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Localização</span>
                  <input
                    type="text"
                    value={infoDraft.location}
                    onChange={(event) =>
                      setInfoDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 16,
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Qualificação</span>
                  <select
                    value={infoDraft.leadQualification}
                    onChange={(event) =>
                      setInfoDraft((current) => ({
                        ...current,
                        leadQualification: event.target.value as '' | 'qualify' | 'not qualify'
                      }))
                    }
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '0 12px',
                      fontSize: 14,
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Não definido</option>
                    <option value="qualify">Qualificado</option>
                    <option value="not qualify">Não qualificado</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Links</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#334155',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={infoDraft.selectedSocialLinks.includes('instagram')}
                        onChange={() => {
                          setInfoDraft((current) => {
                            const isSelected = current.selectedSocialLinks.includes('instagram')

                            if (isSelected) {
                              return {
                                ...current,
                                selectedSocialLinks: current.selectedSocialLinks.filter((item) => item !== 'instagram'),
                                socialLinks: {
                                  ...current.socialLinks,
                                  instagram: ''
                                }
                              }
                            }

                            return {
                              ...current,
                              selectedSocialLinks: [...current.selectedSocialLinks, 'instagram']
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
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={infoDraft.selectedSocialLinks.includes('url')}
                        onChange={() => {
                          setInfoDraft((current) => {
                            const isSelected = current.selectedSocialLinks.includes('url')

                            if (isSelected) {
                              return {
                                ...current,
                                selectedSocialLinks: current.selectedSocialLinks.filter((item) => item !== 'url'),
                                socialLinks: {
                                  ...current.socialLinks,
                                  url: ''
                                }
                              }
                            }

                            return {
                              ...current,
                              selectedSocialLinks: [...current.selectedSocialLinks, 'url']
                            }
                          })
                        }}
                      />
                      URL
                    </label>
                  </div>
                </div>

                {infoDraft.selectedSocialLinks.includes('instagram') ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Instagram</span>
                    <input
                      type="text"
                      value={infoDraft.socialLinks.instagram}
                      onChange={(event) =>
                        setInfoDraft((current) => ({
                          ...current,
                          socialLinks: {
                            ...current.socialLinks,
                            instagram: event.target.value
                          }
                        }))
                      }
                      placeholder="@usuario ou link"
                      style={{
                        width: '100%',
                        height: 42,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 12px',
                        fontSize: 16,
                        color: '#111827',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ) : null}

                {infoDraft.selectedSocialLinks.includes('url') ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>URL</span>
                    <input
                      type="text"
                      value={infoDraft.socialLinks.url}
                      onChange={(event) =>
                        setInfoDraft((current) => ({
                          ...current,
                          socialLinks: {
                            ...current.socialLinks,
                            url: event.target.value
                          }
                        }))
                      }
                      placeholder="https://"
                      style={{
                        width: '100%',
                        height: 42,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '0 12px',
                        fontSize: 16,
                        color: '#111827',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleCancelLeadInfoEdit}
                  style={{
                    minWidth: 100,
                    height: 36,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleSaveLeadInfo()
                  }}
                  style={{
                    minWidth: 100,
                    height: 36,
                    border: 'none',
                    borderRadius: 8,
                    background: '#1f7a4d',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Salvar
                </button>
              </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  borderTop: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><User size={14} /> Nome</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{leadData?.name?.trim() || '-'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Phone size={14} /> Telefone</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{formattedPhone}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Mail size={14} /> Email</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{emailLabel}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Instagram size={14} /> Instagram</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{instagramLabel}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Link2 size={14} /> URL</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{urlLabel}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Compass size={14} /> Origem</span>
                  {sourceTagPresentation.label === '-' ? (
                    <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>-</span>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: sourceTagPresentation.textColor,
                        whiteSpace: 'nowrap',
                        background: `${sourceTagPresentation.textColor}33`,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 10px',
                        lineHeight: 1.1,
                        width: 'fit-content'
                      }}
                    >
                      {sourceTagPresentation.icon ? (
                        <span style={tagIconStyle}>{sourceTagPresentation.icon}</span>
                      ) : null}
                      <span style={tagContentStyle}>{sourceTagPresentation.label}</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /> Localização</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{leadData?.location?.trim() || '-'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><BadgeCheck size={14} /> Qualificação</span>
                  {leadQualificationTagPresentation.label === '-' ? (
                    <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>-</span>
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
                        lineHeight: 1.1
                      }}
                    >
                      {leadQualificationTagPresentation.label}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={14} /> Status</span>
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
                      lineHeight: 1.1
                    }}
                  >
                    {leadStateLabel}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '12px 2px' }}>
                  <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><CalendarDays size={14} /> Criado em</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>{createdAtLabel}</span>
                </div>
              </div>
            )}
            </article>
          ) : null}
      </section>
    )
  }

  const renderFollowUpsTab = () => {
    const businessNameById = new Map(leadNegotiations.map((business) => [business.id, business.title ?? 'Negócio sem nome']))
    const selectedAgendaTemplate =
      messageTemplates.find((template) => template.id === agendaFollowUpDraft.templateId) ?? null
    const canCreateAgendaFollowUp =
      Boolean(agendaFollowUpDraft.negotiationId) &&
      Boolean(agendaFollowUpDraft.title.trim()) &&
      !hasMissingRequiredTemplateVariables(
        selectedAgendaTemplate,
        agendaFollowUpDraft.templateVariables
      ) &&
      Boolean(agendaFollowUpDraft.dueAt)
    const shouldShowDesktopCreateOnly = !isMobile && isCreatingAgendaFollowUp
    const visualStatusOrder: FollowUpVisualStatus[] = [
      statusSortFocus as FollowUpVisualStatus,
      ...(['overdue', 'today', 'scheduled', 'completed'] as FollowUpVisualStatus[]).filter(
        (status) => status !== statusSortFocus
      )
    ]
    const visualStatusPriority = new Map(visualStatusOrder.map((status, index) => [status, index]))
    const agendaFollowUps = [...negotiationFollowUps].sort((firstItem, secondItem) => {
      const firstVisualStatus = getFollowUpVisualStatus({
        ...firstItem,
        leadId: leadId ?? ''
      })
      const secondVisualStatus = getFollowUpVisualStatus({
        ...secondItem,
        leadId: leadId ?? ''
      })
      const firstStatusPriority = visualStatusPriority.get(firstVisualStatus) ?? 0
      const secondStatusPriority = visualStatusPriority.get(secondVisualStatus) ?? 0

      if (firstStatusPriority !== secondStatusPriority) {
        return firstStatusPriority - secondStatusPriority
      }

      const firstDate = getApiDateTimestamp(firstItem.dueAt)
      const secondDate = getApiDateTimestamp(secondItem.dueAt)
      return dateSortOrder === 'asc' ? firstDate - secondDate : secondDate - firstDate
    })

    const toDateKey = (date: Date) => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const monthStart = new Date(agendaCalendarMonth.getFullYear(), agendaCalendarMonth.getMonth(), 1)
    const monthEnd = new Date(agendaCalendarMonth.getFullYear(), agendaCalendarMonth.getMonth() + 1, 0)
    const daysInMonth = monthEnd.getDate()
    const leadingBlankDays = monthStart.getDay()
    const calendarCellCount = Math.ceil((leadingBlankDays + daysInMonth) / 7) * 7
    const todayDateKey = toDateKey(new Date())
    const monthLabelRaw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      monthStart
    )
    const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)
    const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

    const followUpsByDate = new Map<string, NegotiationFollowUpResponse[]>()
    agendaFollowUps.forEach((followUp) => {
      const parsedDate = parsePersistedUtcClockToBrowserDate(followUp.dueAt)
      if (!parsedDate) {
        return
      }

      const dateKey = toDateKey(parsedDate)
      const items = followUpsByDate.get(dateKey)
      if (items) {
        items.push(followUp)
      } else {
        followUpsByDate.set(dateKey, [followUp])
      }
    })

    const calendarCells = Array.from({ length: calendarCellCount }, (_, cellIndex) => {
      const dayNumber = cellIndex - leadingBlankDays + 1
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null
      }

      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNumber)
      const dateKey = toDateKey(date)
      return {
        dayNumber,
        date,
        dateKey,
        isToday: dateKey === todayDateKey,
        followUps: followUpsByDate.get(dateKey) ?? []
      }
    })

    const navigateToFollowUp = (followUp: NegotiationFollowUpResponse) => {
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
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isMobile ? 2 : 6,
          boxSizing: 'border-box',
          padding: isMobile ? '22px 18px 28px' : 0
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
              paddingBottom: 6
            }}
          >
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 700 }}>
              Novo follow-up
            </h3>

            <button
              type="button"
              aria-label="Fechar criação de follow-up"
              onClick={handleCancelAgendaFollowUpCreation}
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
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Negócio</label>
          <select
            value={agendaFollowUpDraft.negotiationId}
            onChange={(event) =>
              setAgendaFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                negotiationId: event.target.value
              }))
            }
            style={{
              width: '100%',
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: agendaFollowUpDraft.negotiationId ? '#111827' : '#6b7280',
              fontSize: isMobile ? 17 / 1.2 : 14,
              fontWeight: 600,
              boxSizing: 'border-box',
              background: '#ffffff'
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

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Título</label>
          <input
            type="text"
            placeholder="Título do follow-up"
            value={agendaFollowUpDraft.title}
            onChange={(event) =>
              setAgendaFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Template</label>
          <select
            value={agendaFollowUpDraft.templateId}
            onChange={(event) => {
              const templateId = event.target.value
              const nextTemplate = messageTemplates.find((template) => template.id === templateId) ?? null

              setAgendaFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                templateId,
                templateVariables: buildTemplateVariablesDraft(
                  nextTemplate,
                  currentDraft.templateVariables
                )
              }))
            }}
            style={{
              width: '100%',
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: agendaFollowUpDraft.templateId ? '#111827' : '#6b7280',
              fontSize: isMobile ? 17 / 1.2 : 14,
              fontWeight: 600,
              boxSizing: 'border-box',
              background: '#ffffff'
            }}
          >
            <option value="">Sem template</option>
            {messageTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {selectedAgendaTemplate?.variables?.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedAgendaTemplate.variables.map((variable) => (
              <div key={variable.key} style={{ display: 'grid', gap: 8 }}>
                <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
                  {variable.label}{variable.required ? ' *' : ''}
                </label>
                <input
                  type="text"
                  placeholder={`Valor para ${variable.label}`}
                  value={agendaFollowUpDraft.templateVariables[variable.key] ?? ''}
                  onChange={(event) =>
                    setAgendaFollowUpDraft((currentDraft) => ({
                      ...currentDraft,
                      templateVariables: {
                        ...currentDraft.templateVariables,
                        [variable.key]: event.target.value
                      }
                    }))
                  }
                  style={{
                    height: isMobile ? 46 : 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: isMobile ? 17 / 1.2 : 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Data/Hora</label>
          <input
            type="datetime-local"
            value={agendaFollowUpDraft.dueAt}
            onChange={(event) =>
              setAgendaFollowUpDraft((currentDraft) => ({
                ...currentDraft,
                dueAt: event.target.value
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
          <button
            type="button"
            onClick={handleCancelAgendaFollowUpCreation}
            style={{
              minWidth: 120,
              height: 42,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleCreateAgendaFollowUp()}
            disabled={!canCreateAgendaFollowUp}
            style={{
              minWidth: 120,
              height: 42,
              border: 'none',
              borderRadius: 8,
              background: '#1f7a4d',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor: canCreateAgendaFollowUp ? 'pointer' : 'not-allowed'
            }}
          >
            Salvar
          </button>
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
          minHeight: 0
        }}
      >
        {followUpsError ? <p style={{ margin: 0, color: '#b91c1c' }}>{followUpsError}</p> : null}

        {!shouldShowDesktopCreateOnly ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            {!isCreatingAgendaFollowUp ? (
              <button
                type="button"
                onClick={() => {
                  const defaultNegotiationId = leadNegotiations[0]?.id ?? ''
                  setAgendaFollowUpDraft({
                    ...initialAgendaFollowUpDraft,
                    negotiationId: agendaFollowUpDraft.negotiationId || defaultNegotiationId
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
                  lineHeight: 1.2
                }}
              >
                + Adicionar Follow-up
              </button>
            ) : (
              null
            )}

            <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
              {agendaFollowUps.length} follow-up{agendaFollowUps.length === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}

        {!isMobile && isCreatingAgendaFollowUp ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                Novo follow-up
              </h2>

              <button
                type="button"
                onClick={handleCancelAgendaFollowUpCreation}
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
                aria-label="Fechar criação de follow-up"
              >
                X
              </button>
            </div>

            <article
              style={{
                border: 'none',
                borderRadius: 0,
                padding: 0,
                background: 'transparent',
                display: 'grid',
                gap: 18,
                maxWidth: 760
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
                cursor: 'default'
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
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)'
              }}
            >
              {agendaFollowUpCreateForm}
            </aside>
          </>
        ) : null}

        {!shouldShowDesktopCreateOnly ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eeeeee',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f3f4f6',
              borderBottom: '1px solid #ececec',
              padding: '10px 12px'
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{monthLabel}</span>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  setAgendaCalendarMonth((currentMonth) =>
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  )
                }}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: '#ffffff',
                  height: 28,
                  width: 28,
                  padding: 0,
                  color: '#475569',
                  cursor: 'pointer'
                }}
                aria-label="Mês anterior"
              >
                {'<'}
              </button>

              <button
                type="button"
                onClick={() => setAgendaCalendarMonth(getCurrentMonthStart())}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: '#ffffff',
                  height: 28,
                  padding: '0 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgendaCalendarMonth((currentMonth) =>
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  )
                }}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: '#ffffff',
                  height: 28,
                  width: 28,
                  padding: 0,
                  color: '#475569',
                  cursor: 'pointer'
                }}
                aria-label="Próximo mês"
              >
                {'>'}
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: 460,
              overflowY: 'auto'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                borderBottom: '1px solid #ececec',
                background: '#f8fafc',
                position: 'sticky',
                top: 0,
                zIndex: 1
              }}
            >
              {weekdayLabels.map((weekday) => (
                <div
                  key={weekday}
                  style={{
                    minHeight: 30,
                    borderRight: '1px solid #eef2f7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'
              }}
            >
              {calendarCells.map((cell, cellIndex) => {
                if (!cell) {
                  return (
                    <div
                      key={`blank-${cellIndex}`}
                      style={{
                        height: 112,
                        borderRight: '1px solid #eef2f7',
                        borderBottom: '1px solid #eef2f7',
                        background: '#f8fafc'
                      }}
                    />
                  )
                }

                return (
                  <div
                    key={cell.dateKey}
                    style={{
                      height: 112,
                      borderRight: '1px solid #eef2f7',
                      borderBottom: '1px solid #eef2f7',
                      padding: '8px 8px 10px',
                      boxSizing: 'border-box',
                      background: cell.isToday ? '#f0fdf4' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: cell.isToday ? '#166534' : '#334155',
                        lineHeight: 1
                      }}
                    >
                      {cell.dayNumber}{cell.followUps.length > 0 ? ` (${cell.followUps.length})` : ''}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 4,
                        alignContent: 'start',
                        minHeight: 0,
                        overflowY: 'auto',
                        paddingRight: 2
                      }}
                    >
                      {cell.followUps.length === 0 ? (
                        <span style={{ fontSize: 11, color: '#cbd5e1' }}>-</span>
                      ) : (
                        cell.followUps.map((followUp) => {
                          const visualStatus = getFollowUpVisualStatus({
                            ...followUp,
                            leadId: leadId ?? ''
                          })
                          const followUpDateTagColors = getFollowUpDateTagColors(visualStatus)
                          const dueTime = followUp.dueAt
                            ? formatDateTime(followUp.dueAt)
                            : '--:--'
                          const isHovered = hoveredFollowUpId === followUp.id
                          const cardBorderColor = isHovered
                            ? `${followUpDateTagColors.textColor}66`
                            : `${followUpDateTagColors.textColor}44`
                          const cardBackgroundColor = isHovered
                            ? `${followUpDateTagColors.textColor}22`
                            : followUpDateTagColors.background

                          return (
                            <button
                              key={followUp.id}
                              type="button"
                              onClick={() => navigateToFollowUp(followUp)}
                              onMouseEnter={() => setHoveredFollowUpId(followUp.id)}
                              onMouseLeave={() => setHoveredFollowUpId(null)}
                              style={{
                                width: '100%',
                                border: `1px solid ${cardBorderColor}`,
                                borderRadius: 6,
                                background: cardBackgroundColor,
                                padding: '4px 6px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'grid',
                                gap: 2,
                                lineHeight: 1.1
                              }}
                              title={`${businessNameById.get(followUp.negotiationId) ?? 'Negócio sem nome'} - ${followUp.title} - ${dueTime}`}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  minWidth: 0,
                                  color: followUpDateTagColors.textColor,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {followUp.title}
                              </span>

                              <span
                                style={{
                                  color: '#475569',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {dueTime} • {businessNameById.get(followUp.negotiationId) ?? 'Negócio sem nome'}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        ) : null}
      </section>
    )
  }

  const renderBusinessFollowUpsTab = (businessId: string) => {
    const followUpsColumns = 'minmax(0,1fr) 112px 156px 84px'
    const followUpsRowMinHeight = 50
    const viewedBusinessFollowUp = viewingBusinessFollowUpId
      ? negotiationFollowUps.find((followUp) => followUp.id === viewingBusinessFollowUpId) ?? null
      : null
    const editingBusinessFollowUp = editingBusinessFollowUpId
      ? negotiationFollowUps.find((followUp) => followUp.id === editingBusinessFollowUpId) ?? null
      : null
    const isManagingBusinessFollowUp =
      isCreatingBusinessFollowUp || editingBusinessFollowUp !== null || viewedBusinessFollowUp !== null
    const shouldShowDesktopCreateOnly = !isMobile && isManagingBusinessFollowUp
    const selectedFollowUpBusiness = leadNegotiations.find((business) => business.id === businessId) ?? null
    const selectedFollowUpBusinessTitle = selectedFollowUpBusiness?.title?.trim() || 'Negócio sem nome'
    const selectedBusinessTemplate =
      messageTemplates.find((template) => template.id === newBusinessFollowUpDraft.templateId) ?? null
    const canCreateBusinessFollowUp =
      Boolean(newBusinessFollowUpDraft.title.trim()) &&
      !hasMissingRequiredTemplateVariables(
        selectedBusinessTemplate,
        newBusinessFollowUpDraft.templateVariables
      ) &&
      Boolean(newBusinessFollowUpDraft.dueAt)
    const businessFollowUps = negotiationFollowUps
      .filter((followUp) => followUp.negotiationId === businessId)
      .sort((firstItem, secondItem) => {
        const firstDate = getApiDateTimestamp(firstItem.dueAt)
        const secondDate = getApiDateTimestamp(secondItem.dueAt)
        return firstDate - secondDate
      })

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
        templateId: viewedBusinessFollowUp.templateId ?? '',
        templateVariables: normalizeTemplateVariableDraft(viewedBusinessFollowUp.templateVariables),
        dueAt: viewedBusinessFollowUp.dueAt ?? '',
        status: viewedBusinessFollowUp.status ?? 'pending'
      })
      setViewingBusinessFollowUpId(null)
      setEditingBusinessFollowUpId(viewedBusinessFollowUp.id)
    }

    const handleSubmitBusinessFollowUp = async () => {
      if (!canCreateBusinessFollowUp) {
        setBusinessesError('Preencha o nome do follow-up e a data/hora.')
        return
      }

      try {
        setBusinessesError(null)
        if (editingBusinessFollowUp) {
          await handleUpdateNegotiationFollowUp(
            editingBusinessFollowUp.id,
            newBusinessFollowUpDraft.title.trim(),
            newBusinessFollowUpDraft.dueAt,
            newBusinessFollowUpDraft.templateId,
            newBusinessFollowUpDraft.templateVariables,
            newBusinessFollowUpDraft.status
          )
        } else {
          await handleCreateNegotiationFollowUp(
            businessId,
            newBusinessFollowUpDraft.title.trim(),
            newBusinessFollowUpDraft.dueAt,
            newBusinessFollowUpDraft.templateId,
            newBusinessFollowUpDraft.templateVariables
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
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isMobile ? 2 : 6,
          boxSizing: 'border-box',
          padding: isMobile ? '22px 18px 28px' : 0
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
              paddingBottom: 6
            }}
          >
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 700 }}>
              {editingBusinessFollowUp ? 'Editar follow-up' : 'Novo follow-up'}
            </h3>

            <button
              type="button"
              aria-label="Fechar criação de follow-up"
              onClick={handleCancelBusinessFollowUpCreation}
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
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Negócio</label>
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
              cursor: 'not-allowed'
            }}
          />
        </div>

        {editingBusinessFollowUp ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Status</label>
            <select
              value={newBusinessFollowUpDraft.status}
              onChange={(event) =>
                setNewBusinessFollowUpDraft((current) => ({
                  ...current,
                  status: event.target.value as LeadFollowUpResponse['status']
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
                background: '#ffffff'
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
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Título</label>
          <input
            type="text"
            placeholder="Título do follow-up"
            value={newBusinessFollowUpDraft.title}
            onChange={(event) =>
              setNewBusinessFollowUpDraft((current) => ({
                ...current,
                title: event.target.value
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Data/Hora</label>
          <input
            type="datetime-local"
            value={newBusinessFollowUpDraft.dueAt}
            onChange={(event) =>
              setNewBusinessFollowUpDraft((current) => ({
                ...current,
                dueAt: event.target.value
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Template</label>
          <select
            value={newBusinessFollowUpDraft.templateId}
            onChange={(event) => {
              const templateId = event.target.value
              const nextTemplate = messageTemplates.find((template) => template.id === templateId) ?? null

              setNewBusinessFollowUpDraft((current) => ({
                ...current,
                templateId,
                templateVariables: buildTemplateVariablesDraft(
                  nextTemplate,
                  current.templateVariables
                )
              }))
            }}
            style={{
              width: '100%',
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: newBusinessFollowUpDraft.templateId ? '#111827' : '#6b7280',
              fontSize: isMobile ? 17 / 1.2 : 14,
              fontWeight: 600,
              boxSizing: 'border-box',
              background: '#ffffff'
            }}
          >
            <option value="">Sem template</option>
            {messageTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {selectedBusinessTemplate?.variables?.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedBusinessTemplate.variables.map((variable) => (
              <div key={variable.key} style={{ display: 'grid', gap: 8 }}>
                <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
                  {variable.label}{variable.required ? ' *' : ''}
                </label>
                <input
                  type="text"
                  placeholder={`Valor para ${variable.label}`}
                  value={newBusinessFollowUpDraft.templateVariables[variable.key] ?? ''}
                  onChange={(event) =>
                    setNewBusinessFollowUpDraft((current) => ({
                      ...current,
                      templateVariables: {
                        ...current.templateVariables,
                        [variable.key]: event.target.value
                      }
                    }))
                  }
                  style={{
                    height: isMobile ? 46 : 42,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '0 14px',
                    color: '#111827',
                    fontSize: isMobile ? 17 / 1.2 : 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {selectedBusinessTemplate ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
              Descrição do template
            </label>
            <textarea
              value={interpolateTemplateDescription(
                selectedBusinessTemplate.description,
                newBusinessFollowUpDraft.templateVariables
              )}
              readOnly
              disabled
              style={{
                width: '100%',
                minHeight: isMobile ? 96 : 86,
                border: '1px solid #d7dce4',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#64748b',
                fontSize: isMobile ? 17 / 1.2 : 14,
                boxSizing: 'border-box',
                background: '#f8fafc',
                cursor: 'not-allowed',
                resize: 'vertical',
                lineHeight: 1.4
              }}
            />
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
          <button
            type="button"
            onClick={handleCancelBusinessFollowUpCreation}
            style={{
              minWidth: 120,
              height: 42,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmitBusinessFollowUp()}
            disabled={!canCreateBusinessFollowUp}
            style={{
              minWidth: 120,
              height: 42,
              border: 'none',
              borderRadius: 8,
              background: '#1f7a4d',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor: canCreateBusinessFollowUp ? 'pointer' : 'not-allowed'
            }}
          >
            Salvar
          </button>
        </div>
      </section>
    )

    const viewedBusinessTemplate = viewedBusinessFollowUp?.templateId
      ? messageTemplates.find((template) => template.id === viewedBusinessFollowUp.templateId) ?? null
      : null

    const viewedBusinessFollowUpStatusTag = viewedBusinessFollowUp
      ? getFollowUpLifecycleStatusTag(viewedBusinessFollowUp.status)
      : null

    const businessFollowUpViewContent = viewedBusinessFollowUp ? (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 16,
          minHeight: 0,
          boxSizing: 'border-box',
          padding: isMobile ? '22px 18px 28px' : 0
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
              marginTop: 2
            }}
          >
            <h3 style={{ margin: 0, color: '#b91c1c', fontSize: 15, fontWeight: 800 }}>
              Deseja deletar esse follow-up?
            </h3>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsConfirmingViewedBusinessFollowUpDelete(false)}
                style={{
                  minWidth: 96,
                  height: 34,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteNegotiationFollowUp(viewedBusinessFollowUp.id)}
                style={{
                  minWidth: 96,
                  height: 34,
                  border: 'none',
                  borderRadius: 8,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Deletar
              </button>
            </div>
          </article>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Negócio</label>
              <input type="text" value={selectedFollowUpBusinessTitle} readOnly disabled style={{ height: isMobile ? 46 : 42, border: '1px solid #d7dce4', borderRadius: 10, padding: '0 14px', color: '#64748b', fontSize: isMobile ? 17 / 1.2 : 14, boxSizing: 'border-box', background: '#f8fafc', cursor: 'not-allowed' }} />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Título</label>
              <input type="text" value={viewedBusinessFollowUp.title ?? ''} readOnly disabled style={{ height: isMobile ? 46 : 42, border: '1px solid #d7dce4', borderRadius: 10, padding: '0 14px', color: '#64748b', fontSize: isMobile ? 17 / 1.2 : 14, boxSizing: 'border-box', background: '#f8fafc', cursor: 'not-allowed' }} />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Data/Hora</label>
              <input type="text" value={formatFollowUpDate(viewedBusinessFollowUp.dueAt)} readOnly disabled style={{ height: isMobile ? 46 : 42, border: '1px solid #d7dce4', borderRadius: 10, padding: '0 14px', color: '#64748b', fontSize: isMobile ? 17 / 1.2 : 14, boxSizing: 'border-box', background: '#f8fafc', cursor: 'not-allowed' }} />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>Template</label>
              <input type="text" value={viewedBusinessTemplate?.name ?? 'Sem template'} readOnly disabled style={{ height: isMobile ? 46 : 42, border: '1px solid #d7dce4', borderRadius: 10, padding: '0 14px', color: '#64748b', fontSize: isMobile ? 17 / 1.2 : 14, boxSizing: 'border-box', background: '#f8fafc', cursor: 'not-allowed' }} />
            </div>

            {viewedBusinessTemplate?.variables?.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {viewedBusinessTemplate.variables.map((variable) => (
                  <div key={variable.key} style={{ display: 'grid', gap: 8 }}>
                    <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
                      {variable.label}{variable.required ? ' *' : ''}
                    </label>
                    <input type="text" value={String(viewedBusinessFollowUp.templateVariables?.[variable.key] ?? '')} readOnly disabled style={{ height: isMobile ? 46 : 42, border: '1px solid #d7dce4', borderRadius: 10, padding: '0 14px', color: '#64748b', fontSize: isMobile ? 17 / 1.2 : 14, boxSizing: 'border-box', background: '#f8fafc', cursor: 'not-allowed' }} />
                  </div>
                ))}
              </div>
            ) : null}

            {viewedBusinessTemplate ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
                  Descrição do template
                </label>
                <textarea
                  value={interpolateTemplateDescription(
                    viewedBusinessTemplate.description,
                    viewedBusinessFollowUp.templateVariables
                  )}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    minHeight: isMobile ? 96 : 86,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#64748b',
                    fontSize: isMobile ? 17 / 1.2 : 14,
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    cursor: 'not-allowed',
                    resize: 'vertical',
                    lineHeight: 1.4
                  }}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingViewedBusinessFollowUpDelete(true)
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
                  cursor: 'pointer'
                }}
              >
                Excluir
              </button>
              <button type="button" onClick={handleStartEditingViewedBusinessFollowUp} style={{ minWidth: 120, height: 42, border: 'none', borderRadius: 8, background: '#1f7a4d', color: '#ffffff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Editar</button>
            </div>
          </>
        )}
      </section>
    ) : null

    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: !isMobile && isManagingBusinessFollowUp ? 16 : 8,
          marginTop: 0,
          flex: 1,
          minHeight: 0
        }}
      >
        {businessesError ? <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p> : null}

        {!shouldShowDesktopCreateOnly ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            {!isManagingBusinessFollowUp ? (
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
                  lineHeight: 1.2
                }}
              >
                + Adicionar follow-up
              </button>
            ) : null}

            <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
              {businessFollowUps.length} follow-up{businessFollowUps.length === 1 ? '' : 's'}
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
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              {viewedBusinessFollowUp ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
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
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {viewedBusinessFollowUpStatusTag.label}
                    </span>
                  ) : null}
                </div>
              ) : (
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                  {editingBusinessFollowUp ? 'Editar follow-up' : 'Novo follow-up'}
                </h2>
              )}

            <button
              type="button"
              onClick={handleCancelBusinessFollowUpCreation}
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
              aria-label="Fechar criação de follow-up"
            >
              X
            </button>
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
                boxSizing: 'border-box'
              }}
            >
              {viewedBusinessFollowUp ? businessFollowUpViewContent : businessFollowUpCreateForm}
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
                cursor: 'default'
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
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)'
              }}
            >
              {viewedBusinessFollowUp ? businessFollowUpViewContent : businessFollowUpCreateForm}
            </aside>
          </>
        ) : null}

        {!shouldShowDesktopCreateOnly && isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {businessFollowUps.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>
                Nenhum follow-up cadastrado.
              </div>
            ) : (
              businessFollowUps.map((followUp) => {
                const visualStatus = getFollowUpVisualStatus({
                  ...followUp,
                  leadId: leadId ?? ''
                })
                const lifecycleStatusTag = getFollowUpLifecycleStatusTag(followUp.status)
                const followUpDateTagColors = getFollowUpDateTagColors(visualStatus)
                const isHovered = hoveredBusinessFollowUpId === followUp.id

                if (editingBusinessFollowUpId === followUp.id) {
                  return null
                }

                if (confirmingDeleteBusinessFollowUpId === followUp.id) {
                  return (
                    <article
                      key={followUp.id}
                      style={{
                        background: interactionTheme.clickableCardHoverBackground,
                        border: '1px solid #e5e7eb',
                        borderRadius: 18,
                        boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <strong style={{ color: '#111827', fontSize: 15 }}>Deletar Follow-up?</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Cancelar exclusão de follow-up"
                          onClick={() => setConfirmingDeleteBusinessFollowUpId(null)}
                          style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                        >
                          X
                        </button>
                        <button
                          type="button"
                          aria-label="Confirmar exclusão de follow-up"
                          onClick={() => void handleDeleteNegotiationFollowUp(followUp.id)}
                          style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
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
                    onMouseEnter={() => setHoveredBusinessFollowUpId(followUp.id)}
                    onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                    style={{
                      background: isHovered ? interactionTheme.clickableCardHoverBackground : '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: 18,
                      boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                      padding: 16,
                      display: 'grid',
                      gap: 18,
                      transition: 'background 120ms ease'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {followUp.title || 'Follow-up sem nome'}
                        </h2>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Editar follow-up"
                          onClick={(event) => {
                            event.stopPropagation()
                            setConfirmingDeleteBusinessFollowUpId(null)
                            setIsCreatingBusinessFollowUp(false)
                            setViewingBusinessFollowUpId(null)
                            setNewBusinessFollowUpDraft({
                              title: followUp.title ?? '',
                              templateId: followUp.templateId ?? '',
                              templateVariables: normalizeTemplateVariableDraft(followUp.templateVariables),
                              dueAt: followUp.dueAt ?? '',
                              status: followUp.status ?? 'pending'
                            })
                            setEditingBusinessFollowUpId(followUp.id)
                          }}
                          style={{ height: 34, width: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Brush size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir follow-up"
                          onClick={(event) => {
                            event.stopPropagation()
                            setViewingBusinessFollowUpId(null)
                            setEditingBusinessFollowUpId(null)
                            setConfirmingDeleteBusinessFollowUpId(followUp.id)
                          }}
                          style={{ height: 34, width: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label={followUp.status === 'done' ? 'Desfazer conclusão do follow-up' : 'Concluir follow-up'}
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleToggleNegotiationFollowUpStatus(followUp.id, followUp.status)
                          }}
                          style={{ height: 34, width: 34, border: followUp.status === 'done' ? '1px solid #86efac' : '1px solid #e5e7eb', borderRadius: 8, background: followUp.status === 'done' ? '#ecfdf3' : '#ffffff', color: followUp.status === 'done' ? '#16a34a' : '#4b5563', padding: 0, cursor: 'pointer' }}
                        >
                          ✓
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: followUpDateTagColors.textColor, whiteSpace: 'nowrap', background: followUpDateTagColors.background, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                        <CalendarClock size={12} />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 4 }}>{formatFollowUpDate(followUp.dueAt)}</span>
                      </span>

                      <span style={{ fontSize: 12, fontWeight: 700, color: lifecycleStatusTag.textColor, whiteSpace: 'nowrap', background: lifecycleStatusTag.background, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lifecycleStatusTag.label}</span>
                      </span>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        ) : null}

        {!shouldShowDesktopCreateOnly && !isMobile ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #eeeeee',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
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
              padding: '10px 12px'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Título</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Status</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Data/Hora</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Ações</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
            {businessFollowUps.length === 0 ? (
              <div style={{ padding: '8px 10px' }}>
                <p style={{ margin: 0, color: '#555555', fontSize: 13 }}>Nenhum follow-up cadastrado.</p>
              </div>
            ) : (
              businessFollowUps.map((followUp) => {
                const visualStatus = getFollowUpVisualStatus({
                  ...followUp,
                  leadId: leadId ?? ''
                })
                const lifecycleStatusTag = getFollowUpLifecycleStatusTag(followUp.status)
                const followUpDateTagColors = getFollowUpDateTagColors(visualStatus)
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
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={() => setHoveredBusinessFollowUpId(followUp.id)}
                      onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#2f2f2f' }}>
                        Deletar Follow-up?
                      </p>
                      <span />
                      <span />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'start' }}>
                        <button
                          type="button"
                          aria-label="Cancelar exclusão de follow-up"
                          onClick={() => setConfirmingDeleteBusinessFollowUpId(null)}
                          onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                          onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
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
                          aria-label="Confirmar exclusão de follow-up"
                          onClick={() => void handleDeleteNegotiationFollowUp(followUp.id)}
                          onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                          onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
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
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={() => setHoveredBusinessFollowUpId(followUp.id)}
                    onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        color: '#2f2f2f',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {followUp.title}
                    </p>

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
                        justifySelf: 'start'
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
                        justifySelf: 'start'
                      }}
                    >
                      {formatFollowUpDate(followUp.dueAt)}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'start' }}>
                      <button
                        type="button"
                        aria-label="Editar follow-up"
                        onClick={(event) => {
                          event.stopPropagation()
                          setConfirmingDeleteBusinessFollowUpId(null)
                          setIsCreatingBusinessFollowUp(false)
                          setViewingBusinessFollowUpId(null)
                          setNewBusinessFollowUpDraft({
                            title: followUp.title ?? '',
                            templateId: followUp.templateId ?? '',
                            templateVariables: normalizeTemplateVariableDraft(followUp.templateVariables),
                            dueAt: followUp.dueAt ?? '',
                            status: followUp.status ?? 'pending'
                          })
                          setEditingBusinessFollowUpId(followUp.id)
                        }}
                        onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                        onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
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
                        <Brush size={14} />
                      </button>

                      <button
                        type="button"
                        aria-label="Excluir follow-up"
                        onClick={(event) => {
                          event.stopPropagation()
                          setViewingBusinessFollowUpId(null)
                          setEditingBusinessFollowUpId(null)
                          setConfirmingDeleteBusinessFollowUpId(followUp.id)
                        }}
                        onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                        onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
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

                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleToggleNegotiationFollowUpStatus(followUp.id, followUp.status)
                        }}
                        aria-label={
                          followUp.status === 'done'
                            ? 'Desfazer conclusão do follow-up'
                            : 'Concluir follow-up'
                        }
                        style={{
                          height: 24,
                          width: 24,
                          border: followUp.status === 'done' ? '1px solid #86efac' : '1px solid #e5e7eb',
                          borderRadius: 4,
                          background: followUp.status === 'done' ? '#ecfdf3' : '#ffffff',
                          color: followUp.status === 'done' ? '#16a34a' : '#4b5563',
                          padding: 0,
                          cursor: 'pointer'
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
          minHeight: 0
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
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
              opacity: isUploadingBusinessAttachment ? 0.7 : 1
            }}
          >
            {isUploadingBusinessAttachment ? 'Enviando...' : '+ Adicionar arquivo'}
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
            {businessAttachments.length} arquivo{businessAttachments.length === 1 ? '' : 's'}
          </span>
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isBusinessAttachmentsLoading ? (
              <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Carregando arquivos...</div>
            ) : businessAttachments.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>Nenhum arquivo cadastrado.</div>
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
                        background: interactionTheme.clickableCardHoverBackground,
                        border: '1px solid #e5e7eb',
                        borderRadius: 18,
                        boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <strong style={{ color: '#111827', fontSize: 15 }}>Deletar arquivo?</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Cancelar exclusão de arquivo"
                          onClick={() => setConfirmingDeleteBusinessAttachmentId(null)}
                          style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
                        >
                          X
                        </button>
                        <button
                          type="button"
                          aria-label="Confirmar exclusão de arquivo"
                          onClick={() => void handleDeleteBusinessAttachment(file.id, negotiationId)}
                          style={{ height: 32, width: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer' }}
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
                      background: isHovered ? interactionTheme.clickableCardHoverBackground : '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: 18,
                      boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                      padding: 16,
                      display: 'grid',
                      gap: 18,
                      transition: 'background 120ms ease'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 12 }}>
                      <div style={{ minWidth: 0, display: 'grid', gap: 8 }}>
                        <h2 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.originalName}>
                          <FileText size={18} color="#4b5563" style={{ flexShrink: 0, verticalAlign: '-3px', marginRight: 8 }} />
                          {file.originalName}
                        </h2>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Baixar arquivo"
                          onClick={() => void handleDownloadBusinessAttachment(file.id)}
                          style={{ height: 34, width: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Download size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir arquivo"
                          onClick={() => setConfirmingDeleteBusinessAttachmentId(file.id)}
                          style={{ height: 34, width: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', whiteSpace: 'nowrap', background: '#f1f5f9', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                        {file.extension?.toUpperCase() || '-'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', background: '#e2e8f0', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                        {formatFileSize(file.size)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7c2d12', whiteSpace: 'nowrap', background: '#ffedd5', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
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
            minHeight: 0
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
              padding: '10px 12px'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Nome</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Tipo</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Tamanho</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Enviado em</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Ações</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
            {isBusinessAttachmentsLoading ? (
              <div style={{ padding: '10px 12px' }}>
                <p style={{ margin: 0, color: '#555555', fontSize: 13 }}>Carregando arquivos...</p>
              </div>
            ) : businessAttachments.length === 0 ? (
              <div style={{ padding: '10px 12px' }}>
                <p style={{ margin: 0, color: '#555555', fontSize: 13 }}>Nenhum arquivo cadastrado.</p>
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
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={() => setHoveredBusinessFileId(file.id)}
                    onMouseLeave={() => setHoveredBusinessFileId(null)}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#2f2f2f' }}>
                      Deletar arquivo?
                    </p>
                    <span />
                    <span />
                    <span />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'start' }}>
                      <button
                        type="button"
                        aria-label="Cancelar exclusão de arquivo"
                        onClick={() => setConfirmingDeleteBusinessAttachmentId(null)}
                        onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                        onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
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
                        disabled={deletingBusinessAttachmentId === file.id}
                        onClick={() => void handleDeleteBusinessAttachment(file.id, negotiationId)}
                        onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                        onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
                        style={{
                          height: 24,
                          width: 24,
                          border: '1px solid #e5e7eb',
                          borderRadius: 4,
                          background: '#ffffff',
                          color: '#4b5563',
                          padding: 0,
                          cursor: 'pointer',
                          opacity: deletingBusinessAttachmentId === file.id ? 0.7 : 1
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
                    boxSizing: 'border-box'
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
                    whiteSpace: 'nowrap'
                  }}
                >
                  {file.originalName}
                </p>

                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 700 }}>
                  {file.extension.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 700 }}>
                  {formatFileSize(file.size)}
                </span>
                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 700 }}>
                  {formatDate(file.createdAt)}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'start' }}>
                  <button
                    type="button"
                    aria-label="Baixar arquivo"
                    disabled={downloadingBusinessAttachmentId === file.id}
                    onClick={() => void handleDownloadBusinessAttachment(file.id)}
                    onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                    onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
                    style={{
                      height: 24,
                      width: 24,
                      border: '1px solid #e5e7eb',
                      borderRadius: 4,
                      background: '#ffffff',
                      color: '#4b5563',
                      padding: 0,
                      cursor: 'pointer',
                      opacity: downloadingBusinessAttachmentId === file.id ? 0.7 : 1
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
                    onMouseEnter={(event) => applyActionHoverBackground(true, event.currentTarget)}
                    onMouseLeave={(event) => applyActionHoverBackground(false, event.currentTarget)}
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
      ? businesses.find((business) => business.id === selectedBusinessId) ?? null
      : null

    const resetBusinessDetailDraft = (business: NegotiationResponse) => {
      setBusinessDetailDraft({
        title: business.title ?? '',
        negotiationType: business.negotiationType ?? '',
        stage: business.stage,
        temperature: business.temperature ?? '',
        value: formatLeadValueInputField(business.value),
        notes: formatNegotiationNotes(business.notes)
      })
    }

    if (selectedBusiness) {
      const selectedBusinessTitle =
        (isEditingBusiness ? businessDetailDraft?.title : selectedBusiness.title) ?? ''
      const selectedBusinessType =
        businessDetailDraft?.negotiationType ?? selectedBusiness.negotiationType ?? ''
      const selectedBusinessStage = businessDetailDraft?.stage ?? selectedBusiness.stage
      const selectedBusinessTemperature =
        businessDetailDraft?.temperature ?? selectedBusiness.temperature ?? ''
      const selectedBusinessValue =
        businessDetailDraft?.value ?? selectedBusiness.value ?? ''
      const selectedBusinessNotes = (selectedBusiness.notes ?? [])
        .map((note, originalIndex) => ({ note, originalIndex }))
        .sort((firstItem, secondItem) => {
          const firstTimestamp = firstItem.note.createdAt ? new Date(firstItem.note.createdAt).getTime() : 0
          const secondTimestamp = secondItem.note.createdAt ? new Date(secondItem.note.createdAt).getTime() : 0

          return secondTimestamp - firstTimestamp
        })
      const viewedBusinessNote =
        viewingBusinessNoteIndex !== null
          ? (selectedBusiness.notes ?? [])[viewingBusinessNoteIndex] ?? null
          : null
      const selectedBusinessClosedAtLabel = formatDateOnly(selectedBusiness.closedAt)
      const selectedBusinessCreatedAtLabel = formatDateOnly(selectedBusiness.createdAt)
      const selectedBusinessUpdatedAtLabel = formatDateOnly(selectedBusiness.updatedAt)
      const isBusinessClosed = selectedBusinessClosedAtLabel !== '-'
      const businessStatusTag =
        selectedBusinessStage === 'WON' && isBusinessClosed
          ? { label: 'Faturado', textColor: '#166534', background: '#dcfce7' }
          : selectedBusinessStage === 'LOST' && isBusinessClosed
            ? { label: 'Perdido', textColor: '#b91c1c', background: '#fee2e2' }
            : { label: 'Em Aberto', textColor: '#1d4ed8', background: '#dbeafe' }
      const isEditBusinessDisabled = isBusinessClosed
      const stageLabel = getLeadStageLabel(selectedBusinessStage)
      const selectedBusinessTypeLabel =
        selectedBusinessType === 'service'
          ? 'Serviço'
          : selectedBusinessType === 'product'
            ? 'Produto'
            : '-'
      const selectedBusinessTypeTagPresentation = getBusinessTypeTagPresentation(selectedBusinessType)
      const temperatureTagPresentation = getTemperatureTagPresentation(selectedBusinessTemperature)
      const shouldShowBusinessInformationTab = isEditingBusiness || activeBusinessTab === 'informacoes'
      const shouldShowDeleteBusinessConfirmation = isConfirmingBusinessDelete
      const shouldShowCloseBusinessConfirmation = isConfirmingBusinessClose

      return (
        <section
          style={{
            display: 'grid',
            alignContent: 'start',
            gap: 8,
            height: '100%',
            minHeight: 0,
            overflowY:
              !isMobile &&
              (activeBusinessTab === 'followups' ||
                activeBusinessTab === 'arquivos' ||
                activeBusinessTab === 'notas')
                ? 'hidden'
                : 'auto',
            overflowX: 'hidden',
            paddingRight: isMobile ? 0 : 4,
            boxSizing: 'border-box'
          }}
        >
          {!isMobile ? (
          <div style={{ display: 'grid', gap: 0 }}>
            <div
              className={isMobile ? 'mobile-tabs-scrollbar-hidden' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                overflowX: isMobile ? 'auto' : 'visible'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 10 : 4,
                  minWidth: 0
                }}
              >
                {[
                  { key: 'informacoes' as const, label: 'Informações' },
                  { key: 'followups' as const, label: 'FollowUps' },
                  { key: 'arquivos' as const, label: 'Arquivos' },
                  { key: 'notas' as const, label: 'Notas' }
                ].map((tab) => {
                  const isActive = activeBusinessTab === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        if (selectedBusiness) {
                          resetBusinessDetailDraft(selectedBusiness)
                        }
                        setIsEditingBusiness(false)
                        setIsConfirmingBusinessDelete(false)
                        setIsConfirmingBusinessClose(false)
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
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: isActive ? 700 : 600,
                        padding: isMobile ? '12px 16px' : '8px 12px',
                        cursor: 'pointer',
                        color:
                          isActive || hoveredBusinessTab === tab.key
                            ? isMobile
                              ? '#1f7a4d'
                              : interactionTheme.activeIconColor
                            : '#6b7280'
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {!isEditingBusiness && !isMobile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBusinessId(null)
                      setIsBusinessActionsOpen(false)
                      setIsConfirmingBusinessDelete(false)
                      setIsConfirmingBusinessClose(false)
                      setIsEditingBusiness(false)
                      setActiveBusinessTab('informacoes')
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Voltar para a lista de negócios"
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>
              ) : null}
            </div>

            {!isMobile ? (
              <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: 8, marginBottom: 10 }} />
            ) : null}
          </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, minHeight: 0, boxSizing: 'border-box' }}>
            {!isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              {activeBusinessTab === 'informacoes' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                    {selectedBusinessTitle || 'Negócio sem nome'}
                  </h2>
                </div>
              ) : null}

              {!isEditingBusiness && activeBusinessTab !== 'followups' && activeBusinessTab !== 'arquivos' && activeBusinessTab !== 'notas' ? (
                  <div ref={businessActionsRef} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsBusinessActionsOpen((current) => !current)}
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
                      justifyContent: 'center'
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
                        gap: 4
                      }}
                    >
                      {isBusinessClosed ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedBusinessId) return

                            void (async () => {
                              try {
                                await WebhookService.updateNegotiation(selectedBusinessId, {
                                  stage: 'NEW',
                                  closedAt: null
                                })
                                await refreshLeadNegotiations(leadId ?? '')
                                onLeadUpdated?.()
                                setActiveBusinessTab('informacoes')
                                setIsBusinessActionsOpen(false)
                                setIsConfirmingBusinessClose(false)
                              } catch (exception: unknown) {
                                const message =
                                  exception instanceof Error
                                    ? exception.message
                                    : 'Falha ao reabrir negócio.'
                                setBusinessesError(message)
                              }
                            })()
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
                            cursor: 'pointer'
                          }}
                        >
                          Reabrir Negócio
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsConfirmingBusinessClose(true)
                            setIsConfirmingBusinessDelete(false)
                            setIsBusinessActionsOpen(false)
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
                            cursor: 'pointer'
                          }}
                        >
                          Fechar Negócio
                        </button>
                      )}

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
                          color: isEditBusinessDisabled ? '#94a3b8' : '#0f172a',
                          fontSize: 14,
                          fontWeight: 600,
                          textAlign: 'left',
                          padding: '10px 12px',
                          cursor: isEditBusinessDisabled ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Editar
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
                          cursor: 'pointer'
                        }}
                      >
                        Deletar
                      </button>
                    </div>
                  ) : null}
                  </div>
              ) : null}
            </div>
            ) : null}

            {businessesError ? <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p> : null}

            {!isEditingBusiness && !shouldShowDeleteBusinessConfirmation && !shouldShowCloseBusinessConfirmation && activeBusinessTab === 'followups'
              ? renderBusinessFollowUpsTab(selectedBusiness.id)
              : null}

            {!isEditingBusiness && !shouldShowDeleteBusinessConfirmation && !shouldShowCloseBusinessConfirmation && activeBusinessTab === 'arquivos'
              ? renderBusinessFilesTab(selectedBusiness.id)
              : null}

            {!isEditingBusiness && shouldShowCloseBusinessConfirmation ? (
            <article
              style={{
                border: '1px solid #fde68a',
                borderRadius: 16,
                padding: 24,
                background: '#fffbeb',
                display: 'grid',
                gap: 18
              }}
            >
              <h3 style={{ margin: 0, color: '#92400e', fontSize: 15, fontWeight: 800 }}>
                Deseja fechar esse negócio?
              </h3>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
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
                    cursor: 'pointer'
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
                        await WebhookService.updateNegotiation(selectedBusinessId, {
                          stage: 'WON',
                          closedAt: new Date().toISOString()
                        })
                        await refreshLeadNegotiations(leadId ?? '')
                        onLeadUpdated?.()
                        setActiveBusinessTab('informacoes')
                        setIsBusinessActionsOpen(false)
                        setIsConfirmingBusinessClose(false)
                      } catch (exception: unknown) {
                        const message =
                          exception instanceof Error
                            ? exception.message
                            : 'Falha ao fechar negócio.'
                        setBusinessesError(message)
                      }
                    })()
                  }}
                  style={{
                    minWidth: 96,
                    height: 34,
                    border: 'none',
                    borderRadius: 8,
                    background: '#15803d',
                    color: '#ffffff',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Ganho
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBusinessId) return

                    void (async () => {
                      try {
                        await WebhookService.updateNegotiation(selectedBusinessId, {
                          stage: 'LOST',
                          closedAt: new Date().toISOString()
                        })
                        await refreshLeadNegotiations(leadId ?? '')
                        onLeadUpdated?.()
                        setActiveBusinessTab('informacoes')
                        setIsBusinessActionsOpen(false)
                        setIsConfirmingBusinessClose(false)
                      } catch (exception: unknown) {
                        const message =
                          exception instanceof Error
                            ? exception.message
                            : 'Falha ao fechar negócio.'
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
                    cursor: 'pointer'
                  }}
                >
                  Perdido
                </button>
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
                gap: 18
              }}
            >
              <h3 style={{ margin: 0, color: '#b91c1c', fontSize: 15, fontWeight: 800 }}>
                Deseja deletar esse negócio?
              </h3>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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
                    cursor: 'pointer'
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
                        await WebhookService.deleteNegotiation(selectedBusinessId)
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
                    cursor: 'pointer'
                  }}
                >
                  Deletar
                </button>
              </div>
            </article>
            ) : null}

            {shouldShowBusinessInformationTab && !shouldShowDeleteBusinessConfirmation && !shouldShowCloseBusinessConfirmation ? (
              isEditingBusiness ? (
                <article
                  style={{
                    border: 'none',
                    borderRadius: 0,
                    padding: 0,
                    background: 'transparent',
                    display: 'grid',
                    marginTop: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
                        <CircleUserRound size={15} />
                      </span>
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Visão Geral</h3>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gap: 14,
                      maxWidth: 520
                    }}
                  >
                    <div style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Nome</span>
                      <input
                        type="text"
                        value={businessDetailDraft?.title ?? ''}
                        onChange={(event) =>
                          setBusinessDetailDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  title: event.target.value
                                }
                              : current
                          )
                        }
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          height: 42,
                          border: '1px solid #d1d5db',
                          borderRadius: 8,
                          padding: '0 12px',
                          fontSize: 16,
                          color: '#111827',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Tipo</span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={selectedBusinessType}
                          onChange={(event) =>
                            setBusinessDetailDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    negotiationType: event.target.value as '' | NegotiationType
                                  }
                                : current
                            )
                          }
                          style={{
                            width: '100%',
                            height: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '0 36px 0 12px',
                            color: selectedBusinessType ? '#111827' : '#6b7280',
                            fontSize: 14,
                            fontWeight: 600,
                            appearance: 'none',
                            background: '#ffffff',
                            boxSizing: 'border-box'
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
                            pointerEvents: 'none'
                          }}
                        >
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Etapa</span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={businessDetailDraft?.stage ?? selectedBusiness.stage}
                          onChange={(event) =>
                            setBusinessDetailDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    stage: event.target.value as LeadStage
                                  }
                                : current
                            )
                          }
                          style={{
                            width: '100%',
                            height: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '0 36px 0 12px',
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 600,
                            appearance: 'none',
                            background: '#ffffff',
                            boxSizing: 'border-box'
                          }}
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
                            pointerEvents: 'none'
                          }}
                        >
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Temperatura</span>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={businessDetailDraft?.temperature ?? selectedBusiness.temperature ?? ''}
                          onChange={(event) =>
                            setBusinessDetailDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    temperature: event.target.value as '' | NegotiationTemperature
                                  }
                                : current
                            )
                          }
                          style={{
                            width: '100%',
                            height: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '0 36px 0 12px',
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 600,
                            appearance: 'none',
                            background: '#ffffff',
                            boxSizing: 'border-box'
                          }}
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
                            pointerEvents: 'none'
                          }}
                        >
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Valor</span>
                      <input
                        type="text"
                        value={businessDetailDraft?.value ?? ''}
                        onChange={(event) =>
                          setBusinessDetailDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  value: sanitizeLeadValueInput(event.target.value)
                                }
                              : current
                          )
                        }
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          height: 42,
                          border: '1px solid #d1d5db',
                          borderRadius: 8,
                          padding: '0 12px',
                          fontSize: 16,
                          color: '#111827',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedBusiness) return
                          resetBusinessDetailDraft(selectedBusiness)
                          setIsEditingBusiness(false)
                        }}
                        style={{
                          minWidth: 100,
                          height: 36,
                          border: '1px solid #d1d5db',
                          borderRadius: 8,
                          background: '#ffffff',
                          color: '#0f172a',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedBusinessId || !businessDetailDraft) return

                          const payload: UpdateNegotiationPayload = {
                            title: businessDetailDraft.title,
                            negotiationType: businessDetailDraft.negotiationType || null,
                            stage: businessDetailDraft.stage,
                            temperature: (businessDetailDraft.temperature || null) as NegotiationTemperature | null,
                            value: parseLeadValueInput(businessDetailDraft.value),
                            notes: businessDetailDraft.notes.trim()
                              ? businessDetailDraft.notes.trim() === formatNegotiationNotes(selectedBusiness.notes).trim()
                                ? (selectedBusiness.notes ?? []).map((note) => ({
                                    title: note.title,
                                    description: note.description,
                                    createdAt: note.createdAt ?? new Date().toISOString()
                                  }))
                                : [{
                                    title: 'Nota',
                                    description: businessDetailDraft.notes.trim(),
                                    createdAt:
                                      selectedBusiness.notes?.[0]?.createdAt ?? new Date().toISOString()
                                  }]
                              : []
                          }

                          void (async () => {
                            try {
                              await WebhookService.updateNegotiation(selectedBusinessId, payload)
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
                          })()
                        }}
                        style={{
                          minWidth: 100,
                          height: 36,
                          border: 'none',
                          borderRadius: 8,
                          background: '#1f7a4d',
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <>
                  <section style={{ display: 'grid', gap: 8, width: '100%', minWidth: 0, marginTop: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
                        <CircleUserRound size={15} />
                      </span>
                      <h3 style={{ margin: 0, marginTop: 8, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Visão Geral</h3>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><CircleDollarSign size={14} /> Valor</span>
                        <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>
                          {formatLeadValue(selectedBusinessValue)}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><BriefcaseBusiness size={14} /> Tipo</span>
                        {selectedBusinessTypeLabel === '-' ? (
                          <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>-</span>
                        ) : (
                          <span
                            style={getDefaultTagStyle(
                              selectedBusinessTypeTagPresentation.textColor,
                              selectedBusinessTypeTagPresentation.background
                            )}
                          >
                            {selectedBusinessTypeLabel}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><TrendingUp size={14} /> Etapa</span>
                        <span style={getDefaultTagStyle('#2563eb', '#dbeafe')}>
                          {stageLabel}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><BadgeCheck size={14} /> Status</span>
                        <span style={getDefaultTagStyle(businessStatusTag.textColor, businessStatusTag.background)}>
                          {businessStatusTag.label}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Flame size={14} /> Temperatura</span>
                        <span
                          style={getDefaultTagStyle(
                            temperatureTagPresentation.textColor,
                            `${temperatureTagPresentation.textColor}44`
                          )}
                        >
                          {temperatureTagPresentation.icon ? (
                            <span style={tagIconStyle}>{temperatureTagPresentation.icon}</span>
                          ) : null}
                          <span style={tagContentStyle}>{temperatureTagPresentation.label}</span>
                        </span>
                      </div>

                    </div>
                  </section>

                  <section style={{ display: 'grid', gap: 8, width: '100%', minWidth: 0 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}>
                        <CalendarClock size={15} />
                      </span>
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Histórico</h3>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><CalendarClock size={14} /> Criado em</span>
                        <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>
                          {selectedBusinessCreatedAtLabel}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Clock4 size={14} /> Atualizado em</span>
                        <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>
                          {selectedBusinessUpdatedAtLabel}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '12px 2px' }}>
                        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><CalendarDays size={14} /> Data de fechamento</span>
                        <span style={{ color: '#111827', fontSize: 14, fontWeight: 700 }}>
                          {selectedBusinessClosedAtLabel}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )
            ) : null}

            {!isEditingBusiness && !shouldShowDeleteBusinessConfirmation && activeBusinessTab === 'notas' ? (
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
                overflow: 'hidden'
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
                    cursor: 'default'
                  }}
                />
              ) : null}

              {!isCreatingBusinessNote && !viewedBusinessNote ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
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
                        lineHeight: 1.2
                      }}
                    >
                      + Adicionar nota
                    </button>

                    <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
                      {(selectedBusiness.notes?.length ?? 0)} nota{(selectedBusiness.notes?.length ?? 0) === 1 ? '' : 's'}
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
                        : 'auto'
                    }}
                  >
                    {selectedBusinessNotes.length === 0 ? (
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Nenhuma nota cadastrada.</p>
                    ) : (
                      selectedBusinessNotes.map(({ note, originalIndex }, noteIndex) => (
                        <article
                          key={`${selectedBusiness.id}-note-${noteIndex}`}
                          onClick={() => {
                                setViewingBusinessNoteIndex(originalIndex)
                            setIsConfirmingBusinessNoteDelete(false)
                            setBusinessesError(null)
                          }}
                          onMouseEnter={() => setHoveredBusinessNoteIndex(originalIndex)}
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
                            cursor: 'pointer'
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
                              borderRight: '52px solid transparent'
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
                              alignSelf: 'center'
                            }}
                          >
                            <FileText size={18} />
                          </div>

                          <div style={{ minWidth: 0, display: 'grid', gap: 4, paddingTop: 2, alignSelf: 'center' }}>
                            <span
                              style={{
                                color: '#0f172a',
                                fontSize: 17,
                                fontWeight: 800,
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
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
                                maxWidth: '70%'
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
                              alignSelf: 'start'
                            }}
                          >
                            {formatDateOnly(note.createdAt) || '-'}
                          </span>
                        </article>
                      ))
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
                    boxShadow: isMobile ? '0 -18px 36px rgba(15, 23, 42, 0.18)' : 'none',
                    width: isMobile ? '100%' : 'auto'
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
                        paddingBottom: 6
                      }}
                    >
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 700 }}>
                        {editingBusinessNoteIndex === null ? 'Nova nota' : 'Editar nota'}
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
                          lineHeight: 1
                        }}
                        aria-label="Fechar criação de nota"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                        {editingBusinessNoteIndex === null ? 'Nova nota' : 'Editar Nota'}
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
                          lineHeight: 1
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
                      gap: 16
                    }}
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Negócio</label>
                      <input
                        type="text"
                        value={selectedBusiness.title?.trim() || 'Negócio sem nome'}
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
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Título</label>
                      <input
                        type="text"
                        placeholder="Título da nota"
                        autoComplete="off"
                        name="business-note-title"
                        value={newBusinessNoteDraft.title}
                        onChange={(event) =>
                          setNewBusinessNoteDraft((current) => ({
                            ...current,
                            title: event.target.value
                          }))
                        }
                        style={{
                          height: isMobile ? 46 : 42,
                          border: '1px solid #d7dce4',
                          borderRadius: 10,
                          padding: '0 14px',
                          color: '#111827',
                          fontSize: isMobile ? 17 / 1.2 : 14,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Descrição</label>
                      <textarea
                        placeholder="Escreva a descrição da nota..."
                        value={newBusinessNoteDraft.description}
                        onChange={(event) =>
                          setNewBusinessNoteDraft((current) => ({
                            ...current,
                            description: event.target.value
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
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
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
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const trimmedTitle = newBusinessNoteDraft.title.trim()
                          const trimmedDescription = newBusinessNoteDraft.description.trim()

                          if (!selectedBusinessId || !trimmedTitle || !trimmedDescription) {
                            return
                          }

                          const currentNotes = selectedBusiness.notes ?? []
                          const isEditingExistingNote = editingBusinessNoteIndex !== null
                          const payload: UpdateNegotiationPayload = {
                            notes: isEditingExistingNote
                              ? currentNotes.map((note, index) =>
                                  index === editingBusinessNoteIndex
                                    ? {
                                        title: trimmedTitle,
                                        description: trimmedDescription,
                                        createdAt: note.createdAt ?? new Date().toISOString()
                                      }
                                    : note
                                )
                              : [
                                  ...currentNotes,
                                  {
                                    title: trimmedTitle,
                                    description: trimmedDescription,
                                    createdAt: new Date().toISOString()
                                  }
                                ]
                          }

                          void (async () => {
                            try {
                              await WebhookService.updateNegotiation(selectedBusinessId, payload)
                              await refreshLeadNegotiations(leadId ?? '')
                              onLeadUpdated?.()
                              const noteToRestore = editingBusinessNoteIndex
                              setIsCreatingBusinessNote(false)
                              setViewingBusinessNoteIndex(noteToRestore)
                              setEditingBusinessNoteIndex(null)
                              setIsConfirmingBusinessNoteDelete(false)
                              setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
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
                        disabled={!newBusinessNoteDraft.title.trim() || !newBusinessNoteDraft.description.trim()}
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
                            newBusinessNoteDraft.title.trim() && newBusinessNoteDraft.description.trim()
                              ? 'pointer'
                              : 'not-allowed'
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
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
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
                        lineHeight: 1
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
                      boxSizing: 'border-box'
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
                          marginTop: 2
                        }}
                      >
                        <h3 style={{ margin: 0, color: '#b91c1c', fontSize: 15, fontWeight: 800 }}>
                          Deseja deletar essa nota?
                        </h3>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingBusinessNoteDelete(false)}
                            style={{
                              minWidth: 96,
                              height: 34,
                              border: '1px solid #d1d5db',
                              borderRadius: 8,
                              background: '#ffffff',
                              color: '#0f172a',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (viewingBusinessNoteIndex === null || !selectedBusinessId) {
                                return
                              }

                              const currentNotes = selectedBusiness.notes ?? []
                              const payload: UpdateNegotiationPayload = {
                                notes: currentNotes.filter((_, index) => index !== viewingBusinessNoteIndex)
                              }

                              void (async () => {
                                try {
                                  await WebhookService.updateNegotiation(selectedBusinessId, payload)
                                  await refreshLeadNegotiations(leadId ?? '')
                                  onLeadUpdated?.()
                                  setViewingBusinessNoteIndex(null)
                                  setEditingBusinessNoteIndex(null)
                                  setIsCreatingBusinessNote(false)
                                  setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                                  setIsConfirmingBusinessNoteDelete(false)
                                  setBusinessesError(null)
                                } catch (exception: unknown) {
                                  const message =
                                    exception instanceof Error ? exception.message : 'Falha ao deletar nota.'
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
                              cursor: 'pointer'
                            }}
                          >
                            Deletar
                          </button>
                        </div>
                      </article>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Negócio</label>
                          <input
                            type="text"
                            value={selectedBusiness.title?.trim() || 'Negócio sem nome'}
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
                              cursor: 'not-allowed'
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                          <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Título</label>
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
                              boxSizing: 'border-box'
                            }}
                          >
                            {viewedBusinessNote.title?.trim() || '-'}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                          <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Descrição</label>
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
                              boxSizing: 'border-box'
                            }}
                          >
                            {viewedBusinessNote.description?.trim() || '-'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
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
                              cursor: 'pointer'
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

                              setEditingBusinessNoteIndex(viewingBusinessNoteIndex)
                              setNewBusinessNoteDraft({
                                title: viewedBusinessNote.title ?? '',
                                description: viewedBusinessNote.description ?? ''
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
                              cursor: 'pointer'
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
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                Novo negócio
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCreatingBusiness(false)
                setNewBusinessDraft(initialNewBusinessDraft)
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
                lineHeight: 1
              }}
              aria-label="Fechar criação de negócio"
            >
              X
            </button>
          </div>

          {businessesError ? <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p> : null}

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
              boxSizing: 'border-box'
            }}
          >
            {isMobile ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Tipo</label>
                  <select
                    value={newBusinessDraft.negotiationType}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({
                        ...current,
                        negotiationType: event.target.value as '' | NegotiationType
                      }))
                    }
                    style={{
                      width: '100%',
                      height: 46,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: newBusinessDraft.negotiationType ? '#111827' : '#6b7280',
                      fontSize: 17 / 1.2,
                      fontWeight: 600,
                      boxSizing: 'border-box',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="service">Serviço</option>
                    <option value="product">Produto</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Nome</label>
                  <input
                    type="text"
                    placeholder="Nome"
                    autoComplete="off"
                    name="business-title"
                    value={newBusinessDraft.title}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    style={{
                      height: 46,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: '#111827',
                      fontSize: 17 / 1.2,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Etapa</label>
                  <select
                    value={newBusinessDraft.stage}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({
                        ...current,
                        stage: event.target.value as LeadStage
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
                      background: '#ffffff'
                    }}
                  >
                    <option value="NEW">Novo</option>
                    <option value="CONTACTED">Contatado</option>
                    <option value="QUALIFIED">Qualificado</option>
                    <option value="PROPOSAL_SENT">Proposta enviada</option>
                    <option value="NEGOTIATION">Negociação</option>
                    <option value="WON">Ganho</option>
                    <option value="LOST">Perdido</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Temperatura</label>
                  <select
                    value={newBusinessDraft.temperature}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({
                        ...current,
                        temperature: event.target.value as '' | NegotiationTemperature
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
                      background: '#ffffff'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="hot">Quente</option>
                    <option value="warm">Morno</option>
                    <option value="cold">Frio</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Valor (R$)</label>
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
                        value: sanitizeLeadValueInput(event.target.value)
                      }))
                    }
                    style={{
                      height: 46,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: '#111827',
                      fontSize: 17 / 1.2,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Tipo</label>
                  <select
                    value={newBusinessDraft.negotiationType}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({
                        ...current,
                        negotiationType: event.target.value as '' | NegotiationType
                      }))
                    }
                    style={{
                      width: '100%',
                      height: 42,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: newBusinessDraft.negotiationType ? '#111827' : '#6b7280',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="service">Serviço</option>
                    <option value="product">Produto</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Nome</label>
                  <input
                    type="text"
                    placeholder="Nome"
                    autoComplete="off"
                    name="business-title"
                    value={newBusinessDraft.title}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    style={{
                      height: 42,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: '#111827',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Etapa</label>
                  <select
                    value={newBusinessDraft.stage}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({
                        ...current,
                        stage: event.target.value as LeadStage
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
                      background: '#ffffff'
                    }}
                  >
                    <option value="NEW">Novo</option>
                    <option value="CONTACTED">Contatado</option>
                    <option value="QUALIFIED">Qualificado</option>
                    <option value="PROPOSAL_SENT">Proposta enviada</option>
                    <option value="NEGOTIATION">Negociação</option>
                    <option value="WON">Ganho</option>
                    <option value="LOST">Perdido</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Temperatura</label>
                  <select
                    value={newBusinessDraft.temperature}
                    onChange={(event) =>
                      setNewBusinessDraft((current) => ({
                        ...current,
                        temperature: event.target.value as '' | NegotiationTemperature
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
                      background: '#ffffff'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="hot">Quente</option>
                    <option value="warm">Morno</option>
                    <option value="cold">Frio</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>Valor (R$)</label>
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
                        value: sanitizeLeadValueInput(event.target.value)
                      }))
                    }
                    style={{
                      height: 42,
                      border: '1px solid #d7dce4',
                      borderRadius: 10,
                      padding: '0 14px',
                      color: '#111827',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: '#1f2937', fontSize: 17 / 1.3, fontWeight: 700 }}>Notas</label>
              <textarea
                placeholder="Escreva uma observação..."
                value={newBusinessDraft.notes}
                onChange={(event) =>
                  setNewBusinessDraft((current) => ({ ...current, notes: event.target.value }))
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
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingBusiness(false)
                  setNewBusinessDraft(initialNewBusinessDraft)
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
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!leadId) return

                  const payload: CreateNegotiationPayload = {
                    leadId,
                    title: newBusinessDraft.title || undefined,
                    stage: newBusinessDraft.stage,
                    temperature: newBusinessDraft.temperature || undefined,
                    negotiationType: newBusinessDraft.negotiationType || undefined,
                    value: parseLeadValueInput(newBusinessDraft.value) ?? undefined,
                    notes: newBusinessDraft.notes.trim()
                      ? [{
                          title: 'Nota',
                          description: newBusinessDraft.notes.trim(),
                          createdAt: new Date().toISOString()
                        }]
                      : undefined
                  }

                  void (async () => {
                    try {
                      await WebhookService.createNegotiation(payload)
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
                  })()
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
                  cursor: 'pointer'
                }}
              >
                Salvar
              </button>
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
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
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
              lineHeight: 1.2
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
                color: '#6b7280'
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
                business.temperature ?? ''
              )
              const businessLifecycleTagPresentation = getBusinessLifecycleTagPresentation(
                business.stage,
                business.closedAt ?? null
              )
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
                      setSelectedBusinessId(business.id)
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
                      transition: 'background 120ms ease'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 12 }}>
                      <h3 style={{ margin: 0, color: '#111827', fontSize: 20, lineHeight: 1.2, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                          flexShrink: 0
                        }}
                      >
                        {businessTypeIcon}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap', background: '#dbeafe', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                        <span style={tagContentStyle}>{getLeadStageLabel(business.stage)}</span>
                      </span>

                      <span style={{ fontSize: 12, fontWeight: 700, color: businessLifecycleTagPresentation.textColor, whiteSpace: 'nowrap', background: businessLifecycleTagPresentation.background, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                        <span style={tagContentStyle}>{businessLifecycleTagPresentation.label}</span>
                      </span>

                      {businessTypeLabel === 'Sem tipo' ? null : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap', background: '#ede9fe', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                          <span style={tagContentStyle}>{businessTypeLabel}</span>
                        </span>
                      )}

                      {temperatureTagPresentation.label === '-' ? null : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: temperatureTagPresentation.textColor, whiteSpace: 'nowrap', background: `${temperatureTagPresentation.textColor}44`, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                          {temperatureTagPresentation.icon ? (
                            <span style={tagIconStyle}>{temperatureTagPresentation.icon}</span>
                          ) : null}
                          <span style={tagContentStyle}>{temperatureTagPresentation.label}</span>
                        </span>
                      )}

                      {formatLeadValue(business.value) === '-' ? null : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', whiteSpace: 'nowrap', background: '#dcfce7', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1 }}>
                          <span style={tagContentStyle}>{formatLeadValue(business.value)}</span>
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
                    setSelectedBusinessId(business.id)
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
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)'
                  }}
                  onMouseEnter={() => setHoveredBusinessId(business.id)}
                  onMouseLeave={() => setHoveredBusinessId(null)}
                >
                  <div style={{ background: '#1f7a4d' }} />

                  <div
                    style={{
                      padding: '14px 16px',
                      display: 'grid',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <h3 style={{ margin: 0, color: '#111827', fontSize: 34 / 2, fontWeight: 800, lineHeight: 1.2 }}>
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
                            flexShrink: 0
                          }}
                        >
                          {businessTypeIcon}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                          gap: 10,
                          width: '100%'
                        }}
                      >
                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Etapa</span>
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
                            width: '100%'
                          }}
                        >
                          <span style={tagContentStyle}>{getLeadStageLabel(business.stage)}</span>
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Status</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: businessLifecycleTagPresentation.textColor,
                            whiteSpace: 'nowrap',
                            background: businessLifecycleTagPresentation.background,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            lineHeight: 1.1,
                            width: '100%'
                          }}
                        >
                          <span style={tagContentStyle}>{businessLifecycleTagPresentation.label}</span>
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Tipo</span>
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
                              width: '100%'
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
                              width: '100%'
                            }}
                          >
                            <span style={tagContentStyle}>{businessTypeLabel}</span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Temperatura</span>
                        {temperatureTagPresentation.label === '-' ? (
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
                              width: '100%'
                            }}
                          >
                            -
                          </span>
                        ) : (
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
                              width: '100%'
                            }}
                          >
                            {temperatureTagPresentation.icon ? (
                              <span style={tagIconStyle}>{temperatureTagPresentation.icon}</span>
                            ) : null}
                            <span style={tagContentStyle}>{temperatureTagPresentation.label}</span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Valor</span>
                        {formatLeadValue(business.value) === '-' ? (
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
                              width: '100%'
                            }}
                          >
                            -
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
                              width: '100%'
                            }}
                          >
                            <span style={tagContentStyle}>{formatLeadValue(business.value)}</span>
                          </span>
                        )}
                      </div>
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
                cursor: 'default'
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
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)'
              }}
            >
              {businessCreateContent}
            </aside>
          </>
        ) : null}

        {businessesError ? <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p> : null}
      </section>
    )
  }

  const renderNotesTab = () => {
    const notesBusinesses = leadNegotiations
    const defaultNotesBusiness =
      notesBusinesses.find((business) => (business.notes ?? []).length > 0) ?? notesBusinesses[0] ?? null
    const selectedNotesBusiness = notesBusinesses.find(
      (business) => business.id === selectedLeadNotesBusinessId
    ) ?? defaultNotesBusiness
    const selectedNotesBusinessNotes = (selectedNotesBusiness?.notes ?? [])
      .map((note, originalIndex) => ({ note, originalIndex }))
      .sort((firstItem, secondItem) => {
        const firstTimestamp = firstItem.note.createdAt ? new Date(firstItem.note.createdAt).getTime() : 0
        const secondTimestamp = secondItem.note.createdAt ? new Date(secondItem.note.createdAt).getTime() : 0

        return secondTimestamp - firstTimestamp
      })

    const notesTotal = selectedNotesBusinessNotes.length
    const canOpenCreateLeadTabNote = notesBusinesses.length > 0
    const canCreateLeadTabNote = Boolean(
      newLeadTabNoteDraft.businessId.trim() &&
      newLeadTabNoteDraft.title.trim() &&
      newLeadTabNoteDraft.description.trim()
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

      if (!leadId || !targetBusinessId || !trimmedTitle || !trimmedDescription) {
        return
      }

      const targetBusiness = leadNegotiations.find((business) => business.id === targetBusinessId)
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
            createdAt: new Date().toISOString()
          }
        ]
      }

      try {
        await WebhookService.updateNegotiation(targetBusinessId, payload)
        await refreshLeadNegotiations(leadId)
        onLeadUpdated?.()
        setSelectedLeadNotesBusinessId(targetBusinessId)
        handleCloseLeadTabCreateNote()
      } catch (exception: unknown) {
        const message =
          exception instanceof Error ? exception.message : 'Falha ao criar nota.'
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
          padding: isMobile ? '22px 18px 28px' : 0
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
              paddingBottom: 6
            }}
          >
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 700 }}>
              Nova nota
            </h3>

            <button
              type="button"
              aria-label="Fechar criação de nota"
              onClick={handleCloseLeadTabCreateNote}
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
        ) : null}

        {leadTabNotesError ? (
          <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>{leadTabNotesError}</p>
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
            Negócio
          </label>
          <select
            value={newLeadTabNoteDraft.businessId}
            onChange={(event) =>
              setNewLeadTabNoteDraft((current) => ({
                ...current,
                businessId: event.target.value
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
              background: '#ffffff'
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
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
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
                title: event.target.value
              }))
            }
            style={{
              height: isMobile ? 46 : 42,
              border: '1px solid #d7dce4',
              borderRadius: 10,
              padding: '0 14px',
              color: '#111827',
              fontSize: isMobile ? 17 / 1.2 : 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ color: '#1f2937', fontSize: isMobile ? 17 / 1.3 : 13, fontWeight: 700 }}>
            Descrição
          </label>
          <textarea
            placeholder="Escreva a descrição da nota..."
            value={newLeadTabNoteDraft.description}
            onChange={(event) =>
              setNewLeadTabNoteDraft((current) => ({
                ...current,
                description: event.target.value
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
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 2 }}>
          <button
            type="button"
            onClick={handleCloseLeadTabCreateNote}
            style={{
              minWidth: 120,
              height: 42,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCreateLeadTabNote()
            }}
            disabled={!canCreateLeadTabNote}
            style={{
              minWidth: 120,
              height: 42,
              border: 'none',
              borderRadius: 8,
              background: '#1f7a4d',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor: canCreateLeadTabNote ? 'pointer' : 'not-allowed'
            }}
          >
            Salvar
          </button>
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
          boxSizing: 'border-box'
        }}
      >
        {!shouldShowDesktopCreateOnly ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  if (!canOpenCreateLeadTabNote) {
                    return
                  }

                  setIsCreatingLeadTabNote(true)
                  setLeadTabNotesError(null)
                  setNewLeadTabNoteDraft({
                    businessId: selectedLeadNotesBusinessId || selectedNotesBusiness?.id || defaultNotesBusiness?.id || '',
                    title: '',
                    description: ''
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
                  opacity: canOpenCreateLeadTabNote ? 1 : 0.65
                }}
              >
                + Adicionar nota
              </button>

              <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
                {notesTotal} nota{notesTotal === 1 ? '' : 's'}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: isMobile ? 'none' : 320 }}>
              <label style={{ color: '#1f2937', fontSize: 14, fontWeight: 700 }}>Negocio</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedLeadNotesBusinessId}
                  onChange={(event) => setSelectedLeadNotesBusinessId(event.target.value)}
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
                    cursor: notesBusinesses.length === 0 ? 'not-allowed' : 'pointer'
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
                    pointerEvents: 'none'
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                Nova nota
              </h2>

              <button
                type="button"
                onClick={handleCloseLeadTabCreateNote}
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
                aria-label="Fechar criação de nota"
              >
                X
              </button>
            </div>

            <article
              style={{
                border: 'none',
                borderRadius: 0,
                padding: 0,
                background: 'transparent',
                display: 'grid',
                gap: 18,
                maxWidth: 760
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
              overflowY: isMobile ? 'visible' : 'auto'
            }}
          >
            {!selectedNotesBusiness ? (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Nenhum negócio cadastrado para este lead.
              </p>
            ) : selectedNotesBusinessNotes.length === 0 ? (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Nenhuma nota cadastrada.</p>
            ) : (
              selectedNotesBusinessNotes.map(({ note, originalIndex }, noteIndex) => (
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
                  onMouseEnter={() => setHoveredBusinessNoteIndex(originalIndex)}
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
                    cursor: 'pointer'
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
                      borderRight: '52px solid transparent'
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
                      alignSelf: 'center'
                    }}
                  >
                    <FileText size={18} />
                  </div>

                  <div style={{ minWidth: 0, display: 'grid', gap: 4, paddingTop: 2, alignSelf: 'center' }}>
                    <span
                      style={{
                        color: '#0f172a',
                        fontSize: 17,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
                        maxWidth: '70%'
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
                      alignSelf: 'start'
                    }}
                  >
                    {formatDateOnly(note.createdAt) || '-'}
                  </span>
                </article>
              ))
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
                cursor: 'default'
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
                boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)'
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

    const currentRuntimeMode: LeadRuntimeMode = leadData?.runtimeMode ?? 'AUTOMATION'
    const isHumanMode = currentRuntimeMode === 'HUMAN'
    const nextModeLabel = isHumanMode ? 'Voltar para automação' : 'Assumir como humano'
    const nextModeIcon = isHumanMode ? <Bot size={18} /> : <CircleUserRound size={18} />

    const handleToggleRuntimeMode = async () => {
      if (!leadId || isUpdatingRuntimeMode) return

      const nextRuntimeMode: LeadRuntimeMode =
        isHumanMode ? 'AUTOMATION' : 'HUMAN'

      try {
        setIsUpdatingRuntimeMode(true)
        setRuntimeModeError(null)

        const updatedRuntimeMode = await WebhookService.updateLeadRuntimeMode(
          leadId,
          nextRuntimeMode
        )

        setLeadData((currentLead) => {
          if (!currentLead) return currentLead

          return {
            ...currentLead,
            runtimeMode: updatedRuntimeMode
          }
        })
      } catch (exception: unknown) {
        const message =
          exception instanceof Error
            ? exception.message
            : 'Falha ao atualizar modo de atendimento.'

        setRuntimeModeError(message)
      } finally {
        setIsUpdatingRuntimeMode(false)
      }
    }

    return (
      <section
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 12,
          height: '100%'
        }}
      >
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 18,
            background: '#ffffff',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              minWidth: 220
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isHumanMode
                  ? 'linear-gradient(135deg, #e8f7ee 0%, #d8f0e3 100%)'
                  : 'linear-gradient(135deg, #eef2ff 0%, #dde6ff 100%)',
                color: isHumanMode ? '#167a43' : '#324fa8'
              }}
            >
              <Headset size={28} />
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#111827', fontWeight: 700, lineHeight: 1.15 }}>
                Modo de atendimento
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.2 }}>
                Atual:{' '}
                <span style={{ color: isHumanMode ? '#167a43' : '#324fa8', fontWeight: 600 }}>
                  {isHumanMode ? 'Manual' : 'Automação'}
                </span>
              </p>
              {runtimeModeError ? (
                <p style={{ margin: 0, fontSize: 12, color: '#b91c1c', lineHeight: 1.2 }}>
                  {runtimeModeError}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleToggleRuntimeMode()}
            disabled={isUpdatingRuntimeMode}
            style={{
              minHeight: 48,
              border: '1px solid rgba(22, 122, 67, 0.26)',
              borderRadius: 12,
              background: isHumanMode
                ? 'linear-gradient(135deg, #1e7f46 0%, #146737 100%)'
                : 'linear-gradient(135deg, #325dca 0%, #1f46ad 100%)',
              color: '#ffffff',
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isUpdatingRuntimeMode ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              minWidth: 230,
              boxShadow: isUpdatingRuntimeMode
                ? 'none'
                : '0 8px 18px rgba(17, 24, 39, 0.14)',
              opacity: isUpdatingRuntimeMode ? 0.75 : 1,
              transition: 'transform 140ms ease, filter 140ms ease'
            }}
          >
            {isUpdatingRuntimeMode ? null : nextModeIcon}
            {isUpdatingRuntimeMode ? 'Atualizando...' : nextModeLabel}
          </button>
        </div>

        <LeadChatTab leadId={leadId} />
      </section>
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
    activeTab === 'negocios' &&
    Boolean(selectedBusinessId)

  useEffect(() => {
    if (isCreateLeadMode) {
      setIsLoading(false)
      setError(null)
      setFollowUpsError(null)
      setBusinessesError(null)
      setLeadData(null)
      setMessageTemplates([])
      setFollowUpsTotalItems(0)
      setStatusSortFocus('overdue')
      setDateSortOrder('asc')
      setHoveredFollowUpId(null)
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
      setRuntimeModeError(null)
      return
    }

    if (!leadId) {
      setError('Lead não informado.')
      setFollowUpsError(null)
      setBusinessesError(null)
      setLeadData(null)
      setMessageTemplates([])
      setLeadNegotiations([])
      setNegotiationFollowUps([])
      setFollowUpsTotalItems(0)
      setStatusSortFocus('overdue')
      setDateSortOrder('asc')
      setRuntimeModeError(null)
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
        const initialStatusSortFocus: FollowUpSortFocus = 'overdue'
        const initialDateSortOrder: FollowUpDateSortOrder = 'asc'
        setStatusSortFocus(initialStatusSortFocus)
        setDateSortOrder(initialDateSortOrder)
        setRuntimeModeError(null)
        setIsUpdatingRuntimeMode(false)
        const [lead, templates] = await Promise.all([
          WebhookService.loadLead(leadId),
          WebhookService.loadMessageTemplates()
        ])
        setLeadData(lead)
        setMessageTemplates(templates)
        await refreshLeadNegotiations(leadId)
      } catch (exception: unknown) {
        const message = exception instanceof Error ? exception.message : 'Falha ao carregar lead.'
        setLeadData(null)
        setMessageTemplates([])
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
    const canCreateLead = Boolean(infoDraft.name.trim() && isLeadPhoneComplete(infoDraft.phone))

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
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              Novo lead
            </h2>
          </div>

          <button
            type="button"
            aria-label="Fechar criação de lead"
            onClick={() => navigate(`${closeLeadPath}${location.search}`)}
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

        {error ? <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p> : null}

        <article
          style={{
            border: isMobile ? 'none' : '1px solid #e5e7eb',
            borderRadius: isMobile ? 0 : 16,
            padding: isMobile ? 0 : 24,
            background: isMobile ? 'transparent' : '#ffffff',
            display: 'grid',
            gap: 18,
            maxWidth: isMobile ? 'none' : 760,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: isMobile ? 2 : 6,
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: 10,
              alignContent: 'start'
            }}
          >
            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Nome</span>
            <input
              type="text"
              value={infoDraft.name}
              onChange={(event) => setInfoDraft((current) => ({ ...current, name: event.target.value }))}
              autoComplete="new-password"
              style={{
                width: '100%',
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 16,
                color: '#111827',
                boxSizing: 'border-box'
              }}
            />

            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Telefone</span>
            <input
              type="text"
              value={infoDraft.phone}
              onChange={(event) => setInfoDraft((current) => ({ ...current, phone: formatLeadPhoneInput(event.target.value) }))}
              autoComplete="new-password"
              maxLength={14}
              inputMode="numeric"
              style={{
                width: '100%',
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 16,
                color: '#111827',
                boxSizing: 'border-box'
              }}
            />

            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Email</span>
            <input
              type="email"
              value={infoDraft.email}
              onChange={(event) => setInfoDraft((current) => ({ ...current, email: event.target.value }))}
              autoComplete="new-password"
              style={{
                width: '100%',
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 16,
                color: '#111827',
                boxSizing: 'border-box'
              }}
            />

            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Localização</span>
            <input
              type="text"
              value={infoDraft.location}
              onChange={(event) => setInfoDraft((current) => ({ ...current, location: event.target.value }))}
              autoComplete="new-password"
              style={{
                width: '100%',
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 16,
                color: '#111827',
                boxSizing: 'border-box'
              }}
            />

            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Origem</span>
            <select
              value={infoDraft.source.toLowerCase()}
              onChange={(event) => setInfoDraft((current) => ({ ...current, source: event.target.value }))}
              style={{
                width: '100%',
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 14,
                color: '#111827',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Selecione</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="metaads">MetaAds</option>
              <option value="indicacao">Indicação</option>
            </select>

            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Qualificação</span>
            <select
              value={infoDraft.leadQualification}
              onChange={(event) =>
                setInfoDraft((current) => ({
                  ...current,
                  leadQualification: event.target.value as '' | 'qualify' | 'not qualify'
                }))
              }
              style={{
                width: '100%',
                height: 36,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 14,
                color: '#111827',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Não definido</option>
              <option value="qualify">Qualificado</option>
              <option value="not qualify">Não qualificado</option>
            </select>

            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Links</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#334155',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={infoDraft.selectedSocialLinks.includes('instagram')}
                  onChange={() => {
                    setInfoDraft((current) => {
                      const isSelected = current.selectedSocialLinks.includes('instagram')

                      if (isSelected) {
                        return {
                          ...current,
                          selectedSocialLinks: current.selectedSocialLinks.filter((item) => item !== 'instagram'),
                          socialLinks: {
                            ...current.socialLinks,
                            instagram: ''
                          }
                        }
                      }

                      return {
                        ...current,
                        selectedSocialLinks: [...current.selectedSocialLinks, 'instagram']
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
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={infoDraft.selectedSocialLinks.includes('url')}
                  onChange={() => {
                    setInfoDraft((current) => {
                      const isSelected = current.selectedSocialLinks.includes('url')

                      if (isSelected) {
                        return {
                          ...current,
                          selectedSocialLinks: current.selectedSocialLinks.filter((item) => item !== 'url'),
                          socialLinks: {
                            ...current.socialLinks,
                            url: ''
                          }
                        }
                      }

                      return {
                        ...current,
                        selectedSocialLinks: [...current.selectedSocialLinks, 'url']
                      }
                    })
                  }}
                />
                URL
              </label>
            </div>

            {infoDraft.selectedSocialLinks.includes('instagram') ? (
              <>
                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Instagram</span>
                <input
                  type="text"
                  value={infoDraft.socialLinks.instagram}
                  onChange={(event) =>
                    setInfoDraft((current) => ({
                      ...current,
                      socialLinks: {
                        ...current.socialLinks,
                        instagram: event.target.value
                      }
                    }))
                  }
                  placeholder="@usuario ou link"
                  style={{
                    width: '100%',
                    height: 36,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 16,
                    color: '#111827',
                    boxSizing: 'border-box'
                  }}
                />
              </>
            ) : null}

            {infoDraft.selectedSocialLinks.includes('url') ? (
              <>
                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>URL</span>
                <input
                  type="text"
                  value={infoDraft.socialLinks.url}
                  onChange={(event) =>
                    setInfoDraft((current) => ({
                      ...current,
                      socialLinks: {
                        ...current.socialLinks,
                        url: event.target.value
                      }
                    }))
                  }
                  placeholder="https://"
                  style={{
                    width: '100%',
                    height: 36,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 16,
                    color: '#111827',
                    boxSizing: 'border-box'
                  }}
                />
              </>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate(`${closeLeadPath}${location.search}`)}
              style={{
                minWidth: 120,
                height: 42,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => {
                void handleCreateLead()
              }}
              disabled={!canCreateLead}
              style={{
                minWidth: 120,
                height: 42,
                border: 'none',
                borderRadius: 8,
                background: '#1f7a4d',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: canCreateLead ? 'pointer' : 'not-allowed'
              }}
            >
              Salvar
            </button>
          </div>
        </article>
      </section>
    )
  }

  const mobileLeadStateLabel =
    leadData?.state?.trim().toLowerCase() === 'archived' ? 'Arquivado' : 'Ativo'
  const isMobileLeadArchived = mobileLeadStateLabel === 'Arquivado'
  const isMobileLeadFavorite = Boolean(leadData?.isFavorite)
  const mobileSelectedBusiness = isMobile && activeTab === 'negocios' && selectedBusinessId
    ? leadNegotiations.find((business) => business.id === selectedBusinessId) ?? null
    : null
  const isMobileSelectedBusinessClosed = mobileSelectedBusiness
    ? formatDateOnly(mobileSelectedBusiness.closedAt) !== '-'
    : false

  return (
    <section
      style={{
        height: '100%',
        minHeight: 0,
        padding: isMobile ? '18px 0 0' : '40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 0 : 8,
        background: '#ffffff'
      }}
    >
      {isMobile ? (
        <header
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: 12,
            padding: '0 12px 18px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <button
              type="button"
              aria-label={mobileSelectedBusiness ? 'Voltar para o lead' : 'Voltar para listagem de leads'}
              onClick={() => {
                if (mobileSelectedBusiness) {
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
                flexShrink: 0
              }}
            >
              <ArrowLeft size={22} />
            </button>

            <h1
              style={{
                margin: 0,
                color: '#111827',
                fontSize: 20,
                fontWeight: 800,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {mobileSelectedBusiness?.title?.trim() || leadData?.name?.trim() || '-'}
            </h1>
            {!mobileSelectedBusiness && isMobileLeadFavorite ? (
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
                  flexShrink: 0
                }}
                aria-label="Lead favoritado"
                title="Lead favoritado"
              >
                <Star size={14} fill="#f59e0b" />
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mobileSelectedBusiness ? (
              <div ref={businessActionsRef} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
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
                    cursor: 'pointer'
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
                      gap: 4
                    }}
                  >
                    {isMobileSelectedBusinessClosed ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedBusinessId) return

                          void (async () => {
                            try {
                              await WebhookService.updateNegotiation(selectedBusinessId, {
                                stage: 'NEW',
                                closedAt: null
                              })
                              await refreshLeadNegotiations(leadId ?? '')
                              onLeadUpdated?.()
                              setActiveBusinessTab('informacoes')
                              setIsBusinessActionsOpen(false)
                              setIsConfirmingBusinessClose(false)
                            } catch (exception: unknown) {
                              const message = exception instanceof Error ? exception.message : 'Falha ao reabrir negócio.'
                              setBusinessesError(message)
                            }
                          })()
                        }}
                        style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#0f172a', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                      >
                        Reabrir Negócio
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfirmingBusinessClose(true)
                          setIsConfirmingBusinessDelete(false)
                          setIsBusinessActionsOpen(false)
                        }}
                        style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#0f172a', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                      >
                        Fechar Negócio
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isMobileSelectedBusinessClosed}
                      onClick={() => {
                        if (isMobileSelectedBusinessClosed) return
                        setIsEditingBusiness(true)
                        setIsConfirmingBusinessDelete(false)
                        setIsConfirmingBusinessClose(false)
                        setActiveBusinessTab('informacoes')
                        setIsBusinessActionsOpen(false)
                      }}
                      style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: isMobileSelectedBusinessClosed ? '#94a3b8' : '#0f172a', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: isMobileSelectedBusinessClosed ? 'not-allowed' : 'pointer' }}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmingBusinessDelete(true)
                        setIsConfirmingBusinessClose(false)
                        setIsBusinessActionsOpen(false)
                      }}
                      style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#dc2626', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                    >
                      Deletar
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
            <div ref={generalActionsRef} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
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
                  cursor: 'pointer'
                }}
                aria-label="Abrir ações do lead"
              >
                <MoreVertical size={20} />
              </button>

              {isGeneralActionsOpen ? (
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
                    gap: 4
                  }}
                >
                  <button
                    type="button"
                    onClick={handleStartLeadInfoEdit}
                    style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#0f172a', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggleLeadFavorite()}
                    style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#0f172a', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                  >
                    {isMobileLeadFavorite ? 'Desfavoritar' : 'Favoritar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isMobileLeadArchived) {
                        void handleToggleLeadArchive()
                        return
                      }

                      setIsConfirmingLeadArchive(true)
                      setIsConfirmingLeadDelete(false)
                      setIsEditingLeadInfo(false)
                      setIsGeneralActionsOpen(false)
                    }}
                    style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#0f172a', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                  >
                    {isMobileLeadArchived ? 'Desarquivar' : 'Arquivar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingLeadDelete(true)
                      setIsEditingLeadInfo(false)
                      setIsGeneralActionsOpen(false)
                    }}
                    style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: 8, color: '#dc2626', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '10px 12px', cursor: 'pointer' }}
                  >
                    Deletar
                  </button>
                </div>
              ) : null}
            </div>
            )}
          </div>
        </header>
      ) : null}

      {mobileSelectedBusiness ? (
        <div style={{ display: 'grid', gap: 0 }}>
          <nav
            className="mobile-tabs-scrollbar-hidden"
            style={{
              padding: '0 4px',
              overflowX: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {[
                { key: 'informacoes' as const, label: 'Informações' },
                { key: 'followups' as const, label: 'FollowUps' },
                { key: 'arquivos' as const, label: 'Arquivos' },
                { key: 'notas' as const, label: 'Notas' }
              ].map((tab) => {
                const isActive = activeBusinessTab === tab.key

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      if (mobileSelectedBusiness) {
                        setBusinessDetailDraft({
                          title: mobileSelectedBusiness.title ?? '',
                          negotiationType: mobileSelectedBusiness.negotiationType ?? '',
                          stage: mobileSelectedBusiness.stage,
                          temperature: mobileSelectedBusiness.temperature ?? '',
                          value: formatLeadValueInputField(mobileSelectedBusiness.value),
                          notes: formatNegotiationNotes(mobileSelectedBusiness.notes)
                        })
                      }
                      setIsEditingBusiness(false)
                      setIsConfirmingBusinessDelete(false)
                      setIsConfirmingBusinessClose(false)
                      setActiveBusinessTab(tab.key)
                      setIsBusinessActionsOpen(false)
                    }}
                    onMouseEnter={() => setHoveredBusinessTab(tab.key)}
                    onMouseLeave={() => setHoveredBusinessTab(null)}
                    style={{
                      border: 'none',
                      background:
                        isActive || hoveredBusinessTab === tab.key
                          ? '#dcfce7'
                          : 'transparent',
                      borderRadius: 8,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      color:
                        isActive || hoveredBusinessTab === tab.key
                          ? '#1f7a4d'
                          : '#6b7280',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      ) : !shouldHideLeadTabs ? (
        <div style={{ display: 'grid', gap: 0 }}>
          <nav
            className={isMobile ? 'mobile-tabs-scrollbar-hidden' : undefined}
            style={{
              padding: isMobile ? '0 4px' : 0,
              overflowX: isMobile ? 'auto' : 'visible'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'flex-start' : 'space-between',
                gap: 12
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 10 : 4,
                  minWidth: isMobile ? 'max-content' : 0
                }}
              >
                {leadTabs.map((tab) => (
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
                          : '#6b7280'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {!isMobile ? (
                <button
                  type="button"
                  aria-label="Fechar lead"
                  onClick={() => navigate(closeLeadPath)}
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
              ) : null}
            </div>
          </nav>

          {!isMobile ? (
            <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: 8, marginBottom: 10 }} />
          ) : null}
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: isMobile ? '16px 12px 0' : 0 }}>
        {isLoading ? <p style={{ margin: 0, color: '#4b5563' }}>Carregando...</p> : null}
        {error ? <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p> : null}
        {!isLoading && !error ? renderTabContent() : null}
      </div>
    </section>
  )
}
