import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Mic, SendHorizontal } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { useRealtime } from '../../../core/realtime/useRealtime'
import { MessageContent } from './MessageContent'
import { RecordingComposer } from './RecordingComposer'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { WebhookService } from '../services/WebhookService'
import type { ChatMessage, ChatMessageApi } from '../types/webhook.types'

type LeadChatTabProps = {
  leadId: string
}

export function LeadChatTab({ leadId }: LeadChatTabProps) {
  const realtime = useRealtime()
  const audioRecorder = useAudioRecorder()
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false)
  const [isAudioButtonHovered, setIsAudioButtonHovered] = useState<boolean>(false)
  const [isSendButtonHovered, setIsSendButtonHovered] = useState<boolean>(false)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)

  const recordingDurationInSeconds = Math.floor(audioRecorder.recordingDurationInMs / 1000)
  const recordingMinutes = Math.floor(recordingDurationInSeconds / 60)
  const recordingSeconds = recordingDurationInSeconds % 60
  const recordingDurationLabel = `${String(recordingMinutes).padStart(2, '0')}:${String(recordingSeconds).padStart(2, '0')}`
  const isRecordingActive = audioRecorder.isRecording || isUploadingAudio

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

  const handleStartRecording = async () => {
    if (!audioRecorder.isSupported) {
      setError('Seu navegador nao suporta gravacao de audio.')
      return
    }

    try {
      setError(null)
      await audioRecorder.startRecording()
    } catch (exception: unknown) {
      const messageText =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : 'Nao foi possivel acessar o microfone. Verifique as permissoes e tente novamente.'

      setError(messageText)
    }
  }

  const handleCancelRecording = async () => {
    try {
      await audioRecorder.cancelRecording()
    } finally {
      setIsUploadingAudio(false)
    }
  }

  const handleFinishRecording = async () => {
    try {
      setError(null)
      setIsUploadingAudio(true)

      const recordedAudioBlob = await audioRecorder.stopRecording()

      if (!recordedAudioBlob || recordedAudioBlob.size === 0) {
        setError('Nao foi possivel finalizar a gravacao de audio.')
        return
      }

      const mimeType = recordedAudioBlob.type || 'audio/webm'
      const extension = mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('mpeg')
          ? 'mp3'
          : mimeType.includes('mp4')
            ? 'mp4'
            : mimeType.includes('aac')
              ? 'aac'
              : mimeType.includes('amr')
                ? 'amr'
                : 'webm'

      const audioFile = new File(
        [recordedAudioBlob],
        `audio-${Date.now()}.${extension}`,
        { type: mimeType }
      )

      await WebhookService.sendMediaMessage(leadId, {
        file: audioFile,
        type: 'audio'
      })
    } catch {
      setError('Nao foi possivel enviar o audio. Tente novamente.')
    } finally {
      setIsUploadingAudio(false)
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
          {isRecordingActive ? (
            <RecordingComposer
              durationLabel={recordingDurationLabel}
              isUploading={isUploadingAudio}
              onCancel={() => {
                void handleCancelRecording()
              }}
              onFinish={() => {
                void handleFinishRecording()
              }}
            />
          ) : (
            <>
              <input
                ref={messageInputRef}
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Digite uma mensagem..."
                disabled={isSending}
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
              <button
                type="button"
                aria-label="Gravar áudio"
                onClick={() => {
                  void handleStartRecording()
                }}
                onMouseEnter={() => setIsAudioButtonHovered(true)}
                onMouseLeave={() => setIsAudioButtonHovered(false)}
                disabled={isSending}
                style={{
                  height: 40,
                  width: 40,
                  minWidth: 40,
                  border: 'none',
                  borderRadius: 8,
                  background: isAudioButtonHovered
                    ? interactionTheme.primaryButtonHoverBackground
                    : interactionTheme.primaryButtonBackground,
                  color: '#ffffff',
                  padding: 0,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Mic size={18} />
              </button>
              <button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={isSending}
                onMouseEnter={() => setIsSendButtonHovered(true)}
                onMouseLeave={() => setIsSendButtonHovered(false)}
                style={{
                  height: 40,
                  width: 40,
                  minWidth: 40,
                  border: 'none',
                  borderRadius: 8,
                  background: isSending
                    ? '#9ca3af'
                    : isSendButtonHovered
                      ? interactionTheme.primaryButtonHoverBackground
                      : interactionTheme.primaryButtonBackground,
                  color: '#ffffff',
                  padding: 0,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isSending ? '...' : <SendHorizontal size={18} />}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  )
}
