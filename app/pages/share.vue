<script setup lang="ts">
import type { AdminGame, ShareMilestone, ShareRecap, ShareResult, ShareUpcoming } from '~/types/admin'
import type { ChipOption } from '~/types/ui'
import { CARD_SIZE, type CardFormat, svgToImage } from '~/utils/shareCanvas'
import { captionFor, type CardInput, type CardKind, renderShareCard } from '~/utils/shareCards'

/**
 * Images to post about PlayChale: a match's result, the week's recap, a milestone, and the games
 * anyone can join. Drawn from real numbers only, with players by first name (or none), as a feed
 * post or a story, then downloaded with a caption to go with it.
 */
useHead({ title: 'Share images · PlayChale Admin' })

const api = useAdminApi()
const notify = useNotify()
const route = useRoute()
const router = useRouter()

const kind = ref<CardKind>((['result', 'recap', 'milestone', 'upcoming'] as const).find(k => k === route.query.card) ?? 'recap')
const kinds: ChipOption<CardKind>[] = [
  { value: 'result', label: 'Match result', icon: 'ph:flag-checkered' },
  { value: 'recap', label: 'This week', icon: 'ph:calendar-check' },
  { value: 'milestone', label: 'Milestone', icon: 'ph:trophy' },
  { value: 'upcoming', label: 'Games coming up', icon: 'ph:soccer-ball' },
]
const format = ref<CardFormat>('post')
const formats: ChipOption<CardFormat>[] = [
  { value: 'post', label: 'Post · 4:5' },
  { value: 'story', label: 'Story · 9:16' },
]
const names = ref(true)
const gameId = ref<string>(typeof route.query.game === 'string' ? route.query.game : '')
watch([kind, gameId], () => router.replace({ query: { card: kind.value, ...(kind.value === 'result' && gameId.value ? { game: gameId.value } : {}) } }))

/* What each card is drawn from */
const { data: played } = await useAsyncData<AdminGame[]>('admin:share:played', () => api.admin.games('played'), { default: () => [], lazy: true })
watch(played, (games) => {
  if (!gameId.value && games.length) gameId.value = games[0]!.id
}, { immediate: true })
const result = ref<ShareResult | null>(null)
const recap = ref<ShareRecap | null>(null)
const milestone = ref<ShareMilestone | null>(null)
const upcoming = ref<ShareUpcoming[] | null>(null)
const loadError = ref<string | null>(null)

const load = async () => {
  loadError.value = null
  try {
    if (kind.value === 'result') result.value = gameId.value ? await api.share.game(gameId.value) : null
    else if (kind.value === 'recap') recap.value ??= await api.share.recap(7)
    else if (kind.value === 'milestone') milestone.value ??= await api.share.milestone()
    else upcoming.value ??= await api.share.upcoming(7)
  }
  catch (e) {
    loadError.value = errorMessage(e)
  }
}

/* The site people are sent to, as the image says it */
const site = computed(() => {
  const { appBase } = useRuntimeConfig().public
  return String(appBase).replace(/^https?:\/\//, '').replace(/\/$/, '')
})

const input = computed<CardInput | null>(() => {
  const base = { kind: kind.value, format: format.value, names: names.value, site: site.value }
  if (kind.value === 'result') return result.value ? { ...base, result: result.value } : null
  if (kind.value === 'recap') return recap.value ? { ...base, recap: recap.value } : null
  if (kind.value === 'milestone') return milestone.value ? { ...base, milestone: milestone.value } : null
  return upcoming.value ? { ...base, upcoming: upcoming.value } : null
})
const caption = computed(() => (input.value ? captionFor(input.value) : ''))

/* The faint sports icons behind every card: the app's own, rendered hidden, then painted */
const iconHost = ref<HTMLElement>()
const TEXTURE = ['ph:soccer-ball-thin', 'ph:basketball-thin', 'ph:trophy-thin', 'ph:volleyball-thin', 'ph:medal-thin']
let texture: HTMLImageElement[] | null = null
const textureImages = async () => {
  if (texture) return texture
  await nextTick()
  const images = await Promise.all(TEXTURE.map((name) => {
    const svg = iconHost.value?.querySelector<SVGElement>(`[data-icon="${name}"] svg`)
    return svg ? svgToImage(svg, '#7cf0c8', 256) : Promise.resolve(null)
  }))
  texture = images.filter((i): i is HTMLImageElement => !!i)
  return texture
}

const blob = ref<Blob | null>(null)
const preview = ref<string>()
const rendering = ref(false)
let renderId = 0
const render = async () => {
  const id = ++renderId
  if (!input.value) {
    blob.value = null
    return
  }
  rendering.value = true
  try {
    const png = await renderShareCard(input.value, await textureImages())
    if (id !== renderId) return
    blob.value = png
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = URL.createObjectURL(png)
  }
  catch (e) {
    console.error('[PlayChale admin] Share image failed', e)
    notify.error('Couldn’t draw the image. Try again.')
  }
  finally {
    if (id === renderId) rendering.value = false
  }
}

onMounted(async () => {
  await load()
  await render()
})
watch([kind, gameId], async () => {
  await load()
  await render()
})
watch([format, names], render)
onBeforeUnmount(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})

