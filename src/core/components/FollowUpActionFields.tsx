import { useEffect, useEffectEvent, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import { formatLeadPhoneInput, formatStoredLeadPhoneInput } from '../utils/leadPhone'
import { WebhookService } from '../../features/webhook/services/WebhookService'
import type {
  FollowUpMessageChannel,
  MessageTemplateResponse
} from '../../features/webhook/types/webhook.types'
import {
  buildTemplateVariablesDraft,
  getChannelFromLeadSource,
  interpolateTemplateDescription
} from './followUpActionDraft'
import type { FollowUpActionDraft } from './followUpActionDraft'

type FollowUpActionFieldsProps = {
  value: FollowUpActionDraft
  onChange: (value: FollowUpActionDraft) => void
  leadSource?: string | null
  leadEmail?: string | null
  leadPhone?: string | null
  isMobile: boolean
  readOnly?: boolean
}

export function FollowUpActionFields({
  value,
  onChange,
  leadSource,
  leadEmail,
  leadPhone,
  isMobile,
  readOnly = false
}: FollowUpActionFieldsProps) {
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplateResponse[]>([])
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const selectedTemplate = messageTemplates.find((template) => template.id === value.templateId) ?? null
  const templateVariableFields = selectedTemplate?.variables ?? Object.keys(value.templateVariables).map((key) => ({
    key,
    label: key,
    required: value.templateRequiredVariables.includes(key)
  }))
  const sourceChannel = getChannelFromLeadSource(leadSource)
  const allowedMessageChannels: FollowUpMessageChannel[] = sourceChannel === 'instagram'
    ? ['instagram', 'whatsapp']
    : sourceChannel === 'messenger'
      ? ['messenger', 'whatsapp']
      : ['whatsapp']

  const syncSelectedTemplate = useEffectEvent((templates: MessageTemplateResponse[]) => {
    const template = templates.find((item) => item.id === value.templateId)

    if (!template || readOnly) return

    onChange({
      ...value,
      templateVariables: buildTemplateVariablesDraft(template, value.templateVariables),
      templateRequiredVariables: (template.variables ?? [])
        .filter((variable) => variable.required)
        .map((variable) => variable.key)
    })
  })

  useEffect(() => {
    if (value.type !== 'send_message' || value.channel !== 'whatsapp' || messageTemplates.length) {
      return
    }

    let isMounted = true
    setIsLoadingTemplates(true)
    setTemplatesError(null)

    void WebhookService.loadMessageTemplates()
      .then((templates) => {
        if (!isMounted) return

        setMessageTemplates(templates)
        syncSelectedTemplate(templates)
      })
      .catch(() => {
        if (isMounted) setTemplatesError('Falha ao carregar templates.')
      })
      .finally(() => {
        if (isMounted) setIsLoadingTemplates(false)
      })

    return () => {
      isMounted = false
    }
  }, [messageTemplates.length, value.channel, value.type])

  const labelStyle = {
    color: '#1f2937',
    fontSize: isMobile ? 17 / 1.3 : 13,
    fontWeight: 700
  }
  const controlStyle = {
    width: '100%',
    minHeight: isMobile ? 46 : 42,
    border: '1px solid #d7dce4',
    borderRadius: 10,
    padding: '0 14px',
    color: readOnly ? '#64748b' : '#111827',
    fontSize: isMobile ? 17 / 1.2 : 14,
    boxSizing: 'border-box' as const,
    background: readOnly ? '#f8fafc' : '#ffffff',
    cursor: readOnly ? 'not-allowed' : undefined,
    opacity: 1
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={labelStyle}>Ação do follow-up</label>
        <select
          value={value.type}
          disabled={readOnly}
          onChange={(event) => {
            const type = event.target.value as FollowUpActionDraft['type']
            const channel = type === 'agenda'
              ? 'Agenda'
              : type === 'send_message'
                ? allowedMessageChannels.includes(value.channel as FollowUpMessageChannel)
                  ? value.channel
                  : allowedMessageChannels[0]
                : ''
            onChange({
              ...value,
              type,
              channel,
              phone: channel === 'whatsapp' ? value.phone || formatStoredLeadPhoneInput(leadPhone ?? '') : value.phone,
              emailTo: type === 'send_email' ? value.emailTo || leadEmail?.trim() || '' : value.emailTo
            })
          }}
          style={{ ...controlStyle, color: readOnly || !value.type ? '#64748b' : '#111827', fontWeight: 600 }}
        >
          <option value="">Selecione</option>
          <option value="agenda">Agenda</option>
          <option value="send_message">Enviar mensagem</option>
          <option value="send_email">Enviar e-mail</option>
        </select>
      </div>

      {value.type === 'send_message' ? (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>Canal</label>
            <select
              value={value.channel}
              disabled={readOnly}
              onChange={(event) => {
                const channel = event.target.value as '' | FollowUpMessageChannel
                onChange({
                  ...value,
                  channel,
                  phone: channel === 'whatsapp' ? value.phone || formatStoredLeadPhoneInput(leadPhone ?? '') : value.phone
                })
              }}
              style={{ ...controlStyle, color: readOnly || !value.channel ? '#64748b' : '#111827', fontWeight: 600 }}
            >
              <option value="">Selecione</option>
              <option value="whatsapp">WhatsApp</option>
              {sourceChannel === 'messenger' ? <option value="messenger">Messenger</option> : null}
              {sourceChannel === 'instagram' ? <option value="instagram">Direct</option> : null}
            </select>
          </div>
          {value.channel === 'whatsapp' ? (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={labelStyle}>Telefone</label>
                <input
                  type="text"
                  value={value.phone}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(event) => onChange({ ...value, phone: formatLeadPhoneInput(event.target.value) })}
                  autoComplete="new-password"
                  maxLength={14}
                  inputMode="numeric"
                  style={controlStyle}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={labelStyle}>Template</label>
                {isLoadingTemplates ? (
                  <Skeleton height={isMobile ? 46 : 42} borderRadius={10} />
                ) : (
                <select
                  value={value.templateId}
                  onChange={(event) => {
                    const templateId = event.target.value
                    const template = messageTemplates.find((item) => item.id === templateId) ?? null
                    onChange({
                      ...value,
                      templateId,
                      templateVariables: buildTemplateVariablesDraft(template, value.templateVariables),
                      templateRequiredVariables: (template?.variables ?? [])
                        .filter((variable) => variable.required)
                        .map((variable) => variable.key)
                    })
                  }}
                  disabled={readOnly}
                  style={{ ...controlStyle, color: readOnly || !value.templateId ? '#64748b' : '#111827', fontWeight: 600 }}
                >
                  <option value="">Selecione um template...</option>
                  {value.templateId && !selectedTemplate ? (
                    <option value={value.templateId}>Template indisponível</option>
                  ) : null}
                  {messageTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                )}
                {templatesError ? <span style={{ color: '#b91c1c', fontSize: 12 }}>{templatesError}</span> : null}
              </div>

              {templateVariableFields.map((variable) => (
                <div key={variable.key} style={{ display: 'grid', gap: 8 }}>
                  <label style={labelStyle}>{variable.label}{variable.required ? ' *' : ''}</label>
                  <input
                    type="text"
                    value={value.templateVariables[variable.key] ?? ''}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(event) => onChange({
                      ...value,
                      templateVariables: { ...value.templateVariables, [variable.key]: event.target.value }
                    })}
                    placeholder={`Valor para ${variable.label}`}
                    style={controlStyle}
                  />
                </div>
              ))}

              {selectedTemplate ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={labelStyle}>Mensagem</label>
                  <textarea
                    readOnly
                    value={interpolateTemplateDescription(selectedTemplate, value.templateVariables)}
                    style={{ ...controlStyle, minHeight: isMobile ? 110 : 96, padding: '10px 14px', resize: 'vertical', lineHeight: 1.4, background: '#f8fafc', color: '#64748b' }}
                  />
                </div>
              ) : null}
            </>
          ) : value.channel ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={labelStyle}>Mensagem</label>
              <textarea
                value={value.message}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(event) => onChange({ ...value, message: event.target.value })}
                placeholder="Digite a mensagem"
                style={{ ...controlStyle, minHeight: isMobile ? 110 : 96, padding: '10px 14px', resize: 'vertical', lineHeight: 1.4 }}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {value.type === 'send_email' ? (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>Destinatário</label>
            <input
              type="email"
              value={value.emailTo}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(event) => onChange({ ...value, emailTo: event.target.value })}
              placeholder="email@exemplo.com"
              style={controlStyle}
            />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>Assunto</label>
            <input
              type="text"
              value={value.emailSubject}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(event) => onChange({ ...value, emailSubject: event.target.value })}
              placeholder="Assunto do e-mail"
              style={controlStyle}
            />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>Mensagem</label>
            <textarea
              value={value.emailBody}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(event) => onChange({ ...value, emailBody: event.target.value })}
              placeholder="Digite o conteúdo do e-mail"
              style={{ ...controlStyle, minHeight: isMobile ? 130 : 110, padding: '10px 14px', resize: 'vertical', lineHeight: 1.4 }}
            />
          </div>
        </>
      ) : null}
    </>
  )
}