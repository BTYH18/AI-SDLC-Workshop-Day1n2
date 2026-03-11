import { expect, test } from '@playwright/test'

test.describe('Template System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    const bypassButton = page.getByRole('button', { name: 'Dev Bypass Login (test account)' })
    if (await bypassButton.isVisible()) {
      await bypassButton.click()
    }
    await page.waitForURL('**/')
  })

  test('save, load, use, rename and delete template from advanced options', async ({ page }) => {
    const titleInput = page.getByPlaceholder('Add a new todo...')
    const prioritySelect = page.locator('select').first()
    const dueDateInput = page.locator('input[type="datetime-local"]').first()

    await titleInput.fill('Weekly report')
    await prioritySelect.selectOption('high')

    const now = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const dueLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await dueDateInput.fill(dueLocal)

    await page.getByRole('button', { name: 'Show Advanced Options' }).click()
    await page.getByRole('button', { name: 'Save Template' }).click()

    const templateSelect = page.locator('select').nth(1)
    const savedOptionValue = await templateSelect.locator('option', { hasText: 'Weekly report' }).first().getAttribute('value')
    await templateSelect.selectOption(savedOptionValue || '')

    await titleInput.fill('Temporary title')
    await prioritySelect.selectOption('low')
    await dueDateInput.fill('')

    await page.getByRole('button', { name: 'Load Into Form' }).click()
    await expect(titleInput).toHaveValue('Weekly report')
    await expect(prioritySelect).toHaveValue('high')

    await page.getByRole('button', { name: 'Use Template Now' }).click()
    await expect(page.locator('p', { hasText: 'Weekly report' }).first()).toBeVisible()

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('New template name')
      await dialog.accept('Weekly report renamed')
    })
    await page.getByRole('button', { name: 'Rename Selected' }).click()

    const renamedOptionValue = await templateSelect.locator('option', { hasText: 'Weekly report renamed' }).first().getAttribute('value')
    await templateSelect.selectOption(renamedOptionValue || '')

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete selected template?')
      await dialog.accept()
    })
    await page.getByRole('button', { name: 'Delete Selected' }).click()

    await expect(templateSelect.locator('option', { hasText: 'Weekly report renamed' })).toHaveCount(0)
  })
})
