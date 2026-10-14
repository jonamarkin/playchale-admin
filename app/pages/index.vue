<script setup lang="ts">
import type { AdminBucket, AdminFunnel, AdminHealth, AdminSms, AdminTrends, AdminVisits } from '~/types/admin'
import type { BarPoint, ChipOption, FunnelStep } from '~/types/ui'

/**
 * How the app is doing: the numbers for a period, how they went over it (one chart, the measure
 * picked above it), and the way from a visit to doing something, with and without an account.
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
      { label: 'Set up a profile', value: health.value.onboarded, icon: 'ph:identification-card' },
      { label: 'Active players', value: health.value.activePeople, icon: 'ph:person-simple-run' },
      { label: 'Games created', value: health.value.gamesCreated, icon: 'ph:calendar-plus' },
      { label: 'Games played', value: health.value.gamesPlayed, icon: 'ph:flag-checkered' },
      { label: 'Called off', value: health.value.gamesCalledOff, icon: 'ph:calendar-x' },
      { label: 'Joins', value: health.value.joins, icon: 'ph:sign-in' },
      { label: 'Messages', value: health.value.messages, icon: 'ph:chat-circle-text' },
      { label: 'Pitch bookings', value: health.value.bookings, icon: 'ph:calendar-check' },
    ]
  : [])

/** Games days and corporate games: whether organisers are actually running them. */
const eventTiles = computed(() => health.value
  ? [
      { label: 'Events made', value: health.value.eventsCreated, icon: 'ph:trophy' },
      { label: 'People added to events', value: health.value.eventPeople, icon: 'ph:users-three' },
      { label: 'Event results in', value: health.value.eventResults, icon: 'ph:flag-checkered' },
    ]
  : [])

/**
 * The player app's pages and films, counted without knowing who: whether a page sent to a church
 * or a company was opened, where visits come from, whether the films are watched to the end.
 */
const { data: visits } = await useAsyncData<AdminVisits | null>(
  'admin:visits',
  () => api.admin.visits(Number(days.value)),
  { default: () => null, lazy: true, watch: [days] },
)
const pageNames: Record<string, string> = {
  '/': 'Home page',
  '/games-day': 'Games days (churches, schools)',
  '/corporate-games': 'Corporate games (companies)',
  '/corporate': 'Company leagues',
  '/communities': 'Communities',
  '/about': 'About',
  '/help': 'Help',
  '/sign-in': 'Sign in',
  '/onboarding': 'Setting up a profile',
  '/home': 'Home, signed in',
  '/games': 'Discover',
  '/games/:id': 'A game',
  '/e/:slug': 'An event’s public page',
  '/events/board/:token': 'An event’s board',
  '/events/join': 'Joining an event',
}
const filmNames: Record<string, string> = {
  'grass': 'Go play',
  'players': 'Players',
  'hosts': 'Hosts & organisers',
  'venues': 'Venues',
  'operations': 'Running a company league',
  'gamesday': 'Games day, on the day',
  'gamesday-desktop': 'Games day, at a laptop',
  'corporategames': 'Corporate games, on the day',
  'corporategames-desktop': 'Corporate games, at a laptop',
}
/** The days anything was opened, latest first. */
const busyDays = computed(() => [...(visits.value?.days ?? [])].reverse().slice(0, 14))
const dayLabel = (day: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  .format(new Date(`${day}T00:00:00Z`))
const share = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '')

/* ---- Over time: one chart, the measure picked above it ---- */
type Measure = 'signups' | 'activePeople' | 'gamesCreated' | 'gamesPlayed' | 'eventPeople' | 'visits'
const measures: ChipOption<Measure>[] = [
  { value: 'signups', label: 'New players' },
  { value: 'activePeople', label: 'Active players' },
  { value: 'gamesCreated', label: 'Games made' },
  { value: 'gamesPlayed', label: 'Games played' },
  { value: 'eventPeople', label: 'People in events' },
  { value: 'visits', label: 'Visits' },
]
const measure = ref<Measure>('signups')
const { data: trends } = await useAsyncData<AdminTrends | null>(
  'admin:trends',
  () => api.admin.trends(Number(days.value)),
  { default: () => null, lazy: true, watch: [days] },
)
const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const long = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthOnly = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const points = computed<BarPoint[]>(() => {
  const t = trends.value
  if (!t) return []
  return t.buckets.map((b: AdminBucket) => {
    const day = new Date(`${b.start}T00:00:00Z`)
    const label = t.unit === 'month' ? monthOnly.format(day) : short.format(day)
    const title = t.unit === 'month' ? monthYear.format(day) : t.unit === 'week' ? `Week of ${short.format(day)}` : long.format(day)
    return { label, title, value: b[measure.value] }
  })
})
const measureLabel = computed(() => measures.find(m => m.value === measure.value)!.label)
const per = computed(() => trends.value?.unit ?? 'day')

