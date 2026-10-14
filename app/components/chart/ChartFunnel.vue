<script setup lang="ts">
import type { FunnelStep } from '~/types/ui'

/**
 * Steps from a visit to doing something, as bars on one scale. Each step after the first says what
 * share of the step before it that is. The steps can be counts of different things (pages opened,
 * then accounts), so a share above 100% is possible and shown as it is.
 */
const props = defineProps<{ steps: FunnelStep[] }>()

const max = computed(() => Math.max(1, ...props.steps.map(s => s.value)))
const share = (i: number) => {
  const before = props.steps[i - 1]?.value ?? 0
  return i > 0 && before > 0 ? `${Math.round((props.steps[i]!.value / before) * 100)}% of the step before` : ''
}
</script>

<template>
  <ol class="space-y-3">
    <li v-for="(step, i) in steps" :key="step.label" class="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-x-4 gap-y-1 max-sm:grid-cols-1">
      <div class="min-w-0">
        <p class="text-[14px] font-medium">{{ step.label }}</p>
        <p v-if="step.note" class="text-[12px] leading-4 text-mute">{{ step.note }}</p>
      </div>
      <div class="flex min-w-0 items-center gap-3">
        <div class="h-7 min-w-0 flex-1 overflow-hidden rounded-[8px] bg-subtle">
          <div class="h-full rounded-[8px]" :class="i === steps.length - 1 ? 'bg-accent' : 'bg-brand'" :style="{ width: `${step.value > 0 ? Math.max(2, (step.value / max) * 100) : 0}%` }" />
        </div>
        <div class="w-28 shrink-0 text-right">
          <p class="text-[15px] font-semibold tabular-nums">{{ step.value.toLocaleString('en-GB') }}</p>
          <p v-if="share(i)" class="text-[11px] leading-4 text-mute">{{ share(i) }}</p>
        </div>
      </div>
    </li>
  </ol>
</template>
