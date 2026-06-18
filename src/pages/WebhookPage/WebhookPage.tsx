import type { FormEvent } from 'react'
import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import axios from 'axios'
import {
  applyStoredAccessToken,
  createRefreshResponseErrorHandler
} from '../LoginPage/auth-session'

type ChatMessageApi = {
  id: string
  content: string
  direction: string
  createdAt?: string
}

type ChatMessage = {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
}

type LeadRuntimeMode = 'HUMAN' | 'AUTOMATION'

type LeadResponse = {
  id: string
  runtimeMode: LeadRuntimeMode
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  timeout: 15000,
  withCredentials: true
})

api.interceptors.request.use((config) => {
  return applyStoredAccessToken(config)
})

api.interceptors.response.use(
  (response) => response,
  createRefreshResponseErrorHandler(api)
)

async function loadMessages(leadId: string): Promise<ChatMessage[]> {
  try {
    const response = await api.get<ChatMessageApi[]>(`/leads/${leadId}/messages`)
    return (response.data || []).map((message) => ({
      id: message.id,
      content: message.content,
      direction:
        String(message.direction || '')
          .trim()
          .toUpperCase() === 'OUTBOUND'
          ? 'outbound'
          : 'inbound'
    }))
  } catch (error) {
    console.error('Error loading messages:', error)
    return []
  }
}

