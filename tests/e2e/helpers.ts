import { createHash } from 'node:crypto'
import { expect, test as base, type APIRequestContext, type Page } from '@playwright/test'

export const API = process.env.PLAYCHALE_API ?? 'http://localhost:8080'

/** Every test starts from the demo data, in which Kojo is the only staff member. */
export const test = base.extend<{ fresh: void }>({
  fresh: [async ({ request }, use) => {
    const reset = await request.post(`${API}/dev/reset`)
    expect(reset.ok(), 'the API must be running with test support on').toBeTruthy()
    await use()
  }, { auto: true }],
})
export { expect }

/** Signs in through the page itself, the way a person does, so the cross-site cookie is exercised. */
export async function signIn(page: Page, who: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email or phone').fill(who)
  await page.getByRole('button', { name: 'Send a code' }).click()
  await page.getByLabel('The 6-digit code').fill('123456')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Errors a page throws or logs, so a test can insist there were none. */
export function watchForErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !/status of 404/.test(message.text())) errors.push(message.text().slice(0, 200))
  })
  return errors
}

/** The demo players' numbers, as the API's demo seed has them. Kojo is the staff member. */
export const KOJO = '+233240000002'
export const ABENA = '+233240000003'

/** A demo record's ID: the name-based UUID the API's demo seed gives it (backend: SeedIds). */
export function seeded(name: string): string {
  const hash = createHash('md5').update(`playchale-seed/${name}`).digest()
  hash[6] = (hash[6]! & 0x0F) | 0x30
  hash[8] = (hash[8]! & 0x3F) | 0x80
  const hex = hash.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Signs a request context in as a player directly against the API, to set things up. */
export async function asPlayer(request: APIRequestContext, phone: string) {
  await request.post(`${API}/auth/codes`, { data: { phone } })
  const signedIn = await request.post(`${API}/auth/sessions`, { data: { phone, code: '123456' } })
  expect(signedIn.ok(), `signing in as ${phone}`).toBeTruthy()
}
