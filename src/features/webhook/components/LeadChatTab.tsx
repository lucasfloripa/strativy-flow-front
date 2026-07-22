import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { useRealtime } from '../../../core/realtime/useRealtime'
import { MessageContent } from './MessageContent'
import { WebhookService } from '../services/WebhookService'
import type { ChatMessage, ChatMessageApi } from '../types/webhook.types'

type LeadChatTabProps = {
  leadId: string
}

export function LeadChatTab({ leadId }: LeadChatTabProps) {
  const realtime = useRealtime()
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false)
  const [isSendButtonHovered, setIsSendButtonHovered] = useState<boolean>(false)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)

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

      console.info('[Realtime] Evento recebido', {
        event: 'message.created',
        leadId,
        messageId: nextMessage.id,
        timestamp: new Date().toISOString()
      })

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
      const createdMessage = await WebhookService.sendMessage(leadId, content)
      setMessage('')
      setMessages((currentMessages) => [
        ...currentMessages.filter((item) => item.id !== createdMessage.id),
        createdMessage
      ])
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
        </form>
      </div>
    </section>
  )
}
