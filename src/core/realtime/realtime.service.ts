import type { Socket } from 'socket.io-client'

import { getRealtimeSocket } from './socket'

type SocketEventHandler<T = unknown> = (payload: T) => void

class RealtimeService {
  private socket: Socket

  constructor() {
    this.socket = getRealtimeSocket()
  }

  connect(): void {
    if (this.socket.connected) {
      return
    }

    this.socket.connect()
  }

  disconnect(): void {
    if (!this.socket.connected && !this.socket.active) {
      return
    }

    this.socket.disconnect()
  }

  joinLeadRoom(leadId: string): void {
    const normalizedLeadId = leadId.trim()

    if (!normalizedLeadId) {
      return
    }

    this.socket.emit('joinLeadRoom', { leadId: normalizedLeadId })

    console.info('[Realtime] Entrou na sala', {
      room: `lead:${normalizedLeadId}`,
      timestamp: new Date().toISOString()
    })
  }

  leaveLeadRoom(leadId: string): void {
    const normalizedLeadId = leadId.trim()

    if (!normalizedLeadId) {
      return
    }

    this.socket.emit('leaveLeadRoom', { leadId: normalizedLeadId })

    console.info('[Realtime] Saiu da sala', {
      room: `lead:${normalizedLeadId}`,
      timestamp: new Date().toISOString()
    })
  }

  on<T = unknown>(event: string, handler: SocketEventHandler<T>): void {
    this.socket.on(event, handler as SocketEventHandler)
  }

  off<T = unknown>(event: string, handler: SocketEventHandler<T>): void {
    this.socket.off(event, handler as SocketEventHandler)
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.socket.emit(event, payload)
  }
}

export const realtimeService = new RealtimeService()
