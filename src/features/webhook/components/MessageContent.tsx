import { FileText } from 'lucide-react'

import type { ChatMessage } from '../types/webhook.types'

type MessageContentProps = {
  message: ChatMessage
}

const formatFileSize = (sizeInBytes?: number | null): string | null => {
  if (typeof sizeInBytes !== 'number' || Number.isNaN(sizeInBytes) || sizeInBytes <= 0) {
    return null
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  const sizeInKb = sizeInBytes / 1024
  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`
  }

  const sizeInMb = sizeInKb / 1024
  return `${sizeInMb.toFixed(1)} MB`
}

const renderUnavailableMedia = () => {
  return <span style={{ opacity: 0.88 }}>Midia indisponivel</span>
}

export function MessageContent({ message }: MessageContentProps) {
  switch (message.type) {
    case 'image':
      return message.mediaUrl ? (
        <div style={{ display: 'grid', gap: message.content ? 8 : 0 }}>
          <a href={message.mediaUrl} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-flex' }}>
            <img
              src={message.mediaUrl}
              alt={message.content || 'Imagem recebida'}
              style={{
                display: 'block',
                maxWidth: '100%',
                width: 'min(280px, 100%)',
                borderRadius: 10,
                objectFit: 'cover',
                cursor: 'zoom-in'
              }}
            />
          </a>
          {message.content ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</span> : null}
        </div>
      ) : renderUnavailableMedia()
    case 'audio':
      return message.mediaUrl ? (
        <div style={{ display: 'grid', gap: 8, minWidth: 220 }}>
          <audio
            controls
            preload="metadata"
            src={message.mediaUrl}
            style={{ display: 'block', width: 'min(280px, 100%)', maxWidth: '100%' }}
          >
            <source src={message.mediaUrl} type={message.mimeType ?? undefined} />
            Seu navegador nao suporta audio.
          </audio>
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid currentColor',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              width: 'fit-content'
            }}
          >
            Abrir audio
          </a>
        </div>
      ) : renderUnavailableMedia()
    case 'video':
      return message.mediaUrl ? (
        <div style={{ display: 'grid', gap: message.content ? 8 : 0 }}>
          <video
            controls
            preload="metadata"
            style={{
              display: 'block',
              maxWidth: '100%',
              width: 'min(320px, 100%)',
              borderRadius: 10
            }}
          >
            <source src={message.mediaUrl} type={message.mimeType ?? undefined} />
            Seu navegador nao suporta video.
          </video>
          {message.content ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</span> : null}
        </div>
      ) : renderUnavailableMedia()
    case 'document': {
      const formattedFileSize = formatFileSize(message.mediaSize)

      return message.mediaUrl ? (
        <div
          style={{
            display: 'grid',
            gap: 10,
            minWidth: 220
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} />
            </span>
            <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {message.fileName || 'Documento'}
              </span>
              {formattedFileSize ? <span style={{ fontSize: 12, opacity: 0.82 }}>{formattedFileSize}</span> : null}
            </div>
          </div>
          {message.content ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</span> : null}
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid currentColor',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              width: 'fit-content'
            }}
          >
            Abrir documento
          </a>
        </div>
      ) : renderUnavailableMedia()
    }
    case 'text':
      return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content ?? ''}</span>
    default:
      return message.mediaUrl ? (
        <a href={message.mediaUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'inherit' }}>
          Abrir midia
        </a>
      ) : renderUnavailableMedia()
  }
}