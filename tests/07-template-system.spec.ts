import { expect, test } from '@playwright/test'

function templateSelect(page: import('@playwright/test').Page) {
  return page.locator('select', {
    has: page.locator('option', { hasText: 'Select template to load/use' }),
  })
}

async function selectTemplateByText(page: import('@playwright/test').Page, name: string) {
  const advancedTemplateSelect = templateSelect(page)
  const option = advancedTemplateSelect.locator('option', { hasText: name })
  await expect(option).toHaveCount(1)
  const value = await option.first().getAttribute('value')
  expect(value).toBeTruthy()
  await advancedTemplateSelect.selectOption(value || '')
}

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
    const templateName = `Weekly report ${Date.now()}`
    const renamedTemplateName = `${templateName} renamed`

    const titleInput = page.getByPlaceholder('Add a new todo...')
    const prioritySelect = page.locator('select').first()
    const dueDateInput = page.locator('input[type="datetime-local"]').first()

    await titleInput.fill(templateName)
    await prioritySelect.selectOption('high')

    const now = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const dueLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await dueDateInput.fill(dueLocal)

    await page.getByRole('button', { name: 'Show Advanced Options' }).click()
    await page.getByRole('button', { name: 'Save Template' }).click()

    await selectTemplateByText(page, templateName)

    await titleInput.fill('Temporary title')
    await prioritySelect.selectOption('low')
    await dueDateInput.fill('')

    await page.getByRole('button', { name: 'Load Into Form' }).click()
    await expect(titleInput).toHaveValue(templateName)
    await expect(prioritySelect).toHaveValue('high')

    await page.getByRole('button', { name: 'Use Template Now' }).click()
    await expect(page.locator('p', { hasText: templateName }).first()).toBeVisible()

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('New template name')
      await dialog.accept(renamedTemplateName)
    })
    await page.getByRole('button', { name: 'Rename Selected' }).click()

    await selectTemplateByText(page, renamedTemplateName)

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete selected template?')
      await dialog.accept()
    })
    await page.getByRole('button', { name: 'Delete Selected' }).click()

    await expect(templateSelect(page).locator('option', { hasText: renamedTemplateName })).toHaveCount(0)
  })
})
