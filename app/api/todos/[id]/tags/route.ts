import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ApiResponse } from '@/lib/types'
import { todoDB } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface TagLinkPayload {
  tagId?: number
}

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
    const todoId = Number(id)
    const body = (await request.json()) as TagLinkPayload
    const tagId = Number(body.tagId)

    if (!Number.isInteger(todoId) || !Number.isInteger(tagId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID or tag ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const success = await todoDB.addTag(session.userId, todoId, tagId)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Todo or tag not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true } as ApiResponse<null>)
  } catch (error) {
    console.error('Error assigning tag to todo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign tag' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

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
    const todoId = Number(id)
    const body = (await request.json()) as TagLinkPayload
    const tagId = Number(body.tagId)

    if (!Number.isInteger(todoId) || !Number.isInteger(tagId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID or tag ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const success = await todoDB.removeTag(session.userId, todoId, tagId)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Todo or tag not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true } as ApiResponse<null>)
  } catch (error) {
    console.error('Error removing tag from todo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove tag' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
