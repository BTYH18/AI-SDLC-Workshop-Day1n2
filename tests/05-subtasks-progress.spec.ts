import { test, expect } from '@playwright/test'
import { TodoAppHelper } from './helpers'

test.describe('Subtasks and Progress', () => {
  let helper: TodoAppHelper

  test.beforeEach(async ({ page }) => {
    helper = new TodoAppHelper(page)
    await helper.goToHome()
  })

  test('should add and complete subtasks with progress updates', async ({ page }) => {
    await helper.createTodo('Build workshop app')
    await helper.addSubtask('Build workshop app', 'Define DB schema')
    await helper.addSubtask('Build workshop app', 'Create API routes')

    const subtaskItems = page.locator('[data-testid="subtask-item"]')
    await expect(subtaskItems).toHaveCount(2)

    await helper.toggleSubtask('Build workshop app', 'Define DB schema')

    await expect(
      page.locator('[data-testid="subtask-item"]').filter({ hasText: 'Define DB schema' })
    ).toContainText('Define DB schema')

    await expect(page.locator('text=1/2 (50%)')).toBeVisible()
  })

  test('should reorder and delete subtasks', async ({ page }) => {
    await helper.createTodo('Launch feature')
    await helper.addSubtask('Launch feature', 'Task A')
    await helper.addSubtask('Launch feature', 'Task B')

    const todoCard = page.locator('p:has-text("Launch feature")').first().locator('../..')
    const taskBRow = todoCard.locator('[data-testid="subtask-item"]').filter({ hasText: 'Task B' }).first()
    await taskBRow.locator('button:has-text("↑")').click()

    const reorderedItems = todoCard.locator('[data-testid="subtask-item"] p')
    await expect(reorderedItems.first()).toHaveText('Task B')

    await helper.deleteSubtask('Launch feature', 'Task A')
    await expect(todoCard.locator('[data-testid="subtask-item"]').filter({ hasText: 'Task A' })).toHaveCount(0)
  })

  test('deleting parent todo should remove its subtasks', async ({ page, request }) => {
    await helper.createTodo('Parent item')
    await helper.addSubtask('Parent item', 'Child task')

    const listRes = await request.get('/api/todos')
    const listData = await listRes.json()
    const parent = (listData.data || []).find((todo: { title: string }) => todo.title === 'Parent item')
    expect(parent).toBeTruthy()

    const beforeDelete = await request.get(`/api/todos/${parent.id}/subtasks`)
    const beforeData = await beforeDelete.json()
    expect(beforeData.data.subtasks.length).toBe(1)

    await helper.deleteTodo('Parent item')

    const afterDelete = await request.get(`/api/todos/${parent.id}/subtasks`)
    expect(afterDelete.status()).toBe(404)
  })
})
