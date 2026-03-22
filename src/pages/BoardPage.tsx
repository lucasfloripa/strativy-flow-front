/* eslint-disable @typescript-eslint/no-explicit-any */

// BoardPage.tsx
// Tudo em 1 arquivo: axios + jotai + styled-components + dnd-kit
// UI-only reorder dentro da mesma coluna + modal ao clicar no lead + edição básica + modal de settings
// + modal de ações da coluna (editar/apagar)
// + botão de criação com dropdown para criar coluna ou lead
// + modal do lead com tabs de notas e follow-ups
// + follow-ups com criação inline + edição inline por linha + confirmação de exclusão

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// import axios from 'axios'
import styled, { createGlobalStyle } from 'styled-components'
import {
  Settings,
  X,
  Plus,
  Pencil,
  FileText,
  MessageSquare,
  Trash2,
  Calendar,
  ArrowRight,
  Check,
  Star,
  Clock3,
  ArrowLeft,
  Sun,
  Moon,
  Menu
} from 'lucide-react'
import { atom, useAtom, useSetAtom } from 'jotai'

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ----------------------------
// Types
// ----------------------------
type FollowUpBoardStatus = 'none' | 'scheduled' | 'today' | 'overdue'
type LeadSourceBadgeType = 'whatsapp' | 'facebook' | 'instagram' | 'default'
type LeadFilterKey =
  | 'favorite'
  | 'none'
  | 'scheduled'
  | 'today'
  | 'overdue'

type FollowupFilterKey = 'scheduled' | 'today' | 'overdue' | 'done'

type LeadFollowUpSummary = {
  openCount: number
  nextFollowUpValue: string | null
  nextDueAt: string | Date | null
  status: FollowUpBoardStatus
}

type LeadFollowUp = {
  id: string
  leadId: string
  value: string
  dueAt: string
  status: 'pending' | 'done' | 'canceled'
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

type Lead = {
  id: string
  boardId: string
  columnId: string
  position: number
  name: string
  phone: string
  email?: string
  source?: string
  notes?: string
  status?: string
  fields?: Record<string, any>
  isFavorite?: boolean
  followUpSummary?: LeadFollowUpSummary
  lastInboundMessageId?: string
  lastAutoReplyMessageId?: string
  lastActivityAt?: string | Date | null
  movedAt?: string | Date
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

type Board = {
  id: string
  name: string
  userId: string
  isActive: boolean
  isArchived: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

type BoardColumnOnEnterCreateFollowUpAutomation = {
  value: string
  dueAt?: string
}

type BoardColumnOnEnterAutomation = {
  createFollowUp?: BoardColumnOnEnterCreateFollowUpAutomation
  favoriteLead?: boolean
  markAllFollowUpsAsDone?: boolean
  resetLastActivityAt?: boolean
}

type BoardColumn = {
  id: string
  name: string
  boardId: string
  position: number
  isDefault: boolean
  createdAt: string | Date
  updatedAt: string | Date
  leads: Lead[]
  onEnter?: BoardColumnOnEnterAutomation | null
}

type BoardFullResponse = {
  board: Board
  columns: BoardColumn[]
}

type UpdateLeadPayload = {
  name?: string
  phone?: string
  email?: string
  source?: string
  notes?: string
  fields?: Record<string, any>
  isArchived?: boolean
}

type CreateLeadPayload = {
  boardId: string
  columnId?: string
  name: string
  phone: string
  email?: string
  source?: string
  notes?: string
  fields?: Record<string, any>
}

type UpdateColumnPayload = {
  name?: string
  onEnter?: BoardColumnOnEnterAutomation | null
}

type CreateColumnPayload = {
  name: string
}

type ColumnModalMode = 'edit' | 'delete'
type LeadModalViewMode = 'followups' | 'notes' | 'details' | 'edit'
type ColumnSortKey = 'newest' | 'oldest' | 'next-followup' | 'no-followup' | 'favorites'
type ColumnSettingsView = 'details' | 'automations'
type ColumnColorKey = 'blue' | 'green' | 'red' | 'yellow'
type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'strativy-theme-mode'

const COLUMN_COLOR_OPTIONS: Array<{
  key: ColumnColorKey
  label: string
  background: string
  textColor: string
}> = [
  { key: 'blue', label: 'Azul', background: '#dbeafe', textColor: '#1d4ed8' },
  { key: 'green', label: 'Verde', background: '#dcfce7', textColor: '#15803d' },
  { key: 'red', label: 'Vermelho', background: '#fee2e2', textColor: '#dc2626' },
  { key: 'yellow', label: 'Amarelo', background: '#fef3c7', textColor: '#b45309' }
]

// ----------------------------
// Axios (comentado — usando mock data)
// ----------------------------
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
//   timeout: 15000
// })
//
// api.interceptors.request.use((config) => {
//   return config
// })

// ----------------------------
// Mock data
// ----------------------------

const _MOCK_NOW = new Date('2026-03-21T12:00:00.000Z').getTime()

function _mockDate(offsetMs: number): string {
  return new Date(_MOCK_NOW + offsetMs).toISOString()
}

// Mutable in-memory store so mutations (create/delete/move) persist during the session
const MOCK_FOLLOWUPS_STORE: Record<string, LeadFollowUp[]> = {
  'lead-1': [
    {
      id: 'fu-1-1', leadId: 'lead-1',
      value: 'Ligar para apresentar proposta enterprise',
      dueAt: _mockDate(-2 * 24 * 3600 * 1000), // 2 dias atrás → atrasado
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-6 * 24 * 3600 * 1000), updatedAt: _mockDate(-6 * 24 * 3600 * 1000)
    },
    {
      id: 'fu-1-2', leadId: 'lead-1',
      value: 'Enviar contrato para análise jurídica',
      dueAt: _mockDate(2 * 24 * 3600 * 1000), // 2 dias à frente → agendado
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-5 * 24 * 3600 * 1000), updatedAt: _mockDate(-5 * 24 * 3600 * 1000)
    }
  ],
  'lead-2': [
    {
      id: 'fu-2-1', leadId: 'lead-2',
      value: 'Enviar catálogo de produtos e cases de uso',
      dueAt: _mockDate(4 * 24 * 3600 * 1000), // agendado
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-30 * 60 * 1000), updatedAt: _mockDate(-30 * 60 * 1000)
    }
  ],
  'lead-3': [
    {
      id: 'fu-3-1', leadId: 'lead-3',
      value: 'Reunião de apresentação do produto',
      dueAt: _mockDate(-6 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-6 * 24 * 3600 * 1000 + 2 * 3600 * 1000),
      createdAt: _mockDate(-11 * 24 * 3600 * 1000), updatedAt: _mockDate(-6 * 24 * 3600 * 1000 + 2 * 3600 * 1000)
    },
    {
      id: 'fu-3-2', leadId: 'lead-3',
      value: 'Aguardar retorno sobre aprovação interna da proposta',
      dueAt: _mockDate(-2 * 3600 * 1000), // hoje (pouco antes de agora)
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-6 * 24 * 3600 * 1000 + 3 * 3600 * 1000), updatedAt: _mockDate(-6 * 24 * 3600 * 1000 + 3 * 3600 * 1000)
    }
  ],
  'lead-4': [
    {
      id: 'fu-4-1', leadId: 'lead-4',
      value: 'Demonstração técnica da plataforma',
      dueAt: _mockDate(-16 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-16 * 24 * 3600 * 1000 + 1 * 3600 * 1000),
      createdAt: _mockDate(-21 * 24 * 3600 * 1000), updatedAt: _mockDate(-16 * 24 * 3600 * 1000 + 1 * 3600 * 1000)
    },
    {
      id: 'fu-4-2', leadId: 'lead-4',
      value: 'Retorno sobre viabilidade de customização',
      dueAt: _mockDate(-3 * 24 * 3600 * 1000), // atrasado
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-16 * 24 * 3600 * 1000 + 2 * 3600 * 1000), updatedAt: _mockDate(-16 * 24 * 3600 * 1000 + 2 * 3600 * 1000)
    },
    {
      id: 'fu-4-3', leadId: 'lead-4',
      value: 'Negociação final de contrato e valores',
      dueAt: _mockDate(7 * 24 * 3600 * 1000),
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-9 * 24 * 3600 * 1000), updatedAt: _mockDate(-9 * 24 * 3600 * 1000)
    }
  ],
  'lead-5': [
    {
      id: 'fu-5-1', leadId: 'lead-5',
      value: 'Enviar proposta comercial detalhada',
      dueAt: _mockDate(-11 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-11 * 24 * 3600 * 1000 + 30 * 60 * 1000),
      createdAt: _mockDate(-16 * 24 * 3600 * 1000), updatedAt: _mockDate(-11 * 24 * 3600 * 1000 + 30 * 60 * 1000)
    },
    {
      id: 'fu-5-2', leadId: 'lead-5',
      value: 'Reforçar proposta com cases de sucesso do setor',
      dueAt: _mockDate(7 * 24 * 3600 * 1000),
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-11 * 24 * 3600 * 1000 + 1 * 3600 * 1000), updatedAt: _mockDate(-11 * 24 * 3600 * 1000 + 1 * 3600 * 1000)
    }
  ],
  'lead-6': [],
  'lead-7': [
    {
      id: 'fu-7-1', leadId: 'lead-7',
      value: 'Apresentação executiva para board de diretores',
      dueAt: _mockDate(-29 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-29 * 24 * 3600 * 1000 + 1 * 3600 * 1000),
      createdAt: _mockDate(-34 * 24 * 3600 * 1000), updatedAt: _mockDate(-29 * 24 * 3600 * 1000 + 1 * 3600 * 1000)
    },
    {
      id: 'fu-7-2', leadId: 'lead-7',
      value: 'Envio e assinatura de contrato anual',
      dueAt: _mockDate(-7 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-6 * 24 * 3600 * 1000),
      createdAt: _mockDate(-25 * 24 * 3600 * 1000), updatedAt: _mockDate(-6 * 24 * 3600 * 1000)
    },
    {
      id: 'fu-7-3', leadId: 'lead-7',
      value: 'Onboarding inicial realizado com sucesso',
      dueAt: _mockDate(-1 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-1 * 24 * 3600 * 1000 + 1 * 3600 * 1000),
      createdAt: _mockDate(-6 * 24 * 3600 * 1000 + 1 * 3600 * 1000), updatedAt: _mockDate(-1 * 24 * 3600 * 1000 + 1 * 3600 * 1000)
    }
  ],
  'lead-8': [
    {
      id: 'fu-8-1', leadId: 'lead-8',
      value: 'Kickoff de onboarding e configuração do ambiente',
      dueAt: _mockDate(-3 * 24 * 3600 * 1000),
      status: 'done', completedAt: _mockDate(-3 * 24 * 3600 * 1000 + 1 * 3600 * 1000),
      createdAt: _mockDate(-3 * 24 * 3600 * 1000 - 3 * 3600 * 1000), updatedAt: _mockDate(-3 * 24 * 3600 * 1000 + 1 * 3600 * 1000)
    },
    {
      id: 'fu-8-2', leadId: 'lead-8',
      value: 'Verificar status da integração com ERP legado',
      dueAt: _mockDate(-2 * 24 * 3600 * 1000), // atrasado
      status: 'pending', completedAt: null,
      createdAt: _mockDate(-3 * 24 * 3600 * 1000 + 2 * 3600 * 1000), updatedAt: _mockDate(-3 * 24 * 3600 * 1000 + 2 * 3600 * 1000)
    }
  ]
}

const MOCK_BOARD_STATE: BoardFullResponse = {
  board: {
    id: 'mock-board-1',
    name: 'Vendas 2026',
    userId: 'mock-user-1',
    isActive: true,
    isArchived: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },
  columns: [
    {
      id: 'col-1',
      name: 'Novos Leads',
      boardId: 'mock-board-1',
      position: 0,
      isDefault: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      onEnter: {
        createFollowUp: { value: 'Ligar para apresentação inicial', dueAt: undefined },
        resetLastActivityAt: true
      },
      leads: [
        {
          id: 'lead-1',
          boardId: 'mock-board-1', columnId: 'col-1', position: 0,
          name: 'João Silva',
          phone: '(11) 99123-4567',
          email: 'joao.silva@empresa.com.br',
          source: 'whatsapp',
          notes: 'Cliente interessado no plano enterprise. Já realizou uma demonstração e gostou muito do produto. Ponto de contato: João (CEO). Empresa com 150 funcionários no setor de logística.',
          isFavorite: true,
          isArchived: false,
          lastActivityAt: undefined,
          createdAt: _mockDate(-6 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-4 * 3600 * 1000),
          movedAt: _mockDate(-1 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 2,
            nextFollowUpValue: 'Ligar para apresentar proposta enterprise',
            nextDueAt: _mockDate(-2 * 24 * 3600 * 1000),
            status: 'overdue'
          }
        },
        {
          id: 'lead-2',
          boardId: 'mock-board-1', columnId: 'col-1', position: 1,
          name: 'Maria Santos',
          phone: '(21) 98765-4321',
          email: 'maria.santos@gmail.com',
          source: 'instagram',
          notes: '',
          isFavorite: false,
          isArchived: false,
          lastActivityAt: undefined,
          createdAt: _mockDate(-30 * 60 * 1000),
          updatedAt: _mockDate(-30 * 60 * 1000),
          movedAt: _mockDate(-30 * 60 * 1000),
          followUpSummary: {
            openCount: 1,
            nextFollowUpValue: 'Enviar catálogo de produtos e cases de uso',
            nextDueAt: _mockDate(4 * 24 * 3600 * 1000),
            status: 'scheduled'
          }
        },
        {
          id: 'lead-9',
          boardId: 'mock-board-1', columnId: 'col-1', position: 2,
          name: 'Bruno Almeida',
          phone: '(19) 99876-5432',
          email: 'bruno.almeida@comercial.com.br',
          source: 'facebook',
          notes: 'Lead novo na operação comercial. Demonstrou interesse no plano profissional e está aguardando retorno com proposta ajustada.',
          isFavorite: false,
          isArchived: false,
          lastActivityAt: _mockDate(-2 * 24 * 3600 * 1000),
          createdAt: _mockDate(-3 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-2 * 24 * 3600 * 1000),
          movedAt: _mockDate(-2 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 1,
            nextFollowUpValue: 'Retornar contato com proposta comercial',
            nextDueAt: _mockDate(-1 * 24 * 3600 * 1000),
            status: 'overdue'
          }
        }
      ]
    },
    {
      id: 'col-2',
      name: 'Em Negociação',
      boardId: 'mock-board-1',
      position: 1,
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      onEnter: {
        markAllFollowUpsAsDone: true,
        favoriteLead: true,
        resetLastActivityAt: true
      },
      leads: [
        {
          id: 'lead-3',
          boardId: 'mock-board-1', columnId: 'col-2', position: 0,
          name: 'Carlos Mendes',
          phone: '(31) 97654-3210',
          email: 'carlos.mendes@negocio.com',
          source: 'facebook',
          notes: 'Reunião realizada há 6 dias. Mostrou interesse no plano Pro com customizações. Aguardando aprovação do board e proposta de integração com sistema legado.',
          isFavorite: true,
          isArchived: false,
          lastActivityAt: _mockDate(-1 * 24 * 3600 * 1000),
          createdAt: _mockDate(-11 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-1 * 24 * 3600 * 1000),
          movedAt: _mockDate(-3 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 1,
            nextFollowUpValue: 'Aguardar retorno sobre aprovação interna da proposta',
            nextDueAt: _mockDate(-2 * 3600 * 1000),
            status: 'today'
          }
        },
        {
          id: 'lead-4',
          boardId: 'mock-board-1', columnId: 'col-2', position: 1,
          name: 'Ana Costa',
          phone: '(41) 96543-2109',
          email: 'ana.costa@startup.io',
          source: 'facebook',
          notes: 'Startup em fase de crescimento acelerado. Potencial de expansão de contrato em 6 meses. Precisa de migração de dados do sistema anterior.',
          isFavorite: false,
          isArchived: false,
          lastActivityAt: _mockDate(-3 * 24 * 3600 * 1000),
          createdAt: _mockDate(-21 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-3 * 24 * 3600 * 1000),
          movedAt: _mockDate(-6 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 2,
            nextFollowUpValue: 'Retorno sobre viabilidade de customização',
            nextDueAt: _mockDate(-3 * 24 * 3600 * 1000),
            status: 'overdue'
          }
        }
      ]
    },
    {
      id: 'col-3',
      name: 'Proposta Enviada',
      boardId: 'mock-board-1',
      position: 2,
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      onEnter: null,
      leads: [
        {
          id: 'lead-5',
          boardId: 'mock-board-1', columnId: 'col-3', position: 0,
          name: 'Roberto Lima',
          phone: '(51) 95432-1098',
          email: 'roberto.lima@consultoria.com.br',
          source: 'whatsapp',
          notes: 'Proposta enviada há 11 dias. Valor: R$ 4.800/mês. Aguardando decisão do conselho. Solicitou adição de módulo de relatórios gerenciais no contrato.',
          isFavorite: false,
          isArchived: false,
          lastActivityAt: _mockDate(-30 * 24 * 3600 * 1000),
          createdAt: _mockDate(-49 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-11 * 24 * 3600 * 1000),
          movedAt: _mockDate(-11 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 1,
            nextFollowUpValue: 'Reforçar proposta com cases de sucesso do setor',
            nextDueAt: _mockDate(7 * 24 * 3600 * 1000),
            status: 'scheduled'
          }
        },
        {
          id: 'lead-6',
          boardId: 'mock-board-1', columnId: 'col-3', position: 1,
          name: 'Juliana Ferreira',
          phone: '(61) 94321-0987',
          email: 'juliana@techcompany.io',
          source: 'whatsapp',
          notes: 'Empresa de tecnologia com 200 funcionários. Proposta customizada elaborada pelo time de soluções. Ponto de contato: Juliana (Diretora Comercial). Negociação em fase final — aguardando assinatura do contrato anual no valor de R$ 12.000/mês.',
          isFavorite: true,
          isArchived: false,
          lastActivityAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          createdAt: _mockDate(-65 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-12 * 3600 * 1000),
          movedAt: _mockDate(-16 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 0,
            nextFollowUpValue: null,
            nextDueAt: null,
            status: 'none'
          }
        }
      ]
    },
    {
      id: 'col-4',
      name: 'Fechado',
      boardId: 'mock-board-1',
      position: 3,
      isDefault: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      onEnter: {
        createFollowUp: { value: 'Onboarding inicial — boas-vindas ao cliente', dueAt: undefined },
        markAllFollowUpsAsDone: true
      },
      leads: [
        {
          id: 'lead-7',
          boardId: 'mock-board-1', columnId: 'col-4', position: 0,
          name: 'Fernando Oliveira',
          phone: '(71) 93210-9876',
          email: 'fernando@grupooliveira.com',
          source: 'instagram',
          notes: 'Contrato assinado em 15/03/2026. Plano Business – 12 meses. Cliente indicou mais 2 contatos da rede. Chave de acesso enviada por email.',
          isFavorite: false,
          isArchived: false,
          lastActivityAt: _mockDate(-6 * 24 * 3600 * 1000),
          createdAt: _mockDate(-60 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-6 * 24 * 3600 * 1000),
          movedAt: _mockDate(-6 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 0,
            nextFollowUpValue: null,
            nextDueAt: null,
            status: 'none'
          }
        },
        {
          id: 'lead-8',
          boardId: 'mock-board-1', columnId: 'col-4', position: 1,
          name: 'Patrícia Rodrigues',
          phone: '(81) 92109-8765',
          email: 'patricia@varejista.com.br',
          source: 'whatsapp',
          notes: 'Cliente de varejo com alto volume de pedidos. Ativação pendente de integração com ERP legado SAP. Time técnico alocado.',
          isFavorite: true,
          isArchived: false,
          lastActivityAt: _mockDate(-2 * 24 * 3600 * 1000),
          createdAt: _mockDate(-39 * 24 * 3600 * 1000),
          updatedAt: _mockDate(-2 * 24 * 3600 * 1000),
          movedAt: _mockDate(-3 * 24 * 3600 * 1000),
          followUpSummary: {
            openCount: 1,
            nextFollowUpValue: 'Verificar status da integração com ERP legado',
            nextDueAt: _mockDate(-2 * 24 * 3600 * 1000),
            status: 'overdue'
          }
        }
      ]
    }
  ]
}

// Helper: patch a lead inside MOCK_BOARD_STATE by id
function _mockPatchLead(leadId: string, patch: Partial<Lead>) {
  MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.map((c) => ({
    ...c,
    leads: c.leads.map((l) => (l.id === leadId ? { ...l, ...patch } : l))
  }))
}

// Helper: move a lead from its current column to another in MOCK_BOARD_STATE
function _mockMoveLead(leadId: string, toColumnId: string, currentData: BoardFullResponse | null) {
  if (!currentData) return
  // Find the lead in current (already-reordered) local state and mirror it to mock store
  const sourceData = currentData
  const newColumns: BoardColumn[] = MOCK_BOARD_STATE.columns.map((col) => ({
    ...col,
    leads: col.leads.filter((l) => l.id !== leadId)
  }))
  const leadFromLocal = sourceData.columns.flatMap((c) => c.leads).find((l) => l.id === leadId)
  if (!leadFromLocal) return
  MOCK_BOARD_STATE.columns = newColumns.map((col) => {
    if (col.id !== toColumnId) return col
    return { ...col, leads: [...col.leads, { ...leadFromLocal, columnId: toColumnId }] }
  })
}

// ----------------------------
// Jotai state
// ----------------------------
const boardIdAtom = atom<string>('')
const openedColumnMenuIdAtom = atom<string | null>(null)

const boardFullAtom = atom<BoardFullResponse | null>(null)
const isLoadingAtom = atom<boolean>(false)
const errorAtom = atom<string | null>(null)

const selectedLeadIdAtom = atom<string | null>(null)
const selectedLeadAtom = atom<Lead | null>(null)
const openCreateFollowupOnLeadOpenAtom = atom<boolean>(false)
const isLeadModalLoadingAtom = atom<boolean>(false)
const leadModalErrorAtom = atom<string | null>(null)

const isSettingsModalOpenAtom = atom<boolean>(false)

const selectedColumnAtom = atom<BoardColumn | null>(null)
const isColumnModalOpenAtom = atom<boolean>(false)
const columnModalModeAtom = atom<ColumnModalMode>('edit')
const columnModalErrorAtom = atom<string | null>(null)
const isColumnModalSavingAtom = atom<boolean>(false)

const isCreateColumnModalOpenAtom = atom<boolean>(false)
const createColumnErrorAtom = atom<string | null>(null)
const isCreateColumnSavingAtom = atom<boolean>(false)

const isCreateLeadModalOpenAtom = atom<boolean>(false)
const createLeadErrorAtom = atom<string | null>(null)
const isCreateLeadSavingAtom = atom<boolean>(false)

const isAutomationsModalOpenAtom = atom<boolean>(false)
const automationsModalColumnAtom = atom<BoardColumn | null>(null)
const columnSettingsInitialViewAtom = atom<ColumnSettingsView>('details')

const setBoardIdAtom = atom(null, (_get, set, id: string) => {
  set(boardIdAtom, id)
})

