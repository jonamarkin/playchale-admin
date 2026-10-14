import type { ISODate } from '~/types/admin'

const day = new Intl.DateTimeFormat('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })

/** "just now", "12 min ago", "3 h ago", "yesterday", then a date. As the player app says it. */
export function formatRelative(iso: ISODate, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'yesterday'
  return day.format(new Date(iso))
}

/** Games are on Ghana's clock (the markets PlayChale runs in today all are). */
const when = new Intl.DateTimeFormat('en-GH', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Accra' })
const date = new Intl.DateTimeFormat('en-GH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "Sat 26 Sep, 6:00 pm": when a game is. */
export function formatWhen(iso: ISODate): string {
  return when.format(new Date(iso))
}

/** "Sat 26 Sep 2026", or "Sat 26 – Sun 27 Sep 2026" for an event over days. Days are plain dates, "2026-09-26". */
export function formatDays(startsOn: string, endsOn: string): string {
  const start = new Date(`${startsOn}T00:00:00Z`)
  if (startsOn === endsOn) return date.format(start)
  return date.formatRange(start, new Date(`${endsOn}T00:00:00Z`))
}
