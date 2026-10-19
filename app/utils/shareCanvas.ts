/**
 * Drawing primitives for the desk's share images, in PlayChale's look: the teal gradient with a mint
 * glow and faint sports icons, the logo, the mint brush stroke behind a big number, Onest throughout.
 *
 * Copied from the player app's stat card (webapp/app/utils/shareCard.ts): the two apps are separate
 * builds, so they can't share the file. Change one, look at the other.
 */

export type CardFormat = 'post' | 'story'

/** Feed 4:5 and story 9:16. Stories cover roughly their top and bottom 250px with their own UI. */
export const CARD_SIZE: Record<CardFormat, { width: number, height: number, top: number, bottom: number, pad: number }> = {
  post: { width: 1080, height: 1350, top: 70, bottom: 1290, pad: 80 },
  story: { width: 1080, height: 1920, top: 250, bottom: 1670, pad: 90 },
}

// Design tokens (mirrors @theme in main.css)
export const C = {
  brand: '#0c3a3a',
  brandDeep: '#0f4848',
  night: '#061c1c',
  accent: '#7cf0c8',
  ink: '#0b1716',
  white: '#ffffff',
}
const FONT = 'Onest, ui-sans-serif, system-ui, sans-serif'

// Logo mark (three arcs of 90°, 30° apart, rounded ends) and the brush stroke, as the player app draws them.
const LOGO_ARCS = [-72, 48, 168].map(deg => (deg * Math.PI) / 180)
const BRUSH_MAIN = 'M6 34C58 14 150 22 252 17s184-10 236 8c7 17 5 39-2 55-66 13-188 5-268 10S62 97 9 85C1 68 1 50 6 34Z'
const BRUSH_FLICKS = ['M470 30c14-3 24-2 30 1-8 4-18 6-30 6Z', 'M476 68c11 0 19 1 24 4-8 3-16 3-25 2Z', 'M0 58c4-3 9-5 14-5-3 5-7 8-13 9Z']

export type Ctx = CanvasRenderingContext2D

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Turns a rendered <svg> (from <Icon mode="svg">) into an image in the given colour. */
export function svgToImage(svg: SVGElement, color: string, size = 128): Promise<HTMLImageElement | null> {
  const clone = svg.cloneNode(true) as SVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(size))
  clone.setAttribute('height', String(size))
  clone.removeAttribute('class')
  clone.setAttribute('style', `color:${color}`)
  const markup = clone.outerHTML.replaceAll('currentColor', color)
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`)
}

export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all(['400 40px Onest', '500 40px Onest', '600 40px Onest'].map(f => document.fonts.load(f).catch(() => undefined)))
}

export const font = (ctx: Ctx, weight: number, size: number, spacing = 0) => {
  ctx.font = `${weight} ${size}px ${FONT}`
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${spacing}px`
}

export const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Shrinks text until it fits `maxWidth`, down to `minSize`, then shortens it with an ellipsis. */
export const fitText = (ctx: Ctx, text: string, weight: number, size: number, maxWidth: number, minSize = size * 0.6) => {
  let s = size
  font(ctx, weight, s)
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 2
    font(ctx, weight, s)
  }
  let t = text
  while (ctx.measureText(t).width > maxWidth && t.length > 1) t = `${t.slice(0, -2)}…`
  return { text: t, size: s }
}

export const drawLogo = (ctx: Ctx, x: number, y: number, height: number) => {
  const scale = height / 24
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.strokeStyle = C.accent
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  for (const start of LOGO_ARCS) {
    ctx.beginPath()
    ctx.arc(12, 12, 8.6, start, start + Math.PI / 2)
    ctx.stroke()
  }
  ctx.restore()
  font(ctx, 600, height * 1.25, -1)
  ctx.fillStyle = C.white
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText('PlayChale', x + 24 * scale + height * 0.45, y + height / 2 + 1)
}

