import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, subtaskDB } from '@/lib/db'
import { ApiResponse, Subtask, UpdateSubtaskInput } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string; subtaskId: string }>
}

/**
 * PUT /api/todos/[id]/subtasks/[subtaskId] - Update a subtask
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

    const { id, subtaskId } = await params
    const todoId = parseInt(id, 10)
    const parsedSubtaskId = parseInt(subtaskId, 10)

    if (isNaN(todoId) || isNaN(parsedSubtaskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' } as ApiResponse<null>,
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

    const body = await request.json() as UpdateSubtaskInput

    if (body.title !== undefined && body.title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Subtask title must be non-empty' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.position !== undefined && (!Number.isInteger(body.position) || body.position < 0)) {
      return NextResponse.json(
        { success: false, error: 'Position must be a non-negative integer' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const subtask = await subtaskDB.update(parsedSubtaskId, todoId, {
      title: body.title?.trim(),
      completed: body.completed,
      position: body.position,
    })

    if (!subtask) {
      return NextResponse.json(
        { success: false, error: 'Subtask not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: subtask,
    } as ApiResponse<Subtask>)
  } catch (error) {
    console.error('Error updating subtask:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update subtask' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/todos/[id]/subtasks/[subtaskId] - Delete a subtask
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

    const { id, subtaskId } = await params
    const todoId = parseInt(id, 10)
    const parsedSubtaskId = parseInt(subtaskId, 10)

    if (isNaN(todoId) || isNaN(parsedSubtaskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' } as ApiResponse<null>,
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

    const success = await subtaskDB.delete(parsedSubtaskId, todoId)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Subtask not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
    } as ApiResponse<null>)
  } catch (error) {
    console.error('Error deleting subtask:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete subtask' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
