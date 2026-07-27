import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Paperclip, SendHorizontal, Bot, User } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { useRealtime } from '../../../core/realtime/useRealtime'
import { MediaPicker } from './MediaPicker'
import { MessageContent } from './MessageContent'
import { useChatMediaUpload } from '../hooks/useChatMediaUpload'
import { WebhookService } from '../services/WebhookService'
import type { ChatMessage, ChatMessageApi, LeadRuntimeMode, MessageTemplateResponse } from '../types/webhook.types'

type LeadChatTabProps = {
  leadId: string
  runtimeMode?: LeadRuntimeMode
  isUpdatingRuntimeMode?: boolean
  onToggleRuntimeMode?: () => void
}

export function LeadChatTab({
  leadId,
  runtimeMode = 'AUTOMATION',
  isUpdatingRuntimeMode = false,
  onToggleRuntimeMode
}: LeadChatTabProps) {
  const realtime = useRealtime()
  const mediaUploader = useChatMediaUpload()
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false)
  const [isAttachmentButtonHovered, setIsAttachmentButtonHovered] = useState<boolean>(false)
  const [isImageButtonHovered, setIsImageButtonHovered] = useState<boolean>(false)
  const [isSendButtonHovered, setIsSendButtonHovered] = useState<boolean>(false)
  const [isReopeningConversation, setIsReopeningConversation] = useState<boolean>(false)
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplateResponse[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)

  const isUploadingDocument = mediaUploader.isUploading && mediaUploader.uploadingType === 'document'
  const isUploadingImageOrVideo =
    mediaUploader.isUploading &&
    (mediaUploader.uploadingType === 'image' || mediaUploader.uploadingType === 'video')
  const isAnyUploadActive = mediaUploader.isUploading

  const lastInboundMessage = messages
    .filter((msg) => msg.direction === 'inbound')
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })[0]

  const shouldShowReopenButton = (() => {
    const inboundMessages = messages.filter((msg) => msg.direction === 'inbound')
    
    // Se não há nenhuma mensagem inbound, mostrar botão
    if (inboundMessages.length === 0) {
      return true
    }
    
    // Se há mensagens inbound, verificar se a última foi há mais de 24h
    if (lastInboundMessage?.createdAt) {
      const lastInboundTime = new Date(lastInboundMessage.createdAt).getTime()
      const now = Date.now()
      const hoursSinceLastInbound = (now - lastInboundTime) / (1000 * 60 * 60)
      return hoursSinceLastInbound > 24
    }
    
    return false
  })()

  const buildTemplateDescription = (description: string | undefined | null): string => {
    if (!description) return ''
    let result = description
    Object.entries(templateVariables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
    })
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

    realtime.on('message.created', handleMessageCreated)

    return () => {
      realtime.off('message.created', handleMessageCreated)
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
    if (isLoading) return

    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight
  }, [isLoading, messages])

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
      await WebhookService.sendMessage(leadId, content)
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

  const statusText = isLoading
    ? 'Carregando mensagens...'
    : messages.length === 0
      ? 'Nenhuma mensagem ainda'
      : null

  return (
    <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {error ? (
        <div style={{ color: '#b91c1c', marginBottom: 12, fontSize: 13 }}>{error}</div>
      ) : null}

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dde3ee',
          borderRadius: 12,
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          overflow: 'hidden'
        }}
      >
        {isReopeningConversation ? (
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
                  value={buildTemplateDescription(selectedTemplate.description)}
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
                  background: interactionTheme.primaryButtonBackground,
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
              messages.map((item) => (
                <div
                  key={item.id}
                  style={{
                    marginBottom: 10,
                    display: 'flex',
                    justifyContent: item.direction === 'outbound' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      borderRadius: 12,
                      padding: '10px 12px',
                      background:
                        item.direction === 'outbound'
                          ? interactionTheme.primaryButtonBackground
                          : interactionTheme.clickableCardHoverBackground,
                      color: item.direction === 'outbound' ? '#ffffff' : '#111827'
                    }}
                  >
                    <MessageContent message={item} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!isReopeningConversation && shouldShowReopenButton && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              gap: 16
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
              Este lead deixou de enviar mensagens há mais de 24 horas. Clique no botão para conversar com o cliente.
            </p>
            <button
              type="button"
              onClick={handleReopenConversation}
              aria-label="Entrar em contato"
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: interactionTheme.primaryButtonBackground,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 120ms ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = interactionTheme.primaryButtonHoverBackground
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = interactionTheme.primaryButtonBackground
              }}
            >
              Entrar em contato
            </button>
          </div>
        )}

        {!isReopeningConversation && !shouldShowReopenButton && (
        <form
          onSubmit={handleSendSubmit}
          style={{ display: 'flex', gap: 10, padding: 12, borderTop: '1px solid #e5e7eb', alignItems: 'center' }}
        >
          <>
              <button
                type="button"
                onClick={onToggleRuntimeMode}
                disabled={isUpdatingRuntimeMode}
                aria-label={runtimeMode === 'HUMAN' ? 'Voltar para automação' : 'Assumir como humano'}
                title={runtimeMode === 'HUMAN' ? 'Voltar para automação' : 'Assumir como humano'}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: runtimeMode === 'HUMAN'
                    ? 'linear-gradient(135deg, #1e7f46 0%, #146737 100%)'
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

              <input
                ref={messageInputRef}
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Digite uma mensagem..."
                disabled={isSending || isAnyUploadActive}
                style={{
                  flex: 1,
                  height: 40,
                  border: `1px solid ${
                    isInputFocused
                      ? interactionTheme.inputFocusBorderColor
                      : '#cfd7e6'
                  }`,
                  borderRadius: 8,
                  padding: '0 12px',
                  outline: 'none',
                  boxShadow: isInputFocused
                    ? interactionTheme.inputFocusBoxShadow
                    : 'none'
                }}
              />
              <MediaPicker
                accept=".jpg,.jpeg,.png,.webp,.mp4,.3gp,image/jpeg,image/png,image/webp,video/mp4,video/3gpp"
                disabled={isSending || isAnyUploadActive}
                onFileSelected={handleImageSelected}
              >
                {({ openPicker }) => (
                  <button
                    type="button"
                    aria-label="Anexar foto ou vídeo"
                    onClick={openPicker}
                    onMouseEnter={() => setIsImageButtonHovered(true)}
                    onMouseLeave={() => setIsImageButtonHovered(false)}
                    disabled={isSending || isAnyUploadActive}
                    style={{
                      height: 40,
                      width: 40,
                      minWidth: 40,
                      border: 'none',
                      borderRadius: 8,
                      background: isImageButtonHovered
                        ? interactionTheme.primaryButtonHoverBackground
                        : interactionTheme.primaryButtonBackground,
                      color: '#ffffff',
                      padding: 0,
                      cursor: isSending || isAnyUploadActive ? 'not-allowed' : 'pointer',
                      opacity: isSending || isAnyUploadActive ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isUploadingImageOrVideo ? <Loader2 size={18} /> : <ImagePlus size={18} />}
                  </button>
                )}
              </MediaPicker>
              <MediaPicker
                accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                disabled={isSending || isAnyUploadActive}
                onFileSelected={handleDocumentSelected}
              >
                {({ openPicker }) => (
                  <button
                    type="button"
                    aria-label="Anexar documento"
                    onClick={openPicker}
                    onMouseEnter={() => setIsAttachmentButtonHovered(true)}
                    onMouseLeave={() => setIsAttachmentButtonHovered(false)}
                    disabled={isSending || isAnyUploadActive}
                    style={{
                      height: 40,
                      width: 40,
                      minWidth: 40,
                      border: 'none',
                      borderRadius: 8,
                      background: isAttachmentButtonHovered
                        ? interactionTheme.primaryButtonHoverBackground
                        : interactionTheme.primaryButtonBackground,
                      color: '#ffffff',
                      padding: 0,
                      cursor: isSending || isAnyUploadActive ? 'not-allowed' : 'pointer',
                      opacity: isSending || isAnyUploadActive ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isUploadingDocument ? <Loader2 size={18} /> : <Paperclip size={18} />}
                  </button>
                )}
              </MediaPicker>
              <button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={isSending || isAnyUploadActive}
                onMouseEnter={() => setIsSendButtonHovered(true)}
                onMouseLeave={() => setIsSendButtonHovered(false)}
                style={{
                  height: 40,
                  width: 40,
                  minWidth: 40,
                  border: 'none',
                  borderRadius: 8,
                  background: isSending || isAnyUploadActive
                    ? '#9ca3af'
                    : isSendButtonHovered
                      ? interactionTheme.primaryButtonHoverBackground
                      : interactionTheme.primaryButtonBackground,
                  color: '#ffffff',
                  padding: 0,
                  cursor: isSending || isAnyUploadActive ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isSending ? '...' : <SendHorizontal size={18} />}
              </button>
            </>
        </form>
        )}
      </div>
    </section>
  )
}
