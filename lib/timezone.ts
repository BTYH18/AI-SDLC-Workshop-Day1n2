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
