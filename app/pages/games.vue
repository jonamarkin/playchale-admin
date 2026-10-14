<script setup lang="ts">
import type { AdminGame } from '~/types/admin'
import type { ChipOption } from '~/types/ui'

/**
 * Every game made on PlayChale, newest first, where a fake or spam one shows up. Taking one down
 * calls it off and tells its host and players why, in the reason given here; it's recorded with
 * your name. A competition's fixtures are the competition's to change, so they can't be.
 */
useHead({ title: 'Games · PlayChale Admin' })

const api = useAdminApi()
const notify = useNotify()
const { appBase } = useRuntimeConfig().public

type When = 'new' | 'upcoming' | 'played' | 'cancelled'
const when = ref<When>('new')
const whens: ChipOption<When>[] = [
  { value: 'new', label: 'Newest made' },
  { value: 'upcoming', label: 'Coming up' },
  { value: 'played', label: 'Been played' },
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

const { data: games, status, error, refresh } = await useAsyncData<AdminGame[]>(
  'admin:games',
  () => api.admin.games(when.value, searched.value || undefined),
  { default: () => [], lazy: true, watch: [when, searched] },
)

const isPast = (g: AdminGame) => new Date(g.startsAt).getTime() < Date.now()
const canTakeDown = (g: AdminGame) => !g.fixture && g.status !== 'cancelled' && g.status !== 'completed'

/** The game being taken down, and why: asked on the page, not in a browser prompt. */
const removing = ref<AdminGame | null>(null)
const why = ref('')
const whyError = ref<string | null>(null)
const busy = ref(false)
const startTakingDown = (g: AdminGame) => {
  removing.value = g
  why.value = ''
  whyError.value = null
}

const confirmTakeDown = async () => {
  const game = removing.value
  if (!game) return
  if (!why.value.trim()) {
    whyError.value = 'Say why: its host and players read this.'
    return
  }
  busy.value = true
  try {
    await api.admin.takeDownGame(game.id, why.value.trim())
    games.value = games.value.map(g => (g.id === game.id ? { ...g, status: 'cancelled', cancelReason: why.value.trim() } : g))
    notify.success('Game taken down. Its host and players were told why.', 'ph:prohibit-bold')
    removing.value = null
  }
  catch (e) {
    notify.error(errorMessage(e))
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="pb-24">
    <h1 class="text-[28px] leading-9 font-semibold">Games</h1>
    <p class="mt-1 text-[15px] text-body">Every game made on PlayChale. Take down one that’s fake or spam: its host and players are told why.</p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <BaseChipGroup v-model="when" :options="whens" label="Which games" size="sm" />
      <BaseField v-slot="{ id }" label="Find a game" hide-label class="min-w-0 flex-1 basis-64">
        <BaseInput :id="id" v-model="query" icon="ph:magnifying-glass" placeholder="Title, place or host" autocomplete="off" />
      </BaseField>
    </div>

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load games" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !games.length" class="mt-6 space-y-2">
      <BaseSkeleton v-for="n in 5" :key="n" class="h-20 rounded-[14px]" />
    </div>

    <BaseEmptyState
      v-else-if="!games.length"
      icon="ph:soccer-ball"
      :title="searched ? `Nothing matches “${searched}”` : 'No games here yet'"
      description="Games appear here as soon as they’re made."
      class="mt-6"
    />

    <ul v-else aria-label="Games" class="mt-6 space-y-2">
      <li v-for="g in games" :key="g.id" class="rounded-[14px] bg-surface p-4 shadow-pill">
        <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div class="min-w-0 flex-1 basis-72">
            <p class="flex flex-wrap items-center gap-2">
              <a :href="`${appBase}/games/${g.id}`" target="_blank" rel="noopener" class="truncate text-[16px] font-semibold hover:underline">{{ g.title }}</a>
              <BasePill v-if="g.status === 'cancelled'" tone="danger">Called off</BasePill>
              <BasePill v-else-if="g.status === 'completed'">Played</BasePill>
              <BasePill v-if="g.visibility === 'private'" icon="ph:lock-simple">Invite only</BasePill>
              <BasePill v-if="g.hostGuest" tone="warning" icon="ph:key">Guest host</BasePill>
              <BasePill v-if="g.fixture" tone="brand">Fixture</BasePill>
            </p>
            <p class="mt-0.5 text-[13px] text-mute">
              {{ formatWhen(g.startsAt) }}<template v-if="isPast(g) && g.status !== 'cancelled'"> (been)</template>
              · {{ [g.venueName, g.venueArea].filter(Boolean).join(', ') }}
            </p>
            <p class="mt-0.5 text-[13px] text-body">
              Hosted by {{ g.hostName || 'someone who’s left' }} · made {{ formatRelative(g.createdAt) }}
            </p>
            <p v-if="g.status === 'cancelled' && g.cancelReason" class="mt-1.5 text-[13px] text-body">“{{ g.cancelReason }}”</p>
          </div>
          <div class="shrink-0 text-[13px] sm:text-right">
            <p class="font-medium tabular-nums">{{ g.players }}{{ g.capacity ? ` / ${g.capacity}` : '' }} in</p>
            <p class="text-mute tabular-nums">{{ g.messages }} {{ g.messages === 1 ? 'message' : 'messages' }}</p>
          </div>
          <BaseButton v-if="canTakeDown(g) && removing?.id !== g.id" variant="danger" size="sm" @click="startTakingDown(g)">
            <Icon name="ph:prohibit" class="size-4" /> Take down
          </BaseButton>
        </div>

        <form v-if="removing?.id === g.id" class="mt-3 flex flex-wrap items-end gap-2 border-t border-hairline pt-3" novalidate @submit.prevent="confirmTakeDown">
          <BaseField v-slot="{ id, describedBy, invalid }" label="Why it’s coming down (its host and players read this)" :error="whyError" class="min-w-0 flex-1 basis-72">
            <BaseInput :id="id" v-model="why" :described-by="describedBy" :invalid="invalid" :maxlength="140" placeholder="e.g. Not a real game: it advertises phones" />
          </BaseField>
          <BaseButton type="submit" variant="danger" size="sm" :loading="busy">Take it down</BaseButton>
          <BaseButton type="button" variant="ghost" size="sm" :disabled="busy" @click="removing = null">Keep it</BaseButton>
        </form>
      </li>
    </ul>
  </div>
</template>