// ----------------------------
// Helpers
// ----------------------------
function formatFollowUpDateLabel(value?: string | Date | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  const endOfTomorrow = new Date(endOfToday)
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)

  const timeLabel = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (date >= startOfToday && date <= endOfToday) {
    return `Hoje ${timeLabel}`
  }

  if (date >= startOfTomorrow && date <= endOfTomorrow) {
    return `Amanhã ${timeLabel}`
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatFollowUpDateTimeExact(value?: string | Date | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getLeadFollowUpStatus(lead: Lead): FollowUpBoardStatus {
  return lead.followUpSummary?.status ?? 'none'
}

function getLeadFollowUpCountLabel(lead: Lead) {
  const count = lead.followUpSummary?.openCount ?? 0

  if (count <= 0) return null
  if (count === 1) return '1 follow-up aberto'
  return `${count} follow-ups abertos`
}

function getLeadFollowUpLine(lead: Lead) {
  const summary = lead.followUpSummary

  if (!summary || summary.status === 'none' || !summary.nextDueAt) {
    return '⚠️ Sem próxima ação'
  }

  if (summary.status === 'overdue') {
    const label = formatFollowUpDateLabel(summary.nextDueAt)
    return label ? `Atrasado: ${label}` : 'Atrasado'
  }

  const label = formatFollowUpDateLabel(summary.nextDueAt)
  return label ? `Próximo: ${label}` : 'Próximo follow-up'
}

function getSingleFollowUpVisualStatus(
  followup: LeadFollowUp
): FollowUpBoardStatus | 'done' {
  if (followup.status === 'done') return 'done'

  const due = new Date(followup.dueAt)
  if (Number.isNaN(due.getTime())) return 'scheduled'

  const now = new Date()

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  if (due < startOfToday) return 'overdue'
  if (due >= startOfToday && due <= endOfToday) return 'today'
  return 'scheduled'
}

function getFollowUpStatusLabel(status: FollowUpBoardStatus | 'done') {
  switch (status) {
    case 'overdue':
      return 'Atrasado'
    case 'today':
      return 'Hoje'
    case 'scheduled':
      return 'Agendado'
    case 'done':
      return 'Concluido'
    default:
      return 'Agendado'
  }
}

function formatPhone(phone?: string) {
  return phone?.trim() || '—'
}

function sortColumnsAndLeads(data: BoardFullResponse): BoardFullResponse {
  const columns = [...data.columns]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      ...c,
      leads: [...(c.leads ?? [])].sort((a, b) => a.position - b.position)
    }))

  return { ...data, columns }
}

function normalizeOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function getLeadNotes(lead?: Lead | null) {
  const value = lead?.notes
  return typeof value === 'string' ? value : ''
}

function sortFollowups(a: LeadFollowUp, b: LeadFollowUp) {
  const aDone = a.status === 'done'
  const bDone = b.status === 'done'
  if (aDone !== bDone) return aDone ? 1 : -1
  const aTime = new Date(a.dueAt).getTime()
  const bTime = new Date(b.dueAt).getTime()
  // done items: oldest dueAt goes to the very bottom (descending)
  if (aDone) return bTime - aTime
  // pending items: ascending by dueAt
  return aTime - bTime
}

function getLeadSourceBadge(source?: string | null) {
  if (!source) return null

  const trimmedSource = source.trim()
  if (!trimmedSource) return null

  const normalized = trimmedSource
    .toLowerCase()
    .replace(/[_\-\s]+/g, '')

  const sourceMap: Record<string, LeadSourceBadgeType> = {
    whatsapp: 'whatsapp',
    zap: 'whatsapp',
    wa: 'whatsapp',
    facebook: 'facebook',
    fb: 'facebook',
    instagram: 'instagram',
    insta: 'instagram',
    ig: 'instagram'
  }

  const type = sourceMap[normalized]
  if (!type) {
    return {
      type: 'default' as const,
      label: trimmedSource.charAt(0).toUpperCase() + trimmedSource.slice(1).toLowerCase()
    }
  }

  const labelMap: Record<LeadSourceBadgeType, string> = {
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    instagram: 'Instagram',
    default: 'Origem'
  }

  return {
    type,
    label: labelMap[type]
  }
}

function getLeadActivityBadge(lead?: Lead | null) {
  if (!lead?.lastActivityAt) {
    return {
      type: 'new' as const,
      label: 'Novo'
    }
  }

  if (lead.status === 'done') {
    return null
  }

  const activityDate = new Date(lead.lastActivityAt)
  if (Number.isNaN(activityDate.getTime())) {
    return {
      type: 'new' as const,
      label: 'Novo'
    }
  }

  const diffMs = Math.max(Date.now() - activityDate.getTime(), 0)
  const oneDayMs = 24 * 60 * 60 * 1000

  if (diffMs < oneDayMs) {
    return null
  }

  const elapsedDays = Math.floor(diffMs / oneDayMs)

  return {
    type: 'time' as const,
    label: `${elapsedDays} ${elapsedDays === 1 ? 'dia' : 'dias'}`
  }
}

