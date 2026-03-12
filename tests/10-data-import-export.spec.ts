import { expect, test } from '@playwright/test'

test.describe('Data Import and Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    const bypassButton = page.getByRole('button', { name: 'Dev Bypass Login (test account)' })
    if (await bypassButton.isVisible()) {
      await bypassButton.click()
    }
    await page.waitForURL('**/')
  })

  test('opens Data modal, imports JSON backup, and can export', async ({ page }) => {
    const uniqueSuffix = Date.now()
    const todoTitle = `Imported todo ${uniqueSuffix}`
    const templateName = `Imported template ${uniqueSuffix}`

    await page.getByTestId('data-modal-trigger').click()
    await expect(page.getByTestId('data-modal')).toBeVisible()

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: [
        {
          title: todoTitle,
          priority: 'high',
          dueDate: null,
          recurrencePattern: null,
          reminderMinutes: null,
          completed: false,
        },
      ],
      templates: [
        {
          name: templateName,
          category: 'Imported',
          priority: 'medium',
          recurrencePattern: null,
          reminderMinutes: null,
          subtasksJson: '[]',
          tagsJson: '[]',
          dueOffsetDays: null,
        },
      ],
    }

    await page.getByTestId('data-import-file').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    })

    await page.getByTestId('data-import-button').click()
    await expect(page.getByTestId('data-import-success')).toContainText('Import successful')

    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('p', { hasText: todoTitle }).first()).toBeVisible()

    await page.getByRole('button', { name: '🎁 Templates' }).click()
    await expect(page.locator('p', { hasText: templateName }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Close' }).first().click()
    await page.getByTestId('data-modal-trigger').click()
    await page.getByTestId('data-export-button').click()
    await expect(page.getByTestId('data-import-success')).toContainText('Export completed')
  })
})
