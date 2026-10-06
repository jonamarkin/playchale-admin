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