function toDatetimeLocalValue(input?: string | Date | null) {
  if (!input) return ''

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

// isLeadLike was used by the api.patch DnD move handler (now mocked)
// function isLeadLike(value: unknown): value is Partial<Lead> {
//   return typeof value === 'object' && value !== null
// }

// ----------------------------
// Modal de settings
// ----------------------------
function SettingsModal() {
  const [isOpen, setIsOpen] = useAtom(isSettingsModalOpenAtom)

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Configurações</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar configurações"
            title="Fechar"
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <SettingsModalBody>
          <SettingsActionButton type="button">Editar Usuario</SettingsActionButton>
          <SettingsSpacer />
          <SettingsActionButton type="button">Logout</SettingsActionButton>
        </SettingsModalBody>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal da coluna
// ----------------------------
function ColumnActionsModal({
  onRefreshBoard
}: {
  onRefreshBoard: () => Promise<void>
}) {
  const [isOpen, setIsOpen] = useAtom(isColumnModalOpenAtom)
  const [selectedColumn, setSelectedColumn] = useAtom(selectedColumnAtom)
  const [mode, setMode] = useAtom(columnModalModeAtom)
  const [error, setError] = useAtom(columnModalErrorAtom)
  const [isSaving, setIsSaving] = useAtom(isColumnModalSavingAtom)
  const [boardId] = useAtom(boardIdAtom)

  const [columnName, setColumnName] = useState('')

  const syncForm = useCallback((column: BoardColumn | null) => {
    setColumnName(column?.name ?? '')
  }, [])

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    setSelectedColumn(null)
    setMode('edit')
    setError(null)
    setIsSaving(false)
    syncForm(null)
  }, [
    isSaving,
    setError,
    setIsOpen,
    setIsSaving,
    setMode,
    setSelectedColumn,
    syncForm
  ])

  useEffect(() => {
    if (!selectedColumn) return
    syncForm(selectedColumn)
  }, [selectedColumn, syncForm])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  const handleBackToMenu = () => {
    setError(null)
    syncForm(selectedColumn)
    setMode('edit')
  }

  const handleSaveColumn = async () => {
    if (!selectedColumn || !boardId) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: UpdateColumnPayload = {
        name: columnName.trim()
      }

      // const res = await api.patch<BoardColumn>(
      //   `/boards/${boardId}/columns/${selectedColumn.id}`,
      //   payload
      // )

      setSelectedColumn((prev) =>
        prev ? { ...prev, name: payload.name ?? prev.name, leads: prev.leads } : prev
      )

      // Update local board state
      const colId = selectedColumn.id
      const newName = payload.name ?? selectedColumn.name
      MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.map((c) =>
        c.id === colId ? { ...c, name: newName } : c
      )

      await onRefreshBoard()
      setMode('edit')
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar coluna'
      setError(String(msg))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteColumn = async () => {
    if (!selectedColumn || !boardId) return

    try {
      setIsSaving(true)
      setError(null)

      // await api.delete(`/boards/${boardId}/columns/${selectedColumn.id}`)
      MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.filter(
        (c) => c.id !== selectedColumn.id
      )
      await onRefreshBoard()
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao apagar coluna'
      setError(String(msg))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !selectedColumn) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>{selectedColumn.name}</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar ações da coluna"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        {error ? <ModalError>{error}</ModalError> : null}

        {mode === 'delete' ? (
          <SettingsModalBody>
            <DeleteConfirmTitle>Apagar coluna</DeleteConfirmTitle>
            <DeleteConfirmText>Você tem certeza?</DeleteConfirmText>

            <FooterButtons>
              <DangerButton
                type="button"
                onClick={() => {
                  void handleDeleteColumn()
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Apagando...' : 'Sim'}
              </DangerButton>

              <NeutralButton
                type="button"
                onClick={handleBackToMenu}
                disabled={isSaving}
              >
                Não
              </NeutralButton>
            </FooterButtons>
          </SettingsModalBody>
        ) : null}

        {mode === 'edit' ? (
          <>
            <SectionTitle>Editar coluna</SectionTitle>

            <InfoList>
              <InfoRow>
                <InfoLabel>Nome</InfoLabel>
                <InfoInput
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Nome da coluna"
                />
              </InfoRow>
            </InfoList>

            <ModalFooter>
              <FooterButtons>
                <DangerButton
                  type="button"
                  onClick={handleBackToMenu}
                  disabled={isSaving}
                >
                  Cancelar
                </DangerButton>

                <SuccessButton
                  type="button"
                  onClick={() => {
                    void handleSaveColumn()
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </SuccessButton>
              </FooterButtons>
            </ModalFooter>
          </>
        ) : null}
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal criar coluna
// ----------------------------
function CreateColumnModal({
  onRefreshBoard
}: {
  onRefreshBoard: () => Promise<void>
}) {
  const [isOpen, setIsOpen] = useAtom(isCreateColumnModalOpenAtom)
  const [error, setError] = useAtom(createColumnErrorAtom)
  const [isSaving, setIsSaving] = useAtom(isCreateColumnSavingAtom)
  const [boardId] = useAtom(boardIdAtom)

  const [columnName, setColumnName] = useState('')

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    setError(null)
    setIsSaving(false)
    setColumnName('')
  }, [isSaving, setError, setIsOpen, setIsSaving])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  const handleSave = async () => {
    if (!boardId) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: CreateColumnPayload = {
        name: columnName.trim()
      }

      // await api.post(`/boards/${boardId}/columns`, payload)
      const newCol: BoardColumn = {
        id: `col-mock-${Date.now()}`,
        name: payload.name,
        boardId: boardId,
        position: MOCK_BOARD_STATE.columns.length,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onEnter: null,
        leads: []
      }
      MOCK_BOARD_STATE.columns = [...MOCK_BOARD_STATE.columns, newCol]
      await onRefreshBoard()
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar coluna'
      setError(String(msg))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Criar coluna</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar criação de coluna"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        {error ? <ModalError>{error}</ModalError> : null}

        <CreateFormCard>
          <InfoInput
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Nome da coluna"
          />
        </CreateFormCard>

        <ModalFooter>
          <FooterButtons>
            <NeutralButton type="button" onClick={closeModal} disabled={isSaving}>
              Fechar
            </NeutralButton>

            <SuccessButton
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </SuccessButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modal criar lead
// ----------------------------
function CreateLeadModal({
  columns,
  onRefreshBoard,
  initialColumnId,
  onClose
}: {
  columns: BoardColumn[]
  onRefreshBoard: () => Promise<void>
  initialColumnId?: string
  onClose?: () => void
}) {
  const [isOpen, setIsOpen] = useAtom(isCreateLeadModalOpenAtom)
  const [error, setError] = useAtom(createLeadErrorAtom)
  const [isSaving, setIsSaving] = useAtom(isCreateLeadSavingAtom)
  const [boardId] = useAtom(boardIdAtom)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [columnId, setColumnId] = useState('')

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    setError(null)
    setIsSaving(false)
    setName('')
    setPhone('')
    setEmail('')
    setSource('')
    setColumnId('')
    onClose?.()
  }, [isSaving, setError, setIsOpen, setIsSaving, onClose])

  useEffect(() => {
    if (!isOpen) return
    const defaultColumnId = initialColumnId || columns[0]?.id || ''
    setColumnId((prev) => prev || defaultColumnId)
  }, [isOpen, columns, initialColumnId])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  const handleSave = async () => {
    if (!boardId) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: CreateLeadPayload = {
        boardId,
        columnId: normalizeOptionalString(columnId),
        name: name.trim(),
        phone: phone.trim(),
        email: normalizeOptionalString(email),
        source: normalizeOptionalString(source),
        fields: {}
      }

      // await api.post('/leads', payload)
      const targetColId = payload.columnId ?? MOCK_BOARD_STATE.columns[0]?.id ?? ''
      const newLead: Lead = {
        id: `lead-mock-${Date.now()}`,
        boardId: payload.boardId,
        columnId: targetColId,
        position: (MOCK_BOARD_STATE.columns.find((c) => c.id === targetColId)?.leads.length ?? 0),
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        source: payload.source,
        notes: '',
        isFavorite: false,
        isArchived: false,
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        movedAt: new Date().toISOString(),
        followUpSummary: { openCount: 0, nextFollowUpValue: null, nextDueAt: null, status: 'none' }
      }
      MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.map((c) =>
        c.id === targetColId ? { ...c, leads: [...c.leads, newLead] } : c
      )
      await onRefreshBoard()
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar lead'
      setError(String(msg))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Criar lead</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar criação de lead"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        {error ? <ModalError>{error}</ModalError> : null}

        <CreateFormCard>
          <CreateFieldsStack>
            <InfoInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do lead"
            />

            <InfoInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone"
            />

            <InfoInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />

            <InfoInput
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Origem"
            />

            <InfoSelect
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
            >
              {!columnId ? <option value="">Selecione a coluna</option> : null}
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </InfoSelect>
          </CreateFieldsStack>
        </CreateFormCard>

        <ModalFooter>
          <FooterButtons>
            <NeutralButton type="button" onClick={closeModal} disabled={isSaving}>
              Fechar
            </NeutralButton>

            <SuccessButton
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </SuccessButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

// ----------------------------
// Modais do lead / followup
// ----------------------------
function LeadDeleteConfirmModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <ModalOverlay
      onClick={() => {
        if (!isDeleting) onClose()
      }}
    >
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Excluir lead</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={onClose}
            aria-label="Fechar confirmação de exclusão"
            title="Fechar"
            disabled={isDeleting}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <DeleteConfirmText>
          Você tem certeza que deseja excluir este lead?
        </DeleteConfirmText>

        <ModalFooter>
          <FooterButtons>
            <DangerButton type="button" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Sim'}
            </DangerButton>

            <NeutralButton type="button" onClick={onClose} disabled={isDeleting}>
              Não
            </NeutralButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

function FollowUpDeleteConfirmModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <ModalOverlay
      onClick={() => {
        if (!isDeleting) onClose()
      }}
    >
      <SettingsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <SettingsModalTitle>Excluir follow-up</SettingsModalTitle>

          <SettingsCloseIconButton
            type="button"
            onClick={onClose}
            aria-label="Fechar confirmação de exclusão do follow-up"
            title="Fechar"
            disabled={isDeleting}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        <DeleteConfirmText>
          Você tem certeza que deseja excluir este follow-up?
        </DeleteConfirmText>

        <ModalFooter>
          <FooterButtons>
            <DangerButton type="button" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Sim'}
            </DangerButton>

            <NeutralButton type="button" onClick={onClose} disabled={isDeleting}>
              Não
            </NeutralButton>
          </FooterButtons>
        </ModalFooter>
      </SettingsModalCard>
    </ModalOverlay>
  )
}

function LeadDetailsModal({
  onRefreshBoard
}: {
  onRefreshBoard: () => Promise<void>
}) {
  const [selectedLeadId, setSelectedLeadId] = useAtom(selectedLeadIdAtom)
  const [selectedLead, setSelectedLead] = useAtom(selectedLeadAtom)
  const [boardData, setBoardData] = useAtom(boardFullAtom)
  const [openCreateFollowupOnLeadOpen, setOpenCreateFollowupOnLeadOpen] = useAtom(
    openCreateFollowupOnLeadOpenAtom
  )
  const [isLoading, setLoading] = useAtom(isLeadModalLoadingAtom)
  const [error, setError] = useAtom(leadModalErrorAtom)

  const [viewMode, setViewMode] = useState<LeadModalViewMode>('details')
  const [isEditModeActive, setIsEditModeActive] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
  const [isColumnChanging, setIsColumnChanging] = useState(false)
  const [isMoveColumnMenuOpen, setIsMoveColumnMenuOpen] = useState(false)
  const [isFollowupFiltersOpen, setIsFollowupFiltersOpen] = useState(false)
  const [selectedFollowupFilters, setSelectedFollowupFilters] = useState<FollowupFilterKey[]>([])
  const [editingHeaderField, setEditingHeaderField] = useState<'name' | 'source' | null>(null)
  const [isHeaderFieldSaving, setIsHeaderFieldSaving] = useState(false)
  const [isContactEditMode, setIsContactEditMode] = useState(false)
  const [isContactSaving, setIsContactSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSource, setContactSource] = useState('')

  const [notes, setNotes] = useState('')
  const [isNotesDirty, setIsNotesDirty] = useState(false)
  const [isNotesSaving, setIsNotesSaving] = useState(false)
  const [notesCountdown, setNotesCountdown] = useState(5)

  const [followups, setFollowups] = useState<LeadFollowUp[]>([])
  const [isFollowupsLoading, setIsFollowupsLoading] = useState(false)
  const [isCreateFollowupOpen, setIsCreateFollowupOpen] = useState(false)
  const [newFollowupValue, setNewFollowupValue] = useState('')
  const [newFollowupDate, setNewFollowupDate] = useState('')

  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null)
  const [editingFollowupValue, setEditingFollowupValue] = useState('')
  const [editingFollowupDate, setEditingFollowupDate] = useState('')

  const [followupToDeleteId, setFollowupToDeleteId] = useState<string | null>(null)
  const [isDeletingFollowup, setIsDeletingFollowup] = useState(false)

  const skipNextNotesAutosaveRef = useRef(true)
  const createFollowupInputRef = useRef<HTMLInputElement | null>(null)
  const moveColumnMenuRef = useRef<HTMLDivElement | null>(null)
  const followupFiltersRef = useRef<HTMLDivElement | null>(null)

  const syncFormWithLead = useCallback((lead: Lead | null) => {
    setName(lead?.name ?? '')
    setPhone(lead?.phone ?? '')
    setEmail(lead?.email ?? '')
    setSource(lead?.source ?? '')
    setContactPhone(lead?.phone ?? '')
    setContactEmail(lead?.email ?? '')
    setContactSource(lead?.source ?? '')
    setNotes(getLeadNotes(lead))
    setIsNotesDirty(false)
    skipNextNotesAutosaveRef.current = true
  }, [])

  const resetFollowupForms = useCallback(() => {
    setIsCreateFollowupOpen(false)
    setNewFollowupValue('')
    setNewFollowupDate('')
    setEditingFollowupId(null)
    setEditingFollowupValue('')
    setEditingFollowupDate('')
    setFollowupToDeleteId(null)
    setIsDeletingFollowup(false)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedLeadId(null)
    setSelectedLead(null)
    setOpenCreateFollowupOnLeadOpen(false)
    setError(null)
    setLoading(false)
    setViewMode('details')
    setIsEditModeActive(false)
    setIsSaving(false)
    setIsNotesSaving(false)
    setIsHeaderFieldSaving(false)
    setIsContactSaving(false)
    setEditingHeaderField(null)
    setIsContactEditMode(false)
    setIsDeleteConfirmOpen(false)
    setIsDeleting(false)
    setIsMoveColumnMenuOpen(false)
    setIsFollowupFiltersOpen(false)
    setSelectedFollowupFilters([])
    setFollowups([])
    setIsFollowupsLoading(false)
    resetFollowupForms()
    syncFormWithLead(null)
  }, [
    setSelectedLeadId,
    setSelectedLead,
    setOpenCreateFollowupOnLeadOpen,
    setError,
    setLoading,
    syncFormWithLead,
    resetFollowupForms
  ])

  const fetchLead = useCallback(async () => {
    if (!selectedLeadId) return

    try {
      setLoading(true)
      setError(null)
      setIsFollowupsLoading(true)

      // const [leadRes, followRes] = await Promise.all([
      //   api.get<Lead>(`/leads/${selectedLeadId}`),
      //   api.get<LeadFollowUp[]>(`/leads/${selectedLeadId}/followups`)
      // ])

      const allLeadsMock = MOCK_BOARD_STATE.columns.flatMap((c) => c.leads)
      const mockLead = allLeadsMock.find((l) => l.id === selectedLeadId) ?? null
      const mockFollowupsData = (MOCK_FOLLOWUPS_STORE[selectedLeadId] ?? []).map((f) => ({ ...f }))

      setSelectedLead(mockLead)
      syncFormWithLead(mockLead)
      setFollowups([...mockFollowupsData].sort(sortFollowups))
      resetFollowupForms()

      if (openCreateFollowupOnLeadOpen) {
        setViewMode('followups')
        setIsCreateFollowupOpen(true)
      } else {
        setViewMode('details')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao carregar lead'
      setError(String(msg))
    } finally {
      setLoading(false)
      setIsFollowupsLoading(false)
    }
  }, [
    selectedLeadId,
    setSelectedLead,
    setLoading,
    setError,
    syncFormWithLead,
    resetFollowupForms,
    openCreateFollowupOnLeadOpen
  ])

  useEffect(() => {
    if (selectedLeadId) {
      void fetchLead()
    }
  }, [selectedLeadId, fetchLead])

  useEffect(() => {
    if (!selectedLeadId) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isSaving || isNotesSaving || isDeleting || isDeletingFollowup) return

      if (followupToDeleteId) {
        setFollowupToDeleteId(null)
        return
      }

      if (isDeleteConfirmOpen) {
        setIsDeleteConfirmOpen(false)
        return
      }

      if (isMoveColumnMenuOpen) {
        setIsMoveColumnMenuOpen(false)
        return
      }

      if (isFollowupFiltersOpen) {
        setIsFollowupFiltersOpen(false)
        return
      }

      closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    selectedLeadId,
    closeModal,
    isSaving,
    isNotesSaving,
    isDeleting,
    isDeleteConfirmOpen,
    followupToDeleteId,
    isDeletingFollowup,
    isMoveColumnMenuOpen,
    isFollowupFiltersOpen
  ])

  useEffect(() => {
    if (!isMoveColumnMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!moveColumnMenuRef.current?.contains(target)) {
        setIsMoveColumnMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMoveColumnMenuOpen])

  useEffect(() => {
    if (!isFollowupFiltersOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!followupFiltersRef.current?.contains(target)) {
        setIsFollowupFiltersOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFollowupFiltersOpen])

  useEffect(() => {
    if (!isCreateFollowupOpen) return
    if (viewMode !== 'followups') return
    if (isLoading || isFollowupsLoading) return

    const frame = window.requestAnimationFrame(() => {
      createFollowupInputRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [isCreateFollowupOpen, viewMode, isLoading, isFollowupsLoading])

  const handleStartEdit = () => {
    syncFormWithLead(selectedLead)
    setError(null)
    setIsDeleteConfirmOpen(false)
    setViewMode('details')
    setIsEditModeActive(false)
  }

  const handleBackToNotes = () => {
    setError(null)
    syncFormWithLead(selectedLead)
    setIsDeleteConfirmOpen(false)
    setViewMode('notes')
  }

  const handleBackToFollowups = () => {
    setError(null)
    setIsDeleteConfirmOpen(false)
    setViewMode('followups')
  }

  const handleCancelEdit = () => {
    syncFormWithLead(selectedLead)
    setError(null)
    setIsEditModeActive(false)
  }

  const applyLeadUpdate = useCallback(
    (updated: Lead) => {
      setSelectedLead(updated)
      setName(updated.name ?? '')
      setPhone(updated.phone ?? '')
      setEmail(updated.email ?? '')
      setSource(updated.source ?? '')
      setContactPhone(updated.phone ?? '')
      setContactEmail(updated.email ?? '')
      setContactSource(updated.source ?? '')
    },
    [setSelectedLead]
  )

  const saveHeaderField = useCallback(
    async (field: 'name' | 'source') => {
      if (!selectedLead) {
        setEditingHeaderField(null)
        return
      }

      const nextName = name.trim()
      const nextSource = normalizeOptionalString(contactSource)
      const currentName = selectedLead.name ?? ''
      const currentSource = selectedLead.source ?? undefined

      const changed =
        field === 'name'
          ? nextName !== currentName
          : (nextSource ?? undefined) !== currentSource

      if (!changed) {
        setEditingHeaderField(null)
        return
      }

      try {
        setIsHeaderFieldSaving(true)
        setError(null)

        const payload: UpdateLeadPayload =
          field === 'name' ? { name: nextName } : { source: nextSource }

        // const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
        const mockUpdatedLead: Lead = { ...selectedLead, ...payload }
        _mockPatchLead(selectedLead.id, payload)
        applyLeadUpdate(mockUpdatedLead)
        await onRefreshBoard()
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : 'Erro ao atualizar lead'
        setError(String(msg))
        setName(selectedLead.name ?? '')
        setSource(selectedLead.source ?? '')
        setContactSource(selectedLead.source ?? '')
      } finally {
        setIsHeaderFieldSaving(false)
        setEditingHeaderField(null)
      }
    },
    [selectedLead, name, contactSource, setError, applyLeadUpdate, onRefreshBoard]
  )

  const startContactEdit = () => {
    setContactPhone(phone)
    setContactEmail(email)
    setContactSource(source)
    setIsContactEditMode(true)
  }

  const cancelContactEdit = () => {
    setContactPhone(phone)
    setContactEmail(email)
    setContactSource(source)
    setIsContactEditMode(false)
  }

  const saveContactEdit = useCallback(async () => {
    if (!selectedLead) return

    try {
      setIsContactSaving(true)
      setError(null)

      const payload: UpdateLeadPayload = {
        phone: contactPhone.trim(),
        email: normalizeOptionalString(contactEmail),
        source: normalizeOptionalString(contactSource)
      }

      // const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
      const mockUpdatedContact: Lead = { ...selectedLead, ...payload }
      _mockPatchLead(selectedLead.id, payload)
      applyLeadUpdate(mockUpdatedContact)
      await onRefreshBoard()
      setIsContactEditMode(false)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar contato'
      setError(String(msg))
    } finally {
      setIsContactSaving(false)
    }
  }, [selectedLead, contactPhone, contactEmail, contactSource, setError, applyLeadUpdate, onRefreshBoard])

  const updateFavoriteLocally = useCallback(
    (nextValue: boolean) => {
      setSelectedLead((prev) => (prev ? { ...prev, isFavorite: nextValue } : prev))

      setBoardData((current) => {
        if (!current) return current

        return {
          ...current,
          columns: current.columns.map((column) => ({
            ...column,
            leads: column.leads.map((item) =>
              item.id === selectedLeadId ? { ...item, isFavorite: nextValue } : item
            )
          }))
        }
      })
    },
    [selectedLeadId, setBoardData, setSelectedLead]
  )

  const toggleFavoriteFromModal = useCallback(async () => {
    if (!selectedLead || isFavoriteUpdating) return

    const previousValue = Boolean(selectedLead.isFavorite)
    const nextValue = !previousValue

    setIsFavoriteUpdating(true)
    updateFavoriteLocally(nextValue)

    try {
      // await api.patch(`/leads/${selectedLead.id}/favorite`, { isFavorite: nextValue })
      _mockPatchLead(selectedLead.id, { isFavorite: nextValue })
    } catch {
      updateFavoriteLocally(previousValue)
    } finally {
      setIsFavoriteUpdating(false)
    }
  }, [selectedLead, isFavoriteUpdating, updateFavoriteLocally])

  const moveLeadFromModal = useCallback(
    async (nextColumnId: string) => {
      if (!selectedLead || !boardData) return
      if (!nextColumnId || nextColumnId === selectedLead.columnId) return

      try {
        setIsColumnChanging(true)
        setError(null)

        const targetColumn = boardData.columns.find((column) => column.id === nextColumnId)
        // const toPosition = targetColumn?.leads.length ?? 0 // used only in api call (mocked)
        void targetColumn // referenced for future use
        // Mock: local state update is sufficient (setSelectedLead already called below)

        setSelectedLead((prev) =>
          prev
            ? {
                ...prev,
                columnId: nextColumnId,
                movedAt: new Date().toISOString()
              }
            : prev
        )

        await onRefreshBoard()
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ?? e?.message ?? 'Erro ao mover lead de coluna'
        setError(String(msg))
      } finally {
        setIsColumnChanging(false)
      }
    },
    [selectedLead, boardData, setError, setSelectedLead, onRefreshBoard]
  )

  const handleSave = async () => {
    if (!selectedLead) return

    try {
      setIsSaving(true)
      setError(null)

      const payload: UpdateLeadPayload = {
        name: name.trim(),
        phone: phone.trim(),
        email: normalizeOptionalString(email),
        source: normalizeOptionalString(source),
        notes
      }

      // const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
      const mockSavedLead: Lead = { ...selectedLead, ...payload }
      _mockPatchLead(selectedLead.id, payload)
      setSelectedLead(mockSavedLead)
      syncFormWithLead(mockSavedLead)
      await onRefreshBoard()
      setIsEditModeActive(false)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar lead'
      setError(String(msg))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLead = async () => {
    if (!selectedLead) return

    try {
      setIsDeleting(true)
      setError(null)

      // await api.delete(`/leads/${selectedLead.id}`)
      MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.map((c) => ({
        ...c,
        leads: c.leads.filter((l) => l.id !== selectedLead.id)
      }))
      await onRefreshBoard()
      setIsDeleteConfirmOpen(false)
      closeModal()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir lead'
      setError(String(msg))
    } finally {
      setIsDeleting(false)
    }
  }

  const createFollowup = async () => {
    if (!selectedLead || !newFollowupValue.trim() || !newFollowupDate) return

    try {
      setError(null)

      const payload = {
        leadId: selectedLead.id,
        value: newFollowupValue.trim(),
        dueAt: newFollowupDate
      }

      // const res = await api.post<LeadFollowUp>('/lead-followups', payload)
      const mockNewFollowup: LeadFollowUp = {
        id: `fu-mock-${Date.now()}`,
        leadId: payload.leadId,
        value: payload.value,
        dueAt: payload.dueAt,
        status: 'pending',
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      MOCK_FOLLOWUPS_STORE[payload.leadId] = [
        ...(MOCK_FOLLOWUPS_STORE[payload.leadId] ?? []),
        mockNewFollowup
      ]

      setFollowups((prev) =>
        [...prev, mockNewFollowup].sort(sortFollowups)
      )

      setIsCreateFollowupOpen(false)
      setNewFollowupValue('')
      setNewFollowupDate('')
      await onRefreshBoard()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar follow-up'
      setError(String(msg))
    }
  }

  const startInlineEditFollowup = (followup: LeadFollowUp) => {
    setEditingFollowupId(followup.id)
    setEditingFollowupValue(followup.value)
    setEditingFollowupDate(toDatetimeLocalValue(followup.dueAt))
  }

  const cancelInlineEditFollowup = () => {
    setEditingFollowupId(null)
    setEditingFollowupValue('')
    setEditingFollowupDate('')
  }

  const updateInlineFollowup = async (id: string) => {
    if (!editingFollowupValue.trim() || !editingFollowupDate) return

    try {
      setError(null)

      const payload = {
        value: editingFollowupValue.trim(),
        dueAt: editingFollowupDate
      }

      // const res = await api.patch<LeadFollowUp>(`/lead-followups/${id}`, payload)
      const existing = MOCK_FOLLOWUPS_STORE[selectedLead?.id ?? '']?.find((f) => f.id === id)
      const mockUpdatedFollowup: LeadFollowUp = existing
        ? { ...existing, ...payload, updatedAt: new Date().toISOString() }
        : { id, leadId: selectedLead?.id ?? '', value: payload.value, dueAt: payload.dueAt, status: 'pending', completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      if (selectedLead?.id) {
        MOCK_FOLLOWUPS_STORE[selectedLead.id] = (MOCK_FOLLOWUPS_STORE[selectedLead.id] ?? []).map((f) =>
          f.id === id ? mockUpdatedFollowup : f
        )
      }

      setFollowups((prev) =>
        prev
          .map((f) => (f.id === id ? mockUpdatedFollowup : f))
          .sort(sortFollowups)
      )

      cancelInlineEditFollowup()
      await onRefreshBoard()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar follow-up'
      setError(String(msg))
    }
  }

  const openDeleteFollowupConfirm = (id: string) => {
    setFollowupToDeleteId(id)
  }

  const deleteFollowup = async () => {
    if (!followupToDeleteId) return

    try {
      setError(null)
      setIsDeletingFollowup(true)

      // await api.delete(`/lead-followups/${followupToDeleteId}`)
      if (selectedLead?.id) {
        MOCK_FOLLOWUPS_STORE[selectedLead.id] = (MOCK_FOLLOWUPS_STORE[selectedLead.id] ?? []).filter(
          (f) => f.id !== followupToDeleteId
        )
      }

      setFollowups((prev) => prev.filter((f) => f.id !== followupToDeleteId))

      if (editingFollowupId === followupToDeleteId) {
        cancelInlineEditFollowup()
      }

      setFollowupToDeleteId(null)
      await onRefreshBoard()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Erro ao excluir follow-up'
      setError(String(msg))
    } finally {
      setIsDeletingFollowup(false)
    }
  }

  const completeFollowup = async (id: string) => {
    try {
      setError(null)

      // const res = await api.patch<LeadFollowUp>(`/lead-followups/${id}`, { status: 'done' })
      const completedAt = new Date().toISOString()
      const mockCompleted = MOCK_FOLLOWUPS_STORE[selectedLead?.id ?? '']?.find((f) => f.id === id)
      const mockCompletedFollowup: LeadFollowUp = mockCompleted
        ? { ...mockCompleted, status: 'done', completedAt, updatedAt: completedAt }
        : { id, leadId: selectedLead?.id ?? '', value: '', dueAt: '', status: 'done', completedAt, createdAt: completedAt, updatedAt: completedAt }
      if (selectedLead?.id) {
        MOCK_FOLLOWUPS_STORE[selectedLead.id] = (MOCK_FOLLOWUPS_STORE[selectedLead.id] ?? []).map((f) =>
          f.id === id ? mockCompletedFollowup : f
        )
      }

      setFollowups((prev) =>
        prev
          .map((f) => (f.id === id ? mockCompletedFollowup : f))
          .sort(sortFollowups)
      )

      if (editingFollowupId === id) {
        cancelInlineEditFollowup()
      }

      await onRefreshBoard()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Erro ao atualizar status do follow-up'
      setError(String(msg))
    }
  }

  const uncompleteFollowup = async (id: string) => {
    try {
      setError(null)

      // const res = await api.patch<LeadFollowUp>(`/lead-followups/${id}`, { status: 'pending' })
      const mockUncompletedBase = MOCK_FOLLOWUPS_STORE[selectedLead?.id ?? '']?.find((f) => f.id === id)
      const mockUncompletedFollowup: LeadFollowUp = mockUncompletedBase
        ? { ...mockUncompletedBase, status: 'pending', completedAt: null, updatedAt: new Date().toISOString() }
        : { id, leadId: selectedLead?.id ?? '', value: '', dueAt: '', status: 'pending', completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      if (selectedLead?.id) {
        MOCK_FOLLOWUPS_STORE[selectedLead.id] = (MOCK_FOLLOWUPS_STORE[selectedLead.id] ?? []).map((f) =>
          f.id === id ? mockUncompletedFollowup : f
        )
      }

      setFollowups((prev) =>
        prev
          .map((f) => (f.id === id ? mockUncompletedFollowup : f))
          .sort(sortFollowups)
      )

      if (editingFollowupId === id) {
        cancelInlineEditFollowup()
      }

      await onRefreshBoard()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Erro ao atualizar status do follow-up'
      setError(String(msg))
    }
  }

  useEffect(() => {
    if (!selectedLead || !selectedLeadId || isDeleteConfirmOpen) return

    if (skipNextNotesAutosaveRef.current) {
      skipNextNotesAutosaveRef.current = false
      return
    }

    const currentNotes = getLeadNotes(selectedLead)

    if (notes === currentNotes) {
      setIsNotesDirty(false)
      return
    }

    setIsNotesDirty(true)
    setNotesCountdown(5)

    const countdownInterval = window.setInterval(() => {
      setNotesCountdown((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setIsNotesSaving(true)
          setError(null)

          const payload: UpdateLeadPayload = {
            notes
          }

          // const res = await api.patch<Lead>(`/leads/${selectedLead.id}`, payload)
          const mockSavedNotes: Lead = { ...selectedLead, ...payload }
          _mockPatchLead(selectedLead.id, payload)

          setSelectedLead(mockSavedNotes)
          setIsNotesDirty(false)
          setNotesCountdown(5)

          skipNextNotesAutosaveRef.current = true
          setNotes(getLeadNotes(mockSavedNotes))
        } catch (e: any) {
          const msg = e instanceof Error ? e.message : 'Erro ao salvar notas'
          setError(String(msg))
        } finally {
          setIsNotesSaving(false)
        }
      })()
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearInterval(countdownInterval)
    }
  }, [notes, selectedLead, selectedLeadId, isDeleteConfirmOpen, setSelectedLead, setError])

  if (!selectedLeadId) return null

  const notesBorderVariant = isNotesDirty ? 'dirty' : 'saved'
  const followupFilterOptions = [
    { key: 'overdue' as const, label: 'Atrasados' },
    { key: 'today' as const, label: 'Hoje' },
    { key: 'scheduled' as const, label: 'Agendados' },
    { key: 'done' as const, label: 'Concluídos' }
  ]
  const followupFiltersSet = new Set(selectedFollowupFilters)
  const filteredFollowups = followups.filter((f) => {
    if (followupFiltersSet.size === 0) return true
    const visualStatus = getSingleFollowUpVisualStatus(f)
    const filterKey: FollowupFilterKey =
      visualStatus === 'done' ? 'done' : visualStatus === 'none' ? 'scheduled' : visualStatus
    return followupFiltersSet.has(filterKey)
  })
  const visibleFollowups = editingFollowupId
    ? followups.filter((f) => f.id === editingFollowupId)
    : filteredFollowups
  const nextFollowup = followups[0] ?? null
  const nextFollowupStatus = nextFollowup
    ? getSingleFollowUpVisualStatus(nextFollowup)
    : undefined
  const contactSourceBadge = getLeadSourceBadge(contactSource)
  const currentColumnName = boardData?.columns.find(
    (column) => column.id === selectedLead?.columnId
  )?.name

  return (
    <>
      <ModalOverlay
        onClick={() => {
          if (
            !isSaving &&
            !isNotesSaving &&
            !isDeleting &&
            !isDeletingFollowup &&
            !followupToDeleteId
          ) {
            closeModal()
          }
        }}
      >
        <ModalCard
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <ModalHeader>
            <ModalTitleArea>
              {editingHeaderField === 'name' ? (
                <ModalHeaderEditInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    void saveHeaderField('name')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void saveHeaderField('name')
                    }

                    if (event.key === 'Escape') {
                      setName(selectedLead?.name ?? '')
                      setEditingHeaderField(null)
                    }
                  }}
                  autoFocus
                  disabled={isHeaderFieldSaving}
                  aria-label="Editar nome do lead"
                />
              ) : (
                <MoveColumnMenuWrapper ref={moveColumnMenuRef}>
                  <ModalTitleInlineRow>
                    <ModalTitleClickable
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingHeaderField('name')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setEditingHeaderField('name')
                        }
                      }}
                    >
                      {selectedLead?.name ?? 'Detalhes do lead'}
                    </ModalTitleClickable>

                    {selectedLead ? (
                      <>
                        <ModalTitleSeparator>|</ModalTitleSeparator>
                        <ModalTitleColumnName>{currentColumnName ?? 'Sem coluna'}</ModalTitleColumnName>
                        <ModalTitleColumnToggle
                          type="button"
                          onClick={() => {
                            setIsMoveColumnMenuOpen((prev) => !prev)
                          }}
                          aria-label="Abrir opções de coluna"
                          title="Mover de coluna"
                          disabled={
                            isSaving ||
                            isNotesSaving ||
                            isDeleting ||
                            isDeletingFollowup ||
                            isColumnChanging
                          }
                        >
                          <ArrowRight size={14} />
                        </ModalTitleColumnToggle>
                      </>
                    ) : null}
                  </ModalTitleInlineRow>

                  {isMoveColumnMenuOpen && selectedLead ? (
                    <MoveColumnDropdown>
                      <MoveColumnLabel>Mover para</MoveColumnLabel>
                      <MoveColumnOptions>
                        {(boardData?.columns ?? []).map((column) => (
                          <MoveColumnOptionButton
                            key={column.id}
                            type="button"
                            $active={column.id === selectedLead.columnId}
                            onClick={() => {
                              void moveLeadFromModal(column.id)
                              setIsMoveColumnMenuOpen(false)
                            }}
                            disabled={isColumnChanging}
                          >
                            {column.name}
                          </MoveColumnOptionButton>
                        ))}
                      </MoveColumnOptions>
                    </MoveColumnDropdown>
                  ) : null}
                </MoveColumnMenuWrapper>
              )}
            </ModalTitleArea>

            <ModalHeaderRightArea>
              <HeaderIconButtons>
                <SettingsCloseIconButton
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(true)
                    setError(null)
                  }}
                  aria-label="Excluir lead"
                  title="Excluir lead"
                  disabled={isSaving || isNotesSaving || isDeleting || isDeletingFollowup}
                >
                  <Trash2 size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $active={viewMode === 'notes'}
                  onClick={handleBackToNotes}
                  aria-label="Notas"
                  title="Notas"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isDeletingFollowup ||
                    viewMode === 'notes'
                  }
                >
                  <MessageSquare size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $active={viewMode === 'followups'}
                  onClick={handleBackToFollowups}
                  aria-label="Follow-ups"
                  title="Follow-ups"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isDeletingFollowup ||
                    viewMode === 'followups'
                  }
                >
                  <Calendar size={18} />
                </SettingsCloseIconButton>

                <SettingsCloseIconButton
                  type="button"
                  $active={viewMode === 'details'}
                  onClick={handleStartEdit}
                  aria-label="Editar lead"
                  title="Editar"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isDeletingFollowup ||
                    isFavoriteUpdating
                  }
                >
                  <FileText size={18} />
                </SettingsCloseIconButton>

                <ModalFavoriteIconButton
                  type="button"
                  $active={Boolean(selectedLead?.isFavorite)}
                  onClick={() => {
                    void toggleFavoriteFromModal()
                  }}
                  aria-label={
                    selectedLead?.isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'
                  }
                  title={selectedLead?.isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isDeletingFollowup ||
                    isFavoriteUpdating
                  }
                >
                  <Star size={18} strokeWidth={2.2} />
                </ModalFavoriteIconButton>

                <SettingsCloseIconButton
                  type="button"
                  onClick={closeModal}
                  aria-label="Fechar modal do lead"
                  title="Fechar"
                  disabled={
                    isSaving ||
                    isNotesSaving ||
                    isDeleting ||
                    isDeletingFollowup ||
                    isFavoriteUpdating
                  }
                >
                  <X size={18} />
                </SettingsCloseIconButton>
              </HeaderIconButtons>
            </ModalHeaderRightArea>
          </ModalHeader>

          {error ? <ModalError>{error}</ModalError> : null}

          {isLoading ? (
            <ModalLoading>Carregando lead...</ModalLoading>
          ) : selectedLead ? (
            <>
              {viewMode === 'followups' ? (
                <>
                  <CommentHeaderRow>
                    <SectionTitleNoMargin>Follow-ups</SectionTitleNoMargin>

                    <FiltersDropdownWrapper ref={followupFiltersRef}>
                      <FollowupFiltersTrigger
                        type="button"
                        onClick={() => {
                          setIsFollowupFiltersOpen((prev) => !prev)
                        }}
                        aria-label="Filtros de follow-ups"
                        title="Filtros"
                      >
                        Filtros
                        {selectedFollowupFilters.length > 0
                          ? ` (${selectedFollowupFilters.length})`
                          : ''}{' '}
                        ▾
                      </FollowupFiltersTrigger>

                      {isFollowupFiltersOpen ? (
                        <FiltersDropdownMenu>
                          {followupFilterOptions.map((option) => {
                            const isSelected = selectedFollowupFilters.includes(option.key)

                            return (
                              <FiltersDropdownOption
                                key={option.key}
                                type="button"
                                onClick={() => {
                                  setSelectedFollowupFilters((prev) =>
                                    prev.includes(option.key)
                                      ? prev.filter((key) => key !== option.key)
                                      : [...prev, option.key]
                                  )
                                }}
                              >
                                <FiltersOptionLabel>{option.label}</FiltersOptionLabel>
                                {isSelected ? <Check size={14} /> : <FiltersCheckPlaceholder />}
                              </FiltersDropdownOption>
                            )
                          })}
                        </FiltersDropdownMenu>
                      ) : null}
                    </FiltersDropdownWrapper>
                  </CommentHeaderRow>

                  <FollowUpList>
                    {isFollowupsLoading ? (
                      <ModalLoading>Carregando follow-ups...</ModalLoading>
                    ) : visibleFollowups.length === 0 ? null : (
                      visibleFollowups.map((f) =>
                      editingFollowupId === f.id ? (
                        <FollowUpListItem
                          key={f.id}
                          $status={getSingleFollowUpVisualStatus(f)}
                        >
                          <FollowUpCreateRow>
                            <FollowUpTextInput
                              value={editingFollowupValue}
                              onChange={(e) =>
                                setEditingFollowupValue(e.target.value)
                              }
                              placeholder="Ex: Ligar para cliente"
                            />

                            <FollowUpDateInput
                              type="datetime-local"
                              value={editingFollowupDate}
                              onChange={(e) =>
                                setEditingFollowupDate(e.target.value)
                              }
                            />

                            <FollowUpInlineCancelButton
                              type="button"
                              onClick={cancelInlineEditFollowup}
                              aria-label="Cancelar edição"
                              title="Cancelar edição"
                            >
                              <X size={18} />
                            </FollowUpInlineCancelButton>

                            <FollowUpInlineCreateIconButton
                              type="button"
                              onClick={() => {
                                void updateInlineFollowup(f.id)
                              }}
                              disabled={
                                !editingFollowupValue.trim() || !editingFollowupDate
                              }
                              aria-label="Salvar edição"
                              title="Salvar edição"
                            >
                              <ArrowRight size={18} />
                            </FollowUpInlineCreateIconButton>
                          </FollowUpCreateRow>
                        </FollowUpListItem>
                      ) : (
                        <FollowUpListItem
                          key={f.id}
                          $status={getSingleFollowUpVisualStatus(f)}
                        >
                          <FollowUpListItemTop>
  <FollowUpItemMainLine>
    <FollowUpItemTitle
      type="button"
      title={f.value}
      aria-label={f.value}
      data-tooltip={f.value}
    >
      {f.value}
    </FollowUpItemTitle>
    {(() => {
      const visualStatus = getSingleFollowUpVisualStatus(f)

      return (
        <>
          <FollowUpItemStatus $status={visualStatus}>
            {getFollowUpStatusLabel(visualStatus)}
          </FollowUpItemStatus>
          <FollowUpItemDate>{formatFollowUpDateTimeExact(f.dueAt)}</FollowUpItemDate>
        </>
      )
    })()}
  </FollowUpItemMainLine>

  <FollowUpItemActions>
    <FollowUpActionIconButton
      type="button"
      onClick={() => startInlineEditFollowup(f)}
      aria-label="Editar follow-up"
      title="Editar"
    >
      <Pencil size={16} />
    </FollowUpActionIconButton>

    <FollowUpActionIconButton
      type="button"
      onClick={() => openDeleteFollowupConfirm(f.id)}
      aria-label="Excluir follow-up"
      title="Excluir"
    >
      <Trash2 size={16} />
    </FollowUpActionIconButton>

    <FollowUpActionIconButton
      type="button"
      onClick={() => {
        void (f.completedAt ? uncompleteFollowup(f.id) : completeFollowup(f.id))
      }}
      aria-label={f.completedAt ? 'Desmarcar como completo' : 'Marcar como completo'}
      title={f.completedAt ? 'Desmarcar' : 'Concluir'}
    >
      {f.completedAt ? <X size={16} /> : <Check size={16} />}
    </FollowUpActionIconButton>
  </FollowUpItemActions>
</FollowUpListItemTop>
                        
                        {/* title already shown on the first line */}

                        </FollowUpListItem>
                        )
                      )
                    )}

                    <FollowUpCreateFooter>
                      {!isCreateFollowupOpen && !editingFollowupId ? (
                        <AddLeadButton
                          type="button"
                          onClick={() => {
                            setIsCreateFollowupOpen(true)
                          }}
                          aria-label="Adicionar follow-up"
                          title="Adicionar follow-up"
                        >
                          <Plus size={16} />
                          <span>Adicionar follow-up</span>
                        </AddLeadButton>
                      ) : isCreateFollowupOpen ? (
                        <FollowUpListItem $isCreateRow>
                          <FollowUpCreateHeader>
                            <InfoLabel>Novo follow-up</InfoLabel>
                          </FollowUpCreateHeader>

                          <FollowUpCreateRow>
                            <FollowUpTextInput
                              ref={createFollowupInputRef}
                              placeholder=""
                              value={newFollowupValue}
                              onChange={(e) => setNewFollowupValue(e.target.value)}
                            />

                            <FollowUpDateInput
                              type="datetime-local"
                              placeholder=""
                              value={newFollowupDate}
                              onChange={(e) => setNewFollowupDate(e.target.value)}
                            />

                            <FollowUpInlineCancelButton
                              type="button"
                              onClick={() => {
                                setIsCreateFollowupOpen(false)
                                setNewFollowupValue('')
                                setNewFollowupDate('')
                              }}
                              aria-label="Cancelar criação de follow-up"
                              title="Cancelar"
                            >
                              <X size={18} />
                            </FollowUpInlineCancelButton>

                            <FollowUpInlineCreateIconButton
                              type="button"
                              onClick={() => {
                                void createFollowup()
                              }}
                              disabled={!newFollowupValue.trim() || !newFollowupDate}
                              aria-label="Criar follow-up"
                              title="Criar follow-up"
                            >
                              <ArrowRight size={18} />
                            </FollowUpInlineCreateIconButton>
                          </FollowUpCreateRow>
                        </FollowUpListItem>
                      ) : null}
                    </FollowUpCreateFooter>
                  </FollowUpList>
                </>
              ) : null}

              {viewMode === 'notes' ? (
                <>
                  <CommentHeaderRow>
                    <SectionTitleNoMargin>Notas</SectionTitleNoMargin>

                    <CommentStatusGroup>
                      <CommentStatusDot
                        $variant={isNotesDirty ? 'dirty' : 'saved'}
                      />

                      <CommentMetaText>
                        {isNotesSaving
                          ? 'Salvando...'
                          : isNotesDirty
                            ? `Editando (${notesCountdown})`
                            : 'Salvo'}
                      </CommentMetaText>
                    </CommentStatusGroup>
                  </CommentHeaderRow>

                  <CommentBox
                    $variant={notesBorderVariant}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                    }}
                    placeholder="Escreva notas sobre este lead..."
                  />
                </>
              ) : null}

              {viewMode === 'details' ? (
                <>
                  <LeadTabSectionTitle>Dados do lead</LeadTabSectionTitle>

                  {!isEditModeActive ? (
                    <InfoList>
                      <InfoRow>
                        <LeadInfoBlockLabel>⚡ Próxima ação</LeadInfoBlockLabel>
                        {nextFollowup ? (
                          <LeadNextActionCard
                            type="button"
                            $status={nextFollowupStatus}
                            onClick={() => setViewMode('followups')}
                            aria-label="Ir para aba de follow-ups"
                            title="Abrir follow-ups"
                          >
                            {(() => {
                              const actionStatus = nextFollowupStatus ?? 'scheduled'

                              return (
                                <LeadNextActionLine>
                                  <FollowUpItemStatus $status={actionStatus}>
                                    {getFollowUpStatusLabel(actionStatus)}
                                  </FollowUpItemStatus>
                                  <LeadNextActionDate>
                                    {formatFollowUpDateTimeExact(nextFollowup.dueAt)}
                                  </LeadNextActionDate>
                                  <LeadNextActionDot />
                                  <LeadNextActionTitle>{nextFollowup.value}</LeadNextActionTitle>
                                </LeadNextActionLine>
                              )
                            })()}
                          </LeadNextActionCard>
                        ) : (
                          <AddLeadButton
                            type="button"
                            onClick={() => {
                              setViewMode('followups')
                              setIsCreateFollowupOpen(true)
                              setEditingFollowupId(null)
                              setNewFollowupValue('')
                              setNewFollowupDate('')
                            }}
                            aria-label="Adicionar follow-up"
                            title="Adicionar follow-up"
                          >
                            <Plus size={16} />
                            <span>Adicionar follow-up</span>
                          </AddLeadButton>
                        )}
                      </InfoRow>

                      <InfoRow>
                        <LeadInfoRowHeader>
                          <LeadInfoBlockLabel>ℹ️ Informações</LeadInfoBlockLabel>
                          {!isContactEditMode ? (
                            <LeadInfoActionButton
                              type="button"
                              onClick={startContactEdit}
                              aria-label="Editar contatos"
                              title="Editar contatos"
                              disabled={isContactSaving}
                            >
                              <Pencil size={14} />
                            </LeadInfoActionButton>
                          ) : (
                            <LeadInfoActions>
                              <LeadInfoActionButton
                                type="button"
                                onClick={cancelContactEdit}
                                aria-label="Cancelar edição de contatos"
                                title="Cancelar"
                                disabled={isContactSaving}
                              >
                                <X size={14} />
                              </LeadInfoActionButton>
                              <LeadInfoActionButton
                                type="button"
                                onClick={() => {
                                  void saveContactEdit()
                                }}
                                aria-label="Salvar contatos"
                                title="Salvar"
                                disabled={isContactSaving}
                              >
                                <Check size={14} />
                              </LeadInfoActionButton>
                            </LeadInfoActions>
                          )}
                        </LeadInfoRowHeader>

                        <LeadContactLine>
                          <LeadContactKey>Telefone:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadContactInlineInput
                              value={contactPhone}
                              onChange={(e) => setContactPhone(e.target.value)}
                              placeholder="Telefone"
                            />
                          ) : (
                            <LeadContactValue>{formatPhone(contactPhone) || '—'}</LeadContactValue>
                          )}
                        </LeadContactLine>

                        <LeadContactLine>
                          <LeadContactKey>Email:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadContactInlineInput
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              placeholder="Email"
                            />
                          ) : (
                            <LeadContactValue>{contactEmail || '—'}</LeadContactValue>
                          )}
                        </LeadContactLine>

                        <LeadContactLine>
                          <LeadContactKey>Origem:</LeadContactKey>
                          {isContactEditMode ? (
                            <LeadContactInlineInput
                              value={contactSource}
                              onChange={(e) => setContactSource(e.target.value)}
                              placeholder="Origem"
                            />
                          ) : (
                            <LeadContactValue>
                              {contactSourceBadge ? (
                                <LeadSourceBadge $type={contactSourceBadge.type}>
                                  {contactSourceBadge.label}
                                </LeadSourceBadge>
                              ) : (
                                contactSource || '—'
                              )}
                            </LeadContactValue>
                          )}
                        </LeadContactLine>
                      </InfoRow>
                    </InfoList>
                  ) : (
                    <InfoList>
                      <InfoRow>
                        <InfoLabel>Nome</InfoLabel>
                        <InfoInput
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nome"
                        />
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Telefone</InfoLabel>
                        <InfoInput
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Telefone"
                        />
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Email</InfoLabel>
                        <InfoInput
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                        />
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Origem</InfoLabel>
                        <InfoInput
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          placeholder="Origem"
                        />
                      </InfoRow>
                    </InfoList>
                  )}

                  {isEditModeActive ? (
                    <ModalFooter>
                      <FooterButtons>
                        <>
                          <DangerButton
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            Cancelar
                          </DangerButton>

                          <SuccessButton
                            type="button"
                            onClick={() => {
                              void handleSave()
                            }}
                            disabled={isSaving}
                          >
                            {isSaving ? 'Salvando...' : 'Salvar'}
                          </SuccessButton>
                        </>
                      </FooterButtons>
                    </ModalFooter>
                  ) : null}
                </>
              ) : null}


            </>
          ) : (
            <ModalLoading>Nenhum lead encontrado.</ModalLoading>
          )}
        </ModalCard>
      </ModalOverlay>

      <LeadDeleteConfirmModal
        isOpen={isDeleteConfirmOpen}
        isDeleting={isDeleting}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
        }}
        onConfirm={() => {
          void handleDeleteLead()
        }}
      />

      <FollowUpDeleteConfirmModal
        isOpen={Boolean(followupToDeleteId)}
        isDeleting={isDeletingFollowup}
        onClose={() => {
          if (!isDeletingFollowup) setFollowupToDeleteId(null)
        }}
        onConfirm={() => {
          void deleteFollowup()
        }}
      />
    </>
  )
}