const fileName = computed(() => `playchale-${kind.value}-${format.value}-${new Date().toISOString().slice(0, 10)}.png`)
const download = () => {
  if (!blob.value || !preview.value) return
  const a = document.createElement('a')
  a.href = preview.value
  a.download = fileName.value
  a.click()
}
const copyCaption = async () => {
  try {
    await navigator.clipboard.writeText(caption.value)
    notify.success('Caption copied', 'ph:copy-bold')
  }
  catch {
    notify.error('Couldn’t copy. Select the caption and copy it instead.')
  }
}
const aspect = computed(() => `${CARD_SIZE[format.value].width} / ${CARD_SIZE[format.value].height}`)
</script>

<template>
  <div class="pb-24">
    <!-- Hidden: the icons painted into the cards, rendered as real SVG -->
    <div ref="iconHost" class="pointer-events-none absolute size-0 overflow-hidden opacity-0" aria-hidden="true">
      <span v-for="name in TEXTURE" :key="name" :data-icon="name"><Icon :name="name" mode="svg" /></span>
    </div>

    <h1 class="text-[28px] leading-9 font-semibold">Share images</h1>
    <p class="mt-1 max-w-[720px] text-[15px] text-body">
      Pictures to post about PlayChale, drawn from what really happened. Players appear by first name only, and you can leave names off.
    </p>

    <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div class="grid content-start gap-5">
        <BaseChipGroup v-model="kind" :options="kinds" label="Which image" />

        <BaseField v-if="kind === 'result'" v-slot="{ id }" label="Game">
          <select :id="id" v-model="gameId" class="h-11 w-full rounded-[12px] border border-hairline bg-surface px-3 text-[15px]">
            <option v-if="!played.length" value="" disabled>No games played yet</option>
            <option v-for="g in played" :key="g.id" :value="g.id">{{ g.title }} · {{ new Date(g.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }} · {{ g.venueName }}</option>
          </select>
        </BaseField>

        <BaseChipGroup v-model="format" :options="formats" label="Size" size="sm" />

        <label v-if="kind === 'result' || kind === 'recap'" class="flex cursor-pointer items-center gap-3 text-[15px]">
          <input v-model="names" type="checkbox" class="size-5 rounded-[6px] accent-[color:var(--color-brand)]">
          Show players’ first names
        </label>

        <p v-if="loadError" role="alert" class="rounded-[12px] bg-[#fef3f2] px-4 py-3 text-[14px] text-[#912018]">{{ loadError }}</p>

        <div v-if="caption" class="rounded-[16px] bg-surface p-4 shadow-pill">
          <p class="text-[13px] font-medium text-mute">Caption</p>
          <p class="mt-1 text-[15px] leading-6 select-all">{{ caption }}</p>
          <BaseButton variant="secondary" size="sm" class="mt-3" @click="copyCaption">
            <Icon name="ph:copy-bold" class="size-4" /> Copy caption
          </BaseButton>
        </div>
      </div>

      <div class="grid content-start gap-3">
        <div
          class="relative mx-auto w-full overflow-hidden rounded-[18px] bg-brand shadow-card"
          :class="format === 'post' ? 'max-w-[420px]' : 'max-w-[300px]'"
          :style="{ aspectRatio: aspect }"
        >
          <img v-if="preview && input" :src="preview" :alt="`Share image: ${kinds.find(k => k.value === kind)?.label}`" class="size-full object-cover" :class="rendering ? 'opacity-60' : ''">
          <p v-else class="absolute inset-0 grid place-items-center px-6 text-center text-[14px] text-white/70">
            {{ kind === 'result' && !played.length ? 'No games played yet' : 'Drawing…' }}
          </p>
        </div>
        <BaseButton class="mx-auto" :disabled="!blob || rendering" @click="download">
          <Icon name="ph:download-simple-bold" class="size-4" /> Download image
        </BaseButton>
      </div>
    </div>
  </div>
</template>
