<script setup lang="ts">
import type { AdminEntry, AdminPerson } from '~/types/admin'

/**
 * Find someone, see what happened to them, and hand them their data if they ask for it.
 *
 * Every search, every look at a history and every export is written to the event stream with the
 * staff member's name on it: looking at someone's games and money is itself an act.
 */
useHead({ title: 'People · PlayChale Admin' })

const api = useAdminApi()
const notify = useNotify()

const query = ref('')
const searched = ref('')
let typing: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(typing)
  typing = setTimeout(() => (searched.value = value.trim()), 350)
})
onBeforeUnmount(() => clearTimeout(typing))

const { data: people, status, error } = await useAsyncData<AdminPerson[]>(
  'admin:people',
  () => api.admin.people(searched.value),
  { default: () => [], lazy: true, watch: [searched] },
)

const chosen = ref<AdminPerson | null>(null)
const history = ref<AdminEntry[]>([])
const loadingHistory = ref(false)
const exporting = ref(false)

/**
 * On a phone the panel sits below the whole list, so choosing someone near the top would seem to do
 * nothing: their history opened a screen or two further down. Bring it into view when it isn't.
 */
const detail = ref<HTMLElement>()
const reveal = async () => {
  await nextTick()
  const el = detail.value
  if (!el) return
  const top = el.getBoundingClientRect().top
  if (top < 0 || top > window.innerHeight - 160) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const backToList = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const open = async (person: AdminPerson) => {
  chosen.value = person
  history.value = []
  void reveal()
  loadingHistory.value = true
  try {
    history.value = await api.admin.history(person.id)
  }
  catch (e) {
    notify.error(errorMessage(e))
  }
  finally {
    loadingHistory.value = false
  }
}

/** A data request: everything held about them, as a file they can be sent. */
const exportPerson = async () => {
  if (!chosen.value) return
  exporting.value = true
  try {
    const data = await api.admin.exportPerson(chosen.value.id)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `playchale-${chosen.value.handle || chosen.value.id}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    notify.success('Export downloaded', 'ph:download-simple-bold')
  }
  catch (e) {
    notify.error(errorMessage(e))
  }
  finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="pb-24">
    <h1 class="text-[28px] leading-9 font-semibold">People</h1>

    <BaseField v-slot="{ id }" label="Find someone" hide-label class="mt-4">
      <BaseInput :id="id" v-model="query" icon="ph:magnifying-glass" placeholder="Name, handle, phone (024…) or email" autocomplete="off" />
    </BaseField>

    <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div class="min-w-0">
        <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t search" :description="errorMessage(error)" />
        <div v-else-if="status === 'pending' && !people.length" class="space-y-2">
          <BaseSkeleton v-for="n in 5" :key="n" class="h-16 rounded-[14px]" />
        </div>
        <p v-else-if="!people.length" class="text-[15px] text-body">Nobody matches “{{ searched }}”.</p>
        <ul v-else aria-label="People found" class="space-y-2">
          <li v-for="person in people" :key="person.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left ring-1 transition-colors ring-inset"
              :class="chosen?.id === person.id ? 'bg-subtle ring-skeleton' : 'bg-surface ring-hairline hover:bg-subtle'"
              @click="open(person)"
            >
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="truncate text-[15px] font-medium">{{ person.name || 'No name yet' }}</span>
                  <BasePill v-if="person.staff" tone="accent">Staff</BasePill>
                  <BasePill v-if="person.deletedAt">Closed</BasePill>
                </span>
                <span class="block truncate text-[13px] text-mute">
                  {{ [person.handle && `@${person.handle}`, person.phone, person.email].filter(Boolean).join(' · ') }}
                </span>
              </span>
              <span class="shrink-0 text-right text-[13px] text-mute tabular-nums">{{ person.games }} {{ person.games === 1 ? 'game' : 'games' }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Pinned beside the list on a wide screen, so picking someone far down never scrolls it away. -->
      <section
        v-if="chosen"
        ref="detail"
        aria-labelledby="person-title"
        class="min-w-0 scroll-mt-32 rounded-[16px] bg-surface p-5 shadow-pill lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto"
      >
        <button type="button" class="mb-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand lg:hidden" @click="backToList">
          <Icon name="ph:arrow-up" class="size-4" /> Back to the list
        </button>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="person-title" class="truncate text-[18px] font-semibold">{{ chosen.name || 'No name yet' }}</h2>
            <p class="text-[13px] text-mute">Joined {{ formatRelative(chosen.joinedAt) }}<template v-if="chosen.area"> · {{ chosen.area }}</template></p>
          </div>
          <BaseButton variant="secondary" size="sm" :loading="exporting" @click="exportPerson">
            <Icon name="ph:download-simple" class="size-4" /> Export their data
          </BaseButton>
        </div>

        <h3 class="mt-5 text-[15px] font-medium">What happened</h3>
        <div v-if="loadingHistory" class="mt-3 space-y-2">
          <BaseSkeleton v-for="n in 4" :key="n" class="h-10 rounded-[10px]" />
        </div>
        <p v-else-if="!history.length" class="mt-2 text-[14px] text-body">Nothing yet.</p>
        <ol v-else class="mt-3 divide-y divide-hairline">
          <li v-for="(entry, i) in history" :key="i" class="flex gap-3 py-2.5">
            <span class="w-24 shrink-0 text-[13px] text-mute tabular-nums">{{ formatRelative(entry.at) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block text-[14px] font-medium">{{ entry.what }}</span>
              <span v-if="entry.detail" class="block truncate text-[13px] text-body">{{ entry.detail }}</span>
            </span>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
