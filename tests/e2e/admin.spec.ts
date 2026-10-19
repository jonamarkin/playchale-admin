import { ABENA, API, asPlayer, expect, goTo, openNav, seeded, signIn, test, watchForErrors } from './helpers'

test.describe('Who gets in', () => {
  test('signed out, the only page is sign-in', async ({ page }) => {
    await page.goto('/people')
    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('a player who signs in is told there is nothing here, and is not signed out of PlayChale', async ({ page }) => {
    await signIn(page, '024 000 0003')
    await expect(page.getByRole('heading', { name: /nothing here for this account/ })).toBeVisible()
    // The session is the API's own, shared with the player app: it must survive this page.
    const session = await page.request.get(`${API}/auth/session`)
    expect(await session.json()).not.toBeNull()
    // And the desk's data is refused by the API itself, not only hidden by this app.
    expect((await page.request.get(`${API}/admin/people`)).status()).toBe(404)
  })

  test('staff sign in and land on the overview', async ({ page }) => {
    const errors = watchForErrors(page)
    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'New players' }).first()).toBeVisible()
    // A laptop has no SMS provider, so the desk says texts aren't set up rather than showing a balance.
    await expect(page.getByRole('region', { name: 'SMS' }).getByText(/Texts aren’t set up/)).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('The desk', () => {
  test('find someone the way a Ghanaian writes their number, and see what happened to them', async ({ page }) => {
    await signIn(page, '024 000 0002')
    await goTo(page, 'People')
    await page.getByPlaceholder(/Name, handle, phone/).fill('024 000 0003')
    const found = page.getByRole('list', { name: 'People found' }).getByRole('button')
    await expect(found).toHaveCount(1)
    await found.first().click()
    // In view, not merely visible: on a phone the panel opens below the list, and "visible" passed
    // while it sat a screen further down and choosing someone seemed to do nothing.
    await expect(page.getByRole('heading', { name: 'What happened' })).toBeInViewport()
    await expect(page.getByText('Joined a game').first()).toBeVisible()

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export their data' }).click()
    expect((await download).suggestedFilename()).toMatch(/^playchale-.+\.json$/)
  })

  test('the overview counts events, and visits without knowing who', async ({ page, playwright }) => {
    // Someone opens the games-day page from a link tagged for Hillview, as the player app tells the API.
    const visitor = await playwright.request.newContext({ extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36' } })
    expect((await visitor.post(`${API}/usage`, { data: { kind: 'page', name: '/games-day', source: 'hillview' } })).status()).toBe(204)
    await visitor.dispose()

    await signIn(page, '024 000 0002')
    await expect(page.getByRole('region', { name: 'Events' }).getByText('Events made')).toBeVisible()
    const visits = page.getByRole('region', { name: 'Visits' })
    await expect(visits.getByText('Games days (churches, schools)')).toBeVisible()
    await expect(visits.getByText('hillview', { exact: true })).toBeVisible()
  })

  test('choosing someone far down the list brings their history into view', async ({ page }) => {
    await signIn(page, '024 000 0002')
    // Signed in once the overview is up: going straight on raced the session cookie.
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto('/people')
    const last = page.getByRole('list', { name: 'People found' }).getByRole('button').last()
    await last.click()
    await expect(page.getByRole('heading', { name: 'What happened' })).toBeInViewport()
  })

  test('a message nobody in the game will take down can be, with a reason', async ({ page, playwright }) => {
    // Abena, in Saturday's game, says something.
    const player = await playwright.request.newContext()
    await asPlayer(player, ABENA)
    const said = await player.post(`${API}/games/${seeded('g-osu-sat')}/messages`, { data: { body: 'Call me on 0244 000 000 for cheap jerseys' } })
    expect(said.ok()).toBeTruthy()
    await player.dispose()

    await signIn(page, '024 000 0002')
    await goTo(page, 'Messages')
    const message = page.getByRole('list', { name: 'Messages' }).getByRole('listitem').filter({ hasText: 'cheap jerseys' })
    await expect(message).toBeVisible()
    await message.getByRole('button', { name: /Take down/ }).click()
    await message.getByLabel('Why it’s coming down').fill('spam')
    await message.getByRole('button', { name: 'Take it down' }).click()
    await expect(page.getByText('cheap jerseys')).toBeHidden()
  })

  test('the overview charts the period, and the way from a visit to doing something', async ({ page }) => {
    const errors = watchForErrors(page)
    await signIn(page, '024 000 0002')
    const trends = page.getByRole('region', { name: 'Over time' })
    await expect(trends.getByRole('img', { name: /^New players per day/ })).toBeVisible()
    await trends.getByRole('radio', { name: 'Games made' }).click()
    await expect(trends.getByRole('img', { name: /^Games made per day/ })).toBeVisible()
    await page.getByRole('radiogroup', { name: 'Period' }).getByRole('radio', { name: 'Year' }).click()
    await expect(trends.getByRole('img', { name: /^Games made per month/ })).toBeVisible()

    const funnel = page.getByRole('region', { name: 'From a visit to doing something' })
    await expect(funnel.getByText('New accounts')).toBeVisible()
    await expect(funnel.getByText('Hosted a game without an account')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('a games day on today shows its results so far, and who to call', async ({ page }) => {
    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await goTo(page, 'Events')
    const hillview = page.getByRole('list', { name: 'Events' }).getByRole('link', { name: /Hillview Games Day/ })
    await expect(hillview).toContainText('On today')
    await hillview.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hillview Games Day' })).toBeVisible()
    const running = page.getByRole('region', { name: 'Who’s running it' })
    await expect(running.getByText('Owner')).toBeVisible()
    await expect(running.getByRole('link', { name: /^\+233/ }).first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Games' }).getByRole('row', { name: /Draughts/ })).toBeVisible()
  })

  test('a fake game is taken down with a reason, and its host is told why', async ({ page, playwright }) => {
    const host = await playwright.request.newContext()
    await asPlayer(host, ABENA)
    const made = await host.post(`${API}/games`, {
      data: {
        sport: 'football', format: '5-a-side', title: 'Free iPhones here', startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        durationMinutes: 60, venue: { kind: 'unlisted', name: 'Legon Park', area: 'Legon' }, capacity: 10, totalCost: 0, visibility: 'public',
      },
    })
    expect(made.ok(), 'Abena makes a game').toBeTruthy()

    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await goTo(page, 'Games')
    const fake = page.getByRole('list', { name: 'Games' }).getByRole('listitem').filter({ hasText: 'Free iPhones here' })
    await fake.getByRole('button', { name: 'Take down' }).click()
    // A reason first: it's what the host and players read.
    await fake.getByRole('button', { name: 'Take it down' }).click()
    await expect(fake.getByText('Say why')).toBeVisible()
    await fake.getByLabel(/Why it’s coming down/).fill('Not a real game: it advertises phones')
    await fake.getByRole('button', { name: 'Take it down' }).click()
    await expect(fake.getByText('Called off')).toBeVisible()
    await expect(fake.getByRole('button', { name: 'Take down' })).toHaveCount(0)

    const told = JSON.stringify(await (await host.get(`${API}/notifications`)).json())
    expect(told).toContain('Free iPhones here was taken down')
    expect(told).toContain('it advertises phones')
    await host.dispose()
  })

  test('a new venue waits on the desk until staff approve it, or send it back with a note', async ({ page, playwright }) => {
    const owner = await playwright.request.newContext()
    await asPlayer(owner, ABENA)
    const hours = Array.from({ length: 7 }, () => ({ open: '06:00', close: '23:00' }))
    const list = (name: string) => owner.post(`${API}/venues`, {
      data: { name, area: 'Dansoman, Accra', address: 'Opposite the Dansoman roundabout', phone: '024 555 0101', hours, amenities: ['floodlights'],
        pitches: [{ name: 'Pitch A', sport: 'football', format: '5-a-side', surface: 'turf', pricePerHour: 30000 }] },
    })
    expect((await list('Dansoman Astro')).ok(), 'Abena lists a venue').toBeTruthy()
    expect((await list('Free Jerseys Arena')).ok()).toBeTruthy()

    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const tab = (await openNav(page)).getByRole('link', { name: /Venues/ })
    await expect(tab).toContainText('2')
    await tab.click()

    const venues = page.getByRole('list', { name: 'Venues' })
    const astro = venues.getByRole('listitem').filter({ hasText: 'Dansoman Astro' })
    await expect(astro.getByText('Opposite the Dansoman roundabout')).toBeVisible()
    await expect(astro.getByText(/Pitch A · football 5-a-side/)).toBeVisible()
    await astro.getByRole('button', { name: 'Approve' }).click()
    await expect(astro).toBeHidden()

    const fake = venues.getByRole('listitem').filter({ hasText: 'Free Jerseys Arena' })
    await fake.getByRole('button', { name: 'Needs a change' }).click()
    await fake.getByRole('button', { name: 'Send it back' }).click()
    await expect(fake.getByText('Say what to change')).toBeVisible()
    await fake.getByLabel(/What to change/).fill('We couldn’t find it on the map. Add its address.')
    await fake.getByRole('button', { name: 'Send it back' }).click()
    await expect(page.getByRole('heading', { name: 'Nothing waiting' })).toBeVisible()
    await expect((await openNav(page)).getByRole('link', { name: /Venues/ })).not.toContainText('2')

    // Live for players now; the other is still hidden. Abena heard about both.
    const found = await (await owner.get(`${API}/venues?query=dansoman`)).json() as { name: string }[]
    expect(found.map(v => v.name)).toEqual(['Dansoman Astro'])
    const told = JSON.stringify(await (await owner.get(`${API}/notifications`)).json())
    expect(told).toContain('Dansoman Astro is live')
    expect(told).toContain('Free Jerseys Arena needs a change')
    await owner.dispose()
  })

  test('reports about one thing are one decision, and the reporters are thanked', async ({ page, playwright }) => {
    // Tema morning run: free, so it can be called off (refunds aren't in the app).
    const game = seeded('g-tema-tomorrow')
    const abena = await playwright.request.newContext()
    await asPlayer(abena, ABENA)
    expect((await abena.post(`${API}/reports`, { data: { subjectType: 'game', subjectId: game, reason: 'spam', note: 'Selling phones in the chat' } })).ok()).toBeTruthy()
    const kwame = await playwright.request.newContext()
    await asPlayer(kwame, '+233240000001')
    expect((await kwame.post(`${API}/reports`, { data: { subjectType: 'game', subjectId: game, reason: 'unsafe' } })).ok()).toBeTruthy()
    expect((await kwame.post(`${API}/reports`, { data: { subjectType: 'user', subjectId: seeded('u-kofi'), reason: 'abuse' } })).ok()).toBeTruthy()

    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const tab = (await openNav(page)).getByRole('link', { name: /Reports/ })
    await expect(tab).toContainText('2')
    await tab.click()

    const list = page.getByRole('list', { name: 'Reported' })
    const saturday = list.getByRole('listitem').filter({ hasText: '2 reports' }).first()
    await expect(saturday.getByText('Selling phones in the chat')).toBeVisible()
    await saturday.getByRole('button', { name: 'Call the game off' }).click()
    await saturday.getByRole('button', { name: 'Call the game off' }).click()
    await expect(saturday.getByText('Say why')).toBeVisible()
    await saturday.getByLabel(/Why it’s coming down/).fill('Selling phones, not a game.')
    await saturday.getByRole('button', { name: 'Call the game off' }).click()
    await expect(list.getByText('Selling phones in the chat')).toBeHidden()

    const person = list.getByRole('listitem').filter({ hasText: 'Abusive or harassing' }).first()
    await person.getByRole('button', { name: 'Leave it' }).click()
    await person.getByRole('button', { name: 'Leave it' }).click()
    await expect(page.getByRole('heading', { name: 'Nothing to decide' })).toBeVisible()

    await page.getByRole('radio', { name: 'Decided' }).click()
    await expect(list.getByText('Dealt with')).toBeVisible()
    await expect(list.getByText('Left as it is')).toBeVisible()

    for (const reporter of [abena, kwame]) {
      expect(JSON.stringify(await (await reporter.get(`${API}/notifications`)).json())).toContain('Thanks for your report')
      await reporter.dispose()
    }
  })

  test('nothing scrolls sideways at phone width', async ({ page }) => {
    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    for (const path of ['/', '/people', '/messages', '/events', `/events/${seeded('ev-hillview')}`, '/games', '/venues', '/reports', '/share']) {
      await page.goto(path)
      await page.waitForTimeout(500)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over, path).toBeLessThanOrEqual(0)
    }
  })
})

test('signing out ends the session', async ({ page }) => {
  await signIn(page, '024 000 0002')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await openNav(page)
  await page.getByRole('button', { name: 'Sign out' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/sign-in/)
})

test.describe('Getting around', () => {
  test('the places are grouped; on a phone they sit in a menu that closes once one is picked', async ({ page }) => {
    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    const nav = await openNav(page)
    for (const group of ['Activity', 'To review', 'Promote']) await expect(nav.getByText(group, { exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Share images' })).toBeVisible()

    const menu = page.getByRole('dialog', { name: 'Menu' })
    if (await menu.isVisible()) {
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
      await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused()
    }
    await goTo(page, 'People')
    await expect(page).toHaveURL(/\/people$/)
    await expect(menu).toBeHidden()
  })
})

test.describe('Share images', () => {
  test('each image is drawn from what really happened, and downloads as a PNG', async ({ page }) => {
    await signIn(page, '024 000 0002')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await goTo(page, 'Share images')
    await expect(page.getByRole('heading', { name: 'Share images' })).toBeVisible()

    const preview = page.getByRole('img', { name: /^Share image:/ })
    await expect(preview).toHaveAttribute('alt', 'Share image: This week', { timeout: 15_000 })
    await expect(page.getByText(/^This week on PlayChale: \d+ games?, \d+ players, \d+ goals/)).toBeVisible()

    await page.getByRole('radio', { name: 'Milestone' }).click()
    await expect(page.getByText(/^\d+ players on PlayChale and counting/)).toBeVisible()
    await page.getByRole('radio', { name: 'Games coming up' }).click()
    await expect(preview).toHaveAttribute('alt', 'Share image: Games coming up', { timeout: 15_000 })

    // A played game's result, picked from the list; names can be left off.
    await page.getByRole('radio', { name: 'Match result' }).click()
    await expect(page.getByText(/^Full time at /)).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Show players’ first names').uncheck()
    await page.getByRole('radio', { name: 'Story · 9:16' }).click()
    await expect(page).toHaveURL(/card=result&game=/)

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download image' }).click()
    expect((await download).suggestedFilename()).toMatch(/^playchale-result-story-\d{4}-\d{2}-\d{2}\.png$/)
  })
})
