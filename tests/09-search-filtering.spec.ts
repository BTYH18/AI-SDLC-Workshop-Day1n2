import { expect, test } from '@playwright/test'

async function loginWithDevBypass(page: import('@playwright/test').Page) {
  await page.goto('/login')
  const bypassButton = page.getByRole('button', { name: 'Dev Bypass Login (test account)' })
  if (await bypassButton.isVisible()) {
    await bypassButton.click()
  }
  await page.waitForURL('**/')
}

async function createTodo(
  page: import('@playwright/test').Page,
  title: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
) {
  await page.getByTestId('create-todo-title-input').fill(title)
  await page.getByTestId('create-todo-priority-select').selectOption(priority)
  await page.getByTestId('create-todo-submit').click()
  await expect(page.locator('p', { hasText: title }).first()).toBeVisible()
}

test.describe('Search and Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDevBypass(page)
  })

  test('filters in real time after debounce', async ({ page }) => {
    const uid = Date.now()
    const alpha = `SearchAlpha-${uid}`
    const beta = `SearchBeta-${uid}`

    await createTodo(page, alpha, 'high')
    await createTodo(page, beta, 'low')

    await expect(page.locator('p', { hasText: alpha })).toBeVisible()
    await expect(page.locator('p', { hasText: beta })).toBeVisible()

    const searchInput = page.getByTestId('todo-search-input')
    await searchInput.fill('Alpha')

    await expect.poll(async () => page.locator('p', { hasText: beta }).count()).toBe(0)
    await expect(page.locator('p', { hasText: alpha })).toBeVisible()
  })

  test('supports advanced token priority search', async ({ page }) => {
    const uid = Date.now()
    const highTodo = `TokenPriorityHigh-${uid}`
    const lowTodo = `TokenPriorityLow-${uid}`

    await createTodo(page, highTodo, 'high')
    await createTodo(page, lowTodo, 'low')

    const searchInput = page.getByTestId('todo-search-input')
    await searchInput.fill('priority:high')

    await expect.poll(async () => page.locator('p', { hasText: lowTodo }).count()).toBe(0)
    await expect(page.locator('p', { hasText: highTodo })).toBeVisible()
  })

  test('supports tag token matching with title hashtags', async ({ page }) => {
    const uid = Date.now()
    const workTodo = `Report-${uid} #work`
    const homeTodo = `Laundry-${uid} #home`

    await createTodo(page, workTodo, 'medium')
    await createTodo(page, homeTodo, 'medium')

    const searchInput = page.getByTestId('todo-search-input')
    await searchInput.fill('tag:work')

    await expect.poll(async () => page.locator('p', { hasText: homeTodo }).count()).toBe(0)
    await expect(page.locator('p', { hasText: workTodo })).toBeVisible()
  })

  test('combines search text, token, and advanced filters with AND logic', async ({ page }) => {
    const uid = Date.now()
    const target = `Plan-${uid} #work`
    const wrongPriority = `Plan-${uid} medium #work`
    const wrongTag = `Plan-${uid} #home`

    await createTodo(page, target, 'high')
    await createTodo(page, wrongPriority, 'medium')
    await createTodo(page, wrongTag, 'high')

    await page.getByTestId('todo-advanced-filters-toggle').click()
    await page.getByRole('button', { name: 'MEDIUM' }).click()

    const searchInput = page.getByTestId('todo-search-input')
    await searchInput.fill(`plan-${uid} priority:high tag:work`)

    await expect.poll(async () => page.locator('p', { hasText: wrongPriority }).count()).toBe(0)
    await expect.poll(async () => page.locator('p', { hasText: wrongTag }).count()).toBe(0)
    await expect(page.locator('p', { hasText: target })).toBeVisible()

    await page.getByTestId('todo-filters-clear-all').click()

    await expect.poll(async () => page.locator('p', { hasText: target }).count()).toBeGreaterThan(0)
    await expect(page.locator('p', { hasText: target })).toBeVisible()
    await expect(page.locator('p', { hasText: wrongPriority })).toBeVisible()
    await expect(page.locator('p', { hasText: wrongTag })).toBeVisible()
  })
})
