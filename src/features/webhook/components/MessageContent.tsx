import { AudioMessagePlayer } from './AudioMessagePlayer'
import { DocumentMessageContent } from './DocumentMessageContent'
import type { ChatMessage } from '../types/webhook.types'

type MessageContentProps = {
  message: ChatMessage
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
        <AudioMessagePlayer
          messageId={message.id}
          mediaUrl={message.mediaUrl}
          mimeType={message.mimeType ?? null}
          isOutbound={message.direction === 'outbound'}
        />
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
      return message.mediaUrl ? (
        <DocumentMessageContent
          mediaUrl={message.mediaUrl}
          fileName={message.fileName}
          mediaSize={message.mediaSize}
          mimeType={message.mimeType}
          caption={message.content}
        />
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