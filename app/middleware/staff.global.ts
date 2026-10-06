/**
 * Every page but sign-in is staff only. Signed out goes to sign-in; signed in but not staff goes to
 * a page that says there's nothing here for that account. The API refuses them either way — this
 * only spares them a screen of errors.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/sign-in') return
  const { ensure } = useStaffSession()
  const { user, role } = await ensure()
  if (!user) return navigateTo({ path: '/sign-in', query: to.fullPath === '/' ? undefined : { redirect: to.fullPath } })
  if (!role && to.path !== '/nothing') return navigateTo('/nothing')
  if (role && to.path === '/nothing') return navigateTo('/')
})
