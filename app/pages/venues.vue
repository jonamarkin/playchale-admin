<script setup lang="ts">
import type { AdminVenue } from '~/types/admin'
import type { ChipOption } from '~/types/ui'

/**
 * Venues waiting for staff, oldest first: anyone can list one, and players only find or book it
 * once it's approved here. Check it's real (the place on a map, the number), then approve it, or
 * say what to change; the owner is told either way, and changing it sends it back here. A live
 * venue can be taken off the same way. Every decision is recorded with your name.
 */
useHead({ title: 'Venues · PlayChale Admin' })

const api = useAdminApi()
const notify = useNotify()

type When = 'waiting' | 'live' | 'declined'
const when = ref<When>('waiting')
const whens: ChipOption<When>[] = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'live', label: 'Live' },
  { value: 'declined', label: 'Needs a change' },
]

const query = ref('')
const searched = ref('')
let typing: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(typing)
  typing = setTimeout(() => (searched.value = value.trim()), 350)
})
onBeforeUnmount(() => clearTimeout(typing))

const { data: venues, status, error, refresh } = await useAsyncData<AdminVenue[]>(
  'admin:venues',
  () => api.admin.venues(when.value, searched.value || undefined),
  { default: () => [], lazy: true, watch: [when, searched] },
)
/** The count on the Venues tab, refreshed after each decision. */
const waitingCount = useState<number | null>('admin:venues-waiting')

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency, maximumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(minor / 100)
const mapLink = (v: AdminVenue) =>
  v.latitude != null && v.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}` : v.mapUrl
const amenityNames: Record<string, string> = {
  'floodlights': 'Floodlights', 'changing-rooms': 'Changing rooms', 'showers': 'Showers', 'parking': 'Parking',
  'water': 'Water', 'equipment': 'Equipment', 'seating': 'Seating', 'toilets': 'Toilets',
}

const busy = ref<string | null>(null)
const afterDecision = (id: string) => {
  venues.value = venues.value.filter(v => v.id !== id)
  api.admin.venuesWaiting().then(r => (waitingCount.value = r.waiting)).catch(() => undefined)
}

const approve = async (v: AdminVenue) => {
  busy.value = v.id
  try {
    await api.admin.approveVenue(v.id)
    notify.success(`${v.name} is live. Its owner was told.`, 'ph:check-circle-bold')
    afterDecision(v.id)
  }
  catch (e) {
    notify.error(errorMessage(e))
  }
  finally {
    busy.value = null
  }
}

/** The venue being declined, and what to change: asked on the page, not in a browser prompt. */
const declining = ref<AdminVenue | null>(null)
const why = ref('')
const whyError = ref<string | null>(null)
const startDeclining = (v: AdminVenue) => {
  declining.value = v
  why.value = ''
  whyError.value = null
}
const confirmDecline = async () => {
  const venue = declining.value
  if (!venue) return
  if (!why.value.trim()) {
    whyError.value = 'Say what to change: the owner reads this.'
    return
  }
  busy.value = venue.id
  try {
    await api.admin.declineVenue(venue.id, why.value.trim())
    notify.success(venue.review === 'approved' ? `${venue.name} is off PlayChale. Its owner was told why.` : `Sent back to ${venue.ownerName || 'its owner'} with your note.`, 'ph:arrow-u-up-left-bold')
    declining.value = null
    afterDecision(venue.id)
  }
  catch (e) {
    notify.error(errorMessage(e))
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="pb-24">
    <h1 class="text-[28px] leading-9 font-semibold">Venues</h1>
    <p class="mt-1 max-w-[720px] text-[15px] text-body">
      Anyone can list a venue; players only find or book it once it’s approved here. Check it’s real, then approve it or say what to change. The owner is told either way.
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <BaseChipGroup v-model="when" :options="whens" label="Which venues" size="sm" />
      <BaseField v-slot="{ id }" label="Find a venue" hide-label class="min-w-0 flex-1 basis-64">
        <BaseInput :id="id" v-model="query" icon="ph:magnifying-glass" placeholder="Name, area or owner" autocomplete="off" />
      </BaseField>
    </div>

    <BaseEmptyState v-if="error" icon="ph:wifi-slash-fill" tone="error" title="Couldn’t load venues" :description="errorMessage(error)" class="mt-6">
      <BaseButton size="sm" @click="refresh()">Try again</BaseButton>
    </BaseEmptyState>

    <div v-else-if="status === 'pending' && !venues.length" class="mt-6 space-y-2">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-40 rounded-[14px]" />
    </div>

    <BaseEmptyState
      v-else-if="!venues.length"
      :icon="when === 'waiting' ? 'ph:check-circle' : 'ph:storefront'"
      :title="searched ? `Nothing matches “${searched}”` : when === 'waiting' ? 'Nothing waiting' : when === 'live' ? 'No live venues yet' : 'Nothing sent back'"
      :description="when === 'waiting' ? 'New venues appear here as they’re listed.' : undefined"
      class="mt-6"
    />

    <ul v-else aria-label="Venues" class="mt-6 space-y-3">
      <li v-for="v in venues" :key="v.id" class="rounded-[16px] bg-surface p-4 shadow-pill sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="flex flex-wrap items-center gap-2">
              <span class="text-[17px] font-semibold">{{ v.name }}</span>
              <BasePill v-if="v.review === 'pending'" tone="warning" icon="ph:hourglass-medium">Waiting</BasePill>
              <BasePill v-else-if="v.review === 'approved'" tone="accent" icon="ph:check-circle">Live</BasePill>
              <BasePill v-else tone="danger">Needs a change</BasePill>
            </p>
            <p class="mt-0.5 text-[13px] text-mute">
              {{ v.area }} · {{ v.country }} · listed {{ formatRelative(v.createdAt) }} by {{ v.ownerName || 'someone who’s left' }}
              <template v-if="v.bookings"> · {{ v.bookings }} {{ v.bookings === 1 ? 'booking' : 'bookings' }}</template>
            </p>
          </div>
          <div v-if="declining?.id !== v.id" class="flex flex-wrap gap-2">
            <BaseButton v-if="v.review !== 'approved'" size="sm" :loading="busy === v.id" @click="approve(v)">
              <Icon name="ph:check-bold" class="size-4" /> Approve
            </BaseButton>
            <BaseButton variant="danger" size="sm" :disabled="busy === v.id" @click="startDeclining(v)">
              {{ v.review === 'approved' ? 'Take it off' : v.review === 'declined' ? 'Change the note' : 'Needs a change' }}
            </BaseButton>
          </div>
        </div>

        <p v-if="v.description" class="mt-3 max-w-[72ch] text-[14px] leading-6 text-body">{{ v.description }}</p>

        <dl class="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
          <div class="min-w-0">
            <dt class="text-[12px] text-mute">Where</dt>
            <dd class="break-words">
              {{ v.address || 'No address given' }}
              <a v-if="mapLink(v)" :href="mapLink(v)" target="_blank" rel="noopener" class="ml-1 inline-flex items-center gap-1 font-medium text-brand hover:underline">
                On a map <Icon name="ph:arrow-square-out" class="size-3.5" />
              </a>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-[12px] text-mute">Venue’s number</dt>
            <dd>
              <a v-if="v.phone" :href="`tel:${v.phone}`" class="font-medium text-brand tabular-nums select-all hover:underline">{{ v.phone }}</a>
              <span v-else class="text-mute">None given</span>
            </dd>
          </div>
          <div class="min-w-0 sm:col-span-2">
            <dt class="text-[12px] text-mute">Pitches</dt>
            <dd>
              <ul class="mt-0.5 flex flex-wrap gap-2">
                <li v-for="(p, i) in v.pitches" :key="i" class="rounded-[10px] bg-subtle px-2.5 py-1 text-[13px]">
                  {{ p.name }} · {{ p.sport }} {{ p.format }} · <span class="tabular-nums">{{ money(p.pricePerHour, v.currency) }}</span>/h
                </li>
              </ul>
            </dd>
          </div>
          <div v-if="v.amenities.length" class="min-w-0 sm:col-span-2">
            <dt class="text-[12px] text-mute">Has</dt>
            <dd>{{ v.amenities.map(a => amenityNames[a] ?? a).join(', ') }}</dd>
          </div>
        </dl>

        <p v-if="v.review === 'declined' && v.reviewNote" class="mt-3 rounded-[12px] bg-[#fef3f2] px-3 py-2 text-[13px] text-[#912018]">
          Your note: “{{ v.reviewNote }}”<template v-if="v.reviewedAt"> · {{ formatRelative(v.reviewedAt) }}</template>
        </p>

        <form v-if="declining?.id === v.id" class="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-4" novalidate @submit.prevent="confirmDecline">
          <BaseField
            v-slot="{ id, describedBy, invalid }"
            :label="v.review === 'approved' ? 'Why it’s coming off (the owner reads this)' : 'What to change (the owner reads this)'"
            :error="whyError"
            class="min-w-0 flex-1 basis-72"
          >
            <BaseInput :id="id" v-model="why" :described-by="describedBy" :invalid="invalid" :maxlength="280" placeholder="e.g. We couldn’t find it on the map. Add its address." />
          </BaseField>
          <BaseButton type="submit" variant="danger" size="sm" :loading="busy === v.id">{{ v.review === 'approved' ? 'Take it off' : 'Send it back' }}</BaseButton>
          <BaseButton type="button" variant="ghost" size="sm" :disabled="busy === v.id" @click="declining = null">Cancel</BaseButton>
        </form>
      </li>
    </ul>
  </div>
</template>
