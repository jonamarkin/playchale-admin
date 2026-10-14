<script setup lang="ts">
import type { AdminEvent } from '~/types/admin'
import type { ChipOption } from '~/types/ui'

/**
 * Games days and corporate games: what's coming up (on today first), what's been, what was called
 * off. On the day, open one to see how its results are getting on and who to call.
 */
useHead({ title: 'Events · PlayChale Admin' })

const api = useAdminApi()

type When = 'upcoming' | 'past' | 'cancelled'
const when = ref<When>('upcoming')
const whens: ChipOption<When>[] = [
  { value: 'upcoming', label: 'Coming up' },
  { value: 'past', label: 'Been' },
  { value: 'cancelled', label: 'Called off' },
]

const query = ref('')
const searched = ref('')
let typing: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(typing)
  typing = setTimeout(() => (searched.value = value.trim()), 350)
})
onBeforeUnmount(() => clearTimeout(typing))

const { data: events, status, error, refresh } = await useAsyncData<AdminEvent[]>(
  'admin:events',
  () => api.admin.events(when.value, searched.value || undefined),
  { default: () => [], lazy: true, watch: [when, searched] },
)

const progress = (e: AdminEvent) => (e.resultsTotal > 0 ? Math.round((e.resultsIn / e.resultsTotal) * 100) : 0)
</script>

<template>
  <div class="pb-24">
    <h1 class="text-[28px] leading-9 font-semibold">Events</h1>
    <p class="mt-1 text-[15px] text-body">Games days and corporate games. On the day, open one to see how its results are going and who to call.</p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <BaseChipGroup v-model="when" :options="whens" label="Which events" size="sm" />
      <BaseField v-slot="{ id }" label="Find an event" hide-label class="min-w-0 flex-1 basis-64">
        <BaseInput :id="id" v-model="query" icon="ph:magnifying-glass" placeholder="Event, or who’s running it" autocomplete="off" />
      </BaseField>
    </div>

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load events" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !events.length" class="mt-6 space-y-2">
      <BaseSkeleton v-for="n in 4" :key="n" class="h-24 rounded-[14px]" />
    </div>

    <BaseEmptyState
      v-else-if="!events.length"
      icon="ph:trophy"
      :title="searched ? `Nothing matches “${searched}”` : when === 'upcoming' ? 'Nothing coming up' : when === 'past' ? 'No events have been yet' : 'Nothing called off'"
      description="Games days and corporate games appear here once an organiser sets one up."
      class="mt-6"
    />

    <ul v-else aria-label="Events" class="mt-6 space-y-2">
      <li v-for="e in events" :key="e.id">
        <NuxtLink :to="`/events/${e.id}`" class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-surface p-4 shadow-pill transition-colors hover:bg-subtle">
          <div class="min-w-0 flex-1 basis-72">
            <p class="flex flex-wrap items-center gap-2">
              <span class="truncate text-[16px] font-semibold">{{ e.name }}</span>
              <BasePill v-if="e.live" tone="accent" icon="ph:broadcast-fill">On today</BasePill>
              <BasePill v-else-if="e.status === 'finished'">Finished</BasePill>
              <BasePill v-else-if="e.status === 'cancelled'" tone="danger">Called off</BasePill>
            </p>
            <p class="mt-0.5 truncate text-[13px] text-mute">{{ formatDays(e.startsOn, e.endsOn) }} · {{ e.organisation }}</p>
          </div>
          <div class="w-32 shrink-0 text-[13px]">
            <p class="font-medium tabular-nums">{{ e.people.toLocaleString('en-GB') }} {{ e.people === 1 ? 'person' : 'people' }}</p>
            <p class="text-mute tabular-nums">{{ e.guests ? `${e.guests} without an account` : `${e.games} ${e.games === 1 ? 'game' : 'games'}` }}</p>
          </div>
          <div class="w-40 shrink-0">
            <p class="text-[13px] tabular-nums">
              <template v-if="e.resultsTotal">{{ e.resultsIn }} of {{ e.resultsTotal }} results</template>
              <span v-else class="text-mute">Nothing drawn yet</span>
            </p>
            <div v-if="e.resultsTotal" class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <div class="h-full rounded-full bg-brand" :style="{ width: `${progress(e)}%` }" />
            </div>
          </div>
          <Icon name="ph:caret-right" class="size-5 shrink-0 text-mute max-sm:hidden" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
