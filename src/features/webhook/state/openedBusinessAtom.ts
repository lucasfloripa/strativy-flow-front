import { atom } from 'jotai'

import type {
  NegotiationAttachmentResponse,
  NegotiationCostResponse,
  NegotiationPaymentResponse,
  NegotiationResponse,
} from '../types/webhook.types'

export type OpenedBusinessStatus = 'idle' | 'loading' | 'ready' | 'error'

export type OpenedBusinessState = {
  business: NegotiationResponse | null
  costs: NegotiationCostResponse[]
  payments: NegotiationPaymentResponse[]
  attachments: NegotiationAttachmentResponse[]
  status: OpenedBusinessStatus
  error: string | null
}

type ValueOrUpdater<TValue> = TValue | ((current: TValue) => TValue)

export const initialOpenedBusinessState: OpenedBusinessState = {
  business: null,
  costs: [],
  payments: [],
  attachments: [],
  status: 'idle',
  error: null,
}

export const openedBusinessAtom = atom<OpenedBusinessState>(
  initialOpenedBusinessState,
)

const resolveValue = <TValue>(
  current: TValue,
  update: ValueOrUpdater<TValue>,
): TValue =>
  typeof update === 'function'
    ? (update as (current: TValue) => TValue)(current)
    : update

export const openedBusinessCostsAtom = atom(
  (get) => get(openedBusinessAtom).costs,
  (get, set, update: ValueOrUpdater<NegotiationCostResponse[]>) => {
    const current = get(openedBusinessAtom)
    set(openedBusinessAtom, {
      ...current,
      costs: resolveValue(current.costs, update),
    })
  },
)

export const openedBusinessPaymentsAtom = atom(
  (get) => get(openedBusinessAtom).payments,
  (get, set, update: ValueOrUpdater<NegotiationPaymentResponse[]>) => {
    const current = get(openedBusinessAtom)
    set(openedBusinessAtom, {
      ...current,
      payments: resolveValue(current.payments, update),
    })
  },
)

export const openedBusinessAttachmentsAtom = atom(
  (get) => get(openedBusinessAtom).attachments,
  (get, set, update: ValueOrUpdater<NegotiationAttachmentResponse[]>) => {
    const current = get(openedBusinessAtom)
    set(openedBusinessAtom, {
      ...current,
      attachments: resolveValue(current.attachments, update),
    })
  },
)
