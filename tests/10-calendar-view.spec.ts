import { expect, test } from '@playwright/test'

async function loginWithDevBypass(page: import('@playwright/test').Page) {
  await page.goto('/login')
  const bypassButton = page.getByRole('button', { name: 'Dev Bypass Login (test account)' })
  if (await bypassButton.isVisible()) {
    await bypassButton.click()
  }
  await page.waitForURL('**/')
}

test.describe('Calendar View Modal', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDevBypass(page)
  })

  test('opens and closes from top bar button', async ({ page }) => {
    const calendarButton = page.getByRole('button', { name: /Calendar/i })
    await expect(calendarButton).toBeVisible()

    await calendarButton.click()
    await expect(page.getByRole('heading', { name: 'Monthly Calendar' })).toBeVisible()

    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('heading', { name: 'Monthly Calendar' })).not.toBeVisible()
  })

  test('shows navigation controls', async ({ page }) => {
    await page.getByRole('button', { name: /Calendar/i }).click()

    await expect(page.getByRole('button', { name: /Previous/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Next/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByText('Sun')).toBeVisible()
    await expect(page.getByText('Mon')).toBeVisible()
  })
})
