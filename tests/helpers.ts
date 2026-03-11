import { Page } from '@playwright/test'

/**
 * Helper class for todo app testing
 */
export class TodoAppHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to home page
   */
  async goToHome() {
    await this.page.goto('/')
    await this.page.waitForSelector('h1:has-text("Todo App")')
  }

  /**
   * Create a todo with given parameters
   */
  async createTodo(
    title: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium',
    dueDate?: string
  ) {
    // Fill title
    await this.page.fill('input[placeholder="What needs to be done?"]', title)

    // Select priority
    if (priority !== 'Medium') {
      const firstSelect = this.page.locator('select').first()
      await firstSelect.selectOption(priority.toLowerCase())
    }

    // Set due date if provided
    if (dueDate) {
      const dateInputs = this.page.locator('input[type="datetime-local"]')
      await dateInputs.fill(dueDate)
    }

    // Submit form
    await this.page.click('button:has-text("Add Todo")')
    await this.page.waitForTimeout(500) // Wait for optimistic update
  }

  /**
   * Get all active todo items
   */
  async getActiveTodos() {
    const section = this.page.locator('text=Active Todos').locator('..')
    return section.locator('div[class*="rounded-lg shadow"] >> nth=-1').count()
  }

  /**
   * Toggle a todo by title
   */
  async toggleTodo(title: string) {
    const todoRow = this.page.locator(`text="${title}"`).locator('..')
    const checkbox = todoRow.locator('input[type="checkbox"]').first()
    await checkbox.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Delete a todo by title
   */
  async deleteTodo(title: string) {
    const todoRow = this.page.locator(`text="${title}"`).locator('..')
    const deleteBtn = todoRow.locator('button:has-text("🗑️")').first()
    await deleteBtn.click()

    // Wait for confirmation modal and click Delete
    await this.page.click('button:has-text("Delete")')
    await this.page.waitForTimeout(300)
  }

  /**
   * Get error message if shown
   */
  async getErrorMessage() {
    const errorDiv = this.page.locator('div[class*="bg-red-50"]')
    if (await errorDiv.isVisible()) {
      return await errorDiv.textContent()
    }
    return null
  }
}
