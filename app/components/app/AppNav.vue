<script setup lang="ts">
import type { AdminWaiting } from '~/types/admin'

/**
 * The desk's places, in groups: what's happening, what's waiting for staff, and promoting the app.
 * The same list sits in the sidebar on a laptop and in the menu on a phone.
 */
const props = defineProps<{ waiting: AdminWaiting | null }>()
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()

interface NavItem { to: string, label: string, icon: string }

const groups: { label?: string, items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Overview', icon: 'ph:chart-bar' }] },
  {
    label: 'Activity',
    items: [
      { to: '/people', label: 'People', icon: 'ph:users' },
      { to: '/games', label: 'Games', icon: 'ph:soccer-ball' },
      { to: '/events', label: 'Events', icon: 'ph:trophy' },
    ],
  },
  {
    label: 'To review',
    items: [
      { to: '/venues', label: 'Venues', icon: 'ph:storefront' },
      { to: '/reports', label: 'Reports', icon: 'ph:flag' },
      { to: '/messages', label: 'Messages', icon: 'ph:chat-circle-text' },
    ],
  },
  { label: 'Promote', items: [{ to: '/share', label: 'Share images', icon: 'ph:image-square' }] },
]

const current = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const countFor = (to: string) => (to === '/venues' ? props.waiting?.venues : to === '/reports' ? props.waiting?.reports : 0) ?? 0
</script>

<template>
  <nav aria-label="Admin" class="grid gap-5">
    <div v-for="(group, g) in groups" :key="g">
      <p v-if="group.label" class="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-mute uppercase">{{ group.label }}</p>
      <ul class="grid gap-0.5">
        <li v-for="item in group.items" :key="item.to">
          <NuxtLink
            :to="item.to"
            :aria-current="current(item.to) ? 'page' : undefined"
            class="flex h-10 items-center gap-3 rounded-[12px] px-3 text-[14px] font-medium transition-colors"
            :class="current(item.to) ? 'bg-brand text-white' : 'text-body hover:bg-subtle hover:text-ink'"
            @click="emit('navigate')"
          >
            <Icon :name="item.icon" class="size-[18px] shrink-0" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="countFor(item.to)"
              class="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-ink tabular-nums"
              :aria-label="`${countFor(item.to)} waiting`"
            >{{ countFor(item.to) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
