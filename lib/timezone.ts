const SINGAPORE_TIMEZONE = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  const now = new Date();
  const localized = new Date(now.toLocaleString('en-US', { timeZone: SINGAPORE_TIMEZONE }));
  return localized;
}

export function formatSingaporeDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SINGAPORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function toSingaporeISOString(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: SINGAPORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(' ', 'T');
}

export function getSingaporeTimezone(): string {
  return SINGAPORE_TIMEZONE;
}
