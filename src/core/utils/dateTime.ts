const FIXED_PERSISTED_OFFSET_HOURS = 6
const FIXED_PERSISTED_OFFSET_MS = FIXED_PERSISTED_OFFSET_HOURS * 60 * 60 * 1000

const applyFixedPersistedOffset = (date: Date): Date => {
  return new Date(date.getTime() - FIXED_PERSISTED_OFFSET_MS)
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
    return applyFixedPersistedOffset(
      new Date(year, month - 1, day, hours, minutes, seconds, milliseconds)
    )
  }

  const parsedDate = new Date(normalizedValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return applyFixedPersistedOffset(parsedDate)
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