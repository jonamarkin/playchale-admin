<script setup lang="ts">
import type { AdminReported, AdminWaiting } from '~/types/admin'
import type { ChipOption } from '~/types/ui'

/**
 * What players reported: a game, something said in one, a person, a venue. Every report about one
 * thing is one decision, the most reported first. Take it down with a reason (a game is called off
 * and its players told, a message removed, a venue taken off), or leave it. Whoever reported hears it
 * was looked at, never what was decided. Every decision is recorded with your name.
 */
useHead({ title: 'Reports · PlayChale Admin' })

const api = useAdminApi()
const notify = useNotify()
const { appBase } = useRuntimeConfig().public

type View = 'open' | 'decided'
const view = ref<View>('open')
const views: ChipOption<View>[] = [
  { value: 'open', label: 'To decide' },
  { value: 'decided', label: 'Decided' },
]

const { data: reported, status, error, refresh } = await useAsyncData<AdminReported[]>(
  'admin:reports',
  () => api.admin.reports(view.value === 'decided'),
  { default: () => [], lazy: true, watch: [view] },
)
const waitingCounts = useState<AdminWaiting | null>('admin:waiting')

const kinds: Record<AdminReported['subjectType'], { label: string, icon: string }> = {
  game: { label: 'Game', icon: 'ph:soccer-ball' },
  message: { label: 'Message', icon: 'ph:chat-circle-text' },
  user: { label: 'Person', icon: 'ph:user' },
  venue: { label: 'Venue', icon: 'ph:storefront' },
}
const reasons: Record<string, string> = {
  spam: 'Fake or spam', abuse: 'Abusive or harassing', unsafe: 'Unsafe', wrong: 'Wrong information', other: 'Something else',
}
/** Where to see it in PlayChale, if there's somewhere. */
const linkTo = (r: AdminReported) => {
  if (!r.title) return null
  if (r.subjectType === 'game') return `${appBase}/games/${r.subjectId}`
  if (r.subjectType === 'message' && r.gameId) return `${appBase}/games/${r.gameId}`
  if (r.subjectType === 'venue') return `${appBase}/venues/${r.subjectId}`
  return null
}
/** Its state now, when that's already an answer: a game called off, a venue off, an account closed. */
const stateNote = (r: AdminReported) => {
  if (!r.title) return 'Gone already'
  return ({ cancelled: 'Called off', completed: 'Played', declined: 'Off PlayChale', pending: 'Waiting for review', closed: 'Account closed' } as Record<string, string>)[r.state ?? ''] ?? null
}
const takeDownLabel = (r: AdminReported) =>
  !r.title ? 'Close as dealt with'
  : ({ game: 'Call the game off', message: 'Remove the message', venue: 'Take the venue off', user: 'Mark as dealt with' } as const)[r.subjectType]
const key = (r: AdminReported) => `${r.subjectType}:${r.subjectId}`

/** The decision being made, and its reason: asked on the page, not in a browser prompt. */
const deciding = ref<{ key: string, action: 'take-down' | 'dismiss' } | null>(null)
const why = ref('')
const whyError = ref<string | null>(null)
const busy = ref(false)
const start = (r: AdminReported, action: 'take-down' | 'dismiss') => {
  deciding.value = { key: key(r), action }
  why.value = ''
  whyError.value = null
}

