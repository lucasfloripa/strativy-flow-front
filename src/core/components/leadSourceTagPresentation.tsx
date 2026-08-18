import { Handshake, Infinity as InfinityIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type LeadSourceTagPresentation = {
  label: string
  textColor: string
  backgroundColor: string
  borderColor: string
  icon?: ReactNode
}

const messengerIcon = (
  <span
    aria-hidden="true"
    style={{
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: '#0084ff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1.4 6.7 4.1 3.8l1.6 1.5 2.9-2-2.7 2.9-1.6-1.5-2.9 2Z"
        fill="#ffffff"
      />
    </svg>
  </span>
)

const instagramDirectIcon = (
  <span
    aria-hidden="true"
    style={{
      width: 14,
      height: 14,
      borderRadius: '50%',
      background:
        'linear-gradient(135deg, #833ab4 0%, #c13584 34%, #fd1d1d 68%, #fcb045 100%)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1.4 6.7 4.1 3.8l1.6 1.5 2.9-2-2.7 2.9-1.6-1.5-2.9 2Z"
        fill="#ffffff"
      />
    </svg>
  </span>
)

const whatsappIcon = (
  <span
    aria-hidden="true"
    style={{
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: '#25d366',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path
        d="M19.1 4.9A9.86 9.86 0 0 0 12.06 2 9.93 9.93 0 0 0 3.4 16.77L2 22l5.36-1.4A9.92 9.92 0 0 0 22 11.96a9.87 9.87 0 0 0-2.9-7.06Zm-7.04 15.03a8 8 0 0 1-4.08-1.12l-.3-.18-3.18.83.85-3.1-.2-.32a8 8 0 1 1 6.91 3.9Zm4.4-5.98c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.26 7.26 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46a.88.88 0 0 0-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.19 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"
        fill="#ffffff"
      />
    </svg>
  </span>
)

const googleAdsIcon = (
  <span
    aria-hidden="true"
    style={{
      position: 'relative',
      width: 14,
      height: 14,
      display: 'inline-flex',
      flexShrink: 0
    }}
  >
    <span
      style={{
        position: 'absolute',
        left: 2,
        top: 0,
        width: 4,
        height: 13,
        borderRadius: 3,
        background: '#4285f4',
        transform: 'rotate(30deg)',
        transformOrigin: 'center'
      }}
    />
    <span
      style={{
        position: 'absolute',
        right: 2,
        top: 0,
        width: 4,
        height: 13,
        borderRadius: 3,
        background: '#fbbc04',
        transform: 'rotate(-30deg)',
        transformOrigin: 'center'
      }}
    />
    <span
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: '#34a853'
      }}
    />
  </span>
)

const createPresentation = (
  label: string,
  textColor: string,
  backgroundColor: string,
  icon?: ReactNode
): LeadSourceTagPresentation => ({
  label,
  textColor,
  backgroundColor,
  borderColor: 'transparent',
  icon
})

export const getLeadSourceTagPresentation = (
  source?: string | null,
  emptyLabel = '-'
): LeadSourceTagPresentation => {
  const sourceLabel = source?.trim() || emptyLabel
  const normalizedSource = sourceLabel
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '')

  if (normalizedSource === 'messenger') {
    return {
      label: 'Messenger',
      textColor: '#006fd6',
      backgroundColor: '#eaf4ff',
      borderColor: 'transparent',
      icon: messengerIcon
    }
  }

  if (
    normalizedSource === 'direct' ||
    normalizedSource === 'instagram' ||
    normalizedSource === 'instagramdirect'
  ) {
    return {
      label: 'Direct',
      textColor: '#c13584',
      backgroundColor: '#fff0f6',
      borderColor: 'transparent',
      icon: instagramDirectIcon
    }
  }

  if (normalizedSource === 'metaads') {
    return createPresentation(
      'Meta Ads',
      '#0668e1',
      '#eef5ff',
      <InfinityIcon size={16} strokeWidth={2.5} />
    )
  }

  if (normalizedSource === 'googleads') {
    return createPresentation('Google Ads', '#1a56a8', '#eaf2ff', googleAdsIcon)
  }

  if (normalizedSource === 'whatsapp') {
    return createPresentation('WhatsApp', '#15803d', '#ecfdf3', whatsappIcon)
  }

  if (normalizedSource === 'indicacao') {
    return createPresentation('Indicação', '#7c3aed', '#f5f0ff', <Handshake size={12} />)
  }

  return createPresentation(sourceLabel, '#6b7280', '#f3f4f6')
}