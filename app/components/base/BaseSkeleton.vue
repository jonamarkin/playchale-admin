<script setup lang="ts">
/** Placeholder bar used for the "redacted" rows inside the product mockups. */
withDefaults(defineProps<{ width?: number | string; height?: number }>(), {
  width: 120,
  height: 10,
})
</script>

<template>
  <span
    aria-hidden="true"
    class="block max-w-full rounded-full bg-skeleton"
    :style="{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }"
  />
</template>
