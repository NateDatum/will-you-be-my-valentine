import { expect, test, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `valentine-hard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  await page.goto('/login')
  await page.getByRole('button', { name: 'New here? Create an account' }).click()
  await page.getByLabel('Your name').fill('Sam')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('valentine-e2e-pass')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return email
}

test('a wrong password keeps the email filled in', async ({ page, browser }) => {
  const email = await signUp(page)
  const fresh = await (await browser.newContext()).newPage()
  await fresh.goto('/login')
  await fresh.getByLabel('Email').fill(email)
  await fresh.getByLabel('Password').fill('wrong-password')
  await fresh.getByRole('button', { name: 'Sign in' }).click()
  await expect(fresh.getByText('That email and password don’t match.')).toBeVisible()
  await expect(fresh.getByLabel('Email')).toHaveValue(email)
})

test('a multi-line message at the 280 limit is accepted', async ({ page }) => {
  await signUp(page)
  await page.goto('/create')
  await page.getByLabel('Who is it for?').fill('Mika')
  await page.getByLabel('Your message').fill(['a'.repeat(92), 'b'.repeat(92), 'c'.repeat(92), 'd'].join('\n'))
  await expect(page.getByText('280 / 280')).toBeVisible()
  await page.getByRole('button', { name: 'Create Invitation' }).click()
  await expect(page.getByText('Your letter for Mika is sealed')).toBeVisible()
})

test('a failed Yes is never re-sent after the recipient changes their answer', async ({ page, browser }) => {
  await signUp(page)
  await page.goto('/create')
  await page.getByLabel('Who is it for?').fill('Jules')
  await page.getByRole('button', { name: 'Create Invitation' }).click()
  const link = await page.getByLabel('Shareable link').inputValue()

  const r = await (await browser.newContext()).newPage()
  await r.route('**/respond', (route) => route.abort())
  await r.goto(link)
  await r.getByRole('button', { name: 'Open your letter' }).click()
  await r.getByRole('button', { name: /Yes, I’d love to/ }).click()
  const toast = r.getByRole('button', { name: 'Couldn’t send — tap to try again' })
  await expect(toast).toBeVisible()
  await expect(r.getByRole('alert').filter({ hasText: 'Couldn’t send' })).toBeVisible()

  await r.getByRole('button', { name: 'Change my answer' }).click()
  await expect(toast).toBeHidden()
})
