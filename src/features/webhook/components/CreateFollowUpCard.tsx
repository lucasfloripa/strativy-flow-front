import { useState, type ReactNode } from 'react'

import { interactionTheme } from '../../../app/theme/brandTheme'

type CreateFollowUpCardProps = {
  onConfirm: (value: string, dueAt: string) => Promise<void> | void
  variant?: 'default' | 'table-row' | 'list-footer'
  headerTrailingContent?: ReactNode
}

type FollowUpInlineFormProps = {
  modeLabel: string
  initialValue?: string
  initialDueAt?: string
  onCancel: () => void
  onConfirm: (value: string, dueAt: string) => Promise<void> | void
  variant?: 'default' | 'table-row'
  columnsTemplate?: string
}

const formatDateToInputValue = (dateValue?: string): string => {
  if (!dateValue) return ''

  const normalizedDateValue = dateValue.trim().replace(' ', 'T')
  return normalizedDateValue.slice(0, 16)
}

export function FollowUpInlineForm({
  modeLabel,
  initialValue = '',
  initialDueAt,
  onCancel,
  onConfirm,
  variant = 'default',
  columnsTemplate
}: FollowUpInlineFormProps) {
  const [value, setValue] = useState<string>(initialValue)
  const [dueAt, setDueAt] = useState<string>(() => formatDateToInputValue(initialDueAt))
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirmDisabled = isSubmitting || !value.trim() || !dueAt.trim()

  const resetForm = () => {
    setValue('')
    setDueAt('')
    setError(null)
  }

  const handleCancel = () => {
    resetForm()
    onCancel()
  }

  const handleSubmit = async () => {
    if (isConfirmDisabled) return

    try {
      setIsSubmitting(true)
      setError(null)
      await onConfirm(value.trim(), dueAt)
      resetForm()
      onCancel()
    } catch (exception: unknown) {
      const message = exception instanceof Error ? exception.message : 'Falha ao criar follow-up.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article
      style={{
        border: variant === 'table-row' ? 'none' : '1px solid #e5e7eb',
        borderRadius: variant === 'table-row' ? 0 : 5,
        background: 'transparent',
        padding: variant === 'table-row' ? 0 : '6px 10px',
        minHeight: variant === 'table-row' ? 0 : 40,
        width: variant === 'table-row' ? '100%' : 'auto',
        boxShadow: 'none',
        display: 'grid',
        gap: variant === 'table-row' ? 0 : 4
      }}
    >
      {variant === 'default' ? (
        <h4 style={{ margin: 0, fontSize: 10, letterSpacing: 0.3, color: '#6b7280' }}>{modeLabel}</h4>
      ) : null}

      {variant === 'table-row' && columnsTemplate ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: columnsTemplate,
            alignItems: 'center',
            columnGap: 8
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Nome do Follow-up"
            style={{
              width: '100%',
              minWidth: 0,
              height: 24,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              padding: '0 8px',
              fontSize: 13,
              color: '#111827',
              boxSizing: 'border-box'
            }}
          />

          <span />

          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            style={{
              width: '100%',
              minWidth: 0,
              height: 24,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              padding: '0 6px',
              fontSize: 13,
              color: '#111827',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'start' }}>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cancelar criação de follow-up"
              style={{
                height: 24,
                width: 24,
                border: '1px solid #d1d5db',
                borderRadius: 4,
                background: '#ffffff',
                color: '#374151',
                padding: 0,
                cursor: 'pointer'
              }}
            >
              X
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isConfirmDisabled}
              aria-label="Confirmar criação de follow-up"
              style={{
                height: 24,
                width: 24,
                border: 'none',
                borderRadius: 4,
                background: isConfirmDisabled
                  ? '#9ca3af'
                  : interactionTheme.primaryButtonBackground,
                color: '#ffffff',
                padding: 0,
                cursor: isConfirmDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              ✓
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Nome do Follow-up"
            style={{
              flex: 1,
              minWidth: 0,
              height: 24,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              padding: '0 8px',
              fontSize: 13,
              color: '#111827',
              boxSizing: 'border-box'
            }}
          />

          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            style={{
              width: 180,
              height: 24,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              padding: '0 6px',
              fontSize: 13,
              color: '#111827',
              boxSizing: 'border-box'
            }}
          />

          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancelar criação de follow-up"
            style={{
              height: 24,
              width: 24,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              background: '#ffffff',
              color: '#374151',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            X
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isConfirmDisabled}
            aria-label="Confirmar criação de follow-up"
            style={{
              height: 24,
              width: 24,
              border: 'none',
              borderRadius: 4,
              background: isConfirmDisabled
                ? '#9ca3af'
                : interactionTheme.primaryButtonBackground,
              color: '#ffffff',
              padding: 0,
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            ✓
          </button>
        </div>
      )}

      {error ? <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p> : null}
    </article>
  )
}

export function CreateFollowUpCard({
  onConfirm,
  variant = 'default',
  headerTrailingContent
}: CreateFollowUpCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  if (variant === 'list-footer' && !isExpanded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          style={{
            width: 'fit-content',
            border: 'none',
            borderRadius: 8,
            background: '#ffffff',
            boxShadow: 'none',
            minHeight: 42,
            padding: '0 12px',
            textAlign: 'left',
            color: '#555555',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1.2
          }}
        >
          + Adicionar Follow-up
        </button>

        {headerTrailingContent}
      </div>
    )
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        style={{
          width: '100%',
          border:
            variant === 'table-row'
              ? '1px dashed #d1d5db'
              : '2px dashed #d1d5db',
          borderRadius: variant === 'list-footer' ? 8 : 4,
          background: variant === 'default' ? '#f9fafb' : '#ffffff',
          boxShadow: 'none',
          minHeight: variant === 'table-row' ? 24 : variant === 'list-footer' ? 42 : 38,
          padding: variant === 'list-footer' ? '0 12px' : '0 8px',
          textAlign: 'left',
          color: '#555555',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: variant === 'list-footer' ? 700 : 400,
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1.2
        }}
      >
        + Adicionar Follow-up
      </button>
    )
  }

  if (variant === 'list-footer') {
    return (
      <div
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 8,
          background: '#ffffff',
          minHeight: 42,
          padding: '9px 12px',
          boxSizing: 'border-box'
        }}
      >
        <FollowUpInlineForm
          modeLabel="NOVO FOLLOW-UP"
          onCancel={() => setIsExpanded(false)}
          onConfirm={onConfirm}
          variant="table-row"
        />
      </div>
    )
  }

  return (
    <FollowUpInlineForm
      modeLabel="NOVO FOLLOW-UP"
      onCancel={() => setIsExpanded(false)}
      onConfirm={onConfirm}
      variant={variant === 'default' ? 'default' : 'table-row'}
    />
  )
}
