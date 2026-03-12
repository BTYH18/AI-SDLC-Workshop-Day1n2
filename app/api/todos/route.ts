import { NextRequest, NextResponse } from 'next/server'
import { todoDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { CreateTodoInput, ApiResponse, Todo } from '@/lib/types'
import { getSingaporeNow, isFutureDate } from '@/lib/timezone'

/**
 * GET /api/todos - Retrieve all todos
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const todos = await todoDB.getAll(session.userId)
    return NextResponse.json({
      success: true,
      data: todos,
    } as ApiResponse<Todo[]>)
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch todos' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

/**
 * POST /api/todos - Create a new todo
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const body = await request.json() as CreateTodoInput
    const validPatterns = new Set(['daily', 'weekly', 'monthly', 'yearly'])
    const validReminderMinutes = new Set([15, 30, 60, 120, 1440, 2880, 10080])

    // Validation
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title is required' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.dueDate) {
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

      if (body.reminderMinutes !== undefined && body.reminderMinutes !== null) {
        const minutesUntilDue = Math.floor((dueDate.getTime() - getSingaporeNow().getTime()) / 60000)
        if (body.reminderMinutes > minutesUntilDue) {
          return NextResponse.json(
            { success: false, error: 'Reminder must be earlier than due date' } as ApiResponse<null>,
            { status: 400 }
          )
        }
      }
    }

    if (body.recurrencePattern && !validPatterns.has(body.recurrencePattern)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recurrence pattern' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.recurrencePattern && !body.dueDate) {
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
      if (!body.dueDate) {
        return NextResponse.json(
          { success: false, error: 'Due date is required when reminder is set' } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    const todo = await todoDB.create(session.userId, {
      title: body.title.trim(),
      priority: body.priority,
      dueDate: body.dueDate,
      recurrencePattern: body.recurrencePattern,
      reminderMinutes: body.reminderMinutes,
    })

    if (Array.isArray(body.tagIds)) {
      try {
        await todoDB.setTags(session.userId, todo.id, body.tagIds)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid tag IDs'
        return NextResponse.json(
          { success: false, error: message } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    const createdTodo = await todoDB.getById(session.userId, todo.id)

    return NextResponse.json(
      { success: true, data: createdTodo ?? todo } as ApiResponse<Todo>,
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create todo' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
