import { test, expect } from '@playwright/test'
import { TodoAppHelper } from './helpers'

test.describe('Todo CRUD Operations', () => {
  let helper: TodoAppHelper

  test.beforeEach(async ({ page }) => {
    helper = new TodoAppHelper(page)
    await helper.goToHome()
  })

  test('should create a todo with title only', async ({ page }) => {
    await helper.createTodo('Buy groceries')

    // Verify todo appears
    await expect(page.locator('text=Buy groceries')).toBeVisible()
  })

  test('should create a todo with priority', async ({ page }) => {
    await helper.createTodo('Urgent task', 'High')

    // Verify todo appears with high priority badge
    const todoRow = page.locator('text=Urgent task').locator('..')
    await expect(todoRow.locator('text=High')).toBeVisible()
  })

  test('should reject empty title', async ({ page }) => {
    const titleInput = page.locator('input[placeholder="What needs to be done?"]')
    const addButton = page.locator('button:has-text("Add Todo")')

    // Leave empty and submit
    await addButton.click()

    // Check for error
    const error = await helper.getErrorMessage()
    expect(error).toBeTruthy()
  })

  test('should toggle todo completion', async ({ page }) => {
    await helper.createTodo('Test todo')

    // Get initial todo count in active section
    const activeBefore = await helper.getActiveTodos()

    // Toggle completion
    await helper.toggleTodo('Test todo')

    // Verify it moved to completed
    const activeAfter = await helper.getActiveTodos()
    expect(activeAfter).toBeLessThan(activeBefore)

    // Verify it appears in completed section
    await expect(
      page.locator('text=Completed').locator('..').locator('text=Test todo')
    ).toBeVisible()
  })

  test('should delete a todo', async ({ page }) => {
    await helper.createTodo('Delete me')
    await expect(page.locator('text=Delete me')).toBeVisible()

    // Delete the todo
    await helper.deleteTodo('Delete me')

    // Verify it's gone
    await expect(page.locator('text=Delete me')).not.toBeVisible()
  })

  test('should display all priority levels', async ({ page }) => {
    await helper.createTodo('High priority', 'High')
    await helper.createTodo('Medium priority', 'Medium')
    await helper.createTodo('Low priority', 'Low')

    // Verify all appear
    await expect(page.locator('text=High priority')).toBeVisible()
    await expect(page.locator('text=Medium priority')).toBeVisible()
    await expect(page.locator('text=Low priority')).toBeVisible()

    // Verify badges
    await expect(page.locator('text=High').first()).toBeVisible()
    await expect(page.locator('text=Medium').first()).toBeVisible()
    await expect(page.locator('text=Low').first()).toBeVisible()
  })
})
