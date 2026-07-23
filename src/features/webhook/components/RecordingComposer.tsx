import { Check, Loader2, Square } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'

type RecordingComposerProps = {
  durationLabel: string
  isUploading: boolean
  onCancel: () => void
  onFinish: () => void
}

export function RecordingComposer({
  durationLabel,
  isUploading,
  onCancel,
  onFinish
}: RecordingComposerProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 40,
        border: `1px solid ${interactionTheme.inputFocusBorderColor}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 0 10px',
        gap: 10,
        background: '#f9fafb'
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#dc2626',
            boxShadow: '0 0 0 4px rgba(220, 38, 38, 0.16)',
            flexShrink: 0
          }}
        />
        <span style={{ fontSize: 13, color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {isUploading ? 'Enviando audio...' : 'Gravando audio...'}
        </span>
        <span
          style={{
            fontSize: 12,
            color: '#4b5563',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap'
          }}
        >
          {durationLabel}
        </span>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          aria-label="Cancelar gravacao"
          onClick={onCancel}
          disabled={isUploading}
          style={{
            height: 30,
            width: 30,
            minWidth: 30,
            border: 'none',
            borderRadius: 6,
            color: '#b91c1c',
            background: '#fee2e2',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.7 : 1
          }}
        >
          <Square size={14} />
        </button>

        <button
          type="button"
          aria-label="Finalizar gravacao"
          onClick={onFinish}
          disabled={isUploading}
          style={{
            height: 30,
            width: 30,
            minWidth: 30,
            border: 'none',
            borderRadius: 6,
            color: '#ffffff',
            background: interactionTheme.primaryButtonBackground,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.7 : 1
          }}
        >
          {isUploading ? <Loader2 size={14} /> : <Check size={15} />}
        </button>
      </div>
    </div>
  )
}
