import type { FormEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Paperclip, SendHorizontal, Bot, User, FileText, Mic, Contact as ContactIcon, Ellipsis } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { appApiClient } from '../../../core/api/appApiClient'
import { useRealtime } from '../../../core/realtime/useRealtime'
import { formatChatMessageTimestamp } from '../../../core/utils/dateTime'
import { formatStoredLeadPhoneInput } from '../../../core/utils/leadPhone'
import { ContactsService } from '../../contacts/services/ContactsService'
import type { Contact as ContactRecord } from '../../contacts/types/contacts.types'
import { MediaPicker } from './MediaPicker'
import { MessageContent } from './MessageContent'
import { RecordingComposer } from './RecordingComposer'
import { useChatMediaUpload } from '../hooks/useChatMediaUpload'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { WebhookService } from '../services/WebhookService'
import type { ChatMessage, ChatMessageApi, LeadRuntimeMode, MessageTemplateResponse } from '../types/webhook.types'

type LeadChatTabProps = {
  leadId: string
  leadSource?: string | null
  runtimeMode?: LeadRuntimeMode
  isUpdatingRuntimeMode?: boolean
  onToggleRuntimeMode?: () => void
}

const conversationWindowDurationInMs = 24 * 60 * 60 * 1000
const messageInputMinHeight = 40
const messageInputMaxHeight = 80
const greenBorderLeadSources = new Set([
  'whatsapp',
  'googleads',
  'metaads',
  'indicacao'
])

const greenChatTheme = {
  backgroundColor: '#eef8f1',
  borderColor: '#128c4a',
  outboundMessageBackground: interactionTheme.primaryButtonBackground,
  inboundMessageBackground: '#d9f2df',
  buttonBackground: interactionTheme.primaryButtonBackground,
  buttonHoverBackground: interactionTheme.primaryButtonHoverBackground,
  inputFocusBorderColor: interactionTheme.inputFocusBorderColor,
  inputFocusBoxShadow: interactionTheme.inputFocusBoxShadow,
  recordingAccentColor: '#15803d',
  templateBackground: '#f0fdf4',
  templateBorderColor: '#bbf7d0',
  templateAccentColor: '#10b981',
  templateLabelColor: '#059669',
  innerHighlight: 'inset 0 1px 0 rgba(37, 211, 102, 0.2)',
  boxShadow:
    'inset 0 0 0 1px rgba(37, 211, 102, 0.2), 0 8px 24px rgba(18, 140, 74, 0.18), 0 2px 6px rgba(18, 140, 74, 0.12)'
}

const messengerChatTheme = {
  backgroundColor: '#eaf4ff',
  borderColor: '#006fd6',
  outboundMessageBackground: '#0084ff',
  inboundMessageBackground: '#dbeeff',
  buttonBackground: '#0084ff',
  buttonHoverBackground: '#006fd6',
  inputFocusBorderColor: '#0084ff',
  inputFocusBoxShadow: '0 0 0 3px rgba(0, 132, 255, 0.18)',
  recordingAccentColor: '#0084ff',
  templateBackground: '#eff6ff',
  templateBorderColor: '#bfdbfe',
  templateAccentColor: '#0084ff',
  templateLabelColor: '#006fd6',
  innerHighlight: 'inset 0 1px 0 rgba(0, 132, 255, 0.2)',
  boxShadow:
    'inset 0 0 0 1px rgba(0, 132, 255, 0.2), 0 8px 24px rgba(0, 111, 214, 0.18), 0 2px 6px rgba(0, 111, 214, 0.12)'
}

const directChatTheme = {
  backgroundColor: '#fff5fa',
  borderColor: '#c13584',
  outboundMessageBackground:
    'linear-gradient(135deg, #833ab4 0%, #c13584 36%, #fd1d1d 72%, #fcb045 100%)',
  inboundMessageBackground: '#fde7f3',
  buttonBackground:
    'linear-gradient(135deg, #833ab4 0%, #c13584 42%, #fd1d1d 100%)',
  buttonHoverBackground: '#a72d73',
  inputFocusBorderColor: '#c13584',
  inputFocusBoxShadow: '0 0 0 3px rgba(193, 53, 132, 0.18)',
  recordingAccentColor: '#c13584',
  templateBackground: '#fff0f6',
  templateBorderColor: '#f9a8d4',
  templateAccentColor: '#c13584',
  templateLabelColor: '#a21caf',
  innerHighlight: 'inset 0 1px 0 rgba(193, 53, 132, 0.18)',
  boxShadow:
    'inset 0 0 0 1px rgba(193, 53, 132, 0.16), 0 8px 24px rgba(193, 53, 132, 0.16), 0 2px 6px rgba(131, 58, 180, 0.12)'
}

