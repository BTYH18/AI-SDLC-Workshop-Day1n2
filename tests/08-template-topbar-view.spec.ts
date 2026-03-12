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

test.describe('Top-bar Templates View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    const bypassButton = page.getByRole('button', { name: 'Dev Bypass Login (test account)' })
    if (await bypassButton.isVisible()) {
      await bypassButton.click()
    }
    await page.waitForURL('**/')
  })

  /**
   * Helper: create a template with a specific category via Advanced Options.
   */
  async function createTemplateViaAdvanced(
    page: import('@playwright/test').Page,
    title: string,
    category: string | null,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) {
    const titleInput = page.getByPlaceholder('Add a new todo...')
    const prioritySelect = page.locator('select').first()

    await titleInput.fill(title)
    await prioritySelect.selectOption(priority)

    await page.getByRole('button', { name: 'Show Advanced Options' }).click()

    if (category) {
      await page.getByPlaceholder('Template category (optional)').fill(category)
    } else {
      await page.getByPlaceholder('Template category (optional)').fill('')
    }

    await page.getByRole('button', { name: 'Save Template' }).click()

    await expect
      .poll(async () => {
        const res = await page.request.get('/api/templates')
        if (!res.ok()) return false
        const json = await res.json()
        return Array.isArray(json?.data) && json.data.some((tpl: { name?: string }) => tpl.name === title)
      })
      .toBe(true)

    // Collapse advanced options to reset UI
    await page.getByRole('button', { name: 'Hide Advanced Options' }).click()
    await titleInput.fill('')
  }

  test('top-bar Templates button toggles the templates view', async ({ page }) => {
    // Click the Templates button in the top bar
    const templatesBtn = page.getByRole('button', { name: '🎁 Templates' })
    await expect(templatesBtn).toBeVisible()

    await templatesBtn.click()

    // The templates view container should appear
    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Close via modal close button to avoid overlay click interception.
    await templatesView.getByRole('button', { name: 'Close' }).click()
    await expect(templatesView).not.toBeVisible()
  })

  test('templates are grouped by category', async ({ page }) => {
    const workTemplate = `Daily standup ${Date.now()}`
    const personalTemplate = `Grocery run ${Date.now()}`

    // Seed two templates with different categories
    await createTemplateViaAdvanced(page, workTemplate, 'Work', 'high')
    await createTemplateViaAdvanced(page, personalTemplate, 'Personal', 'low')

    // Open the templates view
    await page.getByRole('button', { name: '🎁 Templates' }).click()

    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Expect category headings
    await expect(templatesView.getByRole('heading', { name: 'Work' })).toBeVisible()
    await expect(templatesView.getByRole('heading', { name: 'Personal' })).toBeVisible()

    // Expect template names under view
    await expect(templatesView.getByText(workTemplate)).toBeVisible()
    await expect(templatesView.getByText(personalTemplate)).toBeVisible()
  })

  test('templates with no category appear under Uncategorized', async ({ page }) => {
    const uncategorizedTemplate = `Quick note ${Date.now()}`

    // Create a template without a category
    await createTemplateViaAdvanced(page, uncategorizedTemplate, null, 'medium')

    await page.getByRole('button', { name: '🎁 Templates' }).click()

    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Should show an Uncategorized heading
    await expect(templatesView.getByRole('heading', { name: 'Uncategorized' })).toBeVisible()
    await expect(templatesView.getByText(uncategorizedTemplate)).toBeVisible()
  })

  test('using a template from the grouped view creates a todo', async ({ page }) => {
    const templateName = `Sprint retro ${Date.now()}`
    await createTemplateViaAdvanced(page, templateName, 'Work', 'high')

    await page.getByRole('button', { name: '🎁 Templates' }).click()

    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Click Use button on the template card
    const templateCard = templatesView.locator('[data-testid="template-card"]', { hasText: templateName })
    await expect(templateCard).toBeVisible()
    await templateCard.getByRole('button', { name: 'Use' }).click()

    // A new todo with that title should appear in the todo list
    await expect(page.locator('p', { hasText: templateName }).first()).toBeVisible()
  })

  test('existing Advanced Options template workflow still works (regression)', async ({ page }) => {
    // This mirrors the existing test to confirm no regression
    const templateName = `Regression check ${Date.now()}`
    const titleInput = page.getByPlaceholder('Add a new todo...')

    await titleInput.fill(templateName)
    await page.getByRole('button', { name: 'Show Advanced Options' }).click()
    await page.getByRole('button', { name: 'Save Template' }).click()

    await selectTemplateByText(page, templateName)

    await page.getByRole('button', { name: 'Use Template Now' }).click()
    await expect(page.locator('p', { hasText: templateName }).first()).toBeVisible()
  })
})