// ----------------------------
// Modal de automatizações
// ----------------------------
type AutomationsTab = 'entry' | 'exit' | 'time'
type FollowupWhenType = 'hours' | 'days' | 'specific-date'
type EntryActionSection = 'followup' | 'lead' | 'time'
type EntryAutomationAction =
  | 'create-followup'
  | 'complete-followups'
  | 'favorite-lead'
  | 'reset-idle-time'

type EntryAutomationListItem = {
  id: string
  action: EntryAutomationAction
  followUpValue?: string
  followUpDueAt?: string
}

const ENTRY_ACTION_LABELS: Record<EntryAutomationAction, string> = {
  'create-followup': 'Criar follow-up',
  'complete-followups': 'Concluir follow-ups',
  'favorite-lead': 'Lead prioritário',
  'reset-idle-time': 'Reativar lead'
}

const ENTRY_ACTION_CATEGORY_LABELS: Record<EntryAutomationAction, string> = {
  'create-followup': 'FOLLOW_UP',
  'complete-followups': 'FOLLOW_UP',
  'favorite-lead': 'LEAD',
  'reset-idle-time': 'TEMPO'
}

function onEnterToItems(
  onEnter: BoardColumnOnEnterAutomation | null | undefined
): EntryAutomationListItem[] {
  if (!onEnter) return []
  const items: EntryAutomationListItem[] = []
  if (onEnter.createFollowUp) {
    items.push({
      id: 'entry-automation-create-followup',
      action: 'create-followup',
      followUpValue: onEnter.createFollowUp.value,
      followUpDueAt: onEnter.createFollowUp.dueAt
    })
  }
  if (onEnter.markAllFollowUpsAsDone) {
    items.push({ id: 'entry-automation-complete-followups', action: 'complete-followups' })
  }
  if (onEnter.favoriteLead) {
    items.push({ id: 'entry-automation-favorite-lead', action: 'favorite-lead' })
  }
  if (onEnter.resetLastActivityAt) {
    items.push({ id: 'entry-automation-reset-idle-time', action: 'reset-idle-time' })
  }
  return items
}

function itemsToOnEnter(
  items: EntryAutomationListItem[]
): BoardColumnOnEnterAutomation | null {
  if (items.length === 0) return null
  const result: BoardColumnOnEnterAutomation = {}
  for (const item of items) {
    switch (item.action) {
      case 'create-followup':
        result.createFollowUp = {
          value: item.followUpValue ?? '',
          dueAt: item.followUpDueAt
        }
        break
      case 'complete-followups':
        result.markAllFollowUpsAsDone = true
        break
      case 'favorite-lead':
        result.favoriteLead = true
        break
      case 'reset-idle-time':
        result.resetLastActivityAt = true
        break
    }
  }
  return result
}

