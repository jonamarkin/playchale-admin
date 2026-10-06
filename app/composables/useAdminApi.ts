import type { FetchError } from 'ofetch'
import type { AdminEntry, AdminHealth, AdminMessage, AdminPerson, ID, SignedIn, StaffRole } from '~/types/admin'

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
