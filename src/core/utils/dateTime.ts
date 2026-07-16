const DEFAULT_LOCALE = 'pt-BR'
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

const toDateInstance = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE
  })

export const formatDateTime = (date: string | Date) =>
  new Date(date).toLocaleString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

export const formatTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit'
  })

export const formatElapsedHoursAndMinutes = (
  value?: string | Date | null
): string => {
  const parsedDate = toDateInstance(value)

  if (!parsedDate) {
    return '-'
  }

  const diffMs = Math.max(0, Date.now() - parsedDate.getTime())
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${totalMinutes}min`
  }

  return `${hours}h ${minutes}min`
}

export const parseApiDateToBrowserDate = (
  value?: string | Date | null
): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null
    }

    return value
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return null
  }

  const match = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?/i
  )

  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const hours = Number(match[4] ?? '0')
    const minutes = Number(match[5] ?? '0')
    const seconds = Number(match[6] ?? '0')
    const milliseconds = Number((match[7] ?? '0').slice(0, 3).padEnd(3, '0'))
    return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds)
  }

  const parsedDate = new Date(normalizedValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export const parsePersistedUtcClockToBrowserDate = (
  value?: string | Date | null
): Date | null => {
  return parseApiDateToBrowserDate(value)
}

export const getApiDateTimestamp = (value?: string | Date | null): number => {
  const parsedDate = parseApiDateToBrowserDate(value)

  if (!parsedDate) {
    return Number.NaN
  }

  return parsedDate.getTime()
}