<script setup lang="ts" generic="T extends string">
import type { ChipOption } from '~/types/ui'

/**
 * Pill chips for picking one option (radio) or several (`multiple`, checkboxes). This is the chip
 * style from the landing page's Create-a-game and FAQ filters, as one reusable control.
 * Keyboard: arrow keys move between chips in single mode; Space/Enter toggles.
 */
const props = withDefaults(defineProps<{ options: ChipOption<T>[]; label: string; multiple?: boolean; size?: 'sm' | 'md' }>(), {
  multiple: false,
  size: 'md',
})

const model = defineModel<T | T[]>({ required: true })

const isOn = (value: T) => (props.multiple ? (model.value as T[]).includes(value) : model.value === value)

const toggle = (value: T) => {
  if (props.options.find(o => o.value === value)?.disabled) return
  if (!props.multiple) {
    model.value = value
    return
  }
  const list = model.value as T[]
  model.value = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

const chips = ref<HTMLButtonElement[]>([])
const onKeydown = (index: number, event: KeyboardEvent) => {
  if (props.multiple || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return
  event.preventDefault()
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
  const next = (index + step + props.options.length) % props.options.length
  toggle(props.options[next]!.value)
  chips.value[next]?.focus()
}
</script>

<template>
  <div :role="multiple ? 'group' : 'radiogroup'" :aria-label="label" class="flex flex-wrap gap-2">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="chips"
      type="button"
      :role="multiple ? 'checkbox' : 'radio'"
      :aria-checked="isOn(option.value)"
      :disabled="option.disabled"
      :tabindex="multiple || isOn(option.value) || (!options.some(o => isOn(o.value)) && index === 0) ? 0 : -1"
      class="flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors"
      :class="[
        size === 'sm' ? 'h-9 px-3.5 text-[14px]' : 'h-11 px-4 text-[15px]',
        isOn(option.value) ? 'bg-brand text-white' : 'bg-surface text-ink shadow-pill hover:bg-subtle',
        option.disabled ? 'cursor-not-allowed opacity-45 hover:bg-surface' : '',
      ]"
      @click="toggle(option.value)"
      @keydown="onKeydown(index, $event)"
    >
      <Icon v-if="option.icon" :name="option.icon" class="size-4" :class="isOn(option.value) ? 'text-accent' : ''" />
      {{ option.label }}
      <Icon v-if="multiple && isOn(option.value)" name="ph:check-bold" class="size-3.5 text-accent" />
    </button>
  </div>
</template>
