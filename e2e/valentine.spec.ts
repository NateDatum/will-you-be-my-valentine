import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })
const email = `valentine-e2e-${Date.now()}@example.com`

async function createInvite(page: Page, name: string) {
  await page.goto('/create')
  await page.getByLabel('Who is it for?').fill(name)
  await page.getByLabel('Your message').fill('Every coffee run is better with you.')
  await page.getByRole('button', { name: 'Create Invitation' }).click()
  await expect(page.getByText(`Your letter for ${name} is sealed`)).toBeVisible()
  return page.getByLabel('Shareable link').inputValue()
}

test('signed-out visitors are sent to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/create')
  await expect(page).toHaveURL(/\/login$/)
})

test('unknown or malformed links show the lost-letter page', async ({ page, request }) => {
  for (const path of ['/i/hello', '/i/aaaaaaaaaaaaaaaaaaaaa']) {
    await page.goto(path)
    await expect(page.getByText('This letter got lost in the mail')).toBeVisible()
  }
  const res = await request.post('/api/invites/aaaaaaaaaaaaaaaaaaaaa/respond', { data: { answer: 'accepted' } })
  expect(res.status()).toBe(404)
})

test('sender creates invites; recipient declines one and accepts another', async ({ page, browser, request }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'New here? Create an account' }).click()
  await page.getByLabel('Your name').fill('Sam')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('valentine-e2e-pass')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('No invitations yet')).toBeVisible()
  await page.goto('/login')
  await expect(page).toHaveURL(/\/dashboard$/)

  // Invite 1: two Nos
  const declineLink = await createInvite(page, 'Jules')
  const recipient = await (await browser.newContext()).newPage()
  await recipient.goto(declineLink)
  await recipient.getByRole('button', { name: 'Open your letter' }).click()
  await recipient.getByRole('button', { name: 'No, thank you' }).click()
  await expect(recipient.getByText('Okay! Just double-checking')).toBeVisible()
  await Promise.all([recipient.waitForResponse('**/respond'), recipient.getByRole('button', { name: 'Yes, I’m sure' }).click()])
  await expect(recipient.getByText('Two Nos?')).toBeVisible()
  await recipient.reload()
  await expect(recipient.getByText('Take care, Jules')).toBeVisible()

  // API: bad body 400; repeating the answer is harmless
  const slug = declineLink.split('/i/')[1]
  expect((await request.post(`/api/invites/${slug}/respond`, { data: { answer: 'maybe' } })).status()).toBe(400)
  expect((await request.post(`/api/invites/${slug}/respond`, { data: { answer: 'declined' } })).status()).toBe(200)

  // Invite 2: sender preview must not count, then recipient says Yes
  const acceptLink = await createInvite(page, 'Mika')
  await page.goto(`${acceptLink}?preview=1`)
  await expect(page.getByText('Preview — your answer won’t be sent')).toBeVisible()
  await page.getByRole('link', { name: 'Back to dashboard' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('.row', { hasText: 'Mika' })).toContainText('Not opened yet')

  await recipient.goto(acceptLink)
  await recipient.getByRole('button', { name: 'Open your letter' }).click()
  await Promise.all([recipient.waitForResponse('**/respond'), recipient.getByRole('button', { name: /Yes, I’d love to/ }).click()])
  await expect(recipient.getByText('Yay! It’s a date!')).toBeVisible()

  await page.reload()
  await expect(page.locator('.row', { hasText: 'Jules' })).toContainText('Declined')
  await expect(page.locator('.row', { hasText: 'Mika' })).toContainText('Accepted')
})

test('anonymous clients cannot read the invites table', async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  test.skip(!url || !key, 'Supabase env not available')
  const res = await request.get(`${url}/rest/v1/invites?select=*`, { headers: { apikey: key! } })
  expect(res.ok()).toBe(true)
  expect(await res.json()).toEqual([])
})