export function LeadChatTab({
  leadId,
  leadSource,
  runtimeMode = 'AUTOMATION',
  isUpdatingRuntimeMode = false,
  onToggleRuntimeMode
}: LeadChatTabProps) {
  const realtime = useRealtime()
  const mediaUploader = useChatMediaUpload()
  const audioRecorder = useAudioRecorder()
  const normalizedLeadSource = leadSource
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\s_-]+/g, '')
  const isMessengerChat = normalizedLeadSource === 'messenger'
  const isDirectChat =
    normalizedLeadSource === 'direct' ||
    normalizedLeadSource === 'instagram' ||
    normalizedLeadSource === 'instagramdirect'
  const isMetaMessagingChat = isMessengerChat || isDirectChat
  const isWhatsAppChat = normalizedLeadSource === 'whatsapp'
  const canSendContacts = isWhatsAppChat || isMetaMessagingChat
  const outboundMessageChannel = isDirectChat
    ? 'instagram' as const
    : isMessengerChat
      ? 'messenger' as const
      : undefined
  const audioTheme = isDirectChat
    ? 'direct' as const
    : isMessengerChat
      ? 'messenger' as const
      : 'default' as const
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false)
  const [isCompactScreen, setIsCompactScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.innerWidth <= 520
  })
  const [shortcuts, setShortcuts] = useState<{ key: string; value: string }[]>([])
  const [shortcutDropdownVisible, setShortcutDropdownVisible] = useState<boolean>(false)
  const [shortcutFilter, setShortcutFilter] = useState<string>('')
  const [shortcutActiveIndex, setShortcutActiveIndex] = useState<number>(0)
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState<boolean>(false)
  const [isAttachmentMenuButtonHovered, setIsAttachmentMenuButtonHovered] = useState<boolean>(false)
  const [hoveredAttachmentOption, setHoveredAttachmentOption] = useState<'media' | 'document' | 'contact' | null>(null)
  const [isSendButtonHovered, setIsSendButtonHovered] = useState<boolean>(false)
  const [isReopeningConversation, setIsReopeningConversation] = useState<boolean>(false)
  const [isSelectingContact, setIsSelectingContact] = useState<boolean>(false)
  const [contactOptions, setContactOptions] = useState<ContactRecord[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false)
  const [contactPickerError, setContactPickerError] = useState<string | null>(null)
  const [contactSearchTerm, setContactSearchTerm] = useState<string>('')
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplateResponse[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [conversationWindowNow, setConversationWindowNow] = useState<number>(() => Date.now())
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAttachmentMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAttachmentMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isAttachmentMenuOpen])

  useLayoutEffect(() => {
    const messageInput = messageInputRef.current

    if (!messageInput) return

    messageInput.style.height = 'auto'
    const contentHeight = messageInput.scrollHeight + 2
    const nextHeight = Math.min(
      Math.max(contentHeight, messageInputMinHeight),
      messageInputMaxHeight
    )

    messageInput.style.height = `${nextHeight}px`
    messageInput.style.overflowY =
      contentHeight > messageInputMaxHeight ? 'auto' : 'hidden'
  }, [isCompactScreen, message])

  const isUploadingAudio = mediaUploader.isUploading && mediaUploader.uploadingType === 'audio'
  const isAnyUploadActive = mediaUploader.isUploading
  const isComposerActionDisabled =
    isSending || isAnyUploadActive || runtimeMode === 'AUTOMATION'

  const inboundMessages = messages.filter((msg) => msg.direction === 'inbound')
  const inboundMessageTimes = inboundMessages
    .map((msg) => msg.createdAt ? new Date(msg.createdAt).getTime() : Number.NaN)
    .filter(Number.isFinite)
  const lastInboundTime = inboundMessageTimes.length > 0
    ? Math.max(...inboundMessageTimes)
    : null
  const hasNeverConversed = inboundMessages.length === 0
  const shouldShowTemplateButton =
    lastInboundTime === null ||
    conversationWindowNow - lastInboundTime >= conversationWindowDurationInMs
  const shouldBlockMetaComposer =
    shouldShowTemplateButton && isMetaMessagingChat

  useEffect(() => {
    if (lastInboundTime === null) {
      return
    }

    const remainingWindowTime =
      lastInboundTime + conversationWindowDurationInMs - Date.now()

    if (remainingWindowTime <= 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setConversationWindowNow(Date.now())
    }, remainingWindowTime)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [lastInboundTime])

  const buildTemplateDescription = (): string => {
    if (!selectedTemplate?.description) return ''
    let result = selectedTemplate.description
    if (selectedTemplate?.variables) {
      selectedTemplate.variables.forEach((variable) => {
        const value = templateVariables[variable.key]
        const replacement = value || `{${variable.label}}`
        result = result.replace(new RegExp(`\\{${variable.key}\\}`, 'g'), replacement)
      })
    }
    return result
  }

  useEffect(() => {
    if (!leadId.trim()) {
      return
    }

    realtime.joinLeadRoom(leadId)

    return () => {
      realtime.leaveLeadRoom(leadId)
    }
  }, [leadId, realtime])

  useEffect(() => {
    const handleMessageCreated = (payload: ChatMessageApi & { leadId?: string }) => {
      const messageLeadId = String(payload?.leadId ?? '').trim()

      if (messageLeadId && messageLeadId !== leadId) {
        return
      }

      const nextMessage = WebhookService.mapMessageFromApi(payload)

      setMessages((currentMessages) => {
        if (currentMessages.some((message) => message.id === nextMessage.id)) {
          return currentMessages
        }

        return [...currentMessages, nextMessage]
      })
    }

    const handleMessageUpdated = (payload: ChatMessageApi & { leadId?: string }) => {
      const messageLeadId = String(payload?.leadId ?? '').trim()

      if (messageLeadId && messageLeadId !== leadId) {
        return
      }

      const updatedMessage = WebhookService.mapMessageFromApi(payload)

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === updatedMessage.id ? updatedMessage : message
        )
      )
    }

    realtime.on('message.created', handleMessageCreated)
    realtime.on('message.updated', handleMessageUpdated)

    return () => {
      realtime.off('message.created', handleMessageCreated)
      realtime.off('message.updated', handleMessageUpdated)
    }
  }, [leadId, realtime])

  useEffect(() => {
    let isMounted = true

    const loadMessages = async () => {
      try {
        setError(null)
        const loadedMessages = await WebhookService.loadMessages(leadId)
        if (isMounted) {
          setMessages(loadedMessages)
        }
      } catch (exception: unknown) {
        if (isMounted) {
          const messageText =
            exception instanceof Error ? exception.message : 'Falha ao carregar mensagens.'
          setError(messageText)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [leadId])

  useEffect(() => {
    if (!isSelectingContact) {
      return
    }

    let isMounted = true

    setIsLoadingContacts(true)
    setContactPickerError(null)

    void ContactsService.getContacts()
      .then((contacts) => {
        if (isMounted) {
          setContactOptions(contacts)
        }
      })
      .catch(() => {
        if (isMounted) {
          setContactPickerError('Falha ao carregar contatos.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingContacts(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isSelectingContact])

  useEffect(() => {
    if (isLoading) return

    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight
  }, [isLoading, messages])

  useEffect(() => {
    const handleResize = () => {
      setIsCompactScreen(window.innerWidth <= 520)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadTemplates = async () => {
      try {
        const templates = await WebhookService.loadMessageTemplates()
        if (isMounted) {
          setMessageTemplates(templates)
        }
      } catch (exception: unknown) {
        console.error('Falha ao carregar templates:', exception)
      }
    }

    void loadTemplates()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadShortcuts = async () => {
      try {
        const { data } = await appApiClient.get<Array<{ messageShortcuts?: Record<string, string> | null }>>('/user/user-informations')
        if (!isMounted) return
        const raw = data[0]?.messageShortcuts ?? {}
        setShortcuts(Object.entries(raw).map(([key, value]) => ({ key, value })))
      } catch {
        // silently ignore
      }
    }

    void loadShortcuts()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredShortcuts = (() => {
    if (!shortcutDropdownVisible) return []
    const filter = shortcutFilter.toLowerCase()
    const matched = filter
      ? shortcuts.filter((s) => s.key.toLowerCase().startsWith(filter))
      : shortcuts
    return matched.slice(0, 5)
  })()

  const handleMessageChange = (value: string) => {
    setMessage(value)

    if (value.startsWith('/')) {
      const query = value.slice(1)
      setShortcutFilter(query)
      setShortcutDropdownVisible(true)
      setShortcutActiveIndex(0)
    } else {
      setShortcutDropdownVisible(false)
      setShortcutFilter('')
    }
  }

  const handleSelectShortcut = (shortcut: { key: string; value: string }) => {
    setMessage(shortcut.value)
    setShortcutDropdownVisible(false)
    setShortcutFilter('')
    messageInputRef.current?.focus()
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (shortcutDropdownVisible && filteredShortcuts.length > 0 && event.key === 'ArrowDown') {
      event.preventDefault()
      setShortcutActiveIndex((i) => Math.min(i + 1, filteredShortcuts.length - 1))
      return
    }

    if (shortcutDropdownVisible && filteredShortcuts.length > 0 && event.key === 'ArrowUp') {
      event.preventDefault()
      setShortcutActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (
      shortcutDropdownVisible &&
      filteredShortcuts.length > 0 &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      filteredShortcuts[shortcutActiveIndex]
    ) {
      event.preventDefault()
      handleSelectShortcut(filteredShortcuts[shortcutActiveIndex])
      return
    }

    if (event.key === 'Escape' && shortcutDropdownVisible) {
      setShortcutDropdownVisible(false)
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const handleReopenConversation = () => {
    setIsReopeningConversation(true)
    setSelectedTemplateId('')
    setTemplateVariables({})
  }

  const handleCancelReopenConversation = () => {
    setIsReopeningConversation(false)
    setSelectedTemplateId('')
    setTemplateVariables({})
  }

  const handleOpenContactPicker = () => {
    setIsSelectingContact(true)
    setContactSearchTerm('')
    setSelectedContactIds([])
    setContactPickerError(null)
  }

  const handleCancelContactPicker = () => {
    setIsSelectingContact(false)
    setContactSearchTerm('')
    setSelectedContactIds([])
    setContactPickerError(null)
  }

  const handleToggleContact = (contactId: string) => {
    setSelectedContactIds((currentContactIds) =>
      currentContactIds.includes(contactId)
        ? currentContactIds.filter((currentContactId) => currentContactId !== contactId)
        : [...currentContactIds, contactId]
    )
  }

  const handleSendContacts = async () => {
    if (!selectedContactIds.length) {
      return
    }

    try {
      setIsSending(true)
      setContactPickerError(null)
      if (isWhatsAppChat) {
        await WebhookService.sendContacts(leadId, selectedContactIds)
      } else if (outboundMessageChannel) {
        const selectedContacts = selectedContactIds
          .map((contactId) => contactOptions.find((contact) => contact.id === contactId))
          .filter((contact): contact is ContactRecord => Boolean(contact))
        const contactMessage = selectedContacts
          .map((contact) => `${contact.name}\n${formatStoredLeadPhoneInput(contact.phone)}`)
          .join('\n\n')

        if (!contactMessage) {
          return
        }

        await WebhookService.sendMessage(
          leadId,
          contactMessage,
          'normal',
          outboundMessageChannel
        )
      }
      handleCancelContactPicker()
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error ? exception.message : 'Falha ao enviar contatos.'
      setContactPickerError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const selectedTemplate = messageTemplates.find((t) => t.id === selectedTemplateId)

  const handleSendReopening = async () => {
    if (!selectedTemplateId) {
      setError('Selecione um template para reabrir a conversa.')
      return
    }

    const template = messageTemplates.find((t) => t.id === selectedTemplateId)
    if (!template) return

    const missingRequiredVariables = template.variables?.some(
      (v) => v.required && !templateVariables[v.key]?.trim()
    )

    if (missingRequiredVariables) {
      setError('Preencha as variáveis obrigatórias do template.')
      return
    }

    try {
      setIsSending(true)
      setError(null)

      // Send template via WhatsApp Template API
      await WebhookService.sendTemplate(leadId, selectedTemplateId, templateVariables)
      setIsReopeningConversation(false)
      setSelectedTemplateId('')
      setTemplateVariables({})
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error ? exception.message : 'Falha ao reabrir conversa.'
      setError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = messageTemplates.find((t) => t.id === templateId)
    if (template?.variables?.length) {
      const newVariables: Record<string, string> = {}
      template.variables.forEach((v) => {
        newVariables[v.key] = ''
      })
      setTemplateVariables(newVariables)
    } else {
      setTemplateVariables({})
    }
  }

  const handleTemplateVariableChange = (key: string, value: string) => {
    setTemplateVariables((current) => ({
      ...current,
      [key]: value
    }))
  }

  const handleSendSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = message.trim()
    if (!content) {
      setError('Digite uma mensagem para enviar.')
      return
    }

    try {
      setIsSending(true)
      setError(null)
      await WebhookService.sendMessage(
        leadId,
        content,
        undefined,
        outboundMessageChannel
      )
      setMessage('')
    } catch (exception: unknown) {
      const messageText =
        exception instanceof Error ? exception.message : 'Falha ao enviar mensagem.'
      setError(messageText)
    } finally {
      setIsSending(false)
      requestAnimationFrame(() => {
        messageInputRef.current?.focus()
      })
    }
  }

  const handleDocumentSelected = async (selectedFile: File) => {
    const caption = message.trim()

    try {
      setError(null)

      const wasUploaded = await mediaUploader.uploadMedia({
        leadId,
        file: selectedFile,
        type: 'document',
        ...(outboundMessageChannel ? { channel: outboundMessageChannel } : {}),
        ...(caption ? { caption } : {})
      })

      if (wasUploaded && caption) {
        setMessage('')
      }
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : 'Nao foi possivel enviar documento. Tente novamente.'
      setError(errorMessage)
    }
  }

  const handleImageSelected = async (selectedFile: File) => {
    const caption = message.trim()
    const isVideo = selectedFile.type.startsWith('video/')
    const mediaType = isVideo ? 'video' : 'image'

    try {
      setError(null)

      const wasUploaded = await mediaUploader.uploadMedia({
        leadId,
        file: selectedFile,
        type: mediaType,
        ...(outboundMessageChannel ? { channel: outboundMessageChannel } : {}),
        ...(caption ? { caption } : {})
      })

      if (wasUploaded && caption) {
        setMessage('')
      }
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : `Nao foi possivel enviar ${isVideo ? 'video' : 'imagem'}. Tente novamente.`
      setError(errorMessage)
    }
  }

  const handleAudioSelected = async (selectedFile: File) => {
    try {
      setError(null)

      await mediaUploader.uploadMedia({
        leadId,
        file: selectedFile,
        type: 'audio',
        ...(outboundMessageChannel ? { channel: outboundMessageChannel } : {})
      })
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : 'Nao foi possivel enviar áudio. Tente novamente.'
      setError(errorMessage)
    }
  }

  const formatRecordingDuration = (durationInMs: number): string => {
    const totalSeconds = Math.floor(durationInMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      setError(null)
      await audioRecorder.startRecording()
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : 'Nao foi possivel iniciar a gravacao de audio.'
      setError(errorMessage)
    }
  }

  const handleFinishRecording = async () => {
    try {
      setError(null)
      const recordedBlob = await audioRecorder.stopRecording()

      if (!recordedBlob) {
        setError('Nenhum audio foi gravado.')
        return
      }

      console.debug('[AUDIO-RECORDING] Recorded blob metadata', {
        blobType: recordedBlob.type,
        blobSize: recordedBlob.size,
        blobSizeInMb: (recordedBlob.size / (1024 * 1024)).toFixed(2)
      })

      const audioFile = new File([recordedBlob], `audio_${Date.now()}.webm`, {
        type: recordedBlob.type
      })

      console.debug('[AUDIO-RECORDING] Created File object', {
        fileName: audioFile.name,
        fileType: audioFile.type,
        fileSize: audioFile.size,
        fileSizeInMb: (audioFile.size / (1024 * 1024)).toFixed(2)
      })

      await mediaUploader.uploadMedia({
        leadId,
        file: audioFile,
        type: 'audio',
        ...(outboundMessageChannel ? { channel: outboundMessageChannel } : {})
      })
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : 'Nao foi possivel enviar o audio.'
      setError(errorMessage)
    }
  }

  const handleCancelRecording = async () => {
    try {
      await audioRecorder.cancelRecording()
    } catch (exception: unknown) {
      const errorMessage =
        exception instanceof Error ? exception.message : 'Erro ao cancelar gravacao.'
      setError(errorMessage)
    }
  }

  const statusText = isLoading
    ? 'Carregando mensagens...'
    : messages.length === 0
      ? 'Nenhuma mensagem ainda'
      : null

  const compactComposerControlSize = 'clamp(30px, 7.8vw, 36px)'
  const compactComposerGap = 'clamp(4px, 1.6vw, 8px)'
  const chatTheme = isDirectChat
    ? directChatTheme
    : isMessengerChat
      ? messengerChatTheme
    : normalizedLeadSource && greenBorderLeadSources.has(normalizedLeadSource)
      ? greenChatTheme
      : null
  const chatFooterBorderColor = chatTheme?.borderColor ?? '#e5e7eb'
  const chatFooterInnerHighlight = chatTheme?.innerHighlight ?? 'none'
  const normalizedContactSearchTerm = contactSearchTerm.trim().toLocaleLowerCase('pt-BR')
  const filteredContactOptions = contactOptions.filter((contact) => {
    if (!normalizedContactSearchTerm) {
      return true
    }

    return [contact.name, contact.phone, contact.company, contact.instagram]
      .some((field) => field?.toLocaleLowerCase('pt-BR').includes(normalizedContactSearchTerm))
  })

  return (
    <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {error ? (
        <div style={{ color: '#b91c1c', marginBottom: 12, fontSize: 13 }}>{error}</div>
      ) : null}

      <div
        style={{
          background: chatTheme?.backgroundColor ?? '#ffffff',
          border: `1px solid ${chatTheme?.borderColor ?? '#dde3ee'}`,
          borderRadius: 12,
          boxShadow: chatTheme?.boxShadow ?? 'none',
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          overflow: 'hidden'
        }}
      >
        {isSelectingContact ? (
          <div style={{ padding: 16, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gap: 16, flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  Enviar Contato
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                  Selecione um contato
                </p>
              </div>

              <input
                type="search"
                value={contactSearchTerm}
                onChange={(event) => setContactSearchTerm(event.target.value)}
                placeholder="Buscar contato"
                aria-label="Buscar contato para enviar"
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
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
              {isLoadingContacts ? (
                <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>
                  Carregando contatos...
                </div>
              ) : null}

              {!isLoadingContacts && contactPickerError ? (
                <div style={{ color: '#b91c1c', fontSize: 14, padding: 16, textAlign: 'center' }}>
                  {contactPickerError}
                </div>
              ) : null}

              {!isLoadingContacts && !contactPickerError && filteredContactOptions.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 14, padding: 16, textAlign: 'center' }}>
                  Nenhum contato encontrado.
                </div>
              ) : null}

              {!isLoadingContacts && !contactPickerError
                ? filteredContactOptions.map((contact) => {
                    const isSelected = selectedContactIds.includes(contact.id)

                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleToggleContact(contact.id)}
                        aria-pressed={isSelected}
                        disabled={isSending}
                        style={{
                          width: '100%',
                          border: `1px solid ${isSelected ? chatTheme?.borderColor ?? '#16a34a' : '#e5e7eb'}`,
                          borderRadius: 8,
                          background: isSelected ? chatTheme?.backgroundColor ?? '#f0fdf4' : '#ffffff',
                          padding: 14,
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 12,
                          textAlign: 'left',
                          cursor: isSending ? 'not-allowed' : 'pointer',
                          opacity: isSending ? 0.6 : 1
                        }}
                      >
                        <span style={{ minWidth: 0, display: 'grid', gap: 5 }}>
                          <strong style={{ color: '#111827', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {contact.name}
                          </strong>
                          <span style={{ color: '#6b7280', fontSize: 13 }}>
                            {formatStoredLeadPhoneInput(contact.phone)}
                          </span>
                          {contact.company ? (
                            <span style={{ color: '#6b7280', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {contact.company}
                            </span>
                          ) : null}
                        </span>
                        <span
                          aria-hidden="true"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? chatTheme?.borderColor ?? '#16a34a' : '#cbd5e1'}`,
                            background: isSelected ? chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground : '#ffffff',
                            boxSizing: 'border-box',
                            flexShrink: 0
                          }}
                        />
                      </button>
                    )
                  })
                : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'auto' }}>
              <button
                type="button"
                onClick={handleCancelContactPicker}
                disabled={isSending}
                style={{
                  minWidth: 120,
                  height: 42,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSendContacts()}
                disabled={isSending || selectedContactIds.length === 0}
                style={{
                  minWidth: 120,
                  height: 42,
                  border: 'none',
                  borderRadius: 8,
                  background: selectedContactIds.length
                    ? chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground
                    : '#9ca3af',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSending || selectedContactIds.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isSending ? <Loader2 size={16} /> : <SendHorizontal size={16} />}
                {isSending ? 'Enviando...' : `Enviar (${selectedContactIds.length})`}
              </button>
            </div>
          </div>
        ) : isReopeningConversation ? (
          <div style={{ padding: 16, minHeight: 0, overflowY: 'auto', display: 'grid', gap: 16, alignContent: 'start' }}>
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
                Entrar em contato
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Selecione um template para reabrir esta conversa
              </p>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>
                Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                style={{
                  height: 42,
                  border: '1px solid #d7dce4',
                  borderRadius: 10,
                  padding: '0 14px',
                  color: selectedTemplateId ? '#111827' : '#6b7280',
                  fontSize: 14,
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              >
                <option value="">Selecione um template...</option>
                {messageTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate?.variables?.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable.key} style={{ display: 'grid', gap: 8 }}>
                    <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>
                      {variable.label}{variable.required ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      placeholder={`Valor para ${variable.label}`}
                      value={templateVariables[variable.key] ?? ''}
                      onChange={(e) => handleTemplateVariableChange(variable.key, e.target.value)}
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
                ))}
              </div>
            ) : null}

            {selectedTemplate ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ color: '#1f2937', fontSize: 13, fontWeight: 700 }}>
                  Mensagem
                </label>
                <textarea
                  readOnly
                  value={buildTemplateDescription()}
                  style={{
                    minHeight: 80,
                    border: '1px solid #d7dce4',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#111827',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    backgroundColor: '#f9fafb',
                    resize: 'vertical'
                  }}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleCancelReopenConversation}
                disabled={isSending}
                style={{
                  minWidth: 120,
                  height: 42,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSendReopening()}
                disabled={isSending || !selectedTemplateId}
                style={{
                  minWidth: 120,
                  height: 42,
                  border: 'none',
                  borderRadius: 8,
                  background: chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSending || !selectedTemplateId ? 'not-allowed' : 'pointer',
                  opacity: isSending || !selectedTemplateId ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isSending ? <Loader2 size={16} /> : null}
                {isSending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        ) : (
          <div ref={messagesContainerRef} style={{ padding: 16, minHeight: 0, overflowY: 'auto' }}>
            {statusText ? (
              <div style={{ color: '#6b7280' }}>{statusText}</div>
            ) : (
              messages.map((item) => {
                const formattedTime = item.createdAt ? formatChatMessageTimestamp(item.createdAt) : ''
                const isTemplateMessage = item.source === 'template'
                const isOutbound = item.direction === 'outbound'

                return (
                  <div
                    key={item.id}
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                      alignItems: isOutbound ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isTemplateMessage && (
                      <span style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                        {formattedTime}
                      </span>
                    )}

                    <div
                      style={{
                        maxWidth: isCompactScreen ? '90%' : '70%',
                        minWidth: 0,
                        borderRadius: 12,
                        padding: isTemplateMessage ? 0 : '10px 12px',
                        background: isTemplateMessage
                          ? 'transparent'
                          : isOutbound
                            ? chatTheme?.outboundMessageBackground ?? interactionTheme.primaryButtonBackground
                            : chatTheme?.inboundMessageBackground ?? interactionTheme.clickableCardHoverBackground,
                        color: isTemplateMessage
                          ? '#111827'
                          : isOutbound
                            ? '#ffffff'
                            : '#111827',
                        display: isTemplateMessage ? 'grid' : 'block',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word'
                      }}
                    >
                      {isTemplateMessage ? (
                        <>
                          <div
                            style={{
                              background: chatTheme?.templateBackground ?? '#f0fdf4',
                              border: `1px solid ${chatTheme?.templateBorderColor ?? '#bbf7d0'}`,
                              borderBottomLeftRadius: 0,
                              borderBottomRightRadius: 0,
                              borderTopLeftRadius: 12,
                              borderTopRightRadius: 12,
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              justifyContent: 'space-between',
                              minWidth: 0
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div
                                style={{
                                  background: chatTheme?.templateAccentColor ?? '#10b981',
                                  borderRadius: '50%',
                                  width: 28,
                                  height: 28,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <FileText size={16} color="#ffffff" />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 14, color: chatTheme?.templateLabelColor ?? '#059669' }}>
                                Mensagem de template
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              background: chatTheme?.templateBackground ?? '#f0fdf4',
                              border: `1px solid ${chatTheme?.templateBorderColor ?? '#bbf7d0'}`,
                              borderTop: 'none',
                              borderBottomLeftRadius: 12,
                              borderBottomRightRadius: 12,
                              padding: '10px 12px',
                              color: '#111827',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word'
                            }}
                          >
                            <MessageContent
                              message={item}
                              audioTheme={audioTheme}
                            />
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                            {formattedTime}
                          </div>
                        </>
                      ) : (
                        <MessageContent
                          message={item}
                          audioTheme={audioTheme}
                        />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {!isSelectingContact && !isReopeningConversation && shouldBlockMetaComposer && (
          <div
            style={{
              padding: '14px 16px',
              borderTop: `1px solid ${chatFooterBorderColor}`,
              backgroundColor: '#f3f4f6',
              boxShadow: chatFooterInnerHighlight
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: '#4b5563'
              }}
            >
              {hasNeverConversed
                ? `Aguarde o cliente enviar uma mensagem para liberar a caixa de texto. Se precisar iniciar o contato, fale com ele pelo ${isDirectChat ? 'Instagram Direct' : 'Messenger da sua Página no Facebook'}.`
                : `A janela de 24 horas encerrou. Aguarde o cliente voltar a falar para liberar a caixa de texto novamente. Se precisar iniciar o contato, fale com ele pelo ${isDirectChat ? 'Instagram Direct' : 'Messenger da sua Página no Facebook'}.`}
            </p>
          </div>
        )}

        {!isSelectingContact && !isReopeningConversation && shouldShowTemplateButton && !isMetaMessagingChat && (
          <div
            style={{
              display: 'flex',
              alignItems: isCompactScreen ? 'stretch' : 'center',
              justifyContent: 'space-between',
              flexDirection: isCompactScreen ? 'column' : 'row',
              padding: '12px 16px',
              borderTop: `1px solid ${chatFooterBorderColor}`,
              backgroundColor: chatTheme?.backgroundColor ?? '#f9fafb',
              boxShadow: chatFooterInnerHighlight,
              gap: isCompactScreen ? 10 : 16
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: '#6b7280',
                flex: 1
              }}
            >
              {hasNeverConversed
                ? 'Clique no botão para conversar com o cliente.'
                : 'Este lead deixou de enviar mensagens há mais de 24 horas. Clique no botão para conversar com o cliente.'}
            </p>
            <button
              type="button"
              onClick={handleReopenConversation}
              aria-label="Entrar em contato"
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 120ms ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                width: isCompactScreen ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = chatTheme?.buttonHoverBackground ?? interactionTheme.primaryButtonHoverBackground
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground
              }}
            >
              Entrar em contato
            </button>
          </div>
        )}

        {!isSelectingContact && !isReopeningConversation && !shouldShowTemplateButton && (
        <>
          {audioRecorder.isRecording ? (
            <div style={{ display: 'flex', gap: 10, padding: 12, borderTop: `1px solid ${chatFooterBorderColor}`, boxShadow: chatFooterInnerHighlight, background: chatTheme?.backgroundColor ?? '#ffffff', alignItems: 'center', minWidth: 0 }}>
              <RecordingComposer
                durationLabel={formatRecordingDuration(audioRecorder.recordingDurationInMs)}
                isUploading={isAnyUploadActive}
                accentColor={chatTheme?.recordingAccentColor}
                onCancel={handleCancelRecording}
                onFinish={handleFinishRecording}
              />
            </div>
          ) : (
          <div style={{ position: 'relative' }}>
            {shortcutDropdownVisible && filteredShortcuts.length > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 12,
                  right: 12,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  boxShadow: '0 -4px 16px rgba(15,23,42,0.1)',
                  overflow: 'hidden',
                  zIndex: 10
                }}
              >
                {filteredShortcuts.map((shortcut, index) => (
                  <button
                    key={shortcut.key}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectShortcut(shortcut) }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 14px',
                      border: 'none',
                      background: index === shortcutActiveIndex ? '#f3f4f6' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: chatTheme?.templateLabelColor ?? '#2f8f55', flexShrink: 0 }}>/{shortcut.key}</span>
                    <span style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortcut.value}</span>
                  </button>
                ))}
              </div>
            ) : null}
          <form
            onSubmit={handleSendSubmit}
            style={{
              display: 'flex',
              gap: isCompactScreen ? compactComposerGap : 10,
              padding: 12,
              borderTop: `1px solid ${chatFooterBorderColor}`,
              boxShadow: chatFooterInnerHighlight,
              background: chatTheme?.backgroundColor ?? '#ffffff',
              alignItems: 'center',
              flexWrap: 'nowrap',
              minWidth: 0
            }}
          >
            <>
              <button
                type="button"
                onClick={onToggleRuntimeMode}
                disabled={isUpdatingRuntimeMode}
                aria-label={runtimeMode === 'HUMAN' ? 'Voltar para automação' : 'Assumir como humano'}
                title={runtimeMode === 'HUMAN' ? 'Voltar para automação' : 'Assumir como humano'}
                style={{
                  padding: isCompactScreen ? '8px 10px' : '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: runtimeMode === 'HUMAN'
                    ? chatTheme?.buttonBackground ?? 'linear-gradient(135deg, #1e7f46 0%, #146737 100%)'
                    : 'linear-gradient(135deg, #325dca 0%, #1f46ad 100%)',
                  color: '#ffffff',
                  cursor: isUpdatingRuntimeMode ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  opacity: isUpdatingRuntimeMode ? 0.7 : 1,
                  transition: 'opacity 120ms ease',
                  flexShrink: 0
                }}
              >
                {runtimeMode === 'HUMAN' ? <User size={16} /> : <Bot size={16} />}
              </button>

              <textarea
                ref={messageInputRef}
                value={message}
                onChange={(event) => handleMessageChange(event.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => { setIsInputFocused(false); setShortcutDropdownVisible(false) }}
                onKeyDown={handleInputKeyDown}
                placeholder={runtimeMode === 'AUTOMATION' ? 'Modo automação ativo...' : ''}
                disabled={isComposerActionDisabled}
                rows={1}
                style={{
                  flex: isCompactScreen ? '1 1 auto' : 1,
                  width: isCompactScreen ? 'clamp(44px, 28vw, 220px)' : undefined,
                  height: messageInputMinHeight,
                  minHeight: messageInputMinHeight,
                  maxHeight: messageInputMaxHeight,
                  minWidth: 0,
                  border: `1px solid ${
                    isInputFocused
                      ? chatTheme?.inputFocusBorderColor ?? interactionTheme.inputFocusBorderColor
                      : '#cfd7e6'
                  }`,
                  borderRadius: 8,
                  padding: '9px 12px',
                  outline: 'none',
                  resize: 'none',
                  overflowY: 'hidden',
                  lineHeight: '20px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  boxShadow: isInputFocused
                    ? chatTheme?.inputFocusBoxShadow ?? interactionTheme.inputFocusBoxShadow
                    : 'none',
                  background: runtimeMode === 'AUTOMATION' ? '#f3f4f6' : undefined,
                  color: runtimeMode === 'AUTOMATION' ? '#9ca3af' : undefined,
                  cursor: runtimeMode === 'AUTOMATION' ? 'not-allowed' : undefined
                }}
              />
              <div
                ref={attachmentMenuRef}
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <div
                  id="chat-attachment-menu"
                  role="menu"
                  aria-hidden={!isAttachmentMenuOpen}
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 'calc(100% + 8px)',
                    width: 210,
                    maxWidth: 'calc(100vw - 24px)',
                    padding: 6,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: '#ffffff',
                    boxShadow: '0 -8px 24px rgba(15, 23, 42, 0.16)',
                    opacity: isAttachmentMenuOpen ? 1 : 0,
                    visibility: isAttachmentMenuOpen ? 'visible' : 'hidden',
                    pointerEvents: isAttachmentMenuOpen ? 'auto' : 'none',
                    transform: isAttachmentMenuOpen ? 'translateY(0)' : 'translateY(4px)',
                    transition: 'opacity 120ms ease, transform 120ms ease, visibility 120ms ease',
                    zIndex: 20
                  }}
                >
                  <MediaPicker
                    accept=".jpg,.jpeg,.png,.webp,.mp4,.3gp,image/jpeg,image/png,image/webp,video/mp4,video/3gpp"
                    disabled={isComposerActionDisabled}
                    onFileSelected={handleImageSelected}
                  >
                    {({ openPicker }) => (
                      <button
                        type="button"
                        role="menuitem"
                        tabIndex={isAttachmentMenuOpen ? 0 : -1}
                        onClick={() => {
                          openPicker()
                          setIsAttachmentMenuOpen(false)
                        }}
                        onMouseEnter={() => setHoveredAttachmentOption('media')}
                        onMouseLeave={() => setHoveredAttachmentOption(null)}
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 10px',
                          border: 'none',
                          borderRadius: 6,
                          background: hoveredAttachmentOption === 'media' ? '#f1f5f9' : 'transparent',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <ImagePlus size={18} />
                        Foto ou vídeo
                      </button>
                    )}
                  </MediaPicker>
                  <MediaPicker
                    accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    disabled={isComposerActionDisabled}
                    onFileSelected={handleDocumentSelected}
                  >
                    {({ openPicker }) => (
                      <button
                        type="button"
                        role="menuitem"
                        tabIndex={isAttachmentMenuOpen ? 0 : -1}
                        onClick={() => {
                          openPicker()
                          setIsAttachmentMenuOpen(false)
                        }}
                        onMouseEnter={() => setHoveredAttachmentOption('document')}
                        onMouseLeave={() => setHoveredAttachmentOption(null)}
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 10px',
                          border: 'none',
                          borderRadius: 6,
                          background: hoveredAttachmentOption === 'document' ? '#f1f5f9' : 'transparent',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Paperclip size={18} />
                        Documento
                      </button>
                    )}
                  </MediaPicker>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={isAttachmentMenuOpen ? 0 : -1}
                    onClick={() => {
                      setIsAttachmentMenuOpen(false)
                      handleOpenContactPicker()
                    }}
                    onMouseEnter={() => setHoveredAttachmentOption('contact')}
                    onMouseLeave={() => setHoveredAttachmentOption(null)}
                    disabled={!canSendContacts}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 10px',
                      border: 'none',
                      borderRadius: 6,
                      background: hoveredAttachmentOption === 'contact' ? '#f1f5f9' : 'transparent',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: canSendContacts ? 'pointer' : 'not-allowed',
                      opacity: canSendContacts ? 1 : 0.5
                    }}
                  >
                    <ContactIcon size={18} />
                    Contato
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Mais opções"
                  title="Mais opções"
                  aria-haspopup="menu"
                  aria-controls="chat-attachment-menu"
                  aria-expanded={isAttachmentMenuOpen}
                  onClick={() => {
                    setShortcutDropdownVisible(false)
                    setIsAttachmentMenuOpen((isOpen) => !isOpen)
                  }}
                  onMouseEnter={() => setIsAttachmentMenuButtonHovered(true)}
                  onMouseLeave={() => setIsAttachmentMenuButtonHovered(false)}
                  disabled={isComposerActionDisabled}
                  style={{
                    height: isCompactScreen ? compactComposerControlSize : 40,
                    width: isCompactScreen ? compactComposerControlSize : 40,
                    minWidth: isCompactScreen ? compactComposerControlSize : 40,
                    border: 'none',
                    borderRadius: 8,
                    background: isAttachmentMenuButtonHovered || isAttachmentMenuOpen
                      ? chatTheme?.buttonHoverBackground ?? interactionTheme.primaryButtonHoverBackground
                      : chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground,
                    color: '#ffffff',
                    padding: 0,
                    cursor: isComposerActionDisabled ? 'not-allowed' : 'pointer',
                    opacity: isComposerActionDisabled ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ellipsis size={20} />
                </button>
              </div>
              <button
                type="button"
                aria-label="Gravar áudio"
                title={audioRecorder.isSupported ? 'Gravar áudio' : 'Gravação de áudio não suportada neste navegador'}
                onClick={handleStartRecording}
                disabled={isComposerActionDisabled || audioRecorder.isRecording || !audioRecorder.isSupported}
                style={{
                  height: isCompactScreen ? compactComposerControlSize : 40,
                  width: isCompactScreen ? compactComposerControlSize : 40,
                  minWidth: isCompactScreen ? compactComposerControlSize : 40,
                  border: 'none',
                  borderRadius: 8,
                  background: chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground,
                  color: '#ffffff',
                  padding: 0,
                  cursor: isComposerActionDisabled || audioRecorder.isRecording || !audioRecorder.isSupported ? 'not-allowed' : 'pointer',
                  opacity: isComposerActionDisabled || audioRecorder.isRecording || !audioRecorder.isSupported ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Mic size={18} />
              </button>
              <div style={{ display: 'none' }}>
                <MediaPicker
                  accept="audio/*"
                  disabled={isComposerActionDisabled}
                  onFileSelected={handleAudioSelected}
                >
                  {({ openPicker }) => (
                    <button
                      type="button"
                      aria-label="Anexar áudio"
                      onClick={openPicker}
                      disabled={isComposerActionDisabled}
                      style={{
                        height: isCompactScreen ? compactComposerControlSize : 40,
                        width: isCompactScreen ? compactComposerControlSize : 40,
                        minWidth: isCompactScreen ? compactComposerControlSize : 40,
                        border: 'none',
                        borderRadius: 8,
                        background: chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground,
                        color: '#ffffff',
                        padding: 0,
                        cursor: isComposerActionDisabled ? 'not-allowed' : 'pointer',
                        opacity: isComposerActionDisabled ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isUploadingAudio ? <Loader2 size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                </MediaPicker>
              </div>
              <button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={isComposerActionDisabled}
                onMouseEnter={() => setIsSendButtonHovered(true)}
                onMouseLeave={() => setIsSendButtonHovered(false)}
                style={{
                  height: isCompactScreen ? compactComposerControlSize : 40,
                  width: isCompactScreen ? compactComposerControlSize : 40,
                  minWidth: isCompactScreen ? compactComposerControlSize : 40,
                  border: 'none',
                  borderRadius: 8,
                  background: isSendButtonHovered && !isComposerActionDisabled
                      ? chatTheme?.buttonHoverBackground ?? interactionTheme.primaryButtonHoverBackground
                      : chatTheme?.buttonBackground ?? interactionTheme.primaryButtonBackground,
                  color: '#ffffff',
                  padding: 0,
                  cursor: isComposerActionDisabled ? 'not-allowed' : 'pointer',
                  opacity: isComposerActionDisabled ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isSending ? '...' : <SendHorizontal size={18} />}
              </button>
            </>
          </form>
          </div>
          )}
        </>
        )}
      </div>
    </section>
  )
}
