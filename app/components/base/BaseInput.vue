<script lang="ts">
export default { inheritAttrs: false }
</script>

<script setup lang="ts">
/**
 * Text input with optional leading icon or prefix (a dial code, a currency symbol). Use inside BaseField and pass
 * its `id` / `describedBy` / `invalid` through.
 */
const model = defineModel<string | number>({ default: '' })

withDefaults(
  defineProps<{
    id?: string
    type?: string
    placeholder?: string
    icon?: string
    prefix?: string
    describedBy?: string
    invalid?: boolean
    inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url'
    autocomplete?: string
    maxlength?: number
  }>(),
  { id: undefined, type: 'text', placeholder: undefined, icon: undefined, prefix: undefined, describedBy: undefined, invalid: false, inputmode: undefined, autocomplete: undefined, maxlength: undefined },
)

const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div
    class="flex h-14 items-center gap-3 rounded-[14px] bg-surface px-4 ring-1 transition-shadow ring-inset focus-within:ring-2 focus-within:ring-brand"
    :class="invalid ? 'ring-[#f04438]' : 'ring-hairline hover:ring-skeleton'"
  >
    <Icon v-if="icon" :name="icon" class="size-5 shrink-0 text-mute" aria-hidden="true" />
    <span v-if="prefix" class="shrink-0 border-r border-hairline pr-3 text-[16px] font-medium text-body">{{ prefix }}</span>
    <input
      :id="id"
      ref="input"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      v-bind="$attrs"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      class="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
    >
    <slot name="trailing" />
  </div>
</template>