export const drawBrush = (ctx: Ctx, x: number, y: number, w: number, h: number) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.02)
  ctx.scale(w / 500, h / 100)
  ctx.fillStyle = C.accent
  ctx.fill(new Path2D(BRUSH_MAIN))
  ctx.globalAlpha = 0.7
  for (const d of BRUSH_FLICKS) ctx.fill(new Path2D(d))
  ctx.restore()
}

export const background = (ctx: Ctx, w: number, h: number, texture: HTMLImageElement[]) => {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, C.brandDeep)
  g.addColorStop(0.55, C.brand)
  g.addColorStop(1, C.night)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const glow = ctx.createRadialGradient(w * 0.9, h * 0.08, 0, w * 0.9, h * 0.08, w * 0.75)
  glow.addColorStop(0, 'rgba(124,240,200,0.22)')
  glow.addColorStop(1, 'rgba(124,240,200,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  const spots = [[0.78, 0.2, 300, -14], [0.02, 0.5, 190, 18], [0.83, 0.62, 210, 12], [0.1, 0.9, 170, -20], [0.62, 0.95, 150, 24]] as const
  ctx.save()
  ctx.globalAlpha = 0.07
  texture.forEach((img, i) => {
    const [px, py, size, rot] = spots[i % spots.length]!
    ctx.save()
    ctx.translate(px * w, py * h)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
    ctx.restore()
  })
  ctx.restore()
}

/** A small rounded label, e.g. the sport, in the top-right corner. */
export const pill = (ctx: Ctx, text: string, right: number, y: number, h: number) => {
  font(ctx, 500, h * 0.42)
  const pad = h * 0.42
  const w = ctx.measureText(text).width + pad * 2
  roundRect(ctx, right - w, y, w, h, h / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fill()
  ctx.fillStyle = C.white
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, right - w + pad, y + h / 2 + 1)
}

/** A spaced, mint, upper-case line: "FULL TIME", "PLAY THIS WEEK". */
export const kicker = (ctx: Ctx, text: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
  font(ctx, 600, 30, 5)
  ctx.fillStyle = C.accent
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = align
  ctx.fillText(text.toUpperCase(), x, y)
  ctx.textAlign = 'left'
  font(ctx, 400, 30)
}

/** A big number on the brush stroke, with its word beside it: "38 players". */
export const brushNumber = (ctx: Ctx, value: string, label: string, x: number, baseline: number, size: number, center = false, maxWidth = 900) => {
  font(ctx, 600, size, -size * 0.03)
  const numW = ctx.measureText(value).width
  font(ctx, 600, size * 0.46, -2)
  const labW = label ? ctx.measureText(label).width : 0
  const gap = label ? size * 0.14 : 0
  const total = Math.min(numW + gap + labW, maxWidth)
  const left = center ? x - total / 2 : x
  drawBrush(ctx, left - size * 0.24, baseline - size * 0.86, total + size * 0.56, size * 1.02)
  ctx.fillStyle = C.ink
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  font(ctx, 600, size, -size * 0.03)
  ctx.fillText(value, left, baseline)
  if (label) {
    font(ctx, 600, size * 0.46, -2)
    ctx.fillText(label, left + numW + gap, baseline - size * 0.06)
  }
}

/** The bottom line: an invitation on the left, the address in mint on the right. */
export const footer = (ctx: Ctx, line: string, url: string, w: number, y: number, pad: number) => {
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(pad, y, w - pad * 2, 2)
  const cy = y + 62
  font(ctx, 600, 30)
  ctx.fillStyle = C.accent
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'
  ctx.fillText(url, w - pad, cy)
  const urlW = ctx.measureText(url).width
  ctx.textAlign = 'left'
  const fitted = fitText(ctx, line, 500, 30, w - pad * 2 - urlW - 40, 22)
  font(ctx, 500, fitted.size)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(fitted.text, pad, cy)
}

/** A canvas of the format's size, drawn by `draw`, as a PNG. */
export async function toPng(format: CardFormat, draw: (ctx: Ctx) => void | Promise<void>): Promise<Blob> {
  await ensureFonts()
  const { width, height } = CARD_SIZE[format]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'left'
  await draw(ctx)
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'))
}
