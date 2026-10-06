<script setup lang="ts">
/** Small status label: "Paid", "Unlisted venue", "Full", "Hosting"… One component, a few tones. */
withDefaults(defineProps<{ tone?: 'neutral' | 'accent' | 'brand' | 'warning' | 'danger'; icon?: string }>(), {
  tone: 'neutral',
  icon: undefined,
})

const tones = {
  neutral: 'bg-subtle text-body',
  accent: 'bg-accent/30 text-ink',
  brand: 'bg-brand text-white',
  warning: 'bg-[#fef0c7] text-[#93370d]',
  danger: 'bg-[#fee4e2] text-[#b42318]',
}
</script>

<template>
  <span class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] leading-none font-medium whitespace-nowrap" :class="tones[tone]">
    <Icon v-if="icon" :name="icon" class="size-3.5" />
    <slot />
  </span>
</template>
