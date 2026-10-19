<script setup lang="ts">
import type { AdminWaiting } from '~/types/admin'

/**
 * The desk's frame: who you are, the places, and a way out. Utilitarian on purpose — this is
 * a tool for a handful of people, not a product, so it spends no space on anything but the work.
 *
 * The places are grouped (AppNav): a sidebar on a laptop, a menu on a phone, so there's room for
 * more of them without a row of tabs that no longer fits.
 */
const { user, role, signOut } = useStaffSession()
const route = useRoute()
const api = useAdminApi()

/**
 * What's waiting for staff (venues to check, reported things): counted beside their places, so it's
 * seen without going looking. Asked again on every page, which keeps it current (and recovers if the
 * first ask raced signing in).
 */
const waiting = useState<AdminWaiting | null>('admin:waiting', () => null)
watch([role, () => route.path], ([staff]) => {
  if (staff) api.admin.waiting().then(r => (waiting.value = r)).catch(() => undefined)
}, { immediate: true })
const anyWaiting = computed(() => (waiting.value?.venues ?? 0) + (waiting.value?.reports ?? 0) > 0)
const showChrome = computed(() => !!role.value && route.path !== '/sign-in')

/* The phone menu: opens over the page, closes on a place picked, Escape, or the backdrop. */
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const closeMenu = (refocus = true) => {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (refocus) nextTick(() => menuButton.value?.focus())
}
watch(() => route.path, () => closeMenu(false))
watch(menuOpen, async (open) => {
  if (!open) return
  await nextTick()
  panel.value?.querySelector<HTMLElement>('a, button')?.focus()
})
/** Escape closes it; Tab stays inside it while it's open. */
const onPanelKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeMenu()
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  const stops = [...panel.value.querySelectorAll<HTMLElement>('a, button')]
  const first = stops[0]
  const last = stops.at(-1)
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last?.focus()
  }
  else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <div class="min-h-dvh bg-canvas">
    <template v-if="showChrome">
      <!-- Laptop: the sidebar -->
      <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-hairline bg-surface lg:flex">
        <NuxtLink to="/" class="flex h-16 shrink-0 items-center gap-2 px-5 font-semibold">
          <img src="/favicon.svg" alt="" class="size-6">
          <span>PlayChale</span>
          <BasePill tone="accent" icon="ph:shield-check-fill">Admin</BasePill>
        </NuxtLink>
        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <AppNav :waiting="waiting" />
        </div>
        <div class="shrink-0 border-t border-hairline px-5 py-4">
          <p class="truncate text-[14px] font-medium">{{ user?.name || user?.email }}</p>
          <p class="text-[13px] text-mute capitalize">{{ role }}</p>
          <BaseButton variant="secondary" size="sm" class="mt-3" @click="signOut">Sign out</BaseButton>
        </div>
      </aside>

      <!-- Phone and tablet: a slim bar and a menu -->
      <header class="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur lg:hidden">
        <div class="flex h-14 items-center gap-3 px-4 sm:px-6">
          <NuxtLink to="/" class="flex shrink-0 items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" class="size-6">
            <span>PlayChale</span>
            <BasePill tone="accent" icon="ph:shield-check-fill">Admin</BasePill>
          </NuxtLink>
          <button
            ref="menuButton"
            type="button"
            class="relative ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-subtle px-4 text-[14px] font-medium"
            aria-haspopup="dialog"
            :aria-expanded="menuOpen"
            @click="menuOpen = true"
          >
            <Icon name="ph:list-bold" class="size-4" /> Menu
            <span v-if="anyWaiting" class="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-accent ring-2 ring-surface" aria-label="Something is waiting" />
          </button>
        </div>
      </header>

      <div v-if="menuOpen" class="fixed inset-0 z-50 lg:hidden">
        <div class="absolute inset-0 bg-night/40" aria-hidden="true" @click="closeMenu()" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          class="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-surface shadow-float"
          @keydown="onPanelKey"
        >
          <div class="flex h-14 shrink-0 items-center justify-between px-4">
            <span class="font-semibold">Menu</span>
            <button type="button" class="grid size-10 place-items-center rounded-full hover:bg-subtle" aria-label="Close menu" @click="closeMenu()">
              <Icon name="ph:x-bold" class="size-4" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <AppNav :waiting="waiting" @navigate="closeMenu(false)" />
          </div>
          <div class="shrink-0 border-t border-hairline px-5 py-4">
            <p class="truncate text-[14px] font-medium">{{ user?.name || user?.email }} <span class="font-normal text-mute capitalize">· {{ role }}</span></p>
            <BaseButton variant="secondary" size="sm" class="mt-3" @click="signOut">Sign out</BaseButton>
          </div>
        </div>
      </div>
    </template>

    <main :class="showChrome ? 'lg:pl-60' : ''">
      <div class="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
