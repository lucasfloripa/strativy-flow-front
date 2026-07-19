import {
  AlertTriangle,
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
import { CreateFollowUpCard, FollowUpInlineForm } from '../../features/webhook/components/CreateFollowUpCard'
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
}

type LeadPageLocationState = {
  initialLeadTab?: LeadTabKey
  initialBusinessId?: string
  initialBusinessTab?: BusinessInnerTabKey
}

const initialLeadInfoDraft = {
  name: '',
  phone: '',
  email: '',
  source: '',
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
  { key: 'chat', label: 'Chat' },
  { key: 'notas', label: 'Anotações' }
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

export default function LeadPage({ onLeadUpdated }: LeadPageProps) {
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
  const [hoveredFollowUpId, setHoveredFollowUpId] = useState<string | null>(null)
  const [isCreatingAgendaFollowUp, setIsCreatingAgendaFollowUp] = useState<boolean>(false)
  const [agendaFollowUpDraft, setAgendaFollowUpDraft] = useState<{
    negotiationId: string
    value: string
    dueAt: string
  }>({
    negotiationId: '',
    value: '',
    dueAt: ''
  })
  const [infoDraft, setInfoDraft] = useState<{
    name: string
    phone: string
    email: string
    source: string
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
  const [isBusinessActionsOpen, setIsBusinessActionsOpen] = useState<boolean>(false)
  const [isConfirmingBusinessDelete, setIsConfirmingBusinessDelete] = useState<boolean>(false)
  const [isConfirmingBusinessClose, setIsConfirmingBusinessClose] = useState<boolean>(false)
  const [isEditingBusiness, setIsEditingBusiness] = useState<boolean>(false)
  const [editingBusinessFollowUpId, setEditingBusinessFollowUpId] = useState<string | null>(null)
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
  const closeLeadPath = location.pathname.startsWith('/negocios')
    ? '/negocios'
    : location.pathname.startsWith('/agenda')
      ? '/agenda'
      : location.pathname.startsWith('/arquivados')
        ? '/arquivados'
      : '/leads'
  const getCurrentMonthStart = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  const [agendaCalendarMonth, setAgendaCalendarMonth] = useState<Date>(() => getCurrentMonthStart())

  const formatFollowUpDate = (dateValue: string): string => {
    return dateValue ? formatDateTime(dateValue) : '-'
  }

  const getFollowUpVisualStatus = (followUp: LeadFollowUpResponse): FollowUpVisualStatus => {
    if (followUp.status === 'done') {
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

  const getStatusPresentation = (status: FollowUpVisualStatus) => {
    if (status === 'overdue') {
      return {
        label: 'Atrasado',
        textColor: '#ff2d2d',
        icon: <Clock4 size={12} color="#ff2d2d" />
      }
    }

    if (status === 'today') {
      return {
        label: 'Hoje',
        textColor: '#f59e0b',
        icon: <CalendarClock size={12} color="#f59e0b" />
      }
    }

    if (status === 'completed') {
      return {
        label: 'Concluído',
        textColor: '#16a34a',
        icon: <AlertTriangle size={12} color="#16a34a" />
      }
    }

    return {
      label: 'Agendado',
      textColor: '#2563eb',
      icon: <CalendarClock size={12} color="#2563eb" />
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
    value: string,
    dueAt: string
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    setBusinessesError(null)
    await WebhookService.createNegotiationFollowUp({
      negotiationId,
      value,
      dueAt
    })
    await refreshLeadNegotiations(leadId)
    onLeadUpdated?.()
  }

  const handleCreateAgendaFollowUp = async () => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    if (!agendaFollowUpDraft.negotiationId || !agendaFollowUpDraft.value.trim() || !agendaFollowUpDraft.dueAt) {
      setFollowUpsError('Preencha negocio, descricao e data/hora.')
      return
    }

    try {
      setFollowUpsError(null)
      await WebhookService.createNegotiationFollowUp({
        negotiationId: agendaFollowUpDraft.negotiationId,
        value: agendaFollowUpDraft.value.trim(),
        dueAt: agendaFollowUpDraft.dueAt
      })

      await refreshLeadNegotiations(leadId)
      onLeadUpdated?.()

      setAgendaFollowUpDraft((currentDraft) => ({
        ...currentDraft,
        value: '',
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
  }

  const handleUpdateNegotiationFollowUp = async (
    followUpId: string,
    value: string,
    dueAt: string
  ) => {
    if (!leadId) {
      throw new Error('Lead nao informado.')
    }

    try {
      setBusinessesError(null)
      await WebhookService.updateNegotiationFollowUp(followUpId, {
        value,
        dueAt
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
      await WebhookService.createLead({
        name: trimmedName,
        phone: persistedPhone,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(trimmedSource ? { source: trimmedSource } : {}),
        ...(hasSocialLinks ? { socialLinks: socialLinksPayload } : {}),
        leadQualification: infoDraft.leadQualification || null
      })

      setError(null)
      onLeadUpdated?.()
      navigate(`${closeLeadPath}${location.search}`, { replace: true })
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
    setIsCreatingBusiness(false)
    setSelectedBusinessId(requestedInitialBusinessId)
  }, [
    leadId,
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
    setSelectedBusinessId(shouldOpenRequestedBusiness ? requestedInitialBusinessId : null)
    // Keep ref cleared so the selected-business effect can apply initial tab state.
    selectedBusinessIdRef.current = null
    requestedBusinessTabRef.current = shouldOpenRequestedBusiness
      ? requestedInitialBusinessTab ?? 'informacoes'
      : null
    setIsBusinessActionsOpen(false)
    setIsConfirmingBusinessDelete(false)
    setIsConfirmingBusinessClose(false)
    setIsEditingBusiness(false)
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
      setViewingBusinessNoteIndex(null)
      setEditingBusinessNoteIndex(null)
      setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
      setIsEditingBusiness(false)
      setHoveredBusinessNoteIndex(null)
      requestedBusinessNoteIndexRef.current = null
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

    if (selectedBusinessIdRef.current !== selectedBusinessId) {
      const requestedBusinessTab = requestedBusinessTabRef.current ?? 'informacoes'
      setActiveBusinessTab(requestedBusinessTab)
      setEditingBusinessFollowUpId(null)
      setConfirmingDeleteBusinessFollowUpId(null)
      setHoveredBusinessFollowUpId(null)

      if (requestedBusinessTab === 'notas' && requestedBusinessNoteIndexRef.current !== null) {
        setViewingBusinessNoteIndex(requestedBusinessNoteIndexRef.current)
      } else {
        setViewingBusinessNoteIndex(null)
      }

      requestedBusinessTabRef.current = null
      requestedBusinessNoteIndexRef.current = null
    }

    selectedBusinessIdRef.current = selectedBusinessId
    setIsCreatingBusinessNote(false)
    setEditingBusinessNoteIndex(null)
    setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
    setIsEditingBusiness(false)
    setHoveredBusinessNoteIndex(null)
    setIsBusinessActionsOpen(false)
    setIsConfirmingBusinessDelete(false)
    setIsConfirmingBusinessClose(false)
  }, [
    selectedBusinessId,
    leadNegotiations,
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
    const canCreateAgendaFollowUp =
      Boolean(agendaFollowUpDraft.negotiationId) &&
      Boolean(agendaFollowUpDraft.value.trim()) &&
      Boolean(agendaFollowUpDraft.dueAt)
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
      setSelectedBusinessId(followUp.negotiationId)
      setActiveBusinessTab('followups')
      setActiveTab('negocios')
    }

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
        {followUpsError ? <p style={{ margin: 0, color: '#b91c1c' }}>{followUpsError}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          {!isCreatingAgendaFollowUp ? (
            <button
              type="button"
              onClick={() => {
                const defaultNegotiationId = leadNegotiations[0]?.id ?? ''
                setAgendaFollowUpDraft((currentDraft) => ({
                  ...currentDraft,
                  negotiationId: currentDraft.negotiationId || defaultNegotiationId
                }))
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

        {isCreatingAgendaFollowUp ? (
          <div
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 8,
              background: '#ffffff',
              minHeight: 42,
              padding: '9px 12px',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 190px) minmax(0, 1fr) 180px auto',
                alignItems: 'center',
                columnGap: 8
              }}
            >
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
                  minWidth: 0,
                  height: 24,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  padding: '0 6px',
                  fontSize: 13,
                  color: '#111827',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Selecione o negocio</option>
                {leadNegotiations.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.title ?? 'Negócio sem nome'}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={agendaFollowUpDraft.value}
                onChange={(event) =>
                  setAgendaFollowUpDraft((currentDraft) => ({
                    ...currentDraft,
                    value: event.target.value
                  }))
                }
                placeholder="Nome do Follow-up"
                style={{
                  width: '100%',
                  minWidth: 0,
                  height: 24,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  padding: '0 8px',
                  fontSize: 13,
                  color: '#111827',
                  boxSizing: 'border-box'
                }}
              />

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
                  width: '100%',
                  minWidth: 0,
                  height: 24,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  padding: '0 6px',
                  fontSize: 13,
                  color: '#111827',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'start' }}>
                <button
                  type="button"
                  onClick={handleCancelAgendaFollowUpCreation}
                  aria-label="Cancelar criação de follow-up da agenda"
                  style={{
                    height: 24,
                    width: 24,
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    background: '#ffffff',
                    color: '#374151',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  X
                </button>

                <button
                  type="button"
                  onClick={() => void handleCreateAgendaFollowUp()}
                  disabled={!canCreateAgendaFollowUp}
                  aria-label="Confirmar criação de follow-up da agenda"
                  style={{
                    height: 24,
                    width: 24,
                    border: 'none',
                    borderRadius: 4,
                    background: canCreateAgendaFollowUp
                      ? interactionTheme.primaryButtonBackground
                      : '#9ca3af',
                    color: '#ffffff',
                    padding: 0,
                    cursor: canCreateAgendaFollowUp ? 'pointer' : 'not-allowed'
                  }}
                >
                  ✓
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
                              title={`${businessNameById.get(followUp.negotiationId) ?? 'Negócio sem nome'} - ${followUp.value} - ${dueTime}`}
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
                                {followUp.value}
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
      </section>
    )
  }

  const renderBusinessFollowUpsTab = (businessId: string) => {
    const followUpsColumns = 'minmax(0,1fr) 112px 156px 84px'
    const followUpsRowMinHeight = 50
    const businessFollowUps = negotiationFollowUps
      .filter((followUp) => followUp.negotiationId === businessId)
      .sort((firstItem, secondItem) => {
        const firstDate = getApiDateTimestamp(firstItem.dueAt)
        const secondDate = getApiDateTimestamp(secondItem.dueAt)
        return firstDate - secondDate
      })

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
        {businessesError ? <p style={{ margin: 0, color: '#b91c1c' }}>{businessesError}</p> : null}

        <CreateFollowUpCard
          onConfirm={(value, dueAt) => handleCreateNegotiationFollowUp(businessId, value, dueAt)}
          variant="list-footer"
          headerTrailingContent={
            <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
              {businessFollowUps.length} follow-up{businessFollowUps.length === 1 ? '' : 's'}
            </span>
          }
        />

        {isMobile ? (
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
                const statusPresentation = getStatusPresentation(visualStatus)
                const followUpDateTagColors = getFollowUpDateTagColors(visualStatus)
                const isHovered = hoveredBusinessFollowUpId === followUp.id

                if (editingBusinessFollowUpId === followUp.id) {
                  return (
                    <article
                      key={followUp.id}
                      style={{
                        background: isHovered ? interactionTheme.clickableCardHoverBackground : '#ffffff',
                        border: '1px solid #f1f5f9',
                        borderRadius: 18,
                        boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
                        padding: 16
                      }}
                      onMouseEnter={() => setHoveredBusinessFollowUpId(followUp.id)}
                      onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                    >
                      <FollowUpInlineForm
                        modeLabel="EDITAR FOLLOW-UP"
                        initialValue={followUp.value}
                        initialDueAt={followUp.dueAt}
                        variant="table-row"
                        columnsTemplate="minmax(0, 1fr)"
                        onCancel={() => setEditingBusinessFollowUpId(null)}
                        onConfirm={(value, dueAt) =>
                          handleUpdateNegotiationFollowUp(followUp.id, value, dueAt)
                        }
                      />
                    </article>
                  )
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
                          {followUp.value || 'Follow-up sem nome'}
                        </h2>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Editar follow-up"
                          onClick={() => {
                            setConfirmingDeleteBusinessFollowUpId(null)
                            setEditingBusinessFollowUpId(followUp.id)
                          }}
                          style={{ height: 34, width: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#4b5563', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Brush size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label="Excluir follow-up"
                          onClick={() => {
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
                          onClick={() => void handleToggleNegotiationFollowUpStatus(followUp.id, followUp.status)}
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

                      <span style={{ fontSize: 12, fontWeight: 700, color: statusPresentation.textColor, whiteSpace: 'nowrap', background: `${statusPresentation.textColor}33`, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', lineHeight: 1.1, gap: 4 }}>
                        {statusPresentation.icon}
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusPresentation.label}</span>
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
            flexDirection: 'column'
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Descrição</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Status</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Data/Hora</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', justifySelf: 'start' }}>Ações</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                const statusPresentation = getStatusPresentation(visualStatus)
                const followUpDateTagColors = getFollowUpDateTagColors(visualStatus)
                const rowBorder = '1px solid #f0f0f0'
                const rowBackground =
                  hoveredBusinessFollowUpId === followUp.id
                    ? interactionTheme.clickableCardHoverBackground
                    : '#ffffff'

                if (editingBusinessFollowUpId === followUp.id) {
                  return (
                    <div
                      key={followUp.id}
                      style={{
                        borderBottom: rowBorder,
                        padding: '0 12px',
                        background: rowBackground,
                        minHeight: followUpsRowMinHeight,
                        display: 'grid',
                        gridTemplateColumns: followUpsColumns,
                        alignItems: 'center',
                        justifyItems: 'start',
                        columnGap: 8,
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={() => setHoveredBusinessFollowUpId(followUp.id)}
                      onMouseLeave={() => setHoveredBusinessFollowUpId(null)}
                    >
                      <div style={{ gridColumn: '1 / -1', width: '100%' }}>
                        <FollowUpInlineForm
                          modeLabel="EDITAR FOLLOW-UP"
                          initialValue={followUp.value}
                          initialDueAt={followUp.dueAt}
                          variant="table-row"
                          columnsTemplate={followUpsColumns}
                          onCancel={() => setEditingBusinessFollowUpId(null)}
                          onConfirm={(value, dueAt) =>
                            handleUpdateNegotiationFollowUp(followUp.id, value, dueAt)
                          }
                        />
                      </div>
                    </div>
                  )
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
                      {followUp.value}
                    </p>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: statusPresentation.textColor,
                        whiteSpace: 'nowrap',
                        background: `${statusPresentation.textColor}44`,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        lineHeight: 1.1,
                        justifySelf: 'start'
                      }}
                    >
                      {statusPresentation.icon ? statusPresentation.icon : null}
                      {statusPresentation.label}
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
                        onClick={() => {
                          setConfirmingDeleteBusinessFollowUpId(null)
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
                        onClick={() => {
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
                        type="button"
                        aria-label={
                          followUp.status === 'done'
                            ? 'Desfazer conclusão do follow-up'
                            : 'Concluir follow-up'
                        }
                        onClick={() => void handleToggleNegotiationFollowUpStatus(followUp.id, followUp.status)}
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
        )}
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
            flexDirection: 'column'
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

          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
      const selectedBusinessTitle = businessDetailDraft?.title ?? selectedBusiness.title ?? ''
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
            overflowY: 'auto',
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

          <div style={{ display: 'grid', gap: 10, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {!isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                  {(isEditingBusiness ? businessDetailDraft?.title : selectedBusinessTitle) || 'Negócio sem nome'}
                </h2>
              </div>

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
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: 30 / 2, fontWeight: 700 }}>Visão Geral</h3>
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
                display: 'grid',
                gap: 12
              }}
            >
              {!isCreatingBusinessNote && !viewedBusinessNote ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingBusinessNote(true)
                        setViewingBusinessNoteIndex(null)
                        setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
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
                      + Nova nota
                    </button>

                    <span style={{ color: '#6b7280', fontSize: 13, padding: '0 8px' }}>
                      {(selectedBusiness.notes?.length ?? 0)} nota{(selectedBusiness.notes?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {selectedBusinessNotes.length === 0 ? (
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Nenhuma nota cadastrada.</p>
                    ) : (
                      selectedBusinessNotes.map(({ note, originalIndex }, noteIndex) => (
                        <article
                          key={`${selectedBusiness.id}-note-${noteIndex}`}
                          onClick={() => {
                                setViewingBusinessNoteIndex(originalIndex)
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
              ) : isCreatingBusinessNote ? (
                <section
                  style={{
                    display: 'grid',
                    alignContent: 'start',
                    gap: 16,
                    minHeight: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: 20, fontWeight: 700 }}>
                      {editingBusinessNoteIndex === null ? 'Nova nota' : 'Editar Nota'}
                    </h3>
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
                        fontSize: 14,
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
                        setNewBusinessNoteDraft(initialNewBusinessNoteDraft)
                        setBusinessesError(null)
                      }}
                      style={{
                        minWidth: 120,
                        height: 44,
                        border: '1px solid #9ac6ae',
                        borderRadius: 10,
                        background: '#ffffff',
                        color: '#1f7a4d',
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
                        height: 44,
                        border: 'none',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #1f7a4d 0%, #155f3c 100%)',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor:
                          newBusinessNoteDraft.title.trim() && newBusinessNoteDraft.description.trim()
                            ? 'pointer'
                            : 'not-allowed',
                        opacity:
                          newBusinessNoteDraft.title.trim() && newBusinessNoteDraft.description.trim()
                            ? 1
                            : 0.6
                      }}
                    >
                      {editingBusinessNoteIndex === null ? 'Salvar' : 'Editar'}
                    </button>
                  </div>
                </section>
              ) : null}

              {!isCreatingBusinessNote && viewedBusinessNote ? (
                <section
                  style={{
                    display: 'grid',
                    alignContent: 'start',
                    gap: 16,
                    minHeight: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: 20, fontWeight: 700 }}>
                      Nota
                    </h3>
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
                      onClick={() => setViewingBusinessNoteIndex(null)}
                      style={{
                        minWidth: 120,
                        height: 44,
                        border: '1px solid #9ac6ae',
                        borderRadius: 10,
                        background: '#ffffff',
                        color: '#1f7a4d',
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
                        setBusinessesError(null)
                      }}
                      style={{
                        minWidth: 120,
                        height: 44,
                        border: 'none',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #1f7a4d 0%, #155f3c 100%)',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Editar
                    </button>
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
            display: 'grid',
            alignContent: 'start',
            gap: 16,
            height: isMobile ? 'auto' : '100%',
            minHeight: isMobile ? 'auto' : 0,
            overflowY: isMobile ? 'visible' : 'auto',
            padding: isMobile ? '22px 18px 28px' : 24,
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
              border: isMobile ? 'none' : '1px solid #e5e7eb',
              borderRadius: isMobile ? 0 : 16,
              padding: isMobile ? 0 : 24,
              background: isMobile ? 'transparent' : '#ffffff',
              display: 'grid',
              gap: 18,
              maxWidth: isMobile ? 'none' : 760
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px minmax(0, 1fr)',
                  rowGap: 10,
                  columnGap: 16,
                  alignItems: 'center'
                }}
              >
                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Tipo</span>
                <select
                  value={newBusinessDraft.negotiationType}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      negotiationType: event.target.value as '' | NegotiationType
                    }))
                  }
                  style={{
                    height: 36,
                    maxWidth: 240,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 14,
                    color: '#111827',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Selecione</option>
                  <option value="service">Serviço</option>
                  <option value="product">Produto</option>
                </select>

                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Nome</span>
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
                    height: 36,
                    maxWidth: 360,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 16,
                    color: '#111827',
                    boxSizing: 'border-box'
                  }}
                />

                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Etapa</span>
                <select
                  value={newBusinessDraft.stage}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      stage: event.target.value as LeadStage
                    }))
                  }
                  style={{
                    height: 36,
                    maxWidth: 240,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 14,
                    color: '#111827',
                    boxSizing: 'border-box'
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

                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Temperatura</span>
                <select
                  value={newBusinessDraft.temperature}
                  onChange={(event) =>
                    setNewBusinessDraft((current) => ({
                      ...current,
                      temperature: event.target.value as '' | NegotiationTemperature
                    }))
                  }
                  style={{
                    height: 36,
                    maxWidth: 240,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 14,
                    color: '#111827',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Selecione</option>
                  <option value="hot">Quente</option>
                  <option value="warm">Morno</option>
                  <option value="cold">Frio</option>
                </select>

                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Valor (R$)</span>
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
                    height: 36,
                    maxWidth: 360,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0 10px',
                    fontSize: 16,
                    color: '#111827',
                    boxSizing: 'border-box'
                  }}
                />
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
                border: '1px solid #e5e7eb',
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
                position: 'fixed',
                inset: 0,
                border: 'none',
                background: 'rgba(15, 23, 42, 0.18)',
                zIndex: 40,
                cursor: 'default'
              }}
            />

            <aside
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 'calc(82px + env(safe-area-inset-bottom))',
                maxHeight: 'calc(100% - 82px - env(safe-area-inset-bottom))',
                zIndex: 45,
                borderRadius: '22px 22px 0 0',
                background: '#ffffff',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
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
          minHeight: 0,
          boxSizing: 'border-box',
          padding: isMobile ? '22px 18px 28px' : 0
        }}
      >
        {isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
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
              background: canCreateLeadTabNote ? '#1f7a4d' : '#9ca3af',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor: canCreateLeadTabNote ? 'pointer' : 'not-allowed'
            }}
          >
            Confirmar
          </button>
        </div>
      </section>
    )

    const shouldShowDesktopCreateOnly = !isMobile && isCreatingLeadTabNote

    return (
      <section style={{ display: 'grid', alignContent: 'start', gap: 16 }}>
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
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 20,
                background: '#ffffff',
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
          <div style={{ display: 'grid', gap: 8 }}>
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
                position: 'fixed',
                inset: 0,
                border: 'none',
                background: 'rgba(15, 23, 42, 0.18)',
                zIndex: 40,
                cursor: 'default'
              }}
            />

            <aside
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 'calc(82px + env(safe-area-inset-bottom))',
                maxHeight: 'calc(100% - 82px - env(safe-area-inset-bottom))',
                zIndex: 45,
                borderRadius: '22px 22px 0 0',
                background: '#ffffff',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
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
      setFollowUpsTotalItems(0)
      setStatusSortFocus('overdue')
      setDateSortOrder('asc')
      setHoveredFollowUpId(null)
      setIsCreatingAgendaFollowUp(false)
      setAgendaFollowUpDraft({ negotiationId: '', value: '', dueAt: '' })
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
        const lead = await WebhookService.loadLead(leadId)
        setLeadData(lead)
        await refreshLeadNegotiations(leadId)
      } catch (exception: unknown) {
        const message = exception instanceof Error ? exception.message : 'Falha ao carregar lead.'
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
          gap: 16
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
            maxWidth: isMobile ? 'none' : 760
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px minmax(0, 1fr)',
              rowGap: 10,
              columnGap: 16,
              alignItems: 'center'
            }}
          >
            <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>Nome</span>
            <input
              type="text"
              value={infoDraft.name}
              onChange={(event) => setInfoDraft((current) => ({ ...current, name: event.target.value }))}
              autoComplete="new-password"
              style={{
                height: 36,
                maxWidth: 360,
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
                height: 36,
                maxWidth: 360,
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
                height: 36,
                maxWidth: 360,
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
                height: 36,
                maxWidth: 240,
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
                height: 36,
                maxWidth: 240,
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
                    height: 36,
                    maxWidth: 360,
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
                    height: 36,
                    maxWidth: 360,
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
                background: canCreateLead ? '#1f7a4d' : '#9ca3af',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: canCreateLead ? 'pointer' : 'not-allowed'
              }}
            >
              Confirmar
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