/* ---- From a visit to doing something ---- */
const { data: funnel } = await useAsyncData<AdminFunnel | null>(
  'admin:funnel',
  () => api.admin.funnel(Number(days.value)),
  { default: () => null, lazy: true, watch: [days] },
)
const steps = computed<FunnelStep[]>(() => {
  const f = funnel.value
  if (!f) return []
  return [
    { label: 'Visits', value: f.visits, note: 'Counted without knowing who' },
    { label: 'Opened a form', value: f.openedForm, note: 'A game, event, venue, team or league' },
    { label: 'New accounts', value: f.signups },
    { label: 'Did something', value: f.didSomething, note: 'Hosted, joined, or ran something' },
  ]
})
/** Without an account: how many, and how many signed up after. */
const guestRows = computed(() => {
  const g = funnel.value?.guests
  if (!g) return []
  return [
    { label: 'Hosted a game without an account', icon: 'ph:key', started: g.hostsStarted, kept: g.hostsKept },
    { label: 'Joined a games day without an account', icon: 'ph:users-three', started: g.eventGuests, kept: g.eventGuestsKept },
    { label: 'Took a spot in a game without an account', icon: 'ph:sign-in', started: g.gameGuests, kept: g.gameGuestsKept },
  ]
})

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

      <section class="mt-8" aria-labelledby="events-heading">
        <h2 id="events-heading" class="text-[18px] font-semibold">Events</h2>
        <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="tile in eventTiles" :key="tile.label" class="rounded-[16px] bg-surface p-4 shadow-pill">
            <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon :name="tile.icon" class="size-4" /> {{ tile.label }}</p>
            <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ tile.value }}</p>
          </li>
        </ul>
      </section>
    </template>

    <section v-if="trends" class="mt-8" aria-labelledby="trends-heading">
      <h2 id="trends-heading" class="text-[18px] font-semibold">Over time</h2>
      <div class="mt-3 rounded-[16px] bg-surface p-4 shadow-pill">
        <BaseChipGroup v-model="measure" :options="measures" label="What to chart" size="sm" />
        <ChartBars class="mt-4" :points="points" :label="`${measureLabel} per ${per}`" />
        <p class="mt-1 text-[13px] text-mute">{{ measureLabel }} per {{ per }}. Point at a bar, or tab to it, for its number.</p>
      </div>
    </section>

    <section v-if="funnel" class="mt-8" aria-labelledby="funnel-heading">
      <h2 id="funnel-heading" class="text-[18px] font-semibold">From a visit to doing something</h2>
      <p class="mt-1 max-w-[720px] text-[14px] leading-5 text-body">
        Visits and forms are counted without knowing who, so these are counts side by side, not the same people followed through.
      </p>
      <div class="mt-3 rounded-[16px] bg-surface p-4 shadow-pill">
        <ChartFunnel :steps="steps" />
      </div>

      <h3 class="mt-6 text-[15px] font-semibold">Without an account</h3>
      <ul class="mt-2 grid gap-3 lg:grid-cols-3">
        <li v-for="row in guestRows" :key="row.label" class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon :name="row.icon" class="size-4" /> {{ row.label }}</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ row.started.toLocaleString('en-GB') }}</p>
          <p class="mt-1 text-[13px] text-body">
            {{ row.kept.toLocaleString('en-GB') }} signed up after<template v-if="row.started"> · {{ share(row.kept, row.started) }}</template>
          </p>
        </li>
      </ul>
    </section>

    <section v-if="visits" class="mt-8" aria-labelledby="visits-heading">
      <h2 id="visits-heading" class="text-[18px] font-semibold">Visits</h2>
      <p class="mt-1 max-w-[720px] text-[14px] leading-5 text-body">
        Counted without knowing who: no cookies, no addresses, nothing about anyone. Tag a link you send and it shows below by its tag:
        <span class="font-medium text-ink">playchale.com/games-day?from=hillview</span>. Your own visits count too; open
        <span class="font-medium text-ink">playchale.com/?count=off</span> once in each of your browsers to leave them out.
      </p>
      <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <li class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon name="ph:door-open" class="size-4" /> Visits</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ visits.arrivals.toLocaleString('en-GB') }}</p>
        </li>
        <li class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="flex items-center gap-1.5 text-[13px] text-mute"><Icon name="ph:browser" class="size-4" /> Pages opened</p>
          <p class="mt-2 text-[28px] leading-8 font-semibold tabular-nums">{{ visits.opens.toLocaleString('en-GB') }}</p>
        </li>
      </ul>

      <p v-if="!visits.opens" class="mt-4 text-[14px] text-mute">Nothing opened in this period yet.</p>
      <div v-else class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="rounded-[16px] bg-surface p-4 shadow-pill lg:col-span-2">
          <h3 class="text-[15px] font-semibold">Pages</h3>
          <table class="mt-2 w-full table-fixed border-collapse text-[14px]">
            <thead>
              <tr class="text-left text-[12px] text-mute">
                <th scope="col" class="pb-1.5 font-medium">Page</th>
                <th scope="col" class="w-24 pb-1.5 text-right font-medium">Opened</th>
                <th scope="col" class="w-32 pb-1.5 text-right font-medium">Visits began here</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="page in visits.pages" :key="page.name" class="border-t border-hairline">
                <th scope="row" class="max-w-0 py-2 pr-2 text-left font-normal">
                  <span class="block truncate font-medium">{{ pageNames[page.name] ?? page.name }}</span>
                  <span v-if="pageNames[page.name]" class="block truncate text-[12px] text-mute">{{ page.name }}</span>
                </th>
                <td class="py-2 text-right tabular-nums">{{ page.opens.toLocaleString('en-GB') }}</td>
                <td class="py-2 text-right tabular-nums">{{ page.arrivals ? page.arrivals.toLocaleString('en-GB') : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-[16px] bg-surface p-4 shadow-pill">
          <h3 class="text-[15px] font-semibold">Where visits came from</h3>
          <ul class="mt-2 text-[14px]">
            <li v-for="source in visits.sources" :key="source.name" class="flex justify-between gap-3 border-t border-hairline py-2 first:border-t-0">
              <span class="min-w-0 truncate">{{ source.name === 'direct' ? 'Straight in (typed, a bookmark, or an app that doesn’t say)' : source.name }}</span>
              <span class="shrink-0 tabular-nums">{{ source.n.toLocaleString('en-GB') }}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-[16px] bg-surface p-4 shadow-pill">
          <h3 class="text-[15px] font-semibold">By day</h3>
          <ul class="mt-2 text-[14px]">
            <li v-for="day in busyDays" :key="day.day" class="flex justify-between gap-3 border-t border-hairline py-2 first:border-t-0">
              <span>{{ dayLabel(day.day) }}</span>
              <span class="tabular-nums">{{ day.opens.toLocaleString('en-GB') }}</span>
            </li>
          </ul>
        </div>

        <div v-if="visits.films.length" class="rounded-[16px] bg-surface p-4 shadow-pill lg:col-span-2">
          <h3 class="text-[15px] font-semibold">Films</h3>
          <p class="mt-1 text-[13px] text-mute">A film starts by itself, without sound, once it’s on screen; watched to the end is the number that says someone watched it.</p>
          <table class="mt-2 w-full table-fixed border-collapse text-[14px]">
            <thead>
              <tr class="text-left text-[12px] text-mute">
                <th scope="col" class="pb-1.5 font-medium">Film</th>
                <th scope="col" class="w-24 pb-1.5 text-right font-medium">Started</th>
                <th scope="col" class="w-36 pb-1.5 text-right font-medium">Watched to the end</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="film in visits.films" :key="film.name" class="border-t border-hairline">
                <th scope="row" class="max-w-0 truncate py-2 pr-2 text-left font-medium">{{ filmNames[film.name] ?? film.name }}</th>
                <td class="py-2 text-right tabular-nums">{{ film.started.toLocaleString('en-GB') }}</td>
                <td class="py-2 text-right tabular-nums">
                  {{ film.finished.toLocaleString('en-GB') }}<span v-if="film.started" class="ml-1.5 text-[12px] text-mute">{{ share(film.finished, film.started) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

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
