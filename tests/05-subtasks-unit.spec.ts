import { test, expect } from '@playwright/test'
import { buildSequentialAssignments, calculateSubtaskProgress, calculateSubtaskProgressFromCounts, reorderSubtaskIds } from '@/lib/subtasks'

test.describe('Subtask Utility Unit Tests', () => {
  test('calculateSubtaskProgress should compute completed ratio', async () => {
    const progress = calculateSubtaskProgress([
      { completed: true },
      { completed: false },
      { completed: true },
    ])

    expect(progress.total).toBe(3)
    expect(progress.completed).toBe(2)
    expect(progress.percent).toBe(67)
  })

  test('calculateSubtaskProgressFromCounts should handle zero safely', async () => {
    const progress = calculateSubtaskProgressFromCounts(0, 0)

    expect(progress.total).toBe(0)
    expect(progress.completed).toBe(0)
    expect(progress.percent).toBe(0)
  })

  test('reorderSubtaskIds should move item to target index', async () => {
    const reordered = reorderSubtaskIds([10, 20, 30], 30, 1)
    expect(reordered).toEqual([10, 30, 20])
  })

  test('buildSequentialAssignments should provide gapless positions', async () => {
    const assignments = buildSequentialAssignments([7, 2, 9])
    expect(assignments).toEqual([
      { id: 7, position: 0 },
      { id: 2, position: 1 },
      { id: 9, position: 2 },
    ])
  })
})
