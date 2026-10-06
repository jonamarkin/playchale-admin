import { ABENA, API, asPlayer, expect, seeded, signIn, test, watchForErrors } from './helpers'

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
    await expect(page.getByText('New players')).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('The desk', () => {
  test('find someone the way a Ghanaian writes their number, and see what happened to them', async ({ page }) => {
    await signIn(page, '024 000 0002')
    await page.getByRole('link', { name: 'People' }).first().click()
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

  test('choosing someone far down the list brings their history into view', async ({ page }) => {
    await signIn(page, '024 000 0002')
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
    await page.getByRole('link', { name: 'Messages' }).first().click()
    const message = page.getByRole('list', { name: 'Messages' }).getByRole('listitem').filter({ hasText: 'cheap jerseys' })
    await expect(message).toBeVisible()
    await message.getByRole('button', { name: /Take down/ }).click()
    await message.getByLabel('Why it’s coming down').fill('spam')
    await message.getByRole('button', { name: 'Take it down' }).click()
    await expect(page.getByText('cheap jerseys')).toBeHidden()
  })

  test('nothing scrolls sideways at phone width', async ({ page }) => {
    await signIn(page, '024 000 0002')
    for (const path of ['/', '/people', '/messages']) {
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
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in/)
})
