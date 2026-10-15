import { defineConfig, devices } from '@playwright/test'

try { process.loadEnvFile('.env.local') } catch {}

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
})
