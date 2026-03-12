import { expect, test } from '@playwright/test'

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

    // Click again to close (toggle behavior)
    await templatesBtn.click()
    await expect(templatesView).not.toBeVisible()
  })

  test('templates are grouped by category', async ({ page }) => {
    // Seed two templates with different categories
    await createTemplateViaAdvanced(page, 'Daily standup', 'Work', 'high')
    await createTemplateViaAdvanced(page, 'Grocery run', 'Personal', 'low')

    // Open the templates view
    await page.getByRole('button', { name: '🎁 Templates' }).click()

    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Expect category headings
    await expect(templatesView.getByRole('heading', { name: 'Work' })).toBeVisible()
    await expect(templatesView.getByRole('heading', { name: 'Personal' })).toBeVisible()

    // Expect template names under view
    await expect(templatesView.getByText('Daily standup')).toBeVisible()
    await expect(templatesView.getByText('Grocery run')).toBeVisible()
  })

  test('templates with no category appear under Uncategorized', async ({ page }) => {
    // Create a template without a category
    await createTemplateViaAdvanced(page, 'Quick note', null, 'medium')

    await page.getByRole('button', { name: '🎁 Templates' }).click()

    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Should show an Uncategorized heading
    await expect(templatesView.getByRole('heading', { name: 'Uncategorized' })).toBeVisible()
    await expect(templatesView.getByText('Quick note')).toBeVisible()
  })

  test('using a template from the grouped view creates a todo', async ({ page }) => {
    await createTemplateViaAdvanced(page, 'Sprint retro', 'Work', 'high')

    await page.getByRole('button', { name: '🎁 Templates' }).click()

    const templatesView = page.locator('[data-testid="templates-view"]')
    await expect(templatesView).toBeVisible()

    // Click Use button on the template card
    const templateCard = templatesView.locator('[data-testid="template-card"]', { hasText: 'Sprint retro' })
    await expect(templateCard).toBeVisible()
    await templateCard.getByRole('button', { name: 'Use' }).click()

    // A new todo with that title should appear in the todo list
    await expect(page.locator('p', { hasText: 'Sprint retro' }).first()).toBeVisible()
  })

  test('existing Advanced Options template workflow still works (regression)', async ({ page }) => {
    // This mirrors the existing test to confirm no regression
    const titleInput = page.getByPlaceholder('Add a new todo...')

    await titleInput.fill('Regression check')
    await page.getByRole('button', { name: 'Show Advanced Options' }).click()
    await page.getByRole('button', { name: 'Save Template' }).click()

    const templateSelect = page.locator('select').nth(1)
    const savedOption = await templateSelect.locator('option', { hasText: 'Regression check' }).first().getAttribute('value')
    await templateSelect.selectOption(savedOption || '')

    await page.getByRole('button', { name: 'Use Template Now' }).click()
    await expect(page.locator('p', { hasText: 'Regression check' }).first()).toBeVisible()
  })
})
