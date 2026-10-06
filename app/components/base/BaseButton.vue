<script setup lang="ts">
import { NuxtLink } from '#components'

type Variant = 'primary' | 'secondary' | 'soft' | 'outline-accent' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    to?: string
    block?: boolean
    /** Only for buttons (ignored for links). */
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    /** Shows a spinner, keeps the width, and blocks further clicks. */
    loading?: boolean
  }>(),
  { variant: 'primary', size: 'md', to: undefined, block: false, type: 'button', disabled: false, loading: false },
)

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent-hover hover:shadow-[0_10px_28px_-10px_rgb(60_200_160/0.8)]',
  secondary: 'bg-surface text-ink shadow-pill hover:shadow-[0_1px_2px_rgb(16_17_12/0.05),0_0_0_1px_rgb(16_17_12/0.14)]',
  soft: 'bg-canvas text-ink shadow-[inset_0_0_0_1px_rgb(16_17_12/0.06)] hover:bg-hairline',
  'outline-accent': 'text-accent shadow-[inset_0_0_0_1.5px_rgb(124_240_200/0.32)] hover:bg-accent/10 hover:shadow-[inset_0_0_0_1.5px_rgb(124_240_200/0.65)]',
  ghost: 'text-ink hover:bg-subtle',
  danger: 'bg-surface text-[#b42318] shadow-[inset_0_0_0_1px_rgb(180_35_24/0.25)] hover:bg-[#fef3f2]',
}

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[14px]',
  md: 'h-12 px-6 text-[16px]',
  lg: 'h-16 px-10 text-[16px]',
}

const inactive = computed(() => props.disabled || props.loading)
const tag = computed(() => (props.to && !inactive.value ? NuxtLink : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="tag === 'button' ? undefined : to"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? inactive : undefined"
    :aria-busy="loading || undefined"
    class="group/btn relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,box-shadow,transform,opacity] duration-300 ease-out-expo select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
    :class="[variants[variant], sizes[size], block ? 'w-full' : '', loading ? '!opacity-100' : '']"
  >
    <span class="inline-flex items-center gap-2" :class="loading ? 'invisible' : ''">
      <slot />
    </span>
    <Icon v-if="loading" name="ph:circle-notch-bold" class="absolute size-5 animate-spin" aria-hidden="true" />
  </component>
</template>
