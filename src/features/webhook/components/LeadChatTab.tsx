import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Paperclip, SendHorizontal } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { useRealtime } from '../../../core/realtime/useRealtime'
import { MediaPicker } from './MediaPicker'
import { MessageContent } from './MessageContent'
import { useChatMediaUpload } from '../hooks/useChatMediaUpload'
import { WebhookService } from '../services/WebhookService'
import type { ChatMessage, ChatMessageApi } from '../types/webhook.types'

type LeadChatTabProps = {
  leadId: string
}

export function LeadChatTab({ leadId }: LeadChatTabProps) {
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)

  const isUploadingDocument = mediaUploader.isUploading && mediaUploader.uploadingType === 'document'
  const isUploadingImageOrVideo =
    mediaUploader.isUploading &&
    (mediaUploader.uploadingType === 'image' || mediaUploader.uploadingType === 'video')
  const isAnyUploadActive = mediaUploader.isUploading

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
          gridTemplateRows: '1fr auto'
        }}
      >
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

        <form
          onSubmit={handleSendSubmit}
          style={{ display: 'flex', gap: 10, padding: 12, borderTop: '1px solid #e5e7eb' }}
        >
          <>
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
      </div>
    </section>
  )
}
