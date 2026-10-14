import type { FetchError } from 'ofetch'
import type { AdminEntry, AdminEvent, AdminEventDetail, AdminFunnel, AdminGame, AdminHealth, AdminMessage, AdminPerson, AdminSms, AdminTrends, AdminVenue, AdminVisits, ID, SignedIn, StaffRole } from '~/types/admin'

/**
 * The PlayChale API, as the admin desk uses it. The session is the API's own cookie, sent with
 * every request (`credentials: 'include'`), so signing in here and in the player app is one and the
 * same session — which is also why this app never signs anyone out on its own.
 */
export function useAdminApi() {
  const { apiBase } = useRuntimeConfig().public
  const call = <T>(path: string, options: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(path, { baseURL: apiBase, credentials: 'include', ...options } as Parameters<typeof $fetch>[1]) as Promise<T>

  return {
    auth: {
      options: () => call<{ phone: boolean, email: boolean }>('/auth/options'),
      /** Sends a code. In a dev build the API hands the code back, so it can be shown. */
      requestCode: (to: { phone?: string, email?: string }) => call<{ code?: string | null }>('/auth/codes', { method: 'POST', body: to }),
      signIn: (to: { phone?: string, email?: string }, code: string) =>
        call<SignedIn>('/auth/sessions', { method: 'POST', body: { ...to, code } }),
      /** The signed-in person, or null. */
      session: () => call<SignedIn | null>('/auth/session'),
      signOut: () => call<void>('/auth/session', { method: 'DELETE' }),
    },
    admin: {
      me: () => call<{ role: StaffRole }>('/admin/me'),
      people: (query?: string) => call<AdminPerson[]>('/admin/people', { query: query ? { query } : undefined }),
      history: (userId: ID) => call<AdminEntry[]>(`/admin/people/${userId}/history`),
      exportPerson: (userId: ID) => call<Record<string, unknown>>(`/admin/people/${userId}/export`),
      messages: () => call<AdminMessage[]>('/admin/messages'),
      removeMessage: (messageId: ID, why?: string) =>
        call<void>(`/admin/messages/${messageId}`, { method: 'DELETE', body: why ? { why } : undefined }),
      health: (days?: number) => call<AdminHealth>('/admin/health', { query: days ? { days } : undefined }),
      visits: (days?: number) => call<AdminVisits>('/admin/visits', { query: days ? { days } : undefined }),
      sms: () => call<AdminSms>('/admin/sms'),
      trends: (days?: number) => call<AdminTrends>('/admin/trends', { query: days ? { days } : undefined }),
      funnel: (days?: number) => call<AdminFunnel>('/admin/funnel', { query: days ? { days } : undefined }),
      events: (when: 'upcoming' | 'past' | 'cancelled', query?: string) =>
        call<AdminEvent[]>('/admin/events', { query: { when, ...(query ? { query } : {}) } }),
      /** Shows the organisers' numbers, so looking is recorded with your name. */
      event: (eventId: ID) => call<AdminEventDetail>(`/admin/events/${eventId}`),
      games: (when: 'new' | 'upcoming' | 'played' | 'cancelled', query?: string) =>
        call<AdminGame[]>('/admin/games', { query: { when, ...(query ? { query } : {}) } }),
      venues: (when: 'waiting' | 'live' | 'declined', query?: string) =>
        call<AdminVenue[]>('/admin/venues', { query: { when, ...(query ? { query } : {}) } }),
      venuesWaiting: () => call<{ waiting: number }>('/admin/venues/waiting'),
      /** Live for players; its owner is told. */
      approveVenue: (venueId: ID) => call<void>(`/admin/venues/${venueId}/approve`, { method: 'POST' }),
      /** Hidden from players until its owner changes what the note asks; they're told. */
      declineVenue: (venueId: ID, why: string) => call<void>(`/admin/venues/${venueId}/decline`, { method: 'POST', body: { why } }),
      /** Calls a game off on PlayChale's behalf; its host and players are told why. */
      takeDownGame: (gameId: ID, why: string) => call<void>(`/admin/games/${gameId}/take-down`, { method: 'POST', body: { why } }),
    },
  }
}

/** What to tell a person when a call fails: the API's own sentence when it sent one. */
export function errorMessage(error: unknown): string {
  const data = (error as FetchError | undefined)?.data as { error?: { message?: string } } | undefined
  if (data?.error?.message) return data.error.message
  if ((error as FetchError | undefined)?.statusCode === undefined) return 'Couldn’t reach PlayChale. Check the connection and try again.'
  return 'Something went wrong. Please try again.'
}
