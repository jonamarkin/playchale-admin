export interface ChipOption<V extends string = string> {
  value: V
  label: string
  icon?: string
  /** Shown but can't be picked. */
  disabled?: boolean
}