function computeFollowUpDueAt(
  whenType: FollowupWhenType,
  whenValue: string,
  specificDate: string
): string | undefined {
  if (whenType === 'hours') {
    const hours = parseFloat(whenValue)
    if (!isNaN(hours) && hours > 0) {
      return new Date(Date.now() + hours * 3600 * 1000).toISOString()
    }
    return undefined
  }
  if (whenType === 'days') {
    const days = parseFloat(whenValue)
    if (!isNaN(days) && days > 0) {
      return new Date(Date.now() + days * 86400 * 1000).toISOString()
    }
    return undefined
  }
  if (whenType === 'specific-date' && specificDate) {
    const d = new Date(specificDate)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return undefined
}

function AutomationsModal({ onRefreshBoard }: { onRefreshBoard: () => Promise<void> }) {
  const [isOpen, setIsOpen] = useAtom(isAutomationsModalOpenAtom)
  const [column, setColumn] = useAtom(automationsModalColumnAtom)
  const [initialView] = useAtom(columnSettingsInitialViewAtom)
  const [activeSettingsView, setActiveSettingsView] = useState<ColumnSettingsView>('details')
  const [activeTab, setActiveTab] = useState<AutomationsTab>('entry')
  const [isEntryActionSelectorOpen, setIsEntryActionSelectorOpen] = useState(false)
  const [entryAutomationItems, setEntryAutomationItems] = useState<EntryAutomationListItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
  const [isEditingColumnName, setIsEditingColumnName] = useState(false)
  const [selectedColumnColor, setSelectedColumnColor] = useState<ColumnColorKey>('blue')
  const [isColumnColorOpen, setIsColumnColorOpen] = useState(false)
  const [editingEntryAutomationId, setEditingEntryAutomationId] = useState<string | null>(null)
  const [isConfiguringFollowup, setIsConfiguringFollowup] = useState(false)
  const [followupTitle, setFollowupTitle] = useState('')
  const [followupWhenType, setFollowupWhenType] = useState<FollowupWhenType>('hours')
  const [followupWhenValue, setFollowupWhenValue] = useState('')
  const [followupSpecificDate, setFollowupSpecificDate] = useState('')
  const followupDateInputRef = useRef<HTMLInputElement | null>(null)
  const columnColorDropdownRef = useRef<HTMLDivElement | null>(null)
  const [openEntrySections, setOpenEntrySections] = useState<Record<EntryActionSection, boolean>>({
    followup: true,
    lead: false,
    time: false
  })

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setColumn(null)
    setActiveSettingsView('details')
    setActiveTab('entry')
    setIsEntryActionSelectorOpen(false)
    setEntryAutomationItems([])
    setColumnName('')
    setIsEditingColumnName(false)
    setSelectedColumnColor('blue')
    setIsColumnColorOpen(false)
    setEditingEntryAutomationId(null)
    setIsConfiguringFollowup(false)
    setFollowupTitle('')
    setFollowupWhenType('hours')
    setFollowupWhenValue('')
    setFollowupSpecificDate('')
    setSaveError(null)
  }, [setIsOpen, setColumn])

  // Inicializa a lista quando a modal abre com um column
  useEffect(() => {
    if (isOpen && column) {
      setActiveSettingsView(initialView)
      setEntryAutomationItems(onEnterToItems(column.onEnter))
      setColumnName(column.name)
      setIsEditingColumnName(false)
    }
  }, [isOpen, column, initialView])

  useEffect(() => {
    if (!isColumnColorOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!columnColorDropdownRef.current?.contains(target)) {
        setIsColumnColorOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isColumnColorOpen])

  const saveColumnName = useCallback(async () => {
    if (!column) return

    const nextName = columnName.trim()
    if (!nextName) {
      setColumnName(column.name)
      setIsEditingColumnName(false)
      return
    }

    if (nextName === column.name) {
      setIsEditingColumnName(false)
      return
    }

    try {
      setIsSaving(true)
      setSaveError(null)

      // const res = await api.patch<BoardColumn>(
      //   `/boards/${column.boardId}/columns/${column.id}`,
      //   { name: nextName }
      // )

      setColumn((prev) => (prev ? { ...prev, name: nextName, leads: prev.leads } : prev))
      MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.map((c) =>
        c.id === column.id ? { ...c, name: nextName } : c
      )
      setColumnName(nextName)
      await onRefreshBoard()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar nome da coluna'
      setSaveError(String(msg))
      setColumnName(column.name)
    } finally {
      setIsSaving(false)
      setIsEditingColumnName(false)
    }
  }, [column, columnName, onRefreshBoard, setColumn])

  const patchOnEnter = useCallback(
    async (nextItems: EntryAutomationListItem[]) => {
      if (!column) return
      try {
        setIsSaving(true)
        setSaveError(null)
        const onEnterPayload = itemsToOnEnter(nextItems)
      // await api.patch<BoardColumn>(
      //   `/boards/${column.boardId}/columns/${column.id}`,
      //   { onEnter: onEnterPayload }
      // )
      MOCK_BOARD_STATE.columns = MOCK_BOARD_STATE.columns.map((c) =>
        c.id === column.id ? { ...c, onEnter: onEnterPayload } : c
      )
      await onRefreshBoard()
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao salvar automação'
        setSaveError(String(msg))
      } finally {
        setIsSaving(false)
      }
    },
    [column, onRefreshBoard]
  )

  const openEntryActionSelector = useCallback(() => {
    setIsEntryActionSelectorOpen(true)
  }, [])

  const closeEntryActionSelector = useCallback(() => {
    setIsEntryActionSelectorOpen(false)
  }, [])

  const startConfiguringFollowup = useCallback(
    (automationId?: string | null) => {
      setEditingEntryAutomationId(automationId ?? null)
      // Se editando um existing, preenche o form com os dados salvos
      if (automationId) {
        const existing = entryAutomationItems.find((i) => i.id === automationId)
        if (existing?.followUpValue) setFollowupTitle(existing.followUpValue)
        if (existing?.followUpDueAt) {
          // Carrega como data específica
          const d = new Date(existing.followUpDueAt)
          if (!isNaN(d.getTime())) {
            setFollowupWhenType('specific-date')
            setFollowupSpecificDate(d.toISOString().split('T')[0])
          }
        }
      }
      setIsConfiguringFollowup(true)
    },
    [entryAutomationItems]
  )

  const backToActionChoice = useCallback(() => {
    setIsConfiguringFollowup(false)
    setEditingEntryAutomationId(null)
    setFollowupTitle('')
    setFollowupWhenType('hours')
    setFollowupWhenValue('')
    setFollowupSpecificDate('')
  }, [])

  const saveFollowupAction = useCallback(async () => {
    const dueAt = computeFollowUpDueAt(followupWhenType, followupWhenValue, followupSpecificDate)
    let nextItems: EntryAutomationListItem[]

    if (editingEntryAutomationId) {
      nextItems = entryAutomationItems.map((item) =>
        item.id === editingEntryAutomationId
          ? { ...item, followUpValue: followupTitle, followUpDueAt: dueAt }
          : item
      )
    } else {
      nextItems = [
        ...entryAutomationItems,
        {
          id: `entry-automation-${Date.now()}`,
          action: 'create-followup' as EntryAutomationAction,
          followUpValue: followupTitle,
          followUpDueAt: dueAt
        }
      ]
    }

    setEntryAutomationItems(nextItems)
    setIsEntryActionSelectorOpen(false)
    setEditingEntryAutomationId(null)
    setIsConfiguringFollowup(false)
    setFollowupTitle('')
    setFollowupWhenType('hours')
    setFollowupWhenValue('')
    setFollowupSpecificDate('')
    await patchOnEnter(nextItems)
  }, [
    editingEntryAutomationId,
    entryAutomationItems,
    followupTitle,
    followupWhenType,
    followupWhenValue,
    followupSpecificDate,
    patchOnEnter
  ])

  const removeEntryAutomation = useCallback(
    async (automationId: string) => {
      const nextItems = entryAutomationItems.filter((item) => item.id !== automationId)
      setEntryAutomationItems(nextItems)
      await patchOnEnter(nextItems)
    },
    [entryAutomationItems, patchOnEnter]
  )

  const toggleEntrySection = useCallback((section: EntryActionSection) => {
    setOpenEntrySections({
      followup: section === 'followup',
      lead: section === 'lead',
      time: section === 'time'
    })
  }, [])

  const chooseEntryAction = useCallback(
    async (action: EntryAutomationAction) => {
      if (action === 'create-followup') {
        startConfiguringFollowup()
      } else {
        if (entryAutomationItems.some((item) => item.action === action)) {
          setIsEntryActionSelectorOpen(false)
          return
        }
        const nextItems = [
          ...entryAutomationItems,
          { id: `entry-automation-${Date.now()}`, action }
        ]
        setEntryAutomationItems(nextItems)
        setIsEntryActionSelectorOpen(false)
        await patchOnEnter(nextItems)
      }
    },
    [startConfiguringFollowup, entryAutomationItems, patchOnEnter]
  )

  useEffect(() => {
    if (activeTab !== 'entry') {
      setIsEntryActionSelectorOpen(false)
    }
  }, [activeTab])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeModal])

  if (!isOpen || !column) return null

  return (
    <ModalOverlay onClick={closeModal}>
      <AutomationsModalCard
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <SettingsModalHeader>
          <ModalTitleInlineRow>
            <SettingsModalTitle>Configurações</SettingsModalTitle>
            <ModalTitleSeparator>|</ModalTitleSeparator>
            <ModalTitleColumnName>{column.name}</ModalTitleColumnName>
          </ModalTitleInlineRow>

          <SettingsCloseIconButton
            type="button"
            onClick={closeModal}
            aria-label="Fechar automatizações"
            title="Fechar"
            disabled={isSaving}
          >
            <X size={18} />
          </SettingsCloseIconButton>
        </SettingsModalHeader>

        {saveError ? <ModalError>{saveError}</ModalError> : null}

        <ColumnSettingsLayout>
          <ColumnSettingsSidebar>
            <ColumnSettingsSidebarButton
              type="button"
              $active={activeSettingsView === 'details'}
              onClick={() => setActiveSettingsView('details')}
            >
              Detalhes
            </ColumnSettingsSidebarButton>

            <ColumnSettingsSidebarButton
              type="button"
              $active={activeSettingsView === 'automations'}
              onClick={() => setActiveSettingsView('automations')}
            >
              Automatizações
            </ColumnSettingsSidebarButton>
          </ColumnSettingsSidebar>

          <ColumnSettingsMain>
            {activeSettingsView === 'details' ? (
              <>
                <ColumnDetailsLine>
                  <ColumnDetailsKey>Nome:</ColumnDetailsKey>
                  {isEditingColumnName ? (
                    <ColumnDetailsNameInput
                      value={columnName}
                      onChange={(e) => setColumnName(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void saveColumnName()
                        }

                        if (event.key === 'Escape') {
                          setColumnName(column.name)
                          setIsEditingColumnName(false)
                        }
                      }}
                      autoFocus
                      disabled={isSaving}
                      aria-label="Editar nome da coluna"
                    />
                  ) : (
                    <DetailsValueInline>
                      <LeadContactValue>{columnName || column.name}</LeadContactValue>
                      <LeadInfoActionButton
                        type="button"
                        onClick={() => {
                          setColumnName(column.name)
                          setSaveError(null)
                          setIsEditingColumnName(true)
                        }}
                        aria-label="Editar nome da coluna"
                        title="Editar nome da coluna"
                        disabled={isSaving}
                      >
                        <Pencil size={14} />
                      </LeadInfoActionButton>
                    </DetailsValueInline>
                  )}
                </ColumnDetailsLine>

                <ColumnDetailsLine>
                  <ColumnDetailsKey>Cor:</ColumnDetailsKey>
                  <ColumnColorDropdownWrapper ref={columnColorDropdownRef}>
                    <ColumnColorTrigger
                      type="button"
                      onClick={() => {
                        setIsColumnColorOpen((prev) => !prev)
                      }}
                      aria-label="Escolher cor da coluna"
                      title="Escolher cor da coluna"
                    >
                      {COLUMN_COLOR_OPTIONS.find((option) => option.key === selectedColumnColor)?.label ?? 'Azul'}
                      <span>▾</span>
                    </ColumnColorTrigger>

                    {isColumnColorOpen ? (
                      <ColumnColorDropdown>
                        <ColumnColorOptionGrid>
                          {COLUMN_COLOR_OPTIONS.map((option) => (
                            <ColumnColorOptionButton
                              key={option.key}
                              type="button"
                              $active={selectedColumnColor === option.key}
                              onClick={() => {
                                setSelectedColumnColor(option.key)
                                setIsColumnColorOpen(false)
                              }}
                            >
                              <FiltersOptionLabel>{option.label}</FiltersOptionLabel>
                              {selectedColumnColor === option.key ? (
                                <Check size={14} />
                              ) : (
                                <FiltersCheckPlaceholder />
                              )}
                            </ColumnColorOptionButton>
                          ))}
                        </ColumnColorOptionGrid>
                      </ColumnColorDropdown>
                    ) : null}
                  </ColumnColorDropdownWrapper>
                </ColumnDetailsLine>
              </>
            ) : (
              <>
                <AutomationsTabs>
                  <AutomationsTabButton
                    type="button"
                    $active={activeTab === 'entry'}
                    onClick={() => setActiveTab('entry')}
                  >
                    Entrada de lead
                  </AutomationsTabButton>

                  <AutomationsTabButton
                    type="button"
                    $active={activeTab === 'exit'}
                    onClick={() => setActiveTab('exit')}
                  >
                    Saída de lead
                  </AutomationsTabButton>

                  <AutomationsTabButton
                    type="button"
                    $active={activeTab === 'time'}
                    onClick={() => setActiveTab('time')}
                  >
                    Tempo do lead
                  </AutomationsTabButton>
                </AutomationsTabs>

                <AutomationsTabContent>
                  {activeTab === 'entry' ? (
                    <AutomationsEntryArea>
              {entryAutomationItems.length > 0 ? (
              <AutomationsEntryList>
                {entryAutomationItems.map((item) => (
                  <AutomationsEntryListItem key={item.id}>
                    <AutomationsEntryListItemTop>
                      <AutomationsEntryMainLine>
                        <InfoValue>
                          <AutomationsEntryItemCategory>
                            {ENTRY_ACTION_CATEGORY_LABELS[item.action]}
                          </AutomationsEntryItemCategory>
                          {ENTRY_ACTION_LABELS[item.action]}
                        </InfoValue>
                        {item.action === 'create-followup' && item.followUpValue ? (
                          <AutomationsEntryItemFollowUpInfo>
                            <AutomationsEntryItemSubtext>{item.followUpValue}</AutomationsEntryItemSubtext>
                            {item.followUpDueAt ? (
                              <AutomationsEntryItemDueAt style={{ display: 'block', marginTop: 2 }}>
                                {new Date(item.followUpDueAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </AutomationsEntryItemDueAt>
                            ) : null}
                          </AutomationsEntryItemFollowUpInfo>
                        ) : null}
                      </AutomationsEntryMainLine>

                      <FollowUpItemActions>
                        {item.action === 'create-followup' ? (
                          <FollowUpActionIconButton
                            type="button"
                            onClick={() => {
                              setIsEntryActionSelectorOpen(true)
                              startConfiguringFollowup(item.id)
                            }}
                            aria-label="Editar ação de criar follow-up"
                            title="Editar"
                            disabled={isSaving}
                          >
                            <Pencil size={16} />
                          </FollowUpActionIconButton>
                        ) : null}

                        <FollowUpActionIconButton
                          type="button"
                          onClick={() => { void removeEntryAutomation(item.id) }}
                          aria-label="Excluir automação"
                          title="Excluir"
                          disabled={isSaving}
                        >
                          <Trash2 size={16} />
                        </FollowUpActionIconButton>
                      </FollowUpItemActions>
                    </AutomationsEntryListItemTop>
                  </AutomationsEntryListItem>
                ))}

                <AutomationsEntryAddButton type="button" onClick={openEntryActionSelector} disabled={isSaving}>
                  <Plus size={14} strokeWidth={2.4} />
                  Nova ação
                </AutomationsEntryAddButton>
              </AutomationsEntryList>
              ) : (
              <AutomationsEmptyState>
                <AutomationsEmptyTitle>Nenhuma automação de entrada</AutomationsEmptyTitle>
                <AutomationsEmptyText>
                  Automatizações acionadas quando um lead entra nesta coluna.
                </AutomationsEmptyText>
                <AutomationsCreateButton type="button" onClick={openEntryActionSelector} disabled={isSaving}>
                  <Plus size={14} strokeWidth={2.4} />
                  Criar primeira ação
                </AutomationsCreateButton>
              </AutomationsEmptyState>
              )}

              {isEntryActionSelectorOpen ? (
                <AutomationsPickerOverlay onClick={closeEntryActionSelector}>
                  <AutomationsPickerCard
                    onClick={(event) => {
                      event.stopPropagation()
                    }}
                  >
                    {isConfiguringFollowup ? (
                      <>
                        <AutomationsPickerHeader>
                          <AutomationsPickerTitle>Criar follow-up</AutomationsPickerTitle>
                          <AutomationsPickerCloseButton
                            type="button"
                            onClick={backToActionChoice}
                            aria-label="Voltar para escolha de ações"
                            title="Voltar"
                          >
                            <ArrowLeft size={18} />
                          </AutomationsPickerCloseButton>
                        </AutomationsPickerHeader>

                        <AutomationsFormSection>
                          <AutomationsFormInput
                            type="text"
                            placeholder="Título do follow-up"
                            value={followupTitle}
                            onChange={(e) => setFollowupTitle(e.target.value)}
                          />
                        </AutomationsFormSection>

                        <AutomationsFormSection>
                          <AutomationsFormRadioGroup>
                            <AutomationsFormRadioOption>
                              <input
                                type="radio"
                                name="when"
                                value="hours"
                                checked={followupWhenType === 'hours'}
                                onChange={(e) => setFollowupWhenType(e.target.value as FollowupWhenType)}
                              />
                              <span>Em X horas</span>
                              <AutomationsFormNumberInput
                                type="number"
                                min="1"
                                value={followupWhenType === 'hours' ? followupWhenValue : ''}
                                onChange={(e) => followupWhenType === 'hours' && setFollowupWhenValue(e.target.value)}
                              />
                            </AutomationsFormRadioOption>

                            <AutomationsFormRadioOption>
                              <input
                                type="radio"
                                name="when"
                                value="days"
                                checked={followupWhenType === 'days'}
                                onChange={(e) => setFollowupWhenType(e.target.value as FollowupWhenType)}
                              />
                              <span>Em X dias</span>
                              <AutomationsFormNumberInput
                                type="number"
                                min="1"
                                value={followupWhenType === 'days' ? followupWhenValue : ''}
                                onChange={(e) => followupWhenType === 'days' && setFollowupWhenValue(e.target.value)}
                              />
                            </AutomationsFormRadioOption>

                            <AutomationsFormRadioOption>
                              <input
                                type="radio"
                                name="when"
                                value="specific-date"
                                checked={followupWhenType === 'specific-date'}
                                onChange={() => {
                                  setFollowupWhenType('specific-date')
                                  requestAnimationFrame(() => {
                                    const input = followupDateInputRef.current
                                    if (!input) return

                                    input.focus()
                                    if (typeof input.showPicker === 'function') {
                                      input.showPicker()
                                    } else {
                                      input.click()
                                    }
                                  })
                                }}
                              />
                              <span>Data específica</span>
                              {followupWhenType === 'specific-date' ? (
                                <AutomationsFormDateInput
                                  $hasValue={Boolean(followupSpecificDate)}
                                  ref={followupDateInputRef}
                                  type="date"
                                  value={followupSpecificDate}
                                  onFocus={() => setFollowupWhenType('specific-date')}
                                  onChange={(e) => setFollowupSpecificDate(e.target.value)}
                                />
                              ) : null}
                            </AutomationsFormRadioOption>
                          </AutomationsFormRadioGroup>
                        </AutomationsFormSection>

                        <AutomationsFormFooter>
                          <AutomationsFormButton
                            type="button"
                            onClick={backToActionChoice}
                            disabled={isSaving}
                          >
                            Cancelar
                          </AutomationsFormButton>
                          <AutomationsFormButton
                            type="button"
                            $primary
                            disabled={isSaving}
                            onClick={() => { void saveFollowupAction() }}
                          >
                            {isSaving ? 'Salvando...' : 'Salvar ação'}
                          </AutomationsFormButton>
                        </AutomationsFormFooter>
                      </>
                    ) : (
                      <>
                        <AutomationsPickerHeader>
                          <AutomationsPickerTitle>Adicionar nova ação</AutomationsPickerTitle>
                          <AutomationsPickerCloseButton
                            type="button"
                            onClick={closeEntryActionSelector}
                            aria-label="Fechar seletor de ações"
                            title="Fechar"
                          >
                            <X size={18} />
                          </AutomationsPickerCloseButton>
                        </AutomationsPickerHeader>

                        <AutomationsPickerSection>
                          <AutomationsPickerSectionTrigger
                            type="button"
                            onClick={() => toggleEntrySection('followup')}
                            aria-expanded={openEntrySections.followup}
                          >
                            <AutomationsPickerSectionTitle>
                              <Calendar size={14} strokeWidth={2.4} />
                              Follow-up
                            </AutomationsPickerSectionTitle>
                          </AutomationsPickerSectionTrigger>
                          <AutomationsPickerSectionContent $open={openEntrySections.followup}>
                            <AutomationsPickerSectionContentInner>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('create-followup') }}
                              >
                                Criar follow-up
                              </AutomationsPickerOption>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('complete-followups') }}
                              >
                                Concluir follow-ups
                              </AutomationsPickerOption>
                            </AutomationsPickerSectionContentInner>
                          </AutomationsPickerSectionContent>
                        </AutomationsPickerSection>

                        <AutomationsPickerSection>
                          <AutomationsPickerSectionTrigger
                            type="button"
                            onClick={() => toggleEntrySection('lead')}
                            aria-expanded={openEntrySections.lead}
                          >
                            <AutomationsPickerSectionTitle>
                              <FileText size={14} strokeWidth={2.4} />
                              Lead
                            </AutomationsPickerSectionTitle>
                          </AutomationsPickerSectionTrigger>
                          <AutomationsPickerSectionContent $open={openEntrySections.lead}>
                            <AutomationsPickerSectionContentInner>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('favorite-lead') }}
                              >
                                Lead prioritário
                              </AutomationsPickerOption>
                            </AutomationsPickerSectionContentInner>
                          </AutomationsPickerSectionContent>
                        </AutomationsPickerSection>

                        <AutomationsPickerSection>
                          <AutomationsPickerSectionTrigger
                            type="button"
                            onClick={() => toggleEntrySection('time')}
                            aria-expanded={openEntrySections.time}
                          >
                            <AutomationsPickerSectionTitle>
                              <Clock3 size={14} strokeWidth={2.4} />
                              Tempo
                            </AutomationsPickerSectionTitle>
                          </AutomationsPickerSectionTrigger>
                          <AutomationsPickerSectionContent $open={openEntrySections.time}>
                            <AutomationsPickerSectionContentInner>
                              <AutomationsPickerOption
                                type="button"
                                onClick={() => { void chooseEntryAction('reset-idle-time') }}
                              >
                                Reativar lead
                              </AutomationsPickerOption>
                            </AutomationsPickerSectionContentInner>
                          </AutomationsPickerSectionContent>
                        </AutomationsPickerSection>
                      </>
                    )}
                  </AutomationsPickerCard>
                </AutomationsPickerOverlay>
              ) : null}
                    </AutomationsEntryArea>
                  ) : activeTab === 'exit' ? (
                    <AutomationsEmptyState>
                      <AutomationsEmptyTitle>Nenhuma automação de saída</AutomationsEmptyTitle>
                      <AutomationsEmptyText>
                        Automatizações acionadas quando um lead sai desta coluna.
                      </AutomationsEmptyText>
                      <AutomationsCreateButton type="button">
                        <Plus size={14} strokeWidth={2.4} />
                        Criar primeira ação
                      </AutomationsCreateButton>
                    </AutomationsEmptyState>
                  ) : (
                    <AutomationsEmptyState>
                      <AutomationsEmptyTitle>Nenhuma automação de tempo</AutomationsEmptyTitle>
                      <AutomationsEmptyText>
                        Em breve você poderá configurar ações baseadas em tempo.
                      </AutomationsEmptyText>
                    </AutomationsEmptyState>
                  )}
                </AutomationsTabContent>
              </>
            )}
          </ColumnSettingsMain>
        </ColumnSettingsLayout>
      </AutomationsModalCard>
    </ModalOverlay>
  )
}

const COLUMN_SORT_OPTIONS: { key: ColumnSortKey; label: string }[] = [
  { key: 'newest', label: 'Mais recente' },
  { key: 'oldest', label: 'Mais antigo' },
  { key: 'next-followup', label: 'Próximo follow-up' },
  { key: 'no-followup', label: 'Sem follow-up' },
  { key: 'favorites', label: 'Favoritos' },
]

// ----------------------------
// DnD
// ----------------------------
function ColumnActionsMenu({
  column,
  onAddLead,
  onOpenSettings,
  activeSort,
  onSort
}: {
  column: BoardColumn
  onAddLead: (column: BoardColumn) => void
  onOpenSettings: (column: BoardColumn) => void
  activeSort?: ColumnSortKey
  onSort: (columnId: string, sort: ColumnSortKey) => void
}) {
  const [openedColumnMenuId, setOpenedColumnMenuId] = useAtom(openedColumnMenuIdAtom)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const isOpen = openedColumnMenuId === column.id

  useEffect(() => {
    if (!isOpen) setIsSortOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!wrapperRef.current?.contains(target)) {
        setOpenedColumnMenuId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenedColumnMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, setOpenedColumnMenuId])

  return (
    <ColumnMenuWrapper
      ref={wrapperRef}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <ColumnMoreButton
        type="button"
        aria-label={`Mais opções da coluna ${column.name}`}
        title="Mais opções"
        onClick={() => {
          setOpenedColumnMenuId((prev) => (prev === column.id ? null : column.id))
        }}
      >
        ...
      </ColumnMoreButton>

      {isOpen ? (
        <ColumnDropdown>
          <CreateDropdownButton
            type="button"
            onClick={() => {
              setOpenedColumnMenuId(null)
              onAddLead(column)
            }}
          >
            Adicionar lead
          </CreateDropdownButton>

          <ColumnSortMenuWrapper>
            <CreateDropdownButton
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
            >
              <span>Ordenar por{activeSort ? <ColumnSortActiveDot /> : null}</span>
              <ColumnSortChevron $open={isSortOpen}>›</ColumnSortChevron>
            </CreateDropdownButton>
            {isSortOpen ? (
              <ColumnSortSubmenu>
                {COLUMN_SORT_OPTIONS.map((opt) => (
                  <ColumnSortOption
                    key={opt.key}
                    type="button"
                    $active={activeSort === opt.key}
                    onClick={() => {
                      onSort(column.id, opt.key)
                      setIsSortOpen(false)
                      setOpenedColumnMenuId(null)
                    }}
                  >
                    {opt.label}
                  </ColumnSortOption>
                ))}
              </ColumnSortSubmenu>
            ) : null}
          </ColumnSortMenuWrapper>

          <CreateDropdownButton
            type="button"
            onClick={() => {
              setOpenedColumnMenuId(null)
              onOpenSettings(column)
            }}
          >
            Configurações{(() => {
              const onEnter = column.onEnter
              if (!onEnter) return null
              const count = [onEnter.createFollowUp, onEnter.markAllFollowUpsAsDone, onEnter.favoriteLead, onEnter.resetLastActivityAt].filter(Boolean).length
              return count > 0 ? <AutomationsCountBadge>{count}</AutomationsCountBadge> : null
            })()}
          </CreateDropdownButton>
        </ColumnDropdown>
      ) : null}
    </ColumnMenuWrapper>
  )
}

function SortableLeadCard({
  lead,
  isDragDisabled
}: {
  lead: Lead
  isDragDisabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, disabled: Boolean(isDragDisabled) })

  const [boardData, setBoardData] = useAtom(boardFullAtom)
  const setOpenCreateFollowupOnLeadOpen = useSetAtom(openCreateFollowupOnLeadOpenAtom)
  const setSelectedLeadId = useSetAtom(selectedLeadIdAtom)
  const [selectedLead, setSelectedLead] = useAtom(selectedLeadAtom)
  const setLeadModalError = useSetAtom(leadModalErrorAtom)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false)
  const moveMenuRef = useRef<HTMLDivElement | null>(null)

  const isFavorite = Boolean(lead.isFavorite)
  const sourceBadge = getLeadSourceBadge(lead.source)
  const activityBadge = getLeadActivityBadge(lead)

  const followUpStatus = getLeadFollowUpStatus(lead)
  const followUpCountLabel = getLeadFollowUpCountLabel(lead)
  const followUpLine = getLeadFollowUpLine(lead)
  const hideFollowUpCount = followUpStatus === 'none'

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  const updateLeadLocally = useCallback(
    (patch: Partial<Lead>) => {
      setBoardData((current) => {
        if (!current) return current

        return {
          ...current,
          columns: current.columns.map((column) => ({
            ...column,
            leads: column.leads.map((item) =>
              item.id === lead.id ? { ...item, ...patch } : item
            )
          }))
        }
      })

      if (selectedLead?.id === lead.id) {
        setSelectedLead((prev) => (prev ? { ...prev, ...patch } : prev))
      }
    },
    [lead.id, selectedLead?.id, setBoardData, setSelectedLead]
  )

  const toggleFavorite = useCallback(async () => {
    if (isFavoriteUpdating) return

    const previousValue = isFavorite
    const nextValue = !previousValue

    setIsFavoriteUpdating(true)
    updateLeadLocally({ isFavorite: nextValue })

    try {
      // await api.patch(`/leads/${lead.id}/favorite`, { isFavorite: nextValue })
      _mockPatchLead(lead.id, { isFavorite: nextValue })
    } catch {
      updateLeadLocally({ isFavorite: previousValue })
    } finally {
      setIsFavoriteUpdating(false)
    }
  }, [isFavorite, isFavoriteUpdating, lead.id, updateLeadLocally])

  const moveLeadFromCard = useCallback(
    (nextColumnId: string) => {
      if (!nextColumnId || nextColumnId === lead.columnId) {
        setIsMoveMenuOpen(false)
        return
      }

      const movedAt = new Date().toISOString()

      setBoardData((current) => {
        if (!current) return current

        let movedLead: Lead | null = null

        const detachedColumns = current.columns.map((column) => {
          if (column.id !== lead.columnId) return column

          const remainingLeads = column.leads.filter((item) => {
            if (item.id === lead.id) {
              movedLead = {
                ...item,
                columnId: nextColumnId,
                movedAt,
                lastActivityAt: movedAt,
                updatedAt: movedAt
              }
              return false
            }
            return true
          })

          return {
            ...column,
            leads: remainingLeads.map((item, index) => ({ ...item, position: index }))
          }
        })

        if (!movedLead) return current

        const movedLeadSnapshot: Lead = movedLead

        return {
          ...current,
          columns: detachedColumns.map((column) => {
            if (column.id !== nextColumnId) return column

            const nextLeads = [...column.leads, { ...movedLeadSnapshot, position: column.leads.length }]
            return { ...column, leads: nextLeads }
          })
        }
      })

      _mockMoveLead(lead.id, nextColumnId, boardData)
      _mockPatchLead(lead.id, {
        columnId: nextColumnId,
        movedAt,
        lastActivityAt: movedAt,
        updatedAt: movedAt
      })

      if (selectedLead?.id === lead.id) {
        setSelectedLead((prev) =>
          prev
            ? {
                ...prev,
                columnId: nextColumnId,
                movedAt,
                lastActivityAt: movedAt,
                updatedAt: movedAt
              }
            : prev
        )
      }

      setIsMoveMenuOpen(false)
    },
    [boardData, lead.columnId, lead.id, selectedLead?.id, setBoardData, setSelectedLead]
  )

  useEffect(() => {
    if (!isMoveMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!moveMenuRef.current?.contains(target)) {
        setIsMoveMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoveMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMoveMenuOpen])

  return (
    <LeadCard
      ref={setNodeRef}
      style={style}
      {...(isDragDisabled ? {} : attributes)}
      {...(isDragDisabled ? {} : listeners)}
      onClick={() => {
        setOpenCreateFollowupOnLeadOpen(false)
        setSelectedLead(null)
        setLeadModalError(null)
        setSelectedLeadId(lead.id)
      }}
    >
      <LeadTopRow>
        <LeadTitle>
          <LeadTitleInfo>
            <LeadName>{lead.name}</LeadName>
            <LeadBadgesRow>
              {sourceBadge ? (
                <LeadSourceBadge $type={sourceBadge.type}>
                  {sourceBadge.label}
                </LeadSourceBadge>
              ) : null}

              {activityBadge?.type === 'new' ? (
                <LeadNewBadge>
                  <LeadNewSparkle>🔥</LeadNewSparkle>
                  {activityBadge.label}
                </LeadNewBadge>
              ) : null}

              {activityBadge?.type === 'time' ? (
                <LeadAgeBadge>
                  <Clock3 size={10} strokeWidth={2.4} />
                  {activityBadge.label}
                </LeadAgeBadge>
              ) : null}
            </LeadBadgesRow>
          </LeadTitleInfo>

          <LeadActionButtons>
            <LeadFavoriteButton
              type="button"
              aria-label={isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
              title={isFavorite ? 'Desfavoritar lead' : 'Favoritar lead'}
              $active={isFavorite}
              disabled={isFavoriteUpdating}
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
                void toggleFavorite()
              }}
            >
              <Star size={14} strokeWidth={2.2} />
            </LeadFavoriteButton>

            <LeadMoveMenuWrapper
              ref={moveMenuRef}
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <LeadMoveButton
                type="button"
                aria-label="Mover lead"
                title="Mover lead"
                onClick={() => {
                  setIsMoveMenuOpen((prev) => !prev)
                }}
              >
                <ArrowRight size={13} strokeWidth={2.2} />
              </LeadMoveButton>

              {isMoveMenuOpen ? (
                <LeadMoveDropdown>
                  <MoveColumnLabel>Mover para</MoveColumnLabel>
                  {(boardData?.columns ?? []).map((column) => {
                    const isCurrent = column.id === lead.columnId

                    return (
                      <LeadMoveOptionButton
                        key={column.id}
                        type="button"
                        $active={isCurrent}
                        onClick={() => {
                          moveLeadFromCard(column.id)
                        }}
                      >
                        {column.name}
                      </LeadMoveOptionButton>
                    )
                  })}
                </LeadMoveDropdown>
              ) : null}
            </LeadMoveMenuWrapper>
          </LeadActionButtons>
        </LeadTitle>
      </LeadTopRow>

      <LeadSectionDivider />

      <LeadFollowUpBlock>
        <LeadFollowUpContent $singleLine={hideFollowUpCount}>
          {!hideFollowUpCount ? (
            followUpCountLabel ? (
              <LeadFollowUpCount>{followUpCountLabel}</LeadFollowUpCount>
            ) : (
              <LeadFollowUpCount>Sem follow-up</LeadFollowUpCount>
            )
          ) : null}

          <LeadFollowUpNextLine $status={followUpStatus}>
            {followUpLine}
          </LeadFollowUpNextLine>
        </LeadFollowUpContent>

        <QuickFollowupButton
          $alignToNextLine={hideFollowUpCount}
          type="button"
          aria-label="Adicionar follow-up rápido"
          title="Adicionar follow-up rápido"
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
            setOpenCreateFollowupOnLeadOpen(true)
            setSelectedLead(null)
            setLeadModalError(null)
            setSelectedLeadId(lead.id)
          }}
        >
          <Plus size={14} strokeWidth={2.4} />
        </QuickFollowupButton>
      </LeadFollowUpBlock>

      {lead.fields?.lastMessage ? (
        <LeadMessage title="Última mensagem">
          {String(lead.fields.lastMessage)}
        </LeadMessage>
      ) : null}
    </LeadCard>
  )
}

