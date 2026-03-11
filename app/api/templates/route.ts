import { NextRequest, NextResponse } from 'next/server'
import { templateDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ApiResponse, CreateTemplateInput, Priority, Template } from '@/lib/types'

function parseJsonArrayString(raw: string | undefined, fallback: string): string {
  if (raw === undefined) return fallback
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Expected JSON array')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array')
  }
  return JSON.stringify(parsed)
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high'
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

    const templates = await templateDB.getAll(session.userId)
    return NextResponse.json({ success: true, data: templates } as ApiResponse<Template[]>)
  } catch (error) {
    console.error('Error listing templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' } as ApiResponse<null>,
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

    const body = (await request.json()) as CreateTemplateInput

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Template name is required' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.name.trim().length > 200) {
      return NextResponse.json(
        { success: false, error: 'Template name must be 200 characters or fewer' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.category && body.category.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Template category must be 100 characters or fewer' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.priority && !isPriority(body.priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority value' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (
      body.dueOffsetDays !== undefined &&
      body.dueOffsetDays !== null &&
      (!Number.isInteger(body.dueOffsetDays) || body.dueOffsetDays < 0)
    ) {
      return NextResponse.json(
        { success: false, error: 'dueOffsetDays must be a non-negative integer' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const template = await templateDB.create(session.userId, {
      name: body.name.trim(),
      category: body.category?.trim() || null,
      priority: body.priority,
      subtasksJson: parseJsonArrayString(body.subtasksJson, '[]'),
      tagsJson: parseJsonArrayString(body.tagsJson, '[]'),
      dueOffsetDays: body.dueOffsetDays ?? null,
    })

    return NextResponse.json({ success: true, data: template } as ApiResponse<Template>, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected JSON array') {
      return NextResponse.json(
        { success: false, error: 'subtasksJson and tagsJson must be JSON arrays' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    console.error('Error creating template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create template' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
