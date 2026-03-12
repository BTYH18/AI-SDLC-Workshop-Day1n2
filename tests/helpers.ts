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
    await this.page.fill('input[placeholder="Add a new todo..."]', title)

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
    await this.page.click('button:has-text("Add")')
    await this.page.waitForTimeout(500) // Wait for optimistic update
  }

  /**
   * Get all active todo items
   */
  async getActiveTodos() {
    const heading = this.page.locator('h3:has-text("Active Todos")').first()
    const text = (await heading.textContent()) || ''
    const match = text.match(/\((\d+)\)/)
    return Number(match?.[1] || 0)
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
    const deleteBtn = todoRow.locator('button:has-text("✕")').first()
    await deleteBtn.click()

    // Wait for confirmation modal and click Delete
    await this.page.click('button:has-text("Delete")')
    await this.page.waitForTimeout(300)
  }

  /**
   * Get error message if shown
   */
  async getErrorMessage() {
    const errorDiv = this.page.locator('div[class*="bg-red-500/20"]')
    if (await errorDiv.isVisible()) {
      return await errorDiv.textContent()
    }
    return null
  }

  async toggleSubtaskPanel(todoTitle: string) {
    const todoCard = this.page.locator(`p:has-text("${todoTitle}")`).first().locator('../..')
    await todoCard.locator('button[aria-label="Toggle subtasks"]').click()
    await this.page.waitForTimeout(200)
  }

  async addSubtask(todoTitle: string, subtaskTitle: string) {
    const todoCard = this.page.locator(`p:has-text("${todoTitle}")`).first().locator('../..')
    const input = todoCard.locator('input[placeholder="Add subtask"]')
    if (!(await input.isVisible())) {
      await this.toggleSubtaskPanel(todoTitle)
    }
    await input.fill(subtaskTitle)
    await todoCard.locator('button:has-text("Add Subtask")').click()
    await this.page.waitForTimeout(300)
  }

  async toggleSubtask(todoTitle: string, subtaskTitle: string) {
    const todoCard = this.page.locator(`p:has-text("${todoTitle}")`).first().locator('../..')
    const input = todoCard.locator('input[placeholder="Add subtask"]')
    if (!(await input.isVisible())) {
      await this.toggleSubtaskPanel(todoTitle)
    }
    const subtaskItem = todoCard.locator('[data-testid="subtask-item"]').filter({ hasText: subtaskTitle }).first()
    await subtaskItem.locator('input[type="checkbox"]').click()
    await this.page.waitForTimeout(300)
  }

  async deleteSubtask(todoTitle: string, subtaskTitle: string) {
    const todoCard = this.page.locator(`p:has-text("${todoTitle}")`).first().locator('../..')
    const input = todoCard.locator('input[placeholder="Add subtask"]')
    if (!(await input.isVisible())) {
      await this.toggleSubtaskPanel(todoTitle)
    }
    const subtaskItem = todoCard.locator('[data-testid="subtask-item"]').filter({ hasText: subtaskTitle }).first()
    await subtaskItem.locator('button:has-text("✕")').click()
    await this.page.waitForTimeout(300)
  }
}