const decide = async (r: AdminReported) => {
  const action = deciding.value?.action
  if (!action) return
  if (action === 'take-down' && !why.value.trim()) {
    whyError.value = r.subjectType === 'user' ? 'Say what was done: it’s recorded.' : 'Say why: it’s recorded, and its people read it.'
    return
  }
  busy.value = true
  try {
    if (action === 'take-down') await api.admin.takeDownReported(r.subjectType, r.subjectId, why.value.trim())
    else await api.admin.dismissReports(r.subjectType, r.subjectId, why.value.trim() || undefined)
    notify.success(action === 'take-down' ? 'Dealt with. Whoever reported it is thanked.' : 'Left as it is. Whoever reported it is thanked.', 'ph:check-circle-bold')
    reported.value = reported.value.filter(x => key(x) !== key(r))
    deciding.value = null
    api.admin.waiting().then(w => (waitingCounts.value = w)).catch(() => undefined)
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
    <h1 class="text-[28px] leading-9 font-semibold">Reports</h1>
    <p class="mt-1 max-w-[720px] text-[15px] text-body">
      What players told PlayChale about. Every report about one thing is one decision. Whoever reported hears it was looked at, never what was decided.
    </p>

    <BaseChipGroup v-model="view" :options="views" label="Which reports" size="sm" class="mt-4" />

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load reports" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !reported.length" class="mt-6 space-y-2">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-32 rounded-[14px]" />
    </div>

    <BaseEmptyState
      v-else-if="!reported.length"
      :icon="view === 'open' ? 'ph:check-circle' : 'ph:flag'"
      :title="view === 'open' ? 'Nothing to decide' : 'Nothing decided in the last 90 days'"
      :description="view === 'open' ? 'Reports from players appear here as they come in.' : undefined"
      class="mt-6"
    />

    <ul v-else aria-label="Reported" class="mt-6 space-y-3">
      <li v-for="r in reported" :key="`${key(r)}:${r.decidedAt ?? ''}`" class="rounded-[16px] bg-surface p-4 shadow-pill sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1 basis-72">
            <p class="flex flex-wrap items-center gap-2">
              <BasePill :icon="kinds[r.subjectType].icon">{{ kinds[r.subjectType].label }}</BasePill>
              <BasePill v-if="r.reports.length > 1" tone="warning">{{ r.reports.length }} reports</BasePill>
              <BasePill v-if="stateNote(r)" tone="neutral">{{ stateNote(r) }}</BasePill>
              <template v-if="r.outcome">
                <BasePill v-if="r.outcome === 'actioned'" tone="danger">Dealt with</BasePill>
                <BasePill v-else tone="accent">Left as it is</BasePill>
              </template>
            </p>
            <p class="mt-2 text-[16px] font-semibold break-words" :class="r.subjectType === 'message' ? 'font-normal italic' : ''">
              <template v-if="r.title">{{ r.subjectType === 'message' ? `“${r.title}”` : r.title }}</template>
              <span v-else class="text-mute">It isn’t there any more</span>
            </p>
            <p v-if="r.detail" class="mt-0.5 text-[13px] text-mute">{{ r.detail }}</p>
            <a v-if="linkTo(r)" :href="linkTo(r)!" target="_blank" rel="noopener" class="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
              Open in PlayChale <Icon name="ph:arrow-square-out" class="size-3.5" />
            </a>
          </div>
          <div v-if="view === 'open' && deciding?.key !== key(r)" class="flex flex-wrap gap-2">
            <BaseButton variant="danger" size="sm" @click="start(r, 'take-down')">{{ takeDownLabel(r) }}</BaseButton>
            <BaseButton variant="secondary" size="sm" @click="start(r, 'dismiss')">Leave it</BaseButton>
          </div>
        </div>

        <ol class="mt-3 divide-y divide-hairline rounded-[12px] bg-subtle px-3">
          <li v-for="(line, i) in r.reports" :key="i" class="py-2 text-[14px]">
            <p class="flex flex-wrap items-baseline gap-x-2">
              <span class="font-medium">{{ reasons[line.reason] ?? line.reason }}</span>
              <span class="text-[12px] text-mute">{{ line.reporterName || 'Someone' }} · {{ formatRelative(line.at) }}</span>
            </p>
            <p v-if="line.note" class="mt-0.5 break-words text-body">{{ line.note }}</p>
          </li>
        </ol>

        <p v-if="r.outcome" class="mt-3 text-[13px] text-body">
          {{ r.decidedBy || 'Staff' }}<template v-if="r.decidedAt">, {{ formatRelative(r.decidedAt) }}</template><template v-if="r.outcomeNote">: “{{ r.outcomeNote }}”</template>
        </p>

        <form v-if="deciding?.key === key(r)" class="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-4" novalidate @submit.prevent="decide(r)">
          <BaseField
            v-slot="{ id, describedBy, invalid }"
            :label="deciding.action === 'dismiss' ? 'Why it stays' : r.subjectType === 'user' ? 'What was done' : r.subjectType === 'message' ? 'Why it’s coming down' : 'Why it’s coming down (its people read this)'"
            :optional="deciding.action === 'dismiss'"
            :error="whyError"
            class="min-w-0 flex-1 basis-72"
          >
            <BaseInput :id="id" v-model="why" :described-by="describedBy" :invalid="invalid" :maxlength="280" />
          </BaseField>
          <BaseButton type="submit" :variant="deciding.action === 'dismiss' ? 'primary' : 'danger'" size="sm" :loading="busy">
            {{ deciding.action === 'dismiss' ? 'Leave it' : takeDownLabel(r) }}
          </BaseButton>
          <BaseButton type="button" variant="ghost" size="sm" :disabled="busy" @click="deciding = null">Cancel</BaseButton>
        </form>
      </li>
    </ul>
  </div>
</template>
