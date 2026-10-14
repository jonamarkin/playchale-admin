<script setup lang="ts">
import type { BarPoint } from '~/types/ui'

/**
 * A bar chart, drawn by hand: one bar per period, on one scale whose ticks are round numbers, and
 * only as many dates under it as fit. A bar shows its exact number when it's pointed at or tabbed
 * to, and the same numbers are in a table for a screen reader.
 *
 * It's sized to its box (a ResizeObserver), so text stays text-sized at every width rather than
 * being stretched with the drawing.
 */
const props = defineProps<{ points: BarPoint[]; label: string }>()

const HEIGHT = 220
const PAD = { top: 12, right: 8, bottom: 26, left: 40 }

const box = ref<HTMLElement>()
const width = ref(640)
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!box.value) return
  width.value = box.value.clientWidth || 640
  observer = new ResizeObserver(([entry]) => (width.value = Math.max(240, Math.round(entry!.contentRect.width))))
  observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())

/** Round ticks from 0: steps of 1, 2 or 5 times a power of ten, about four of them. */
const ticks = computed(() => {
  const max = Math.max(0, ...props.points.map(p => p.value))
  if (max === 0) return [0, 1]
  const rough = max / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = Math.max(1, [1, 2, 5, 10].map(m => m * power).find(s => s >= rough)!)
  const top = Math.ceil(max / step) * step
  return Array.from({ length: top / step + 1 }, (_, i) => i * step)
})
const top = computed(() => ticks.value.at(-1)!)
const plot = computed(() => ({ w: width.value - PAD.left - PAD.right, h: HEIGHT - PAD.top - PAD.bottom }))
const band = computed(() => plot.value.w / Math.max(1, props.points.length))
const barWidth = computed(() => Math.max(2, Math.min(36, band.value * 0.68)))
const y = (value: number) => PAD.top + plot.value.h - (value / top.value) * plot.value.h
const x = (i: number) => PAD.left + i * band.value + (band.value - barWidth.value) / 2

/** Every k-th date, so they never run into each other; always the last. */
const labelEvery = computed(() => Math.max(1, Math.ceil(props.points.length / Math.max(2, Math.floor(plot.value.w / 64)))))
const showsLabel = (i: number) => i === props.points.length - 1 || (i % labelEvery.value === 0 && props.points.length - 1 - i >= labelEvery.value)

/** The first and last dates sit inside the drawing rather than centred off its edge. */
const anchor = (i: number) => (i === props.points.length - 1 ? 'end' : i === 0 ? 'start' : 'middle')
const labelX = (i: number) => (anchor(i) === 'end' ? x(i) + barWidth.value : anchor(i) === 'start' ? x(i) : x(i) + barWidth.value / 2)

const active = ref<number | null>(null)
const tip = computed(() => {
  if (active.value === null) return null
  const point = props.points[active.value]
  if (!point) return null
  const left = Math.min(Math.max(x(active.value) + barWidth.value / 2, 60), width.value - 60)
  return { point, left, top: y(point.value) }
})
const empty = computed(() => props.points.every(p => p.value === 0))
const total = computed(() => props.points.reduce((sum, p) => sum + p.value, 0))
</script>

<template>
  <figure class="relative m-0">
    <div ref="box" class="relative w-full">
      <svg :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" role="img" :aria-label="`${label}: ${total.toLocaleString('en-GB')} in all`" class="block">
        <!-- The scale -->
        <g aria-hidden="true">
          <g v-for="tick in ticks" :key="tick">
            <line :x1="PAD.left" :x2="width - PAD.right" :y1="y(tick)" :y2="y(tick)" class="stroke-hairline" :stroke-dasharray="tick === 0 ? undefined : '3 4'" />
            <text :x="PAD.left - 8" :y="y(tick)" dy="0.32em" text-anchor="end" class="fill-mute text-[11px] tabular-nums">{{ tick.toLocaleString('en-GB') }}</text>
          </g>
        </g>
        <!-- The bars: each a focusable stop, with a hit area the full height so a short bar is easy to point at. -->
        <g>
          <g
            v-for="(point, i) in points"
            :key="i"
            tabindex="0"
            class="cursor-default outline-none"
            :aria-label="`${point.title}: ${point.value.toLocaleString('en-GB')}`"
            @mouseenter="active = i"
            @mouseleave="active = null"
            @focus="active = i"
            @blur="active = null"
          >
            <rect :x="PAD.left + i * band" :y="PAD.top" :width="band" :height="plot.h" fill="transparent" />
            <rect
              v-if="point.value > 0"
              :x="x(i)"
              :y="y(point.value)"
              :width="barWidth"
              :height="Math.max(1, PAD.top + plot.h - y(point.value))"
              rx="3"
              :class="active === i ? 'fill-accent' : 'fill-brand'"
            />
            <rect v-if="active === i" :x="x(i) - 2" :y="PAD.top" :width="barWidth + 4" :height="plot.h" rx="4" fill="none" class="stroke-skeleton" stroke-dasharray="2 3" />
          </g>
        </g>
        <!-- The dates -->
        <g aria-hidden="true">
          <template v-for="(point, i) in points" :key="i">
            <text v-if="showsLabel(i)" :x="labelX(i)" :y="HEIGHT - 8" :text-anchor="anchor(i)" class="fill-mute text-[11px]">{{ point.label }}</text>
          </template>
        </g>
      </svg>
      <p v-if="empty" class="pointer-events-none absolute inset-x-0 top-[38%] text-center text-[14px] text-mute">Nothing in this period yet.</p>
      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] bg-night px-2.5 py-1.5 text-center text-[12px] leading-4 whitespace-nowrap text-white shadow-lg"
        :style="{ left: `${tip.left}px`, top: `${Math.max(tip.top - 8, 34)}px` }"
        aria-hidden="true"
      >
        <span class="block text-white/70">{{ tip.point.title }}</span>
        <span class="block text-[14px] font-semibold tabular-nums">{{ tip.point.value.toLocaleString('en-GB') }}</span>
      </div>
    </div>
    <!-- The same numbers, for a screen reader. -->
    <table class="sr-only">
      <caption>{{ label }}</caption>
      <thead><tr><th scope="col">Period</th><th scope="col">Count</th></tr></thead>
      <tbody>
        <tr v-for="(point, i) in points" :key="i"><th scope="row">{{ point.title }}</th><td>{{ point.value }}</td></tr>
      </tbody>
    </table>
  </figure>
</template>
