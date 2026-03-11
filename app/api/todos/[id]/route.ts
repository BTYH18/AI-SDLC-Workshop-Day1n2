import { NextRequest, NextResponse } from 'next/server'
import { todoDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { UpdateTodoInput, ApiResponse, Todo } from '@/lib/types'
import { calculateNextDueDate, getSingaporeNow, isFutureDate } from '@/lib/timezone'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/todos/[id] - Get a single todo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const { id } = await params
    const todoId = parseInt(id, 10)

    if (isNaN(todoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const todo = await todoDB.getById(session.userId, todoId)
    if (!todo) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: todo } as ApiResponse<Todo>
    )
  } catch (error) {
    console.error('Error fetching todo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch todo' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/todos/[id] - Update a todo
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const { id } = await params
    const todoId = parseInt(id, 10)

    if (isNaN(todoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const body = await request.json() as UpdateTodoInput
    const currentTodo = await todoDB.getById(session.userId, todoId)
    if (!currentTodo) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }
    const validPatterns = new Set(['daily', 'weekly', 'monthly', 'yearly'])
    const validReminderMinutes = new Set([15, 30, 60, 120, 1440, 2880, 10080])

    // Validation
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Title must be non-empty string' } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    if (body.dueDate !== undefined && body.dueDate !== null) {
      const dueDate = new Date(body.dueDate)
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid due date format' } as ApiResponse<null>,
          { status: 400 }
        )
      }
      if (!isFutureDate(dueDate)) {
        return NextResponse.json(
          { success: false, error: 'Due date must be at least 1 minute in the future' } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    if (body.recurrencePattern !== undefined && body.recurrencePattern !== null) {
      if (!validPatterns.has(body.recurrencePattern)) {
        return NextResponse.json(
          { success: false, error: 'Invalid recurrence pattern' } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    const nextRecurrencePattern =
      body.recurrencePattern !== undefined ? body.recurrencePattern : currentTodo.recurrencePattern
    const nextDueDate = body.dueDate !== undefined ? body.dueDate : currentTodo.dueDate

    if (nextRecurrencePattern && !nextDueDate) {
      return NextResponse.json(
        { success: false, error: 'Due date is required for recurring todos' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.reminderMinutes !== undefined && body.reminderMinutes !== null) {
      if (!validReminderMinutes.has(body.reminderMinutes)) {
        return NextResponse.json(
          { success: false, error: 'Invalid reminder timing' } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    const nextReminderMinutes =
      body.reminderMinutes !== undefined ? body.reminderMinutes : currentTodo.reminderMinutes
    if (nextReminderMinutes !== null && !nextDueDate) {
      return NextResponse.json(
        { success: false, error: 'Due date is required when reminder is set' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (nextReminderMinutes !== null && nextDueDate) {
      const effectiveDueDate = new Date(nextDueDate)
      const minutesUntilDue = Math.floor((effectiveDueDate.getTime() - getSingaporeNow().getTime()) / 60000)
      if (nextReminderMinutes > minutesUntilDue) {
        return NextResponse.json(
          { success: false, error: 'Reminder must be earlier than due date' } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    const todo = await todoDB.update(session.userId, todoId, {
      title: body.title?.trim(),
      priority: body.priority,
      dueDate: body.dueDate,
      recurrencePattern: body.recurrencePattern,
      reminderMinutes: body.reminderMinutes,
      completed: body.completed,
    })

    if (!todo) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    const becameCompleted = currentTodo.completed === false && body.completed === true
    if (becameCompleted && todo.recurrencePattern && todo.dueDate) {
      const nextDueDateIso = calculateNextDueDate(todo.dueDate, todo.recurrencePattern)
      await todoDB.create(session.userId, {
        title: todo.title,
        priority: todo.priority,
        dueDate: nextDueDateIso,
        recurrencePattern: todo.recurrencePattern,
        reminderMinutes: todo.reminderMinutes,
      })
    }

    return NextResponse.json(
      { success: true, data: todo } as ApiResponse<Todo>
    )
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update todo' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/todos/[id] - Delete a todo
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const { id } = await params
    const todoId = parseInt(id, 10)

    if (isNaN(todoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const success = await todoDB.delete(session.userId, todoId)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true } as ApiResponse<null>,
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete todo' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
