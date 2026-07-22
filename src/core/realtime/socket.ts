import { io, type Socket } from 'socket.io-client'

let socketInstance: Socket | null = null
let listenersAttached = false

const normalizeRealtimeBaseUrl = (urlValue: string): string => {
  const trimmed = urlValue.trim()

  if (!trimmed) {
    return 'http://localhost:4000'
  }

  try {
    const parsed = new URL(trimmed)

    if (parsed.pathname.endsWith('/api')) {
      parsed.pathname = parsed.pathname.slice(0, -4) || '/'
    }

    const normalizedPath = parsed.pathname.replace(/\/$/, '')
    return `${parsed.origin}${normalizedPath}`
  } catch {
    return trimmed.replace(/\/$/, '')
  }
}

const resolveRealtimeBaseUrl = (): string => {
  const explicitRealtimeUrl = import.meta.env.VITE_REALTIME_URL as string | undefined

  if (explicitRealtimeUrl && explicitRealtimeUrl.trim()) {
    return normalizeRealtimeBaseUrl(explicitRealtimeUrl)
  }

  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000'
  return normalizeRealtimeBaseUrl(apiUrl)
}

const attachConnectionListeners = (socket: Socket): void => {
  if (listenersAttached) {
    return
  }

  listenersAttached = true

  socket.on('connect', () => {
    console.info('[Realtime] Socket conectado', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    })
  })

  socket.on('disconnect', (reason) => {
    console.warn('[Realtime] Socket desconectado', {
      reason,
      timestamp: new Date().toISOString()
    })
  })

  socket.on('connect_error', (error) => {
    const socketError = error as Error & {
      description?: unknown
      context?: unknown
    }

    const details =
      typeof socketError.description === 'string'
        ? socketError.description
        : socketError.description && typeof socketError.description === 'object'
          ? JSON.stringify(socketError.description)
          : null

    console.error('[Realtime] Erro de conexão', {
      message: error.message,
      details,
      context: socketError.context ?? null,
      timestamp: new Date().toISOString()
    })
  })

  socket.io.on('reconnect_attempt', (attempt) => {
    console.info('[Realtime] Reconectando', {
      attempt,
      timestamp: new Date().toISOString()
    })
  })
}

export const getRealtimeSocket = (): Socket => {
  if (socketInstance) {
    return socketInstance
  }

  socketInstance = io(`${resolveRealtimeBaseUrl()}/realtime`, {
    autoConnect: false,
    reconnection: true
  })

  attachConnectionListeners(socketInstance)

  return socketInstance
}
