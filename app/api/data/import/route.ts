import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dataTransferDB } from '@/lib/db'
import { Priority, RecurrencePattern } from '@/lib/types'

const MAX_IMPORT_BYTES = 5 * 1024 * 1024
const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const RECURRENCE_PATTERNS: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePriority(value: unknown): Priority {
  if (typeof value !== 'string' || !PRIORITIES.includes(value as Priority)) {
    throw new Error('Invalid priority value')
  }
  return value as Priority
}

function parseRecurrence(value: unknown): RecurrencePattern | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !RECURRENCE_PATTERNS.includes(value as RecurrencePattern)) {
    throw new Error('Invalid recurrencePattern value')
  }
  return value as RecurrencePattern
}

function parseNullableDate(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new Error('Invalid dueDate value')
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) throw new Error('Invalid dueDate format')
  return value
}

function parseReminderMinutes(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('Invalid reminderMinutes value')
  }
  return value
}

function parseOptionalString(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new Error(`Invalid ${fieldName} value`)
  return value
}

function parseJsonArrayString(value: unknown, fieldName: string): string {
  if (typeof value === 'string') {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error(`${fieldName} must contain a JSON array`)
    return JSON.stringify(parsed)
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }

  throw new Error(`Invalid ${fieldName} value`)
}

function validatePayload(payload: unknown): {
  todos: Array<{
    title: string
    priority: Priority
    dueDate: string | null
    recurrencePattern: RecurrencePattern | null
    reminderMinutes: number | null
    completed: boolean
    subtasks: Array<{ title: string; position: number; completed: boolean }>
  }>
  templates: Array<{
    name: string
    category: string | null
    priority: Priority
    recurrencePattern: RecurrencePattern | null
    reminderMinutes: number | null
    subtasksJson: string
    tagsJson: string
    dueOffsetDays: number | null
  }>
} {
  if (!isRecord(payload)) {
    throw new Error('Payload must be an object')
  }

  const version = payload.version
  const todos = payload.todos
  const templates = payload.templates
  if (version !== 1) {
    throw new Error('Unsupported backup version')
  }

  if (!Array.isArray(todos) || !Array.isArray(templates)) {
    throw new Error('Payload must include todos and templates arrays')
  }

  const normalizedTodos = todos.map((todo, index) => {
    if (!isRecord(todo)) {
      throw new Error(`Todo at index ${index} is invalid`)
    }

    const title = typeof todo.title === 'string' ? todo.title.trim() : ''
    if (!title) {
      throw new Error(`Todo at index ${index} is missing a title`)
    }

    const completed = typeof todo.completed === 'boolean' ? todo.completed : false

    const subtasks: Array<{ title: string; position: number; completed: boolean }> = []
    if (Array.isArray(todo.subtasks)) {
      todo.subtasks.forEach((subtask: unknown, sIdx: number) => {
        if (!isRecord(subtask)) {
          throw new Error(`Subtask at todo index ${index}, subtask index ${sIdx} is invalid`)
        }
        const subtaskTitle = typeof subtask.title === 'string' ? subtask.title.trim() : ''
        if (!subtaskTitle) {
          throw new Error(`Subtask at todo index ${index}, subtask index ${sIdx} is missing a title`)
        }
        const position =
          typeof subtask.position === 'number' && Number.isInteger(subtask.position)
            ? subtask.position
            : sIdx
        const subtaskCompleted = typeof subtask.completed === 'boolean' ? subtask.completed : false
        subtasks.push({ title: subtaskTitle, position, completed: subtaskCompleted })
      })
    }

    return {
      title,
      priority: parsePriority(todo.priority ?? 'medium'),
      dueDate: parseNullableDate(todo.dueDate),
      recurrencePattern: parseRecurrence(todo.recurrencePattern),
      reminderMinutes: parseReminderMinutes(todo.reminderMinutes),
      completed,
      subtasks,
    }
  })

  const normalizedTemplates = templates.map((template, index) => {
    if (!isRecord(template)) {
      throw new Error(`Template at index ${index} is invalid`)
    }

    const name = typeof template.name === 'string' ? template.name.trim() : ''
    if (!name) {
      throw new Error(`Template at index ${index} is missing a name`)
    }

    const dueOffsetDaysRaw = template.dueOffsetDays
    let dueOffsetDays: number | null = null
    if (dueOffsetDaysRaw !== null && dueOffsetDaysRaw !== undefined) {
      if (typeof dueOffsetDaysRaw !== 'number' || !Number.isInteger(dueOffsetDaysRaw)) {
        throw new Error(`Invalid dueOffsetDays at template index ${index}`)
      }
      dueOffsetDays = dueOffsetDaysRaw
    }

    return {
      name,
      category: parseOptionalString(template.category, 'category'),
      priority: parsePriority(template.priority ?? 'medium'),
      recurrencePattern: parseRecurrence(template.recurrencePattern),
      reminderMinutes: parseReminderMinutes(template.reminderMinutes),
      subtasksJson: parseJsonArrayString(template.subtasksJson ?? [], 'subtasksJson'),
      tagsJson: parseJsonArrayString(template.tagsJson ?? [], 'tagsJson'),
      dueOffsetDays,
    }
  })

  return {
    todos: normalizedTodos,
    templates: normalizedTemplates,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Import file is too large (max 5MB)' },
        { status: 413 }
      )
    }

    const rawPayload = await request.json()
    const normalizedPayload = validatePayload(rawPayload)

    const result = await dataTransferDB.importForUser(session.userId, normalizedPayload)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof Error) {
      const isValidationError =
        error.message.includes('Invalid') ||
        error.message.includes('missing') ||
        error.message.includes('Payload') ||
        error.message.includes('Unsupported')

      return NextResponse.json(
        { success: false, error: error.message },
        { status: isValidationError ? 400 : 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to import data' },
      { status: 500 }
    )
  }
}
