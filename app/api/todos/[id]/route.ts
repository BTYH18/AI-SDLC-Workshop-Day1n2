import { NextRequest, NextResponse } from 'next/server'
import { todoDB } from '@/lib/db'
import { UpdateTodoInput, ApiResponse, Todo } from '@/lib/types'
import { isFutureDate } from '@/lib/timezone'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/todos/[id] - Get a single todo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const todoId = parseInt(id, 10)

    if (isNaN(todoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const todo = await todoDB.getById(todoId)
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
    const { id } = await params
    const todoId = parseInt(id, 10)

    if (isNaN(todoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const body = await request.json() as UpdateTodoInput

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

    const todo = await todoDB.update(todoId, {
      title: body.title?.trim(),
      priority: body.priority,
      dueDate: body.dueDate,
      completed: body.completed,
    })

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
    const { id } = await params
    const todoId = parseInt(id, 10)

    if (isNaN(todoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const success = await todoDB.delete(todoId)
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
