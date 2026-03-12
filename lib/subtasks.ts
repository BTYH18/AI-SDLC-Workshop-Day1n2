import { Subtask } from './types'

export interface SubtaskProgress {
  total: number
  completed: number
  percent: number
}

export function calculateSubtaskProgress(subtasks: Array<Pick<Subtask, 'completed'>>): SubtaskProgress {
  const total = subtasks.length
  const completed = subtasks.filter((subtask) => subtask.completed).length
  return calculateSubtaskProgressFromCounts(total, completed)
}

export function calculateSubtaskProgressFromCounts(total: number, completed: number): SubtaskProgress {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { total, completed, percent }
}

export function reorderSubtaskIds(currentIds: number[], movingId: number, targetPosition: number): number[] {
  const currentIndex = currentIds.indexOf(movingId)
  if (currentIndex === -1) return currentIds

  const withoutCurrent = currentIds.filter((id) => id !== movingId)
  const boundedTarget = Math.max(0, Math.min(targetPosition, withoutCurrent.length))

  return [
    ...withoutCurrent.slice(0, boundedTarget),
    movingId,
    ...withoutCurrent.slice(boundedTarget),
  ]
}

export function buildSequentialAssignments(orderedIds: number[]): Array<{ id: number; position: number }> {
  return orderedIds.map((id, index) => ({ id, position: index }))
}
