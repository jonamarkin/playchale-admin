import type { ShareMilestone, ShareRecap, ShareResult, ShareUpcoming } from '~/types/admin'
import { background, brushNumber, C, CARD_SIZE, type CardFormat, type Ctx, drawLogo, fitText, font, footer, kicker, pill, roundRect, toPng } from '~/utils/shareCanvas'

/**
 * The desk's four share images, each as a feed post (4:5) or a story (9:16): a match's result, the
 * week's recap, a milestone, and the games anyone can join. Drawn only from real numbers (the
 * desk's /admin/share data), and with people by first name only, or none at all.
 */

export type CardKind = 'result' | 'recap' | 'milestone' | 'upcoming'

export interface CardInput {
  kind: CardKind
  format: CardFormat
  /** First names on the image; off, no names at all. */
  names: boolean
  /** The address people go to, e.g. "playchale.com". */
  site: string
  result?: ShareResult
  recap?: ShareRecap
  milestone?: ShareMilestone
  upcoming?: ShareUpcoming[]
}

const sportLabel = (sport: string) => sport.charAt(0).toUpperCase() + sport.slice(1)

const dayDate = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(new Date(iso))
const weekday = (iso: string, timeZone: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone }).format(new Date(iso)).toUpperCase()
const clock = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).format(new Date(iso)).replace(/\s/g, ' ').toLowerCase()
const range = (from: string, to: string) => {
  const f = new Date(from)
  const t = new Date(to)
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric' })
  const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' })
  return f.getMonth() === t.getMonth() ? `${day.format(f)} – ${dayMonth.format(t)}` : `${dayMonth.format(f)} – ${dayMonth.format(t)}`
}