function DroppableColumnBody({
  columnId,
  children
}: {
  columnId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnId}`
  })

  return (
    <ColumnBody ref={setNodeRef} $isOver={isOver}>
      {children}
    </ColumnBody>
  )
}

function DroppableColumnHeader({
  columnId,
  onClick,
  children
}: {
  columnId: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-header-${columnId}`
  })

  return (
    <ColumnHeader ref={setNodeRef} $isOver={isOver} onClick={onClick}>
      {children}
    </ColumnHeader>
  )
}

// ----------------------------
// Page
// ----------------------------
export default function BoardPage() {
  const [boardId, setBoardId] = useAtom(boardIdAtom)
  const [data, setData] = useAtom(boardFullAtom)
  const [, setLoading] = useAtom(isLoadingAtom)
  const [error, setError] = useAtom(errorAtom)

  const setBoardIdAction = useSetAtom(setBoardIdAtom)

  const setIsCreateColumnModalOpen = useSetAtom(isCreateColumnModalOpenAtom)
  const setCreateColumnError = useSetAtom(createColumnErrorAtom)
  const setIsCreateLeadModalOpen = useSetAtom(isCreateLeadModalOpenAtom)
  const setIsAutomationsModalOpen = useSetAtom(isAutomationsModalOpenAtom)
  const setAutomationsModalColumn = useSetAtom(automationsModalColumnAtom)
  const setColumnSettingsInitialView = useSetAtom(columnSettingsInitialViewAtom)

  const [createLeadColumnId, setCreateLeadColumnId] = useState<string>('')

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false)
  const [selectedLeadFilters, setSelectedLeadFilters] = useState<LeadFilterKey[]>([])
  const [columnSorts, setColumnSorts] = useState<Record<string, ColumnSortKey>>({})
  const [isBoardSelectorOpen, setIsBoardSelectorOpen] = useState(false)
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false)
  const [isMobileNavMenuOpen, setIsMobileNavMenuOpen] = useState(false)
  const [isMobileSettingsDropdownOpen, setIsMobileSettingsDropdownOpen] = useState(false)
  const [isNarrowMobile, setIsNarrowMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 450px)').matches
  })
  const [openMobileColumnMap, setOpenMobileColumnMap] = useState<Record<string, boolean>>({})
  const [selectedBoardOptionId, setSelectedBoardOptionId] = useState<string>('')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'

    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const boardSelectorRef = useRef<HTMLDivElement | null>(null)
  const filtersDropdownRef = useRef<HTMLDivElement | null>(null)
  const searchDropdownRef = useRef<HTMLDivElement | null>(null)
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null)
  const mobileNavMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileSettingsDropdownRef = useRef<HTMLDivElement | null>(null)

  const [dragSnapshot, setDragSnapshot] = useState<BoardFullResponse | null>(null)

  useEffect(() => {
    if (!boardId) {
      setBoardId('')
      setBoardIdAction('60b37bbd-7d0c-4698-99e4-d9cddaccb375')
    }
  }, [boardId, setBoardIdAction, setBoardId])

  const fetchBoardFull = useCallback(async () => {
    if (!boardId) return

    try {
      setError(null)
      setLoading(true)

      // const res = await api.get<BoardFullResponse>(`/boards/${boardId}/full`)
      setData(sortColumnsAndLeads(JSON.parse(JSON.stringify(MOCK_BOARD_STATE)) as BoardFullResponse))
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar board'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }, [boardId, setData, setError, setLoading])

  const filteredData = useMemo(() => {
    if (!data) return data

    const term = searchTerm.toLowerCase().trim()
    const hasSearch = term.length > 0
    const selectedFilters = new Set(selectedLeadFilters)
    const hasActiveFilters = selectedFilters.size > 0

    const matchesLeadFilters = (lead: Lead) => {
      if (!hasActiveFilters) return true

      const status = lead.followUpSummary?.status ?? 'none'

      return (
        (selectedFilters.has('favorite') && Boolean(lead.isFavorite)) ||
        (selectedFilters.has('none') && status === 'none') ||
        (selectedFilters.has('scheduled') && status === 'scheduled') ||
        (selectedFilters.has('today') && status === 'today') ||
        (selectedFilters.has('overdue') && status === 'overdue')
      )
    }

    const filteredColumns = data.columns
      .map((col) => ({
        ...col,
        leads: col.leads.filter((lead) =>
          (!hasSearch ||
            lead.name.toLowerCase().includes(term) ||
            (lead.email && lead.email.toLowerCase().includes(term)) ||
            lead.phone.toLowerCase().includes(term)) &&
          matchesLeadFilters(lead)
        )
      }))

    return { ...data, columns: filteredColumns }
  }, [data, searchTerm, selectedLeadFilters])

  const leadFilterOptions = useMemo(
    () => [
      { key: 'favorite' as const, label: 'Favoritos' },
      { key: 'none' as const, label: 'Sem follow-up' },
      { key: 'scheduled' as const, label: 'Agendados' },
      { key: 'today' as const, label: 'Hoje' },
      { key: 'overdue' as const, label: 'Atrasados' }
    ],
    []
  )

  const boardOptions = useMemo(() => {
    if (!data?.board) return []

    // Keeping this as an array so it is ready for multiple boards when available.
    return [
      {
        id: data.board.id,
        name: data.board.name
      }
    ]
  }, [data?.board])

  useEffect(() => {
    if (!boardOptions.length) return

    setSelectedBoardOptionId((prev) => (prev ? prev : boardOptions[0].id))
  }, [boardOptions])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(max-width: 450px)')
    const onChange = (event: MediaQueryListEvent) => {
      setIsNarrowMobile(event.matches)
    }

    setIsNarrowMobile(media.matches)
    media.addEventListener('change', onChange)

    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    if (!isNarrowMobile) return

    const columns = filteredData?.columns ?? []
    if (!columns.length) {
      setOpenMobileColumnMap({})
      return
    }

    setOpenMobileColumnMap((prev) => {
      const next: Record<string, boolean> = {}
      columns.forEach((column, index) => {
        if (typeof prev[column.id] === 'boolean') {
          next[column.id] = prev[column.id]
          return
        }
        next[column.id] = index === 0
      })
      return next
    })
  }, [filteredData, isNarrowMobile])

  useEffect(() => {
    if (!isBoardSelectorOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!boardSelectorRef.current?.contains(target)) {
        setIsBoardSelectorOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBoardSelectorOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isBoardSelectorOpen])

  useEffect(() => {
    if (!isSettingsDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!settingsDropdownRef.current?.contains(target)) {
        setIsSettingsDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSettingsDropdownOpen])

  useEffect(() => {
    if (!isFiltersDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!filtersDropdownRef.current?.contains(target)) {
        setIsFiltersDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFiltersDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isFiltersDropdownOpen])

  useEffect(() => {
    if (!isSearchOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!searchDropdownRef.current?.contains(target)) {
        setIsSearchOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (!isMobileNavMenuOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!mobileNavMenuRef.current?.contains(target)) {
        setIsMobileNavMenuOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileNavMenuOpen])

  useEffect(() => {
    if (!isMobileSettingsDropdownOpen) return

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!mobileSettingsDropdownRef.current?.contains(target)) {
        setIsMobileSettingsDropdownOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSettingsDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileSettingsDropdownOpen])

  useEffect(() => {
    void fetchBoardFull()
  }, [fetchBoardFull])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 6
      }
    })
  )

  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    return closestCenter(args)
  }, [])

  const leadIdToColumnId = useMemo(() => {
    const map = new Map<string, string>()

    if (!data) return map

    for (const col of data.columns) {
      for (const lead of col.leads ?? []) {
        map.set(lead.id, col.id)
      }
    }

    return map
  }, [data])

  const getOverColumnId = useCallback(
    (overId: string) => {
      if (overId.startsWith('column-header-')) {
        return overId.replace('column-header-', '')
      }

      if (overId.startsWith('column-')) {
        return overId.replace('column-', '')
      }

      return leadIdToColumnId.get(overId) ?? null
    },
    [leadIdToColumnId]
  )

  const moveLeadLocally = useCallback(
    (
      currentData: BoardFullResponse,
      activeId: string,
      overId: string
    ): BoardFullResponse | null => {
      const fromColumnId = currentData.columns.find((column) =>
        column.leads.some((lead) => lead.id === activeId)
      )?.id

      const toColumnId = overId.startsWith('column-header-')
        ? overId.replace('column-header-', '')
        : overId.startsWith('column-')
          ? overId.replace('column-', '')
          : currentData.columns.find((column) =>
              column.leads.some((lead) => lead.id === overId)
            )?.id

      if (!fromColumnId || !toColumnId) return null

      const next: BoardFullResponse = {
        ...currentData,
        columns: currentData.columns.map((column) => ({
          ...column,
          leads: [...column.leads]
        }))
      }

      const fromColumn = next.columns.find((column) => column.id === fromColumnId)
      const toColumn = next.columns.find((column) => column.id === toColumnId)

      if (!fromColumn || !toColumn) return null

      const activeIndex = fromColumn.leads.findIndex((lead) => lead.id === activeId)
      if (activeIndex < 0) return null

      const [movedLead] = fromColumn.leads.splice(activeIndex, 1)

      let newIndex = 0

      if (overId.startsWith('column-header-') || overId.startsWith('column-')) {
        newIndex = toColumn.leads.length
      } else {
        const overIndex = toColumn.leads.findIndex((lead) => lead.id === overId)
        if (overIndex < 0) {
          newIndex = toColumn.leads.length
        } else if (fromColumnId === toColumnId && activeIndex <= overIndex) {
          // Same-column downward drag: active was before over in the original array.
          // After splicing active out, over shifted left by 1, so insert AFTER over.
          newIndex = overIndex + 1
        } else {
          newIndex = overIndex
        }
      }

      if (fromColumnId === toColumnId) {
        const originalIndex = currentData.columns
          .find((column) => column.id === fromColumnId)
          ?.leads.findIndex((lead) => lead.id === activeId)

        if (originalIndex === newIndex) {
          return currentData
        }
      }

      toColumn.leads.splice(newIndex, 0, {
        ...movedLead,
        columnId: toColumnId
      })

      fromColumn.leads = fromColumn.leads.map((lead, index) => ({
        ...lead,
        position: index
      }))

      toColumn.leads = toColumn.leads.map((lead, index) => ({
        ...lead,
        position: index
      }))

      return next
    },
    []
  )

  const onDragStart = useCallback(() => {
    if (!data) return

    setDragSnapshot({
      ...data,
      columns: data.columns.map((column) => ({
        ...column,
        leads: [...column.leads]
      }))
    })
  }, [data])

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!data) return

      const { active, over } = event
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)

      if (activeId === overId) return

      const next = moveLeadLocally(data, activeId, overId)
      if (!next || next === data) return

      setData(next)
    },
    [data, moveLeadLocally, setData]
  )

  const onDragCancel = useCallback(() => {
    if (dragSnapshot) {
      setData(dragSnapshot)
    }

    setDragSnapshot(null)
  }, [dragSnapshot, setData])

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!data || !boardId) {
        setDragSnapshot(null)
        return
      }

      const { active, over } = event

      if (!over) {
        if (dragSnapshot) setData(dragSnapshot)
        setDragSnapshot(null)
        return
      }

      const activeId = String(active.id)
      const overId = String(over.id)

      // During sortable drops, `over` can be the same as `active`.
      // In this case the UI state may already be correctly previewed by `onDragOver`,
      // so applying another local move here can corrupt the final order.
      const finalData =
        activeId === overId ? data : moveLeadLocally(data, activeId, overId) ?? data
      setData(finalData)

      const targetColumnId = getOverColumnId(overId)
      if (!targetColumnId) {
        if (dragSnapshot) setData(dragSnapshot)
        setDragSnapshot(null)
        return
      }

      const targetColumn = finalData.columns.find(
        (column) => column.id === targetColumnId
      )

      const movedLeadIndex =
        targetColumn?.leads.findIndex((lead) => lead.id === activeId) ?? -1

      if (movedLeadIndex < 0) {
        if (dragSnapshot) setData(dragSnapshot)
        setDragSnapshot(null)
        return
      }

      try {
        // const res = await api.patch(`/leads/${activeId}/move`, { ... })

        const movedLeadPatch = {
          lastActivityAt: new Date().toISOString(),
          movedAt: new Date().toISOString()
        }

        // Sync DnD result into mock store so fetchBoardFull reflects the new order/column
        _mockMoveLead(activeId, targetColumnId, finalData)
        _mockPatchLead(activeId, movedLeadPatch)

        setData((current) => {
          if (!current) return current

          return {
            ...current,
            columns: current.columns.map((column) => ({
              ...column,
              leads: column.leads.map((lead) =>
                lead.id === activeId ? { ...lead, ...movedLeadPatch } : lead
              )
            }))
          }
        })

        const targetColumnOnEnter = finalData.columns.find(
          (column) => column.id === targetColumnId
        )?.onEnter

        const columnHasAutomations = targetColumnOnEnter && (
          targetColumnOnEnter.createFollowUp ||
          targetColumnOnEnter.favoriteLead ||
          targetColumnOnEnter.markAllFollowUpsAsDone ||
          targetColumnOnEnter.resetLastActivityAt
        )

        if (columnHasAutomations) {
          await fetchBoardFull()
        }
      } catch (e) {
        console.error('Erro ao mover lead:', e)
        if (dragSnapshot) setData(dragSnapshot)
        await fetchBoardFull()
      } finally {
        setDragSnapshot(null)
      }
    },
    [
      data,
      boardId,
      dragSnapshot,
      getOverColumnId,
      moveLeadLocally,
      setData,
      fetchBoardFull
    ]
  )

  return (
    <>
      <GlobalStyle $themeMode={themeMode} />

      <Page>
        <BottomFixedBackground />

        <BottomBrand>
          <BottomBrandDot />
          <BottomBrandText>Strativy.co</BottomBrandText>
        </BottomBrand>

        <BoardOuter>
          <BoardShell>
            <BoardHeader>
              <BoardHeaderTopRow>
                <BoardSelectorWrapper ref={boardSelectorRef}>
                  <BoardTitleButton
                    type="button"
                    onClick={() => {
                      setIsBoardSelectorOpen((prev) => !prev)
                    }}
                    aria-label="Selecionar board"
                    title="Selecionar board"
                  >
                    <BoardTitle>{data?.board?.name ?? 'Seu Board'}</BoardTitle>
                    <BoardTitleCaret>{isBoardSelectorOpen ? '▴' : '▾'}</BoardTitleCaret>
                  </BoardTitleButton>

                  {isBoardSelectorOpen ? (
                    <BoardSelectorDropdown>
                      {boardOptions.map((option) => {
                        const isSelected = option.id === selectedBoardOptionId

                        return (
                          <BoardSelectorOption
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedBoardOptionId(option.id)
                              setIsBoardSelectorOpen(false)

                              if (option.id !== boardId) {
                                setBoardIdAction(option.id)
                              }
                            }}
                            aria-label={`Selecionar board ${option.name}`}
                            title={option.name}
                          >
                            <BoardOptionCircle $selected={isSelected} />
                            <BoardOptionName>{option.name}</BoardOptionName>
                          </BoardSelectorOption>
                        )
                      })}
                    </BoardSelectorDropdown>
                  ) : null}
                </BoardSelectorWrapper>

                <BoardHeaderActions>
                  <SearchDropdownWrapper ref={searchDropdownRef}>
                    <HeaderActionButton
                      type="button"
                      onClick={() => {
                        setIsSearchOpen((prev) => !prev)
                      }}
                      aria-label="Buscar leads"
                      title="Buscar leads"
                    >
                      Buscar leads
                    </HeaderActionButton>

                    {isSearchOpen ? (
                      <SearchDropdownMenu>
                        <SearchInput
                          type="text"
                          placeholder="Nome, telefone, email"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                        />
                      </SearchDropdownMenu>
                    ) : null}
                  </SearchDropdownWrapper>

                  <FiltersDropdownWrapper ref={filtersDropdownRef}>
                    <HeaderActionButton
                      type="button"
                      onClick={() => {
                        setIsFiltersDropdownOpen((prev) => !prev)
                      }}
                      aria-label="Filtros"
                      title="Filtros"
                    >
                      Filtros
                      {selectedLeadFilters.length > 0
                        ? ` (${selectedLeadFilters.length})`
                        : ''}{' '}
                      ▾
                    </HeaderActionButton>

                    {isFiltersDropdownOpen ? (
                      <FiltersDropdownMenu>
                        {leadFilterOptions.map((option) => {
                          const isSelected = selectedLeadFilters.includes(option.key)

                          return (
                            <FiltersDropdownOption
                              key={option.key}
                              type="button"
                              onClick={() => {
                                setSelectedLeadFilters((prev) =>
                                  prev.includes(option.key)
                                    ? prev.filter((key) => key !== option.key)
                                    : [...prev, option.key]
                                )
                              }}
                            >
                              <FiltersOptionLabel>{option.label}</FiltersOptionLabel>
                              {isSelected ? <Check size={14} /> : <FiltersCheckPlaceholder />}
                            </FiltersDropdownOption>
                          )
                        })}
                      </FiltersDropdownMenu>
                    ) : null}
                  </FiltersDropdownWrapper>

                  <HeaderActionButton
                    type="button"
                    onClick={() => {
                      setCreateColumnError(null)
                      setIsCreateColumnModalOpen(true)
                    }}
                    aria-label="Nova coluna"
                    title="Nova coluna"
                  >
                    + Nova coluna
                  </HeaderActionButton>

                  <HeaderActionButton
                    type="button"
                    onClick={() => {
                      setCreateLeadColumnId('')
                      setIsCreateLeadModalOpen(true)
                    }}
                    aria-label="Novo lead"
                    title="Novo lead"
                  >
                    + Novo Lead
                  </HeaderActionButton>

                  <SettingsDropdownWrapper ref={settingsDropdownRef}>
                    <SettingsButton
                      type="button"
                      onClick={() => {
                        setIsSettingsDropdownOpen((prev) => !prev)
                      }}
                      aria-label="Abrir menu de configurações"
                      title="Configurações"
                    >
                      <Settings size={18} />
                    </SettingsButton>

                    {isSettingsDropdownOpen ? (
                      <SettingsDropdownMenu>
                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
                            setIsSettingsDropdownOpen(false)
                          }}
                        >
                          <SettingsOptionWithIcon>
                            {themeMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                            {themeMode === 'dark' ? 'Tema claro' : 'Tema escuro'}
                          </SettingsOptionWithIcon>
                        </SettingsDropdownOption>

                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setIsSettingsDropdownOpen(false)
                          }}
                        >
                          Logout
                        </SettingsDropdownOption>
                      </SettingsDropdownMenu>
                    ) : null}
                  </SettingsDropdownWrapper>
                </BoardHeaderActions>

                <BoardHeaderActionsMobile ref={mobileNavMenuRef}>
                  <MobileNavMenuButton
                    type="button"
                    onClick={() => {
                      setIsMobileSettingsDropdownOpen(false)
                      setIsMobileNavMenuOpen((prev) => !prev)
                    }}
                    aria-label="Abrir menu"
                    title="Menu"
                  >
                    <Menu size={18} />
                  </MobileNavMenuButton>

                  {isMobileNavMenuOpen ? (
                    <MobileNavMenuDropdown>
                      <MobileNavMenuSectionTitle>Buscar leads</MobileNavMenuSectionTitle>
                      <MobileNavMenuSearchInput
                        type="text"
                        placeholder="Nome, telefone, email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />

                      <MobileNavMenuDivider />

                      <MobileNavMenuSectionTitle>Filtros</MobileNavMenuSectionTitle>
                      <MobileNavFiltersList>
                        {leadFilterOptions.map((option) => {
                          const isSelected = selectedLeadFilters.includes(option.key)

                          return (
                            <FiltersDropdownOption
                              key={option.key}
                              type="button"
                              onClick={() => {
                                setSelectedLeadFilters((prev) =>
                                  prev.includes(option.key)
                                    ? prev.filter((key) => key !== option.key)
                                    : [...prev, option.key]
                                )
                              }}
                            >
                              <FiltersOptionLabel>{option.label}</FiltersOptionLabel>
                              {isSelected ? <Check size={14} /> : <FiltersCheckPlaceholder />}
                            </FiltersDropdownOption>
                          )
                        })}
                      </MobileNavFiltersList>

                      <MobileNavMenuDivider />

                      <SettingsDropdownOption
                        type="button"
                        onClick={() => {
                          setCreateColumnError(null)
                          setIsCreateColumnModalOpen(true)
                          setIsMobileNavMenuOpen(false)
                        }}
                      >
                        + Nova coluna
                      </SettingsDropdownOption>

                      <SettingsDropdownOption
                        type="button"
                        onClick={() => {
                          setCreateLeadColumnId('')
                          setIsCreateLeadModalOpen(true)
                          setIsMobileNavMenuOpen(false)
                        }}
                      >
                        + Novo lead
                      </SettingsDropdownOption>
                    </MobileNavMenuDropdown>
                  ) : null}

                  <SettingsDropdownWrapper ref={mobileSettingsDropdownRef}>
                    <SettingsButton
                      type="button"
                      onClick={() => {
                        setIsMobileNavMenuOpen(false)
                        setIsMobileSettingsDropdownOpen((prev) => !prev)
                      }}
                      aria-label="Abrir menu de configurações"
                      title="Configurações"
                    >
                      <Settings size={18} />
                    </SettingsButton>

                    {isMobileSettingsDropdownOpen ? (
                      <SettingsDropdownMenu>
                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
                            setIsMobileSettingsDropdownOpen(false)
                          }}
                        >
                          <SettingsOptionWithIcon>
                            {themeMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                            {themeMode === 'dark' ? 'Tema claro' : 'Tema escuro'}
                          </SettingsOptionWithIcon>
                        </SettingsDropdownOption>

                        <SettingsDropdownOption
                          type="button"
                          onClick={() => {
                            setIsMobileSettingsDropdownOpen(false)
                          }}
                        >
                          Logout
                        </SettingsDropdownOption>
                      </SettingsDropdownMenu>
                    ) : null}
                  </SettingsDropdownWrapper>
                </BoardHeaderActionsMobile>
              </BoardHeaderTopRow>

              {error ? <ErrorBadge>{error}</ErrorBadge> : null}
            </BoardHeader>

            <ColumnsArea>
              {!filteredData ? (
                <EmptyState>
                  <EmptyTitle>Board não carregado</EmptyTitle>
                  <EmptyText>
                    Clique em <b>Atualizar leads</b> para buscar os dados.
                  </EmptyText>
                </EmptyState>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={collisionDetectionStrategy}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  onDragCancel={onDragCancel}
                >
                  <ColumnsRow>
                    {filteredData.columns.map((col) => {
                      const isColumnOpen = !isNarrowMobile || Boolean(openMobileColumnMap[col.id])

                      return (
                      <Column key={col.id}>
                        <DroppableColumnHeader
                          columnId={col.id}
                          onClick={() => {
                            if (!isNarrowMobile) return

                            setOpenMobileColumnMap((prev) => ({
                              ...prev,
                              [col.id]: !prev[col.id]
                            }))
                          }}
                        >
                          <ColumnTitleGroup>
                            <ColumnAccordionToggle
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setOpenMobileColumnMap((prev) => ({
                                  ...prev,
                                  [col.id]: !prev[col.id]
                                }))
                              }}
                              $open={isColumnOpen}
                              aria-label={isColumnOpen
                                ? `Fechar coluna ${col.name}`
                                : `Abrir coluna ${col.name}`}
                              title={isColumnOpen ? 'Fechar coluna' : 'Abrir coluna'}
                            >
                              <ArrowRight size={14} />
                            </ColumnAccordionToggle>
                            <ColumnName>{col.name}</ColumnName>
                            <ColumnCount>({col.leads.length})</ColumnCount>
                          </ColumnTitleGroup>

                          <ColumnActionsMenu
                            column={col}
                            activeSort={columnSorts[col.id]}
                            onSort={(columnId, sort) =>
                              setColumnSorts((prev) => {
                                if (prev[columnId] === sort) {
                                  const next = { ...prev }
                                  delete next[columnId]
                                  return next
                                }
                                return { ...prev, [columnId]: sort }
                              })
                            }
                            onAddLead={(column) => {
                              setCreateLeadColumnId(column.id)
                              setIsCreateLeadModalOpen(true)
                            }}
                            onOpenSettings={(column) => {
                              setColumnSettingsInitialView('details')
                              setAutomationsModalColumn(column)
                              setIsAutomationsModalOpen(true)
                            }}
                          />
                        </DroppableColumnHeader>

                        {isColumnOpen ? (
                        <DroppableColumnBody columnId={col.id}>
                          <SortableContext
                            items={(col.leads ?? []).map((l) => l.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {((() => {
                              const sort = columnSorts[col.id]
                              if (!sort) return col.leads ?? []
                              const leads = [...(col.leads ?? [])]
                              const followUpOrder = (lead: Lead): number => {
                                const s = lead.followUpSummary?.status ?? 'none'
                                if (s === 'overdue') return 0
                                if (s === 'today') return 1
                                if (s === 'scheduled') return 2
                                return 3
                              }
                              if (sort === 'newest') {
                                leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              } else if (sort === 'oldest') {
                                leads.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                              } else if (sort === 'next-followup') {
                                leads.sort((a, b) => followUpOrder(a) - followUpOrder(b))
                              } else if (sort === 'no-followup') {
                                leads.sort((a, b) => {
                                  const aNone = (a.followUpSummary?.status ?? 'none') === 'none' ? 0 : 1
                                  const bNone = (b.followUpSummary?.status ?? 'none') === 'none' ? 0 : 1
                                  return aNone - bNone
                                })
                              } else if (sort === 'favorites') {
                                leads.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
                              }
                              return leads
                            })()).map((lead) => (
                              <SortableLeadCard
                                key={lead.id}
                                lead={lead}
                                isDragDisabled={isNarrowMobile}
                              />
                            ))}
                          </SortableContext>

                          <AddLeadButton
                            type="button"
                            onClick={() => {
                              setCreateLeadColumnId(col.id)
                              setIsCreateLeadModalOpen(true)
                            }}
                            aria-label={`Adicionar lead à coluna ${col.name}`}
                            title="Adicionar lead"
                          >
                            <Plus size={16} />
                            Adicionar lead
                          </AddLeadButton>
                        </DroppableColumnBody>
                        ) : null}
                      </Column>
                      )
                    })}

                    <AddColumnButton
                      type="button"
                      onClick={() => {
                        setCreateColumnError(null)
                        setIsCreateColumnModalOpen(true)
                      }}
                      aria-label="Adicionar coluna"
                      title="Adicionar coluna"
                    >
                      <Plus size={20} />
                      Adicionar coluna
                    </AddColumnButton>
                  </ColumnsRow>
                </DndContext>
              )}
            </ColumnsArea>
          </BoardShell>
        </BoardOuter>
      </Page>

      <LeadDetailsModal onRefreshBoard={fetchBoardFull} />
      <SettingsModal />
      <ColumnActionsModal onRefreshBoard={fetchBoardFull} />
      <CreateColumnModal onRefreshBoard={fetchBoardFull} />
      <AutomationsModal onRefreshBoard={fetchBoardFull} />
      <CreateLeadModal
        columns={data?.columns ?? []}
        onRefreshBoard={fetchBoardFull}
        initialColumnId={createLeadColumnId}
        onClose={() => setCreateLeadColumnId('')}
      />
    </>
  )
}

