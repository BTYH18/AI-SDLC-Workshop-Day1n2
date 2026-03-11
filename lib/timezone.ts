// Singapore timezone support
// Note: Uses native Date API for timezone support

/**
 * Get current time (in system timezone, adjust as needed)
 * For Singapore timezone awareness, dates are stored in ISO format
 */
export function getSingaporeNow(): Date {
  return new Date()
}

/**
 * Format date for display
 */
export function formatSingaporeDate(date: Date): string {
  return new Intl.DateTimeFormat('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Singapore',
  }).format(date)
}

/**
 * Get date in Singapore timezone with time set to start of day
 */
export function getSingaporeDateOnly(date: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-SG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Singapore',
  })

  const parts = formatter.formatToParts(date)
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2024', 10)
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10) - 1
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10)

  const sgDate = new Date(year, month, day, 0, 0, 0, 0)
  return sgDate
}

/**
 * Check if a date is in the future (at least 1 minute from now)
 */
export function isFutureDate(date: Date): boolean {
  const now = getSingaporeNow()
  const futureThreshold = new Date(now.getTime() + 60000) // 1 minute
  return date > futureThreshold
}

/**
 * Calculate the next due date for recurring todos.
 * Uses local Date arithmetic and returns ISO string for storage.
 */
export function calculateNextDueDate(
  currentDueDate: string,
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  const source = new Date(currentDueDate)
  if (isNaN(source.getTime())) {
    throw new Error('Invalid due date for recurrence calculation')
  }

  const next = new Date(source)

  if (pattern === 'daily') {
    next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (pattern === 'weekly') {
    next.setDate(next.getDate() + 7)
    return next.toISOString()
  }

  if (pattern === 'monthly') {
    const y = source.getFullYear()
    const m = source.getMonth()
    const d = source.getDate()
    const hh = source.getHours()
    const mm = source.getMinutes()
    const ss = source.getSeconds()
    const ms = source.getMilliseconds()

    const targetMonth = m + 1
    const targetYear = y + Math.floor(targetMonth / 12)
    const normalizedMonth = ((targetMonth % 12) + 12) % 12
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
    const safeDay = Math.min(d, lastDay)
    const clamped = new Date(targetYear, normalizedMonth, safeDay, hh, mm, ss, ms)
    return clamped.toISOString()
  }

  const year = source.getFullYear() + 1
  const month = source.getMonth()
  const day = source.getDate()
  const hh = source.getHours()
  const mm = source.getMinutes()
  const ss = source.getSeconds()
  const ms = source.getMilliseconds()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const safeDay = Math.min(day, lastDay)
  return new Date(year, month, safeDay, hh, mm, ss, ms).toISOString()
}
