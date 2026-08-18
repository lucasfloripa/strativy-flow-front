const getLeadPhoneLocalDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  const hasExplicitCountryCode = value.trim().startsWith('+55')
  const hasCountryCodeByLength = digits.startsWith('55') && digits.length > 11

  return hasExplicitCountryCode || hasCountryCodeByLength
    ? digits.slice(2, 13)
    : digits.slice(0, 11)
}

const formatLocalPhoneDigits = (localDigits: string): string => {
  if (!localDigits) return ''

  const ddd = localDigits.slice(0, 2)
  const numberPart = localDigits.slice(2)

  if (localDigits.length <= 2) return `(${ddd}`
  if (numberPart.length <= 4) return `(${ddd})${numberPart}`
  if (numberPart.length <= 8) return `(${ddd})${numberPart.slice(0, 4)}-${numberPart.slice(4)}`

  return `(${ddd})${numberPart.slice(0, 5)}-${numberPart.slice(5, 9)}`
}

export const formatLeadPhoneInput = (value: string): string => {
  const localDigits = getLeadPhoneLocalDigits(value)
  return formatLocalPhoneDigits(localDigits)
}

export const formatStoredLeadPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (digits === '55') return ''

  const localDigits = digits.startsWith('55') && digits.length > 11
    ? digits.slice(2, 13)
    : digits.slice(0, 11)

  return formatLocalPhoneDigits(localDigits)
}

export const isLeadPhoneComplete = (value: string): boolean => {
  const localDigits = getLeadPhoneLocalDigits(value)
  return localDigits.length === 10 || localDigits.length === 11
}

export const isLeadPhoneValidForSource = (phone: string, source: string): boolean => {
  const hasPhone = getLeadPhoneLocalDigits(phone).length > 0
  const isWhatsAppSource = source.trim().toLowerCase() === 'whatsapp'

  return isWhatsAppSource
    ? isLeadPhoneComplete(phone)
    : !hasPhone || isLeadPhoneComplete(phone)
}

export const toPersistedLeadPhone = (value: string): string => {
  const localDigits = getLeadPhoneLocalDigits(value)
  return `55${localDigits}`
}
