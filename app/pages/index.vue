<script setup lang="ts">
import type { AdminHealth, AdminSms } from '~/types/admin'

/**
 * How the app is doing. Counts, not charts: with few players a chart is a line along the floor, and
 * the honest thing to show is the number.
 */
useHead({ title: 'Overview · PlayChale Admin' })

const api = useAdminApi()
const days = ref('30')
const windows = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: 'Year' },
]

const { data: health, status, error, refresh } = await useAsyncData<AdminHealth | null>(
  'admin:health',
  () => api.admin.health(Number(days.value)),
  { default: () => null, lazy: true, watch: [days] },
)

const tiles = computed(() => health.value
  ? [
      { label: 'New players', value: health.value.signups, icon: 'ph:user-plus' },
      { label: 'Active players', value: health.value.activePeople, icon: 'ph:person-simple-run' },
      { label: 'Games created', value: health.value.gamesCreated, icon: 'ph:calendar-plus' },
      { label: 'Games played', value: health.value.gamesPlayed, icon: 'ph:flag-checkered' },
      { label: 'Called off', value: health.value.gamesCalledOff, icon: 'ph:calendar-x' },
      { label: 'Joins', value: health.value.joins, icon: 'ph:sign-in' },
      { label: 'Messages', value: health.value.messages, icon: 'ph:chat-circle-text' },
    ]
  : [])

/** The SMS bundle: asked of the provider, so it's loaded on its own and never holds the page up. */
const { data: sms } = await useAsyncData<AdminSms | null>('admin:sms', () => api.admin.sms(), { default: () => null, lazy: true })

/** Of the games made in the window, the share that were called off: the number to watch. */
const calledOffShare = computed(() => {
  const h = health.value
  return h && h.gamesCreated > 0 ? Math.round((h.gamesCalledOff / h.gamesCreated) * 100) : null
})
</script>

<template>
  <div class="pb-24">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-[28px] leading-9 font-semibold">Overview</h1>
      <BaseChipGroup v-model="days" :options="windows" label="Period" size="sm" />
    </div>

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load the numbers" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !health" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <BaseSkeleton v-for="n in 7" :key="n" class="h-24 rounded-[16px]" />
    </div>

    <template v-else-if="health">
      <ul class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <li v-for="tile in tiles" :key="tile.label" class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon :name="tile.icon" class="size-4" /> {{ tile.label }}</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ tile.value }}</p>
        </li>
      </ul>
      <p v-if="calledOffShare !== null" class="mt-4 text-[14px] text-body">
        {{ calledOffShare }}% of games made in this period were called off.
      </p>
    </template>

    <section v-if="sms" class="mt-8" aria-labelledby="sms-heading">
      <h2 id="sms-heading" class="text-[18px] font-semibold">SMS</h2>
      <div class="mt-3 rounded-[16px] p-4 shadow-pill" :class="sms.low ? 'bg-[#fef3f2]' : 'bg-surface'">
        <template v-if="!sms.configured">
          <p class="text-[15px] text-body">Texts aren’t set up, so nobody can sign in with a phone number. People sign in by email.</p>
        </template>
        <template v-else-if="sms.credits === null">
          <p class="text-[15px] text-body">Couldn’t ask the SMS provider for the balance just now.</p>
        </template>
        <template v-else>
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon name="ph:chat-text" class="size-4" /> SMS credits left</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums" :class="sms.low ? 'text-[#912018]' : ''">{{ sms.credits.toLocaleString('en-GB') }}</p>
          <p v-if="sms.low" class="mt-2 text-[14px] text-[#912018]">Running low: top the bundle up before sign-in codes stop going out.</p>
          <p v-else class="mt-2 text-[13px] text-mute">Each sign-in code by text uses one. You’ll be warned below {{ sms.lowAt.toLocaleString('en-GB') }}.</p>
        </template>
      </div>
    </section>
  </div>
</template>