async function sendMessage(leadId: string, content: string): Promise<void> {
  try {
    await api.post(`/leads/${leadId}/messages`, { content })
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

async function loadLeadRuntimeMode(
  leadId: string
): Promise<LeadRuntimeMode | null> {
  try {
    const response = await api.get<LeadResponse>(`/leads/${leadId}`)
    return response.data?.runtimeMode ?? null
  } catch (error) {
    console.error('Error loading lead runtime mode:', error)
    return null
  }
}

async function updateLeadRuntimeMode(
  leadId: string,
  runtimeMode: LeadRuntimeMode
): Promise<LeadRuntimeMode> {
  const response = await api.patch<LeadResponse>(`/leads/${leadId}/runtime-mode`, {
    runtimeMode
  })
  return response.data.runtimeMode
}

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f5f7fb;
`

const LeadIdForm = styled.form`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-bottom: 16px;
  width: 100%;
  max-width: 760px;
`

const LeadIdInput = styled.input`
  height: 40px;
  border: 1px solid #cfd7e6;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 13px;
  outline: none;
  font-family: monospace;
`

const LeadIdButton = styled.button`
  height: 40px;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  background: #0f172a;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const RuntimeModeActions = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
`

const RuntimeModeButton = styled.button<{ $active: boolean }>`
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#1d4ed8' : '#cfd7e6')};
  background: ${({ $active }) => ($active ? '#2563eb' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#0f172a')};
  font-size: 12px;
  font-weight: 700;
  padding: 0 14px;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ChatCard = styled.section`
  width: 100%;
  max-width: 760px;
  height: 70vh;
  min-height: 460px;
  border: 1px solid #dde3ee;
  border-radius: 14px;
  background: #ffffff;
  display: grid;
  grid-template-rows: 1fr auto;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
`

const MessagesArea = styled.div`
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const MessageRow = styled.div<{ $direction: 'inbound' | 'outbound' }>`
  width: 100%;
  display: flex;
  justify-content: ${({ $direction }) =>
    $direction === 'outbound' ? 'flex-end' : 'flex-start'};
`

const MessageBubble = styled.div<{ $direction: 'inbound' | 'outbound' }>`
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  border: 1px solid
    ${({ $direction }) => ($direction === 'outbound' ? '#1d4ed8' : '#d8e1ef')};
  background: ${({ $direction }) =>
    $direction === 'outbound' ? '#2563eb' : '#eef3f9'};
  color: ${({ $direction }) =>
    $direction === 'outbound' ? '#ffffff' : '#10203a'};
  box-shadow: ${({ $direction }) =>
    $direction === 'outbound'
      ? '0 8px 18px rgba(37, 99, 235, 0.18)'
      : '0 4px 10px rgba(15, 23, 42, 0.05)'};
`

const ComposerForm = styled.form`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid #e8edf5;
`

const MessageInput = styled.input`
  width: 100%;
  height: 44px;
  border: 1px solid #cfd7e6;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;

  &:disabled {
    background: #f5f7fb;
    color: #999;
    cursor: not-allowed;
  }
`

const SendButton = styled.button`
  height: 44px;
  border: none;
  border-radius: 10px;
  padding: 0 18px;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`

export default function WebhookPage() {
  const messagesAreaRef = useRef<HTMLDivElement | null>(null)
  const [leadIdInput, setLeadIdInput] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [runtimeMode, setRuntimeMode] = useState<LeadRuntimeMode | null>(null)
  const [isUpdatingRuntimeMode, setIsUpdatingRuntimeMode] = useState(false)

  useEffect(() => {
    if (!activeLeadId) return

    const init = async () => {
      setIsLoading(true)
      const [loaded, loadedRuntimeMode] = await Promise.all([
        loadMessages(activeLeadId),
        loadLeadRuntimeMode(activeLeadId)
      ])
      setMessages(loaded)
      setRuntimeMode(loadedRuntimeMode)
      setIsLoading(false)
    }

    init()

    const interval = setInterval(async () => {
      const loaded = await loadMessages(activeLeadId)
      setMessages(loaded)
    }, 3000)

    return () => clearInterval(interval)
  }, [activeLeadId])

  useEffect(() => {
    const element = messagesAreaRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [messages])

  const handleLeadIdSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = leadIdInput.trim()
    if (!trimmed) return
    setMessages([])
    setRuntimeMode(null)
    setActiveLeadId(trimmed)
  }

  const handleRuntimeModeChange = async (nextRuntimeMode: LeadRuntimeMode) => {
    if (!activeLeadId) return

    setIsUpdatingRuntimeMode(true)
    try {
      const updatedRuntimeMode = await updateLeadRuntimeMode(
        activeLeadId,
        nextRuntimeMode
      )
      setRuntimeMode(updatedRuntimeMode)
    } catch (error) {
      console.error('Failed to update runtime mode:', error)
    } finally {
      setIsUpdatingRuntimeMode(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim() || !activeLeadId) {
      return
    }

    const messageContent = message.trim()
    setMessage('')
    setIsSending(true)

    try {
      await sendMessage(activeLeadId, messageContent)
      const updated = await loadMessages(activeLeadId)
      setMessages(updated)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Page>
      <LeadIdForm onSubmit={handleLeadIdSubmit}>
        <LeadIdInput
          type="text"
          value={leadIdInput}
          onChange={(e) => setLeadIdInput(e.target.value)}
          placeholder="Cole o ID do lead aqui..."
        />
        <LeadIdButton type="submit">Carregar</LeadIdButton>
      </LeadIdForm>
      <RuntimeModeActions>
        <RuntimeModeButton
          type="button"
          $active={runtimeMode === 'HUMAN'}
          disabled={!activeLeadId || isUpdatingRuntimeMode}
          onClick={() => handleRuntimeModeChange('HUMAN')}
        >
          HUMAN
        </RuntimeModeButton>
        <RuntimeModeButton
          type="button"
          $active={runtimeMode === 'AUTOMATION'}
          disabled={!activeLeadId || isUpdatingRuntimeMode}
          onClick={() => handleRuntimeModeChange('AUTOMATION')}
        >
          AUTOMATION
        </RuntimeModeButton>
      </RuntimeModeActions>
      <ChatCard aria-label="Chat de testes">
        <MessagesArea ref={messagesAreaRef}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
              Carregando mensagens...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
              {activeLeadId ? 'Nenhuma mensagem ainda' : 'Informe um lead para começar'}
            </div>
          ) : (
            messages.map((msg) => (
              <MessageRow key={msg.id} $direction={msg.direction}>
                <MessageBubble $direction={msg.direction}>{msg.content}</MessageBubble>
              </MessageRow>
            ))
          )}
        </MessagesArea>

        <ComposerForm onSubmit={handleSubmit}>
          <MessageInput
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Digite uma mensagem..."
            disabled={isSending || !activeLeadId}
          />

          <SendButton type="submit" disabled={isSending || !activeLeadId}>
            {isSending ? 'Enviando...' : 'Enviar'}
          </SendButton>
        </ComposerForm>
      </ChatCard>
    </Page>
  )
}
