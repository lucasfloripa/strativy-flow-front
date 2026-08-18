import { Contact as ContactIcon, Phone } from 'lucide-react'

import { AudioMessagePlayer } from './AudioMessagePlayer'
import { DocumentMessageContent } from './DocumentMessageContent'
import type { ChatMessage } from '../types/webhook.types'

type AudioTheme = 'default' | 'messenger' | 'direct'

type MessageContentProps = {
  message: ChatMessage
  audioTheme?: AudioTheme
}

const renderUnavailableMedia = () => {
  return <span style={{ opacity: 0.88 }}>Midia indisponivel</span>
}

type ContactMessageItem = {
  name?: {
    formatted_name?: unknown
  }
  phones?: Array<{
    phone?: unknown
  }>
}

const resolveContactItems = (message: ChatMessage): ContactMessageItem[] => {
  const contacts = message.metadata?.contacts

  if (!Array.isArray(contacts)) {
    return []
  }

  return contacts.filter(
    (contact): contact is ContactMessageItem =>
      Boolean(contact) && typeof contact === 'object' && !Array.isArray(contact)
  )
}

const renderContactMessage = (message: ChatMessage) => {
  const contacts = resolveContactItems(message)

  if (!contacts.length) {
    return <span>{message.content || 'Contato indisponivel'}</span>
  }

  return (
    <div style={{ display: 'grid', minWidth: 220 }}>
      {contacts.map((contact, contactIndex) => {
        const formattedName = contact.name?.formatted_name
        const name =
          typeof formattedName === 'string' && formattedName.trim()
            ? formattedName.trim()
            : 'Contato'
        const phones = (contact.phones ?? [])
          .map(({ phone }) => typeof phone === 'string' ? phone.trim() : '')
          .filter(Boolean)

        return (
          <div
            key={`${name}-${contactIndex}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px minmax(0, 1fr)',
              gap: 10,
              alignItems: 'center',
              padding: '10px 2px',
              borderTop: contactIndex ? '1px solid rgba(100, 116, 139, 0.24)' : 'none'
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.72)',
                color: '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ContactIcon size={19} />
            </span>
            <span style={{ minWidth: 0, display: 'grid', gap: 4 }}>
              <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</strong>
              {phones.length ? phones.map((phone) => (
                <span key={phone} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, opacity: 0.82 }}>
                  <Phone size={13} />
                  {phone}
                </span>
              )) : <span style={{ opacity: 0.72 }}>Sem telefone</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const renderMessageBody = (message: ChatMessage, audioTheme: AudioTheme) => {
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
          theme={audioTheme}
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
    case 'contact':
      return renderContactMessage(message)
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

const resolveReactionEmoji = (message: ChatMessage) => {
  const reaction = message.metadata?.reaction

  if (!reaction || typeof reaction !== 'object' || Array.isArray(reaction)) {
    return null
  }

  const emoji = (reaction as { emoji?: unknown }).emoji
  return typeof emoji === 'string' && emoji.trim() ? emoji.trim() : null
}

export function MessageContent({
  message,
  audioTheme = 'default'
}: MessageContentProps) {
  const reactionEmoji = resolveReactionEmoji(message)

  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: reactionEmoji ? 6 : 0
      }}
    >
      {renderMessageBody(message, audioTheme)}
      {reactionEmoji ? (
        <span
          aria-label={`Reacao ${reactionEmoji}`}
          title={`Reacao ${reactionEmoji}`}
          style={{
            position: 'absolute',
            right: message.direction === 'outbound' ? -8 : 'auto',
            left: message.direction === 'inbound' ? -8 : 'auto',
            bottom: -18,
            minWidth: 26,
            height: 24,
            padding: '0 5px',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.18)',
            color: '#111827',
            fontSize: 15,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            zIndex: 1
          }}
        >
          {reactionEmoji}
        </span>
      ) : null}
    </div>
  )
}