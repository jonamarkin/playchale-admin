<script setup lang="ts">
/**
 * Label + control + hint/error, wired for accessibility. The default slot receives the ids to
 * put on the control: `<BaseField v-slot="{ id, describedBy, invalid }">`.
 */
const props = withDefaults(defineProps<{ label: string; hint?: string; error?: string | null; optional?: boolean; hideLabel?: boolean }>(), {
  hint: undefined,
  error: null,
  optional: false,
  hideLabel: false,
})

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`
const describedBy = computed(() => [props.error ? errorId : null, props.hint ? hintId : null].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="grid grid-cols-1 gap-2">
    <label :for="id" class="flex items-baseline justify-between text-[15px] font-medium" :class="hideLabel ? 'sr-only' : ''">
      {{ label }}
      <span v-if="optional" class="text-[13px] font-normal text-mute">Optional</span>
    </label>
    <slot :id="id" :described-by="describedBy" :invalid="!!error" />
    <p v-if="error" :id="errorId" class="flex items-center gap-1.5 text-[14px] text-[#b42318]" role="alert">
      <Icon name="ph:warning-circle-fill" class="size-4 shrink-0" />
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="text-[14px] text-mute">{{ hint }}</p>
  </div>
</template>