// ----------------------------
// Styles
// ----------------------------
const GlobalStyle = createGlobalStyle<{ $themeMode: ThemeMode }>`
  :root {
    color-scheme: ${(props) => (props.$themeMode === 'dark' ? 'dark' : 'light')};
    --app-bg: ${(props) => (props.$themeMode === 'dark' ? '#111317' : '#f5f5f5')};
    --app-surface: ${(props) => (props.$themeMode === 'dark' ? '#191c22' : '#ffffff')};
    --app-surface-soft: ${(props) => (props.$themeMode === 'dark' ? '#15181e' : '#fbfbfb')};
    --app-border: ${(props) => (props.$themeMode === 'dark' ? '#2a2f39' : '#dcdcdc')};
    --app-border-strong: ${(props) => (props.$themeMode === 'dark' ? '#3a404c' : '#2b2b2b')};
    --app-divider: ${(props) => (props.$themeMode === 'dark' ? '#262b35' : '#e6e6e6')};
    --app-text: ${(props) => (props.$themeMode === 'dark' ? '#eef0f4' : '#111111')};
    --app-text-muted: ${(props) => (props.$themeMode === 'dark' ? '#b5bbc7' : '#6b6b6b')};
    --app-hover: ${(props) => (props.$themeMode === 'dark' ? '#232833' : '#f5f5f5')};
    --status-scheduled-text: ${(props) => (props.$themeMode === 'dark' ? '#7fb5ff' : '#1d4ed8')};
    --status-today-text: ${(props) => (props.$themeMode === 'dark' ? '#ffd866' : '#d97706')};
    --status-overdue-text: ${(props) => (props.$themeMode === 'dark' ? '#ff8a80' : '#dc2626')};
    --status-done-text: ${(props) => (props.$themeMode === 'dark' ? '#66e1a3' : '#15803d')};
    --status-scheduled-border: ${(props) => (props.$themeMode === 'dark' ? '#3b82f6' : '#3b82f6')};
    --status-today-border: ${(props) => (props.$themeMode === 'dark' ? '#fbbf24' : '#facc15')};
    --status-overdue-border: ${(props) => (props.$themeMode === 'dark' ? '#ff6b63' : '#ff3b30')};
    --status-done-border: ${(props) => (props.$themeMode === 'dark' ? '#34d399' : '#22c55e')};
    --status-scheduled-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.10)')};
    --status-today-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(251, 191, 36, 0.22)' : 'rgba(250, 204, 21, 0.10)')};
    --status-overdue-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(255, 107, 99, 0.24)' : 'rgba(255, 59, 48, 0.10)')};
    --status-done-shadow: ${(props) => (props.$themeMode === 'dark' ? 'rgba(52, 211, 153, 0.22)' : 'rgba(34, 197, 94, 0.10)')};
    --status-scheduled-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.07)')};
    --status-today-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(250, 204, 21, 0.07)')};
    --status-overdue-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(255, 107, 99, 0.18)' : 'rgba(255, 59, 48, 0.08)')};
    --status-done-bg: ${(props) => (props.$themeMode === 'dark' ? 'rgba(52, 211, 153, 0.16)' : 'rgba(34, 197, 94, 0.07)')};
    --status-scheduled-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(59, 130, 246, 0.26)' : 'rgba(59, 130, 246, 0.12)')};
    --status-today-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(251, 191, 36, 0.28)' : 'rgba(250, 204, 21, 0.12)')};
    --status-overdue-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(255, 107, 99, 0.28)' : 'rgba(255, 59, 48, 0.13)')};
    --status-done-bg-hover: ${(props) => (props.$themeMode === 'dark' ? 'rgba(52, 211, 153, 0.24)' : 'rgba(34, 197, 94, 0.12)')};
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    background: var(--app-bg);
    color: var(--app-text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  }
`

const Page = styled.div`
  height: 100dvh;
  background: var(--app-bg);
  color: var(--app-text);
  padding: 0;
  overflow: hidden;
`

const SettingsButton = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`

const SettingsDropdownWrapper = styled.div`
  position: relative;
`

const SettingsDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 90;
`

const SettingsDropdownOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

const SettingsOptionWithIcon = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const BoardOuter = styled.div`
  height: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 4px 10px 52px;
  overflow: hidden;

  @media (max-width: 450px) {
    padding: 2px 6px 44px;
  }
`

const BoardShell = styled.div`
  height: 100%;
  background: var(--app-bg);
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;

  @media (max-width: 450px) {
    padding: 6px 8px 10px;
  }
`

const BoardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 6px 12px 6px;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--app-bg);
  border-bottom: 1px solid var(--app-divider);

  @media (max-width: 450px) {
    gap: 8px;
    padding: 2px 2px 8px;
  }
`

const BoardHeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: space-between;
`

const BoardSelectorWrapper = styled.div`
  position: relative;
`

const BoardTitleButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
`

const BoardHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  @media (max-width: 650px) {
    display: none;
  }
`

const BoardHeaderActionsMobile = styled.div`
  display: none;
  position: relative;
  margin-left: auto;

  @media (max-width: 650px) {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`

const MobileNavMenuButton = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid var(--app-border-strong);
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

const MobileNavMenuDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(340px, calc(100vw - 24px));
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 95;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 450px) {
    width: min(340px, calc(100vw - 24px));
  }
`

const MobileNavMenuSectionTitle = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 2px 2px 0;
`

const MobileNavMenuSearchInput = styled.input`
  width: 100%;
  height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: var(--app-bg);
  color: var(--app-text);
  padding: 0 10px;
  font-size: 13px;

  &::placeholder {
    color: var(--app-text-muted);
  }

  &:focus {
    outline: 2px solid #7dd3fc55;
    outline-offset: 0;
  }

  @media (max-width: 920px) {
    min-width: 0;
  }
`

const MobileNavMenuDivider = styled.div`
  height: 1px;
  background: var(--app-border);
  margin: 2px 0;
`

const MobileNavFiltersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const BoardTitle = styled.div`
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
  color: var(--app-text);

  @media (max-width: 450px) {
    font-size: 16px;
  }
`

const BoardTitleCaret = styled.span`
  font-size: 12px;
  color: var(--app-text-muted);
  line-height: 1;
`

const BoardSelectorDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 260px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 80;

  @media (max-width: 450px) {
    min-width: 0;
    width: min(320px, calc(100vw - 24px));
  }
`

const BoardSelectorOption = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--app-hover);
  }
`

const BoardOptionCircle = styled.span<{ $selected: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 1px solid #111111;
  background: #ffffff;
  flex: 0 0 auto;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #111111;
    transform: translate(-50%, -50%) scale(${(props) => (props.$selected ? 1 : 0)});
    transition: transform 0.12s ease;
  }
`

const BoardOptionName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
`

const FiltersDropdownWrapper = styled.div`
  position: relative;
`

const FiltersDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 90;
`

const FiltersDropdownOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: var(--app-hover);
  }
`

const FiltersOptionLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
`

const FiltersCheckPlaceholder = styled.span`
  width: 14px;
  height: 14px;
  display: inline-block;
`

const SearchDropdownWrapper = styled.div`
  position: relative;
`

const SearchDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 250px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 90;
`

const HeaderActionButton = styled.button`
  min-height: 34px;
  border: 1px solid var(--app-border-strong);
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

const BottomBrand = styled.div`
  position: fixed;
  bottom: 20px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  z-index: 50;
  pointer-events: none;

  @media (max-width: 450px) {
    left: 10px;
    bottom: 12px;
    gap: 8px;
  }
`

const BottomFixedBackground = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  background: var(--app-bg);
  z-index: 40;
  pointer-events: none;

  @media (max-width: 450px) {
    height: 40px;
  }
`

const BottomBrandDot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #ffffff;
`

const BottomBrandText = styled.span`
  color: var(--app-text);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;

  @media (max-width: 450px) {
    font-size: 16px;
  }
`
const ErrorBadge = styled.div`
  border: 1px solid #ffdddd;
  background: #fff2f2;
  color: #7a0b0b;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  max-width: 520px;
`

const ColumnsArea = styled.div`
  flex: 1;
  height: 0;
  min-height: 0;
  margin-top: 12px;
  overflow: auto;
  scrollbar-gutter: stable;

  @media (max-width: 450px) {
    margin-top: 8px;
    overflow-x: hidden;
    overflow-y: auto;
  }
`

const ColumnsRow = styled.div`
  display: flex;
  width: max-content;
  min-width: 100%;
  gap: 12px;
  align-items: flex-start;
  overflow: visible;
  padding-bottom: 10px;

  @media (max-width: 450px) {
    width: 100%;
    min-width: 100%;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 6px;
  }
`

const Column = styled.div`
  min-width: 280px;
  max-width: 280px;
  border: 1px solid var(--app-border-strong);
  border-radius: 16px;
  background: var(--app-surface);
  padding: 10px;

  @media (max-width: 450px) {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    padding: 9px;
  }
`

const ColumnHeader = styled.div<{ $isOver?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 10px 6px;
  border-radius: 12px;
  background: ${(props) => (props.$isOver ? 'var(--app-hover)' : 'transparent')};
  transition: background 0.12s ease;
`

const ColumnAccordionToggle = styled.button<{ $open: boolean }>`
  display: none;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--app-text-muted);
  padding: 0;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;

  svg {
    transform: rotate(${(props) => (props.$open ? 90 : 0)}deg);
    transition: transform 0.16s ease;
  }

  &:hover {
    color: var(--app-text);
  }

  @media (max-width: 450px) {
    display: inline-flex;
  }
`

const ColumnTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ColumnName = styled.div`
  font-weight: 900;
  letter-spacing: -0.2px;
  color: var(--app-text);
`

const ColumnCount = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: var(--app-text-muted);
  line-height: 1;
`

const ColumnMoreButton = styled.button`
  border: none;
  background: transparent;
  color: #555555;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  font-weight: 900;

  &:hover {
    color: #111111;
  }
`

const ColumnBody = styled.div<{ $isOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 14px;
  background: ${(props) => (props.$isOver ? '#f7f7f7' : 'transparent')};
  transition: background 0.15s ease;
`

const AddLeadButton = styled.button`
  width: 100%;
  border: 1px dashed var(--app-border);
  border-radius: 14px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--app-hover);
    border-color: var(--app-border);
  }
`

const AddColumnButton = styled.button`
  min-width: 280px;
  max-width: 280px;
  height: 100%;
  border: 1px dashed var(--app-border);
  border-radius: 16px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  padding: 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--app-hover);
    border-color: var(--app-border);
  }

  @media (max-width: 450px) {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    min-height: 0;
    height: auto;
    padding: 12px 10px;
    justify-content: flex-start;
    font-size: 13px;
    font-weight: 700;
  }
`

const LeadCard = styled.div`
  position: relative;
  z-index: 0;
  border: 1px solid var(--app-border-strong);
  border-radius: 16px;
  background: var(--app-surface);
  padding: 12px;
  cursor: grab;
  user-select: none;
  overflow: visible;

  &:active {
    cursor: grabbing;
  }

  &:focus-within {
    z-index: 90;
  }

  @media (max-width: 450px) {
    touch-action: pan-y;
  }
`

const LeadFollowUpBlock = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
`

const LeadFollowUpContent = styled.div<{ $singleLine?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 34px;
  justify-content: ${(props) => (props.$singleLine ? 'center' : 'flex-start')};
`

const LeadSectionDivider = styled.div`
  margin-top: 10px;
  border-top: 1px solid var(--app-divider);
`

const LeadFollowUpCount = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: var(--app-text);
`

const LeadFollowUpNextLine = styled.div<{ $status: FollowUpBoardStatus }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => {
    switch (props.$status) {
      case 'none':
        return 'var(--app-text)'
      case 'scheduled':
        return 'var(--status-scheduled-text)'
      case 'today':
        return 'var(--status-today-text)'
      case 'overdue':
        return 'var(--status-overdue-text)'
      default:
        return 'var(--app-text-muted)'
    }
  }};
`

const QuickFollowupButton = styled.button<{ $alignToNextLine?: boolean }>`
  align-self: ${(props) => (props.$alignToNextLine ? 'center' : 'flex-end')};
  border: 0;
  background: transparent;
  color: var(--app-text-muted);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: ${(props) => (props.$alignToNextLine ? 'translateY(0)' : 'translateY(-11px)')};
  margin-right: 2px;
  cursor: pointer;
  transition: color 0.16s ease;

  &:hover {
    color: var(--app-text);
  }
`

const LeadTopRow = styled.div`
  display: flex;
  align-items: center;
`

const LeadTitle = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`

const LeadTitleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const LeadBadgesRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const LeadName = styled.div`
  font-weight: 900;
  letter-spacing: -0.2px;
  line-height: 1.2;
`

const LeadSourceBadge = styled.span<{ $type: LeadSourceBadgeType }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  color: ${(props) => (props.$type === 'default' ? '#2f2f2f' : '#ffffff')};
  letter-spacing: 0.2px;
  border: ${(props) => (props.$type === 'default' ? '1px solid #d4d4d4' : 'none')};
  background: ${(props) => {
    switch (props.$type) {
      case 'whatsapp':
        return '#25d366'
      case 'facebook':
        return '#1877f2'
      case 'instagram':
        return 'linear-gradient(135deg, #f58529 0%, #dd2a7b 55%, #8134af 100%)'
      default:
        return 'linear-gradient(180deg, #f1f1f1 0%, #dddddd 100%)'
    }
  }};
  box-shadow: ${(props) => (props.$type === 'default'
    ? 'inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 2px rgba(0, 0, 0, 0.08)'
    : 'none')};
`

const LeadAgeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15px;
  color: #2f2f2f;
  border: 1px solid #d4d4d4;
  background: linear-gradient(180deg, #f1f1f1 0%, #dddddd 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    0 1px 2px rgba(0, 0, 0, 0.08);
`

const LeadNewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  margin-top: 4px;
  margin-bottom: 2px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15px;
  color: #111111;
  border: 1px solid #e3c94a;
  background: linear-gradient(180deg, #fff06a 0%, #ffd941 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.08);
`

const LeadNewSparkle = styled.span`
  display: inline-flex;
  align-items: center;
  line-height: 1;
  font-size: 11px;
`

const LeadActionButtons = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

const LeadMoveMenuWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const LeadMoveButton = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a3a3a3;
  cursor: pointer;

  &:hover {
    color: var(--app-text);
  }
`

const LeadMoveDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 170px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 80;
`

const LeadMoveOptionButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$active ? 'var(--app-hover)' : 'transparent')};
  color: var(--app-text);
  text-align: left;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 800 : 700)};
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }
`

const LeadFavoriteButton = styled.button<{ $active: boolean }>`
  border: 0;
  background: transparent;
  padding: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$active ? '#facc15' : '#a3a3a3')};
  cursor: pointer;

  svg {
    transform: scale(${(props) => (props.$active ? 1.3 : 1)});
    transition:
      transform 0.18s ease,
      fill 0.18s ease,
      color 0.18s ease;
    fill: ${(props) => (props.$active ? '#facc15' : 'transparent')};
  }

  &:hover svg {
    transform: scale(1.3);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.75;
  }
`

const LeadMessage = styled.div`
  margin-top: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text);
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 12px;
  padding: 10px;
  line-height: 1.35;
  max-height: 88px;
  overflow: hidden;
`

const EmptyState = styled.div`
  border: 1px dashed var(--app-border);
  border-radius: 16px;
  padding: 18px;
  background: var(--app-surface-soft);
