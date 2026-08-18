import type {
  FollowUpActionPayload,
  FollowUpActionResponse,
  FollowUpActionType,
  FollowUpMessageChannel,
  MessageTemplateResponse
} from '../../features/webhook/types/webhook.types'
import {
  formatStoredLeadPhoneInput,
  isLeadPhoneComplete,
  toPersistedLeadPhone
} from '../utils/leadPhone'

export type FollowUpActionDraft = {
  type: '' | FollowUpActionType | 'agenda'
  channel: '' | FollowUpMessageChannel
  message: string
  phone: string
  templateId: string
  templateVariables: Record<string, string>
  templateRequiredVariables: string[]
  emailTo: string
  emailSubject: string
  emailBody: string
}

export const initialFollowUpActionDraft: FollowUpActionDraft = {
  type: '',
  channel: '',
  message: '',
  phone: '',
  templateId: '',
  templateVariables: {},
  templateRequiredVariables: [],
  emailTo: '',
  emailSubject: '',
  emailBody: ''
}

const getPayloadString = (
  payload: Record<string, unknown>,
  key: string
): string => {
  const payloadValue = payload[key]
  return typeof payloadValue === 'string' ? payloadValue : ''
}

export const fromFollowUpActionResponse = (
  action?: FollowUpActionResponse
): FollowUpActionDraft => {
  if (!action) {
    return {
      ...initialFollowUpActionDraft,
      templateVariables: {},
      templateRequiredVariables: []
    }
  }

  const payload = action.payload ?? {}
  const rawVariables = payload.variables
  const templateVariables =
    rawVariables && typeof rawVariables === 'object' && !Array.isArray(rawVariables)
      ? Object.fromEntries(
          Object.entries(rawVariables).flatMap(([key, value]) =>
            typeof value === 'string' ? [[key, value]] : []
          )
        )
      : {}

  return {
    type: action.channel === 'Agenda' ? 'agenda' : action.type,
    channel: action.channel ?? '',
    message: getPayloadString(payload, 'message'),
    phone: formatStoredLeadPhoneInput(getPayloadString(payload, 'phone')),
    templateId: getPayloadString(payload, 'templateId'),
    templateVariables,
    templateRequiredVariables: Object.keys(templateVariables),
    emailTo: getPayloadString(payload, 'to'),
    emailSubject: getPayloadString(payload, 'subject'),
    emailBody:
      getPayloadString(payload, 'text') || getPayloadString(payload, 'html')
  }
}

export const getChannelFromLeadSource = (
  source?: string | null
): '' | FollowUpMessageChannel => {
  const normalizedSource = source?.trim().toLowerCase().replace(/[\s_-]+/g, '')

  if (normalizedSource === 'whatsapp') return 'whatsapp'
  if (normalizedSource === 'messenger') return 'messenger'
  if (
    normalizedSource === 'direct' ||
    normalizedSource === 'instagramdirect' ||
    normalizedSource === 'instagram'
  ) {
    return 'instagram'
  }

  return ''
}

export const buildTemplateVariablesDraft = (
  template: MessageTemplateResponse | null | undefined,
  currentVariables?: Record<string, string>
): Record<string, string> => {
  if (!template?.variables?.length) return {}

  return Object.fromEntries(
    template.variables.map((variable) => [variable.key, currentVariables?.[variable.key] ?? ''])
  )
}

export const interpolateTemplateDescription = (
  template: MessageTemplateResponse,
  variables: Record<string, string>
): string => {
  let description = template.description ?? ''

  for (const variable of template.variables ?? []) {
    const replacement = variables[variable.key]?.trim() || `{${variable.label}}`
    const escapedKey = variable.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    description = description
      .replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'), replacement)
      .replace(new RegExp(`{\\s*${escapedKey}\\s*}`, 'g'), replacement)
  }

  return description
}

export const isFollowUpActionDraftValid = (draft: FollowUpActionDraft): boolean => {
  if (draft.type === 'agenda') {
    return true
  }

  if (draft.type === 'send_message') {
    if (draft.channel === 'whatsapp') {
      const hasMissingVariable = draft.templateRequiredVariables.some(
        (key) => !draft.templateVariables[key]?.trim()
      )

      return Boolean(isLeadPhoneComplete(draft.phone) && draft.templateId && !hasMissingVariable)
    }

    return Boolean(draft.channel && draft.message.trim())
  }

  if (draft.type === 'send_email') {
    return Boolean(draft.emailTo.trim() && draft.emailSubject.trim() && draft.emailBody.trim())
  }

  return false
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const toFollowUpActionPayload = (draft: FollowUpActionDraft): FollowUpActionPayload => {
  if (draft.type === 'agenda') {
    return {
      type: 'send_message',
      channel: 'Agenda',
      payload: {}
    }
  }

  if (draft.type === 'send_message' && draft.channel) {
    if (draft.channel === 'whatsapp') {
      return {
        type: draft.type,
        channel: draft.channel,
        payload: {
          phone: toPersistedLeadPhone(draft.phone),
          templateId: draft.templateId,
          variables: Object.fromEntries(
            Object.entries(draft.templateVariables).filter(([, value]) => value.trim())
          )
        }
      }
    }

    return {
      type: draft.type,
      channel: draft.channel,
      payload: { message: draft.message.trim() }
    }
  }

  if (draft.type === 'send_email') {
    const text = draft.emailBody.trim()

    return {
      type: draft.type,
      payload: {
        to: draft.emailTo.trim(),
        subject: draft.emailSubject.trim(),
        text,
        html: escapeHtml(text).replaceAll('\n', '<br>')
      }
    }
  }

  throw new Error('Selecione e preencha a ação do follow-up.')
}
