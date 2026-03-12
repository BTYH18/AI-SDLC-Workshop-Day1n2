import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ApiResponse, Tag } from '@/lib/types'
import { tagDB } from '@/lib/db'

interface TagPayload {
  id?: number
  name?: string
  color?: string | null
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/

function normalizeTagColor(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !HEX_COLOR_REGEX.test(value)) {
    throw new Error('Invalid color. Expected hex format like #22c55e')
  }
  return value
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const tags = await tagDB.getAll(session.userId)
    return NextResponse.json({ success: true, data: tags } as ApiResponse<Tag[]>)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const body = (await request.json()) as TagPayload
    const name = (body.name || '').trim()
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (await tagDB.existsByName(session.userId, name)) {
      return NextResponse.json(
        { success: false, error: 'Tag name already exists' } as ApiResponse<null>,
        { status: 409 }
      )
    }

    const color = normalizeTagColor(body.color)
    const tag = await tagDB.create(session.userId, name, color)

    return NextResponse.json(
      { success: true, data: tag } as ApiResponse<Tag>,
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tag'
    if (message.includes('Invalid color')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 400 }
      )
    }

    console.error('Error creating tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const body = (await request.json()) as TagPayload
    const id = Number(body.id)
    const name = (body.name || '').trim()

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tag ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (await tagDB.existsByName(session.userId, name, id)) {
      return NextResponse.json(
        { success: false, error: 'Tag name already exists' } as ApiResponse<null>,
        { status: 409 }
      )
    }

    const color = normalizeTagColor(body.color)
    const updated = await tagDB.update(session.userId, id, name, color)
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: updated } as ApiResponse<Tag>)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update tag'
    if (message.includes('Invalid color')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 400 }
      )
    }

    console.error('Error updating tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update tag' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const body = (await request.json()) as TagPayload
    const id = Number(body.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tag ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const success = await tagDB.delete(session.userId, id)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true } as ApiResponse<null>)
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
