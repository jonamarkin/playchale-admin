<script setup lang="ts">
import type { IconLabel } from '~/types/landing'

/** Small notification pill. Sizes to its content; pass a width class to fix it. */
withDefaults(defineProps<{ toast: IconLabel; tone?: 'success' | 'error' | 'info' }>(), { tone: 'success' })

const dots = {
  success: 'bg-accent text-ink',
  info: 'bg-subtle text-brand',
  error: 'bg-[#fee4e2] text-[#b42318]',
}
</script>

<template>
  <p class="flex h-11 w-fit max-w-full items-center gap-2.5 rounded-full bg-surface pr-4 pl-2.5 text-[14px] leading-5 shadow-card">
    <span class="grid size-6 shrink-0 place-items-center rounded-full" :class="dots[tone]">
      <Icon :name="toast.icon" class="size-3.5" />
    </span>
    <span class="truncate">{{ toast.label }}</span>
  </p>
</template>
