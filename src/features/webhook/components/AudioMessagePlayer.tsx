import { Loader2, Pause, Play } from 'lucide-react'

import { interactionTheme } from '../../../app/theme/brandTheme'
import { useAudioPlayback } from '../hooks/useAudioPlayback'

type AudioMessagePlayerProps = {
  messageId: string
  mediaUrl: string
  mimeType?: string | null
  isOutbound?: boolean
  theme?: 'default' | 'messenger' | 'direct'
}

export function AudioMessagePlayer({
  messageId,
  mediaUrl,
  mimeType,
  isOutbound = false,
  theme = 'default'
}: AudioMessagePlayerProps) {
  const isMessenger = theme === 'messenger'
  const isDirect = theme === 'direct'
  const accentColor = isDirect
    ? '#c13584'
    : isMessenger
      ? '#0084ff'
      : interactionTheme.primaryButtonBackground
  const {
    audioRef,
    isPlaying,
    isLoading,
    hasError,
    errorMessage,
    progressValue,
    currentTimeLabel,
    durationLabel,
    togglePlayPause,
    handleSeekChange
  } = useAudioPlayback({
    playbackId: messageId
  })

  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 220, width: 'min(320px, 100%)' }}>
      <style>
        {`
          .audio-progress-slider {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
          }

          .audio-progress-slider::-webkit-slider-runnable-track {
            height: 6px;
            border-radius: 999px;
            background: rgba(22, 163, 74, 0.2);
          }

          .audio-progress-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            margin-top: -4px;
            border-radius: 50%;
            background: #16a34a;
            border: none;
          }

          .audio-progress-slider::-moz-range-track {
            height: 6px;
            border-radius: 999px;
            background: rgba(22, 163, 74, 0.2);
          }

          .audio-progress-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #16a34a;
            border: none;
          }

          .audio-progress-slider--outbound::-webkit-slider-thumb {
            background: #ffffff;
            border: 2px solid #16a34a;
          }

          .audio-progress-slider--outbound::-moz-range-thumb {
            background: #ffffff;
            border: 2px solid #16a34a;
          }

          .audio-progress-slider--messenger::-webkit-slider-runnable-track {
            background: rgba(0, 132, 255, 0.22);
          }

          .audio-progress-slider--messenger::-webkit-slider-thumb {
            background: #0084ff;
          }

          .audio-progress-slider--messenger::-moz-range-track {
            background: rgba(0, 132, 255, 0.22);
          }

          .audio-progress-slider--messenger::-moz-range-thumb {
            background: #0084ff;
          }

          .audio-progress-slider--messenger.audio-progress-slider--outbound::-webkit-slider-thumb {
            background: #ffffff;
            border: 2px solid #0084ff;
          }

          .audio-progress-slider--messenger.audio-progress-slider--outbound::-moz-range-thumb {
            background: #ffffff;
            border: 2px solid #0084ff;
          }

          .audio-progress-slider--direct::-webkit-slider-runnable-track {
            background: rgba(193, 53, 132, 0.22);
          }

          .audio-progress-slider--direct::-webkit-slider-thumb {
            background: #c13584;
          }

          .audio-progress-slider--direct::-moz-range-track {
            background: rgba(193, 53, 132, 0.22);
          }

          .audio-progress-slider--direct::-moz-range-thumb {
            background: #c13584;
          }

          .audio-progress-slider--direct.audio-progress-slider--outbound::-webkit-slider-thumb {
            background: #ffffff;
            border: 2px solid #c13584;
          }

          .audio-progress-slider--direct.audio-progress-slider--outbound::-moz-range-thumb {
            background: #ffffff;
            border: 2px solid #c13584;
          }
        `}
      </style>

      <audio ref={audioRef} preload="metadata" src={mediaUrl}>
        <source src={mediaUrl} type={mimeType ?? undefined} />
      </audio>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '34px 1fr',
          gap: 10,
          alignItems: 'center'
        }}
      >
        <button
          type="button"
          aria-label={isPlaying ? 'Pausar audio' : 'Reproduzir audio'}
          onClick={() => {
            void togglePlayPause()
          }}
          style={{
            height: 34,
            width: 34,
            minWidth: 34,
            border: 'none',
            borderRadius: 8,
            background: accentColor,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isLoading ? (
            <Loader2 size={15} />
          ) : isPlaying ? (
            <Pause size={15} />
          ) : (
            <Play size={15} style={{ marginLeft: 1 }} />
          )}
        </button>

        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <input
            className={`audio-progress-slider${isOutbound ? ' audio-progress-slider--outbound' : ''}${isMessenger ? ' audio-progress-slider--messenger' : ''}`}
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressValue}
            onChange={(event) => {
              handleSeekChange(Number(event.target.value))
            }}
            aria-label="Progresso do audio"
            style={{ width: '100%', accentColor, cursor: 'pointer' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              opacity: 0.85,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            <span>{currentTimeLabel}</span>
            <span>{durationLabel}</span>
          </div>
        </div>
      </div>

      {hasError && errorMessage ? (
        <span style={{ fontSize: 12, color: '#b91c1c' }}>{errorMessage}</span>
      ) : null}
    </div>
  )
}
