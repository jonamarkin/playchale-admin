<script setup lang="ts">
/**
 * Renders the app-wide toast stack (see useNotify). Pinned to the top — under the header on phones,
 * top-right on desktop — so it never collides with bottom sheets, sticky action bars or the tab bar.
 */
const { notices, dismiss } = useNotify()
</script>

<template>
  <div
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[80] flex flex-col items-center gap-2 px-4 lg:top-24 lg:right-6 lg:left-auto lg:items-end"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out-expo"
      enter-from-class="-translate-y-3 opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0"
    >
      <button
        v-for="notice in notices"
        :key="notice.id"
        type="button"
        class="pointer-events-auto max-w-full"
        :aria-label="`${notice.label} — dismiss`"
        @click="dismiss(notice.id)"
      >
        <BaseToast :toast="notice" :tone="notice.tone" class="shadow-float" />
      </button>
    </TransitionGroup>
  </div>
</template>
