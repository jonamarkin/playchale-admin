import { defineConfig, devices } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * End-to-end tests for the admin desk, against the real API — there is no mock here: the desk only
 * exists to read real data, and the thing most worth testing is the gate the API keeps.
 *
 * Start the API (backend: ./mvnw spring-boot:run) and this app (pnpm dev, on :3200), then:
 *
 *   pnpm test:e2e
 *
 * Every test resets the demo data first, so they run one at a time.
 */
const cache = join(homedir(), '.cache/ms-playwright')
const chromium = (() => {
  try {
    const dir = readdirSync(cache).find(d => d.startsWith('chromium-'))
    if (!dir) return undefined
    const inner = readdirSync(join(cache, dir)).find(d => d.startsWith('chrome'))
    return inner ? join(cache, dir, inner, 'chrome') : undefined
  }
  catch {
    return undefined
  }
})()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.ADMIN_URL ?? 'http://localhost:3200',
    trace: 'retain-on-failure',
    timezoneId: 'Africa/Accra',
    launchOptions: chromium ? { executablePath: chromium } : {},
  },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
})
