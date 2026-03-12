import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, subtaskDB } from '@/lib/db'
import { ApiResponse, CreateSubtaskInput, Subtask } from '@/lib/types'

const MAX_SUBTASKS_PER_TODO = 50
const MAX_SUBTASK_TITLE_LENGTH = 500

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/todos/[id]/subtasks - List subtasks and progress for a todo
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

    const subtasks = await subtaskDB.listByTodoId(todoId)
    const progress = await subtaskDB.getProgress(todoId)

    return NextResponse.json({
      success: true,
      data: {
        subtasks,
        progress,
      },
    } as ApiResponse<{ subtasks: Subtask[]; progress: { total: number; completed: number; percent: number } }>)
  } catch (error) {
    console.error('Error listing subtasks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list subtasks' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

/**
 * POST /api/todos/[id]/subtasks - Create a subtask for a todo
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json() as CreateSubtaskInput
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Subtask title is required' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.title.trim().length > MAX_SUBTASK_TITLE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Subtask title too long (max ${MAX_SUBTASK_TITLE_LENGTH} characters)` } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const existingSubtasks = await subtaskDB.listByTodoId(todoId)
    if (existingSubtasks.length >= MAX_SUBTASKS_PER_TODO) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_SUBTASKS_PER_TODO} subtasks per todo` } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const subtask = await subtaskDB.create(todoId, {
      title: body.title.trim(),
    })

    return NextResponse.json(
      { success: true, data: subtask } as ApiResponse<Subtask>,
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating subtask:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create subtask' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