`

const EmptyTitle = styled.div`
  font-weight: 900;
  font-size: 14px;
  margin-bottom: 6px;
`

const EmptyText = styled.div`
  font-size: 13px;
  color: var(--app-text-muted);
  font-weight: 600;
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;

  @media (max-width: 920px) {
    padding: 16px;
  }

  @media (max-width: 640px) {
    padding: 12px;
  }
`

const ModalCard = styled.div`
  width: min(620px, calc(100vw - 48px));
  max-height: min(86vh, 900px);
  overflow-y: auto;
  border: 1px solid var(--app-divider);
  border-radius: 20px;
  background: var(--app-surface);
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);

  @media (max-width: 920px) {
    width: clamp(320px, calc(100vw - 300px), 620px);
    max-height: calc(100vh - 48px);
    padding: 16px;
    border-radius: 18px;
  }

  @media (max-width: 640px) {
    width: calc(100vw - 44px);
    max-height: calc(100vh - 24px);
    padding: 14px;
    border-radius: 16px;
  }
`

const SettingsModalCard = styled.div`
  width: min(388px, calc(100vw - 48px));
  border: 1px solid var(--app-divider);
  border-radius: 20px;
  background: var(--app-surface);
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);

  @media (max-width: 640px) {
    width: calc(100vw - 44px);
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--app-divider);
  margin-bottom: 18px;

  @media (max-width: 850px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`

const SettingsModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
`

const ModalTitleArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 850px) {
    width: 100%;
  }
`

const ModalTitleInlineRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
`

const ModalTitleSeparator = styled.span`
  color: var(--app-text-muted);
  font-size: 14px;
  font-weight: 700;
`

const ModalTitleColumnName = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: var(--app-text-muted);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ModalTitleColumnToggle = styled.button`
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  svg {
    transform: rotate(90deg);
  }

  &:hover {
    color: var(--app-text);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const MoveColumnMenuWrapper = styled.div`
  position: relative;
`

const MoveColumnDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
  padding: 10px;
  z-index: 45;
`

const MoveColumnLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.35px;
  margin-bottom: 6px;
`

const MoveColumnOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MoveColumnOptionButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$active ? 'var(--app-hover)' : 'transparent')};
  color: var(--app-text);
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 800 : 600)};
  text-align: left;
  padding: 7px 9px;
  cursor: pointer;

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ModalTitle = styled.div`
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.3px;
`

const ModalTitleClickable = styled(ModalTitle)`
  cursor: pointer;
`

const ModalHeaderEditInput = styled.input`
  width: fit-content;
  min-width: 220px;
  max-width: 100%;
  min-height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 10px;
  outline: none;
  font-size: 14px;
  font-weight: 700;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

const ModalHeaderRightArea = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  @media (max-width: 850px) {
    width: 100%;
    justify-content: flex-start;
  }
`

const HeaderIconButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 850px) {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`

const SettingsModalTitle = styled.div`
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
`


const SettingsCloseIconButton = styled.button<{ $active?: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid ${(props) => (props.$active ? 'var(--app-border-strong)' : 'var(--app-border)')};
  background: ${(props) => (props.$active ? 'var(--app-hover)' : 'var(--app-surface-soft)')};
  color: ${(props) => (props.$active ? 'var(--app-text)' : 'var(--app-text-muted)')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
    color: var(--app-text);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ModalFavoriteIconButton = styled.button<{ $active: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: ${(props) => (props.$active ? '#facc15' : '#9a9a9a')};

  svg {
    transform: scale(1);
    transition:
      fill 0.16s ease,
      color 0.16s ease;
    fill: ${(props) => (props.$active ? '#facc15' : 'transparent')};
  }

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ModalError = styled.div`
  border: 1px solid #ffdddd;
  background: #fff2f2;
  color: #7a0b0b;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
`

const ModalLoading = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  color: var(--app-text);
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  margin-top: 10px;
`

const SectionTitle = styled.div`
  margin-top: 18px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 900;
  color: var(--app-text);
`

const SectionTitleNoMargin = styled.div`
  font-size: 14px;
  font-weight: 900;
  color: var(--app-text);
`

const LeadTabSectionTitle = styled(SectionTitleNoMargin)`
  margin-bottom: 10px;
`

const CommentHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`

const FollowupFiltersTrigger = styled.button`
  border: none;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: var(--app-text-muted);
  }
`

const CommentMetaText = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--app-text-muted);
`

const CommentStatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CommentStatusDot = styled.div<{ $variant: 'saved' | 'dirty' }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${(props) => (props.$variant === 'dirty' ? '#eab308' : '#22c55e')};
  box-shadow: 0 0 0 3px
    ${(props) =>
      props.$variant === 'dirty'
        ? 'rgba(234, 179, 8, 0.12)'
        : 'rgba(34, 197, 94, 0.12)'};
`

const CommentBox = styled.textarea<{ $variant: 'saved' | 'dirty' }>`
  width: 100%;
  min-height: 220px;
  resize: vertical;
  border-radius: 16px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 14px 16px;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  border: 2px solid
    ${(props) => (props.$variant === 'dirty' ? '#eab308' : '#22c55e')};
  box-shadow: 0 0 0 4px
    ${(props) =>
      props.$variant === 'dirty'
        ? 'rgba(234, 179, 8, 0.10)'
        : 'rgba(34, 197, 94, 0.10)'};

  &::placeholder {
    color: var(--app-text-muted);
  }
`

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const InfoRow = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 14px;
  padding: 12px;
`

const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
`

const InfoValue = styled.div<{ $preWrap?: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.45;
  white-space: ${(props) => (props.$preWrap ? 'pre-wrap' : 'normal')};
  word-break: break-word;
`

const LeadInfoBlockLabel = styled(InfoLabel)`
  color: var(--app-text);
  font-weight: 900;
`

const LeadInfoRowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const LeadInfoActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const LeadInfoActionButton = styled.button`
  border: none;
  background: transparent;
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 0;

  &:hover {
    opacity: 0.75;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const LeadNextActionCard = styled.button<{
  $status?: FollowUpBoardStatus | 'done'
}>`
  width: 100%;
  border: 2px solid
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-border)'
        case 'today':
          return 'var(--status-today-border)'
        case 'overdue':
          return 'var(--status-overdue-border)'
        case 'done':
          return 'var(--status-done-border)'
        default:
          return 'var(--app-border)'
      }
    }};
  box-shadow: 0 0 0 4px
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-shadow)'
        case 'today':
          return 'var(--status-today-shadow)'
        case 'overdue':
          return 'var(--status-overdue-shadow)'
        case 'done':
          return 'var(--status-done-shadow)'
        default:
          return 'rgba(0, 0, 0, 0.04)'
      }
    }};
  background:
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-bg)'
        case 'today':
          return 'var(--status-today-bg)'
        case 'overdue':
          return 'var(--status-overdue-bg)'
        case 'done':
          return 'var(--status-done-bg)'
        default:
          return 'var(--app-surface-soft)'
      }
    }};
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    transform: scale(1.012);
    background:
      ${(props) => {
        switch (props.$status) {
          case 'scheduled':
            return 'var(--status-scheduled-bg-hover)'
          case 'today':
            return 'var(--status-today-bg-hover)'
          case 'overdue':
            return 'var(--status-overdue-bg-hover)'
          case 'done':
            return 'var(--status-done-bg-hover)'
          default:
            return 'var(--app-hover)'
        }
      }};
  }
`

const LeadNextActionLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
`

const LeadNextActionDate = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
  white-space: nowrap;
`

const LeadNextActionTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.35;
  min-width: 0;
  word-break: break-word;
`

const LeadNextActionDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--app-text);
  flex-shrink: 0;
`

const LeadContactLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-muted);
  line-height: 1.45;

  & + & {
    margin-top: 3px;
  }
`

const LeadContactKey = styled.span`
  width: 70px;
  flex-shrink: 0;
  color: var(--app-text);
  font-weight: 900;
`

const LeadContactValue = styled.span`
  color: var(--app-text-muted);
  font-weight: 600;
`

const LeadContactInlineInput = styled.input`
  flex: 0 0 280px;
  width: 280px;
  max-width: 100%;
  min-height: 30px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 10px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

const InfoInput = styled.input`
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

const InfoSelect = styled.select`
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  outline: none;
  font-size: 13px;
  font-weight: 600;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

const CreateFormCard = styled.div`
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  border-radius: 14px;
  padding: 12px;
`

const CreateFieldsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SearchInput = styled.input`
  width: 230px;
  min-height: 34px;
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 0 12px;
  outline: none;
  font-size: 14px;
  font-weight: 500;

  &:focus {
    border-color: #bdbdbd;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }

  &::placeholder {
    color: var(--app-text-muted);
  }
`

const FollowUpList = styled.div`
  display: flex;
  flex-direction: column;
`

const FollowUpListItem = styled.div<{
  $isCreateRow?: boolean
  $status?: FollowUpBoardStatus | 'done'
}>`
  width: 100%;
  box-sizing: border-box;
  border: 2px solid
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-border)'
        case 'today':
          return 'var(--status-today-border)'
        case 'overdue':
          return 'var(--status-overdue-border)'
        case 'done':
          return 'var(--status-done-border)'
        default:
          return 'var(--app-border)'
      }
    }};
  box-shadow: 0 0 0 4px
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-shadow)'
        case 'today':
          return 'var(--status-today-shadow)'
        case 'overdue':
          return 'var(--status-overdue-shadow)'
        case 'done':
          return 'var(--status-done-shadow)'
        default:
          return 'rgba(0, 0, 0, 0.04)'
      }
    }};
  background:
    ${(props) => {
      switch (props.$status) {
        case 'scheduled':
          return 'var(--status-scheduled-bg)'
        case 'today':
          return 'var(--status-today-bg)'
        case 'overdue':
          return 'var(--status-overdue-bg)'
        case 'done':
          return 'var(--status-done-bg)'
        default:
          return 'var(--app-surface-soft)'
      }
    }};
  border-radius: 14px;
  padding: 6px 12px;
  margin-top: ${(props) => (props.$isCreateRow ? '0' : '10px')};
  transition:
    transform 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    transform: ${(props) => (props.$isCreateRow ? 'none' : 'scale(1.012)')};
    background:
      ${(props) => {
        switch (props.$status) {
          case 'scheduled':
            return 'var(--status-scheduled-bg-hover)'
          case 'today':
            return 'var(--status-today-bg-hover)'
          case 'overdue':
            return 'var(--status-overdue-bg-hover)'
          case 'done':
            return 'var(--status-done-bg-hover)'
          default:
            return 'var(--app-hover)'
        }
      }};
  }
`

const FollowUpCreateRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  width: 100%;
`

const FollowUpCreateHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
`

const FollowUpCreateFooter = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  width: 100%;

  > * {
    width: 100%;
  }
`

const FollowUpTextInput = styled(InfoInput)`
  flex: 1 1 0;
  min-width: 0;
`

const FollowUpDateInput = styled(InfoInput)`
  width: auto;
  max-width: none;
  flex: 1 1 0;
  min-width: 0;
`

const FollowUpInlineCreateIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

const FollowUpInlineCancelButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
  }
`

const FollowUpListItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-bottom: 0;
`
const FollowUpItemDate = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
`

const FollowUpItemStatus = styled.div<{
  $status?: FollowUpBoardStatus | 'done'
}>`
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1.2;
  flex-shrink: 0;
  color: ${(props) => {
    switch (props.$status) {
      case 'overdue':
        return 'var(--status-overdue-text)'
      case 'today':
        return 'var(--status-today-text)'
      case 'scheduled':
        return 'var(--status-scheduled-text)'
      case 'done':
        return 'var(--status-done-text)'
      default:
        return 'var(--app-text-muted)'
    }
  }};
`

const FollowUpItemMainLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;

  ${FollowUpItemDate} {
    flex-shrink: 0;
    white-space: nowrap;
  }

  ${FollowUpItemStatus} {
    white-space: nowrap;
  }
`

const FollowUpItemTitle = styled.button`
  position: relative;
  margin: 0;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
  -webkit-touch-callout: none;

  &::before {
    content: '';
    position: absolute;
    left: 14px;
    bottom: calc(100% + 2px);
    border-width: 6px 6px 0 6px;
    border-style: solid;
    border-color: rgba(17, 17, 17, 0.92) transparent transparent transparent;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.14s ease, transform 0.14s ease;
    pointer-events: none;
    z-index: 6;
  }

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 0;
    bottom: calc(100% + 8px);
    min-width: 160px;
    max-width: min(280px, 70vw);
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(17, 17, 17, 0.92);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    white-space: normal;
    word-break: break-word;
    overflow: visible;
    text-overflow: initial;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.14s ease, transform 0.14s ease;
    pointer-events: none;
    z-index: 5;
  }

  &:hover::before,
  &:hover::after,
  &:focus-visible::before,
  &:focus-visible::after,
  &:active::before,
  &:active::after {
    opacity: 1;
    transform: translateY(0);
  }
`



const FollowUpItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
`

const FollowUpActionIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--app-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const ModalFooter = styled.div`
  margin-top: 18px;
`

const FooterButtons = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`

const FooterButtonBase = styled.button`
  flex: 1;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

const NeutralButton = styled(FooterButtonBase)`
  background: var(--app-surface-soft);
  color: var(--app-text);
  border-color: var(--app-border);

  &:hover {
    background: var(--app-hover);
  }
`

const CreateDropdownButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  &:hover {
    background: var(--app-hover);
  }

  &:focus {
    outline: none;
    background: var(--app-hover);
  }
`

const DangerButton = styled(FooterButtonBase)`
  background: #d9534f;
  color: #ffffff;
  border-color: #c8423e;
`

const SuccessButton = styled(FooterButtonBase)`
  background: #2e9b57;
  color: #ffffff;
  border-color: #27874b;
`

const SettingsModalBody = styled.div`
  display: flex;
  flex-direction: column;
`

const SettingsActionButton = styled.button`
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
  color: var(--app-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

const SettingsSpacer = styled.div`
  height: 42px;
`

const AutomationsModalCard = styled.div`
  width: 760px;
  max-width: calc(100vw - 40px);
  height: 468px;
  max-height: calc(100vh - 40px);
  overflow: hidden;
  border: 1px solid var(--app-divider);
  border-radius: 20px;
  background: var(--app-surface);
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
`

const ColumnSettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  flex: 1;
  min-height: 0;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 12px;
    align-content: start;
    grid-auto-rows: min-content;
  }
`

const ColumnSettingsSidebar = styled.div`
  border-right: 1px solid var(--app-divider);
  padding-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;

  @media (max-width: 860px) {
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--app-divider);
    padding-right: 0;
    padding-bottom: 10px;
  }
`

const ColumnSettingsSidebarButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: 1px solid ${(p) => (p.$active ? 'var(--app-border-strong)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'var(--app-border-strong)' : 'transparent')};
  color: ${(p) => (p.$active ? '#ffffff' : 'var(--app-text-muted)')};
  padding: 9px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background: ${(p) => (p.$active ? 'var(--app-border-strong)' : 'var(--app-hover)')};
    color: ${(p) => (p.$active ? '#ffffff' : 'var(--app-text)')};
  }

  @media (max-width: 860px) {
    text-align: center;
  }
`

const ColumnSettingsMain = styled.div`
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
`

const ColumnDetailsNameInput = styled.input`
  flex: 0 0 260px;
  width: 260px;
  max-width: 100%;
  min-height: 28px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  outline: none;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;

  &:focus {
    box-shadow: none;
  }
`

const ColumnDetailsLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  line-height: 1.4;

  & + & {
    margin-top: 6px;
  }
`

const ColumnDetailsKey = styled.span`
  color: var(--app-text);
  font-weight: 900;
  flex-shrink: 0;
`

const DetailsValueInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const ColumnColorDropdownWrapper = styled.div`
  position: relative;
`

const ColumnColorTrigger = styled.button`
  border: none;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  &:hover {
    color: var(--app-text-muted);
  }
`

const ColumnColorDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 120;
`

const ColumnColorOptionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ColumnColorOptionButton = styled.button<{
  $active?: boolean
}>`
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: var(--app-hover);
  }
`

const AutomationsTabs = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--app-divider);
  margin-bottom: 20px;
`

const AutomationsTabButton = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: none;
  cursor: pointer;
  color: ${(p) => (p.$active ? 'var(--app-text)' : 'var(--app-text-muted)')};
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--app-text)' : 'transparent')};
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: var(--app-text);
  }
`

const AutomationsTabContent = styled.div`
  min-height: 320px;
`

const AutomationsEntryArea = styled.div`
  position: relative;
  min-height: 320px;
`

const AutomationsCountBadge = styled.span`
  flex-shrink: 0;
  background: var(--app-hover);
  color: var(--app-text-muted);
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 18px;
`

const AutomationsEntryMainLine = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  flex: 1;

  ${InfoValue} {
    margin: 0;
    min-width: 0;
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    white-space: normal;
    line-height: 1.35;
    word-break: break-word;
  }

  @media (max-width: 820px) {
    gap: 8px;
  }
`

const AutomationsEntryListItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-bottom: 0;
`

const AutomationsEntryItemFollowUpInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  width: 100%;
`

const AutomationsEntryItemSubtext = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-muted);
  min-width: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
  max-width: none;
  line-height: 1.35;
`

const AutomationsEntryItemDueAt = styled.span`
  font-size: 11px;
  color: var(--app-text-muted);
  white-space: nowrap;
`

const AutomationsEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 8px;
`

const AutomationsEmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: var(--app-text);
`

const AutomationsEmptyText = styled.div`
  font-size: 12px;
  color: var(--app-text-muted);
  font-weight: 500;
  max-width: 280px;
  line-height: 1.5;
`

const AutomationsCreateButton = styled.button`
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--app-border-strong);
  border-radius: 10px;
  background: var(--app-border-strong);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.86;
  }
`

const AutomationsPickerOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 17, 17, 0.42);
  border-radius: 12px;
  z-index: 2;
`

const AutomationsPickerCard = styled.div`
  width: min(380px, 100%);
  max-height: calc(320px - 16px);
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
  padding: 14px;
`

const AutomationsPickerTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: var(--app-text);
`

const AutomationsPickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

const AutomationsPickerCloseButton = styled.button`
  border: none;
  background: none;
  color: var(--app-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s;

  &:hover {
    color: var(--app-text);
  }
`

const AutomationsPickerSection = styled.div`
  & + & {
    margin-top: 10px;
  }
`

const AutomationsPickerSectionTrigger = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
`

const AutomationsPickerSectionTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--app-text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`

const AutomationsPickerSectionContent = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${(p) => (p.$open ? '1fr' : '0fr')};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  margin-top: ${(p) => (p.$open ? '6px' : '0')};
  pointer-events: ${(p) => (p.$open ? 'auto' : 'none')};
  transition: grid-template-rows 0.22s ease, opacity 0.18s ease, margin-top 0.22s ease;
`

const AutomationsPickerSectionContentInner = styled.div`
  overflow: hidden;
`

const AutomationsPickerOption = styled.button`
  width: 100%;
  border: none;
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--app-hover);
  }
`

const AutomationsEntryList = styled.div`
  display: flex;
  flex-direction: column;
`

const AutomationsEntryListItem = styled.div`
  border: 2px solid var(--app-border);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.04);
  background: var(--app-surface-soft);
  border-radius: 14px;
  padding: 6px 12px;

  & + & {
    margin-top: 10px;
  }

  &:hover {
    background: var(--app-hover);
  }
`

const AutomationsEntryAddButton = styled.button`
  width: 100%;
  margin-top: 10px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: var(--app-hover);
    border-color: var(--app-border);
  }
`

const AutomationsEntryItemCategory = styled.span`
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.35px;
  color: var(--app-text-muted);
`

// Form Styled Components
const AutomationsFormSection = styled.div`
  margin-bottom: 18px;

  &:last-of-type {
    margin-bottom: 20px;
  }
`

const AutomationsFormInput = styled.input`
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--app-text);
  background: var(--app-surface);
  font-family: inherit;

  &::placeholder {
    color: var(--app-text-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--app-border-strong);
    box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.1);
  }
`

const AutomationsFormRadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const AutomationsFormRadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 8px;
  min-height: 34px;
  box-sizing: border-box;
  border-radius: 8px;
  transition: background 0.15s;

  &:hover {
    background: var(--app-hover);
  }

  input[type='radio'] {
    cursor: pointer;
    accent-color: var(--app-text);
  }

  span {
    font-size: 13px;
    color: var(--app-text);
    font-weight: 500;
    flex: 1;
  }
`

const AutomationsFormNumberInput = styled.input`
  width: 50px;
  height: 24px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 24px;
  color: var(--app-text);
  background: var(--app-surface);
  font-family: inherit;
  text-align: center;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--app-border-strong);
    box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.1);
  }

  /* Remove spinner arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`

const AutomationsFormDateInput = styled.input<{ $hasValue: boolean }>`
  width: 128px;
  height: 24px;
  margin-left: auto;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--app-text);
  background: var(--app-surface);
  font-family: inherit;
  box-sizing: border-box;

  &::-webkit-datetime-edit {
    color: ${(p) => (p.$hasValue ? 'var(--app-text)' : 'transparent')};
  }

  &:focus::-webkit-datetime-edit {
    color: var(--app-text);
  }

  &:focus {
    outline: none;
    border-color: var(--app-border-strong);
    box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.1);
  }
`

const AutomationsFormFooter = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--app-divider);
`

const AutomationsFormButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$primary ? 'var(--app-border-strong)' : 'var(--app-border)')};
  background: ${(p) => (p.$primary ? 'var(--app-text)' : 'var(--app-surface)')};
  color: ${(p) => (p.$primary ? 'var(--app-bg)' : 'var(--app-text-muted)')};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${(p) => (p.$primary ? 'var(--app-text)' : 'var(--app-hover)')};
    border-color: ${(p) => (p.$primary ? 'var(--app-border-strong)' : 'var(--app-border)')};
    opacity: ${(p) => (p.$primary ? 0.9 : 1)};
  }

  &:active {
    transform: scale(0.98);
  }
`

const DeleteConfirmTitle = styled.div`
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.2px;
  color: #111111;
  margin-bottom: 8px;
`

const DeleteConfirmText = styled.div`
  font-size: 14px;
  color: #555555;
  font-weight: 600;
  margin-bottom: 18px;
`

const ColumnMenuWrapper = styled.div`
  position: relative;
`

const ColumnDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 40;
`

const ColumnSortMenuWrapper = styled.div`
  position: relative;
`

const ColumnSortChevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  font-size: 16px;
  line-height: 1;
  color: var(--app-text-muted);
  transform: rotate(${(p) => (p.$open ? '90deg' : '0deg')});
  transition: transform 0.15s;
`

const ColumnSortActiveDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-text);
  margin-left: 5px;
  vertical-align: middle;
  margin-bottom: 1px;
`

const ColumnSortSubmenu = styled.div`
  padding: 4px 0 4px 10px;
`

const ColumnSortOption = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: 8px;
  background: ${(p) => (p.$active ? 'var(--app-hover)' : 'transparent')};
  color: var(--app-text);
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '700' : '500')};
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--app-hover);
  }
`