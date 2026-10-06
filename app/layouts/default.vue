<script setup lang="ts">
/**
 * The desk's frame: who you are, the three places, and a way out. Utilitarian on purpose — this is
 * a tool for a handful of people, not a product, so it spends no space on anything but the work.
 */
const { user, role, signOut } = useStaffSession()
const route = useRoute()
const tabs = [
  { to: '/', label: 'Overview', icon: 'ph:chart-bar' },
  { to: '/people', label: 'People', icon: 'ph:users' },
  { to: '/messages', label: 'Messages', icon: 'ph:chat-circle-text' },
]
const current = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const showChrome = computed(() => !!role.value && route.path !== '/sign-in')
</script>

<template>
  <div class="min-h-dvh bg-canvas">
    <header v-if="showChrome" class="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" class="size-6">
          <span>PlayChale</span>
          <BasePill tone="accent" icon="ph:shield-check-fill">Admin</BasePill>
        </NuxtLink>
        <nav aria-label="Admin" class="hidden flex-1 items-center gap-1 sm:flex">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            :aria-current="current(tab.to) ? 'page' : undefined"
            class="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors"
            :class="current(tab.to) ? 'bg-brand text-white' : 'text-body hover:bg-subtle hover:text-ink'"
          >
            <Icon :name="tab.icon" class="size-4" /> {{ tab.label }}
          </NuxtLink>
        </nav>
        <div class="ml-auto flex min-w-0 items-center gap-3">
          <span class="hidden truncate text-[13px] text-mute md:block">{{ user?.name || user?.email }} · {{ role }}</span>
          <BaseButton variant="secondary" size="sm" @click="signOut">Sign out</BaseButton>
        </div>
      </div>
      <!-- On a phone the places sit in their own row rather than squeezing beside the name. -->
      <nav aria-label="Admin" class="flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:hidden">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          :aria-current="current(tab.to) ? 'page' : undefined"
          class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium"
          :class="current(tab.to) ? 'bg-brand text-white' : 'bg-surface text-ink shadow-pill'"
        >
          <Icon :name="tab.icon" class="size-4" /> {{ tab.label }}
        </NuxtLink>
      </nav>
    </header>
    <main class="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>
