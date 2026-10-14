export interface ChipOption<V extends string = string> {
  value: V
  label: string
  icon?: string
  /** Shown but can't be picked. */
  disabled?: boolean
}

/** One bar in ChartBars. */
export interface BarPoint {
  /** Under the bar, when there's room: "21 Sep". */
  label: string
  /** Over the bar when it's picked: "Mon 21 Sep". */
  title: string
  value: number
}

/** One step in ChartFunnel. */
export interface FunnelStep {
  label: string
  value: number
  /** Under the label, small: what's counted. */
  note?: string
}