/** "2 goals", "1 goal · 1 ast", "14 pts": what a player did, in the sport's terms. */
const line = (p: { goals: number, assists: number, points: number }) => {
  const parts = [
    p.goals ? `${p.goals} ${p.goals === 1 ? 'goal' : 'goals'}` : '',
    p.assists ? `${p.assists} ast` : '',
    p.points ? `${p.points} pts` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

/** Where a format's content sits, and how much taller a story's spacing is than a post's. */
const frame = (format: CardFormat) => {
  const f = CARD_SIZE[format]
  return { ...f, k: format === 'story' ? 1.18 : 1 }
}

/** The header every card shares: the logo, and a label on the right. */
const header = (ctx: Ctx, format: CardFormat, label: string, texture: HTMLImageElement[]) => {
  const f = frame(format)
  background(ctx, f.width, f.height, texture)
  drawLogo(ctx, f.pad, f.top + 6, 44)
  pill(ctx, label, f.width - f.pad, f.top - 6, 68)
  return f
}

/* ---------------------------------------------------------------- */
/* A match's result                                                   */
/* ---------------------------------------------------------------- */

function drawResult(ctx: Ctx, input: CardInput, texture: HTMLImageElement[]) {
  const r = input.result!
  const f = header(ctx, input.format, sportLabel(r.sport), texture)
  const { width: w, pad, top, k } = f
  let y = top + 180 * k
  kicker(ctx, r.sets.length ? 'Full time · sets' : 'Full time', pad, y)
  y += 82 * k
  const title = fitText(ctx, r.title, 600, 66, w - pad * 2, 44)
  font(ctx, 600, title.size, -1)
  ctx.fillStyle = C.white
  ctx.fillText(title.text, pad, y)
  y += 56 * k
  const meta = fitText(ctx, `${dayDate(r.startsAt, r.timezone)} · ${r.venueName}`, 400, 32, w - pad * 2, 24)
  font(ctx, 400, meta.size)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(meta.text, pad, y)

  // The score, big, on the brush stroke
  y += 280 * k
  brushNumber(ctx, `${r.home.score} – ${r.away.score}`, '', w / 2, y, 210, true)

  // The two sides, left and right
  y += 110 * k
  for (const [side, align, x] of [[r.home, 'left', pad], [r.away, 'right', w - pad]] as const) {
    ctx.textAlign = align
    const label = fitText(ctx, side.label, 600, 38, w / 2 - pad - 20, 26)
    font(ctx, 600, label.size)
    ctx.fillStyle = C.white
    ctx.fillText(label.text, x, y)
    if (!input.names) continue
    let py = y + 58 * k
    for (const p of side.players.slice(0, input.format === 'story' ? 7 : 6)) {
      const stat = line(p)
      font(ctx, 400, 32)
      const nameW = ctx.measureText(p.name).width
      font(ctx, 500, 32)
      const statText = stat ? ` · ${stat}` : ''
      const statW = ctx.measureText(statText).width
      const left = align === 'left' ? x : x - nameW - statW
      ctx.textAlign = 'left'
      font(ctx, 400, 32)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText(p.name, left, py)
      if (stat) {
        font(ctx, 500, 32)
        ctx.fillStyle = C.accent
        ctx.fillText(statText, left + nameW, py)
      }
      py += 48 * k
    }
  }
  ctx.textAlign = 'left'
  if (r.sets.length) {
    font(ctx, 500, 30)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.textAlign = 'center'
    ctx.fillText(`Sets  ${r.sets.map(s => `${s.home}–${s.away}`).join('  ·  ')}`, w / 2, f.bottom - 170)
    ctx.textAlign = 'left'
  }
  footer(ctx, 'Play your next game on PlayChale', input.site, w, f.bottom - 110, pad)
}

/* ---------------------------------------------------------------- */
/* The week                                                           */
/* ---------------------------------------------------------------- */

function drawRecap(ctx: Ctx, input: CardInput, texture: HTMLImageElement[]) {
  const r = input.recap!
  const f = header(ctx, input.format, 'Weekly recap', texture)
  const { width: w, pad, top, k } = f
  let y = top + 180 * k
  kicker(ctx, 'This week on PlayChale', pad, y)
  y += 84 * k
  font(ctx, 600, 64, -1)
  ctx.fillStyle = C.white
  ctx.fillText(range(r.from, r.to), pad, y)

  // Three figures
  y += 60 * k
  const figures = [[r.games, r.games === 1 ? 'game' : 'games'], [r.players, r.players === 1 ? 'player' : 'players'], [r.goals, r.goals === 1 ? 'goal' : 'goals']] as const
  const gap = 24
  const tw = (w - pad * 2 - gap * 2) / 3
  const th = 210 * k
  figures.forEach(([value, label], i) => {
    const tx = pad + i * (tw + gap)
    roundRect(ctx, tx, y, tw, th, 32)
    ctx.fillStyle = i === 0 ? C.accent : 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.textAlign = 'center'
    font(ctx, 600, 100, -3)
    ctx.fillStyle = i === 0 ? C.ink : C.white
    ctx.fillText(String(value), tx + tw / 2, y + th / 2 + 22)
    font(ctx, 500, 30)
    ctx.fillStyle = i === 0 ? 'rgba(11,23,22,0.7)' : 'rgba(255,255,255,0.7)'
    ctx.fillText(label, tx + tw / 2, y + th / 2 + 72)
    ctx.textAlign = 'left'
  })

  // The results
  y += th + 70 * k
  const shown = r.results.slice(0, input.format === 'story' ? 4 : 3)
  if (shown.length) {
    kicker(ctx, 'Results', pad, y)
    y += 30
    for (const game of shown) {
      const rh = 96 * k
      roundRect(ctx, pad, y, w - pad * 2, rh, 24)
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.fill()
      const score = `${game.home.score} – ${game.away.score}`
      font(ctx, 600, 44, -1)
      const scoreW = ctx.measureText(score).width
      ctx.fillStyle = C.accent
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(score, w - pad - 32, y + rh / 2 + 2)
      ctx.textAlign = 'left'
      const name = fitText(ctx, game.title, 500, 34, w - pad * 2 - scoreW - 96, 24)
      font(ctx, 500, name.size)
      ctx.fillStyle = C.white
      ctx.fillText(name.text, pad + 32, y + rh / 2 + 2)
      ctx.textBaseline = 'alphabetic'
      y += rh + 16
    }
  }

  // Who scored most, by first name
  if (input.names && r.topScorers.length) {
    y += 44 * k
    const best = r.topScorers.filter(s => s.goals === r.topScorers[0]!.goals)
    const text = best.length === 1
      ? `Top scorer: ${best[0]!.name} · ${best[0]!.goals} ${best[0]!.goals === 1 ? 'goal' : 'goals'}`
      : `Top scorers: ${best.map(s => s.name).join(', ')} · ${best[0]!.goals} each`
    const fitted = fitText(ctx, text, 500, 34, w - pad * 2, 24)
    font(ctx, 500, fitted.size)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText(fitted.text, pad, y)
  }
  footer(ctx, 'Find a game near you on PlayChale', input.site, w, f.bottom - 110, pad)
}

/* ---------------------------------------------------------------- */
/* A milestone                                                        */
/* ---------------------------------------------------------------- */

function drawMilestone(ctx: Ctx, input: CardInput, texture: HTMLImageElement[]) {
  const m = input.milestone!
  const f = header(ctx, input.format, 'Made in Ghana', texture)
  const { width: w, pad, top, k } = f
  let y = top + 230 * k
  kicker(ctx, 'PlayChale so far', w / 2, y, 'center')
  y += 300 * k
  brushNumber(ctx, String(m.members), m.members === 1 ? 'player' : 'players', w / 2, y, 230, true, w - pad * 2)
  y += 120 * k
  const support = [`${m.gamesPlayed} ${m.gamesPlayed === 1 ? 'game' : 'games'} played`, m.sports > 1 ? `${m.sports} sports` : ''].filter(Boolean).join(' · ')
  font(ctx, 500, 44)
  ctx.fillStyle = C.white
  ctx.textAlign = 'center'
  ctx.fillText(`and ${support}`, w / 2, y)
  y += 210 * k
  font(ctx, 600, 84, -2)
  ctx.fillStyle = C.white
  ctx.fillText('Join them.', w / 2, y)
  y += 70 * k
  font(ctx, 400, 36)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('Find a game, or put one on. It’s free.', w / 2, y)
  ctx.textAlign = 'left'
  footer(ctx, 'Your next game is on PlayChale', input.site, w, f.bottom - 110, pad)
}

/* ---------------------------------------------------------------- */
/* Games anyone can join                                              */
/* ---------------------------------------------------------------- */

function drawUpcoming(ctx: Ctx, input: CardInput, texture: HTMLImageElement[]) {
  const games = input.upcoming ?? []
  const f = header(ctx, input.format, 'Open to all', texture)
  const { width: w, pad, top, k } = f
  let y = top + 180 * k
  kicker(ctx, 'Play this week', pad, y)
  y += 84 * k
  font(ctx, 600, 64, -1)
  ctx.fillStyle = C.white
  ctx.fillText(games.length ? 'Games you can join' : 'Put the first game on', pad, y)
  y += 60 * k

  if (!games.length) {
    font(ctx, 400, 36)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText('Nothing open this week yet. A place, a time,', pad, y + 40)
    ctx.fillText('and a link for the group chat.', pad, y + 90)
  }
  const rh = 150 * k
  for (const g of games.slice(0, input.format === 'story' ? 6 : 4)) {
    roundRect(ctx, pad, y, w - pad * 2, rh, 28)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    // When, on the left
    ctx.textAlign = 'left'
    font(ctx, 600, 30, 3)
    ctx.fillStyle = C.accent
    ctx.fillText(weekday(g.startsAt, g.timezone), pad + 32, y + rh / 2 - 6)
    font(ctx, 500, 30)
    ctx.fillStyle = C.white
    ctx.fillText(clock(g.startsAt, g.timezone), pad + 32, y + rh / 2 + 36)
    // Spots, on the right
    const spots = g.spotsLeft == null ? 'Open' : `${g.spotsLeft} ${g.spotsLeft === 1 ? 'spot' : 'spots'}`
    font(ctx, 600, 28)
    const sw = ctx.measureText(spots).width + 40
    roundRect(ctx, w - pad - 28 - sw, y + rh / 2 - 26, sw, 52, 26)
    ctx.fillStyle = C.accent
    ctx.fill()
    ctx.fillStyle = C.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spots, w - pad - 28 - sw / 2, y + rh / 2 + 1)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    // What and where, between
    const left = pad + 210
    const room = w - pad - 28 - sw - 24 - left
    const title = fitText(ctx, g.title, 600, 36, room, 26)
    font(ctx, 600, title.size)
    ctx.fillStyle = C.white
    ctx.fillText(title.text, left, y + rh / 2 - 6)
    const where = fitText(ctx, [g.venueName, g.venueArea].filter(Boolean).join(', '), 400, 28, room, 22)
    font(ctx, 400, where.size)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(where.text, left, y + rh / 2 + 36)
    y += rh + 18
  }
  footer(ctx, 'Join free on PlayChale', input.site, w, f.bottom - 110, pad)
}

/** Draws one card and returns it as a PNG. */
export function renderShareCard(input: CardInput, texture: HTMLImageElement[]): Promise<Blob> {
  return toPng(input.format, (ctx) => {
    if (input.kind === 'result') drawResult(ctx, input, texture)
    else if (input.kind === 'recap') drawRecap(ctx, input, texture)
    else if (input.kind === 'milestone') drawMilestone(ctx, input, texture)
    else drawUpcoming(ctx, input, texture)
  })
}

/** A caption to post with it, from the same numbers. */
export function captionFor(input: CardInput): string {
  const url = `https://${input.site}`
  if (input.kind === 'result' && input.result) {
    const r = input.result
    return `Full time at ${r.venueName}: ${r.title}, ${r.home.score}–${r.away.score}. Your next game is on PlayChale: ${url}`
  }
  if (input.kind === 'recap' && input.recap) {
    const r = input.recap
    return `This week on PlayChale: ${r.games} ${r.games === 1 ? 'game' : 'games'}, ${r.players} players, ${r.goals} goals. Find a game near you: ${url}`
  }
  if (input.kind === 'milestone' && input.milestone) {
    return `${input.milestone.members} players on PlayChale and counting. Find a game, or put one on. It’s free: ${url}`
  }
  const n = input.upcoming?.length ?? 0
  return n
    ? `${n} ${n === 1 ? 'game' : 'games'} open to join this week on PlayChale. Pick one and you’re in: ${url}`
    : `Got a regular game? Put it on PlayChale and share the link with your group: ${url}`
}
