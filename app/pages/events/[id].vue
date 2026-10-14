<script setup lang="ts">
import type { AdminEventDetail, AdminEventGame } from '~/types/admin'

/**
 * One event, for the day it runs: how far each game's results have got, and who runs it, with their
 * number and email to call or write. Showing those is recorded with your name, as looking someone
 * up is.
 */
const route = useRoute()
const api = useAdminApi()
const { appBase } = useRuntimeConfig().public
const id = computed(() => String(route.params.id))

const { data, status, error, refresh } = await useAsyncData<AdminEventDetail | null>(
  () => `admin:event:${id.value}`,
  () => api.admin.event(id.value),
  { default: () => null, lazy: true },
)
useHead({ title: () => `${data.value?.event.name ?? 'Event'} · PlayChale Admin` })

const kinds: Record<AdminEventGame['entryKind'], string> = { single: 'On their own', pair: 'Pairs', team: 'Teams' }
const formats: Record<AdminEventGame['format'], string> = { knockout: 'Knockout', league: 'League', placings: 'Heats', pools: 'Pools, then a knockout' }
const progress = (inn: number, total: number) => (total > 0 ? Math.round((inn / total) * 100) : 0)
</script>

<template>
  <div class="pb-24">
    <NuxtLink to="/events" class="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand hover:underline">
      <Icon name="ph:arrow-left" class="size-4" /> All events
    </NuxtLink>

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load this event" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !data" class="mt-4 space-y-3">
      <BaseSkeleton class="h-10 w-2/3 rounded-[10px]" />
      <BaseSkeleton class="h-28 rounded-[16px]" />
      <BaseSkeleton class="h-40 rounded-[16px]" />
    </div>

    <template v-else-if="data">
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <h1 class="text-[28px] leading-9 font-semibold">{{ data.event.name }}</h1>
        <BasePill v-if="data.event.live" tone="accent" icon="ph:broadcast-fill">On today</BasePill>
        <BasePill v-else-if="data.event.status === 'finished'">Finished</BasePill>
        <BasePill v-else-if="data.event.status === 'cancelled'" tone="danger">Called off</BasePill>
      </div>
      <p class="mt-1 text-[15px] text-body">{{ formatDays(data.event.startsOn, data.event.endsOn) }} · {{ data.event.organisation }}</p>
      <p v-if="data.event.publicSlug" class="mt-2">
        <a :href="`${appBase}/e/${data.event.publicSlug}`" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand hover:underline">
          Its public page <Icon name="ph:arrow-square-out" class="size-4" />
        </a>
      </p>

      <ul class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <li class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon name="ph:users-three" class="size-4" /> People</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ data.event.people.toLocaleString('en-GB') }}</p>
          <p v-if="data.event.guests" class="mt-1 text-[13px] text-body">{{ data.event.guests }} without an account</p>
        </li>
        <li class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon name="ph:trophy" class="size-4" /> Games</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ data.event.games }}</p>
        </li>
        <li class="col-span-2 rounded-[16px] bg-surface p-4 shadow-pill sm:col-span-1">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon name="ph:flag-checkered" class="size-4" /> Results in</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">
            {{ data.event.resultsIn }}<span class="text-[16px] font-normal text-mute"> of {{ data.event.resultsTotal }}</span>
          </p>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
            <div class="h-full rounded-full bg-brand" :style="{ width: `${progress(data.event.resultsIn, data.event.resultsTotal)}%` }" />
          </div>
        </li>
      </ul>

      <section class="mt-8" aria-labelledby="organisers-heading">
        <h2 id="organisers-heading" class="text-[18px] font-semibold">Who’s running it</h2>
        <p class="mt-1 text-[13px] text-mute">Seeing these numbers is recorded with your name.</p>
        <p v-if="!data.organisers.length" class="mt-3 text-[15px] text-body">Nobody with an account runs its workspace any more.</p>
        <ul v-else class="mt-3 grid gap-2 sm:grid-cols-2">
          <li v-for="o in data.organisers" :key="o.id" class="rounded-[14px] bg-surface p-4 shadow-pill">
            <p class="flex items-center gap-2">
              <span class="truncate text-[15px] font-medium">{{ o.name || 'No name yet' }}</span>
              <BasePill :tone="o.role === 'owner' ? 'brand' : 'neutral'">{{ o.role === 'owner' ? 'Owner' : 'Admin' }}</BasePill>
            </p>
            <p v-if="o.phone" class="mt-2 flex items-center gap-2 text-[14px]">
              <Icon name="ph:phone" class="size-4 text-mute" aria-hidden="true" />
              <a :href="`tel:${o.phone}`" class="font-medium text-brand tabular-nums select-all hover:underline">{{ o.phone }}</a>
            </p>
            <p v-if="o.email" class="mt-1 flex min-w-0 items-center gap-2 text-[14px]">
              <Icon name="ph:envelope-simple" class="size-4 shrink-0 text-mute" aria-hidden="true" />
              <a :href="`mailto:${o.email}`" class="truncate text-brand select-all hover:underline">{{ o.email }}</a>
            </p>
          </li>
        </ul>
      </section>

      <section class="mt-8" aria-labelledby="games-heading">
        <h2 id="games-heading" class="text-[18px] font-semibold">Games</h2>
        <p v-if="!data.games.length" class="mt-3 text-[15px] text-body">No games added yet.</p>
        <div v-else class="mt-3 overflow-x-auto rounded-[16px] bg-surface p-4 shadow-pill">
          <table class="w-full min-w-[520px] border-collapse text-[14px]">
            <thead>
              <tr class="text-left text-[12px] text-mute">
                <th scope="col" class="pb-1.5 font-medium">Game</th>
                <th scope="col" class="pb-1.5 font-medium">How it’s played</th>
                <th scope="col" class="w-20 pb-1.5 text-right font-medium">Entries</th>
                <th scope="col" class="w-40 pb-1.5 pl-4 font-medium">Results</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in data.games" :key="g.id" class="border-t border-hairline">
                <th scope="row" class="py-2.5 pr-2 text-left font-medium">{{ g.name }}</th>
                <td class="py-2.5 pr-2 text-body">{{ kinds[g.entryKind] }} · {{ formats[g.format] ?? g.format }}</td>
                <td class="py-2.5 text-right tabular-nums">{{ g.entries }}</td>
                <td class="py-2.5 pl-4">
                  <span v-if="g.resultsTotal" class="tabular-nums">{{ g.resultsIn }} of {{ g.resultsTotal }}</span>
                  <span v-else class="text-mute">Not drawn yet</span>
                  <div v-if="g.resultsTotal" class="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                    <div class="h-full rounded-full bg-brand" :style="{ width: `${progress(g.resultsIn, g.resultsTotal)}%` }" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
