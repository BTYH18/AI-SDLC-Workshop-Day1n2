import { test, expect } from '@playwright/test'
import { subtaskDB, todoDB } from '@/lib/db'

test.describe('Subtasks Integration', () => {
  test('should recalculate positions after delete', async () => {
    const todo = await todoDB.create(1, {
      title: `Position Integration Todo ${Date.now()}`,
      priority: 'medium',
    })

    const subtaskOne = await subtaskDB.create(todo.id, { title: 'One' })
    const subtaskTwo = await subtaskDB.create(todo.id, { title: 'Two' })
    await subtaskDB.create(todo.id, { title: 'Three' })

    const deleted = await subtaskDB.delete(subtaskTwo.id, todo.id)
    expect(deleted).toBeTruthy()

    const remaining = await subtaskDB.listByTodoId(todo.id)
    expect(remaining.map((subtask) => subtask.position)).toEqual([0, 1])
    expect(remaining[0].id).toBe(subtaskOne.id)

    await todoDB.delete(1, todo.id)
  })

  test('should cascade delete subtasks when parent todo is removed', async () => {
    const todo = await todoDB.create(1, {
      title: `Cascade Parent Todo ${Date.now()}`,
      priority: 'low',
    })

    await subtaskDB.create(todo.id, { title: 'Child A' })

    const beforeDelete = await subtaskDB.listByTodoId(todo.id)
    expect(beforeDelete.length).toBe(1)

    const deletedTodo = await todoDB.delete(1, todo.id)
    expect(deletedTodo).toBeTruthy()

    const afterDelete = await subtaskDB.listByTodoId(todo.id)
    expect(afterDelete.length).toBe(0)
  })
})
