import type { SignedIn, StaffRole } from '~/types/admin'

/**
 * Who is signed in, and whether they work here. Asked once per visit and kept; signing in or out
 * asks again.
 */
export function useStaffSession() {
  const user = useState<SignedIn | null>('staff:user', () => null)
  const role = useState<StaffRole | null>('staff:role', () => null)
  const ready = useState('staff:ready', () => false)
  const api = useAdminApi()

  const load = async () => {
    try {
      user.value = await api.auth.session()
    }
    catch {
      user.value = null
    }
    role.value = null
    if (user.value) {
      try {
        role.value = (await api.admin.me()).role
      }
      catch {
        // Signed in, but not staff. Deliberately not signed out: the session is shared with the
        // player app, and signing them out here would sign them out there too.
        role.value = null
      }
    }
    ready.value = true
  }

  const ensure = async () => {
    if (!ready.value) await load()
    return { user: user.value, role: role.value }
  }

  const signOut = async () => {
    await api.auth.signOut().catch(() => {})
    user.value = null
    role.value = null
    await navigateTo('/sign-in')
  }

  return { user, role, ensure, reload: load, signOut }
}
