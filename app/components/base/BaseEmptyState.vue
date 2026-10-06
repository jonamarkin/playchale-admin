<script setup lang="ts">
/** Friendly empty / error state with an icon tile, a line of guidance and optional actions. */
withDefaults(defineProps<{ icon: string; title: string; description?: string; tone?: 'neutral' | 'error' }>(), {
  description: undefined,
  tone: 'neutral',
})
</script>

<template>
  <div class="flex flex-col items-center px-6 py-14 text-center" :role="tone === 'error' ? 'alert' : undefined">
    <span
      class="grid size-16 place-items-center rounded-[20px]"
      :class="tone === 'error' ? 'bg-[#fee4e2] text-[#b42318]' : 'bg-accent/25 text-brand'"
    >
      <Icon :name="icon" class="size-8" />
    </span>
    <h3 class="mt-5 text-[20px] leading-7 font-semibold">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-[380px] text-[16px] leading-6 text-pretty text-body">{{ description }}</p>
    <div v-if="$slots.default" class="mt-6 flex flex-wrap justify-center gap-3">
      <slot />
    </div>
  </div>
</template>
