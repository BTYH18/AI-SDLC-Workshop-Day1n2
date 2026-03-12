import { NextRequest, NextResponse } from 'next/server'
import { templateDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ApiResponse, Priority, RecurrencePattern, Template, UpdateTemplateInput } from '@/lib/types'

const validPatterns = new Set<RecurrencePattern>(['daily', 'weekly', 'monthly', 'yearly'])
const validReminderMinutes = new Set([15, 30, 60, 120, 1440, 2880, 10080])

interface RouteParams {
  params: Promise<{ id: string }>
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function parseOptionalArrayJson(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
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
    const templateId = parseInt(id, 10)

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const template = await templateDB.getById(session.userId, templateId)
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: template } as ApiResponse<Template>)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

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
    const templateId = parseInt(id, 10)

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const body = (await request.json()) as UpdateTemplateInput

    if (body.name !== undefined && body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Template name cannot be empty' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.name !== undefined && body.name.trim().length > 200) {
      return NextResponse.json(
        { success: false, error: 'Template name must be 200 characters or fewer' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.category !== undefined && body.category !== null && body.category.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Template category must be 100 characters or fewer' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.priority !== undefined && !isPriority(body.priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority value' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (body.recurrencePattern !== undefined && body.recurrencePattern !== null && !validPatterns.has(body.recurrencePattern)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recurrence pattern' } as ApiResponse<null>,
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

    const currentTemplate = await templateDB.getById(session.userId, templateId)
    if (!currentTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    const nextDueOffsetDays = body.dueOffsetDays !== undefined ? body.dueOffsetDays : currentTemplate.dueOffsetDays
    const nextRecurrencePattern = body.recurrencePattern !== undefined ? body.recurrencePattern : currentTemplate.recurrencePattern
    const nextReminderMinutes = body.reminderMinutes !== undefined ? body.reminderMinutes : currentTemplate.reminderMinutes

    if (nextRecurrencePattern !== null && nextDueOffsetDays === null) {
      return NextResponse.json(
        { success: false, error: 'Due date offset is required for recurring templates' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (nextReminderMinutes !== null && nextDueOffsetDays === null) {
      return NextResponse.json(
        { success: false, error: 'Due date offset is required when reminder is set' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const updated = await templateDB.update(session.userId, templateId, {
      name: body.name?.trim(),
      category: body.category === undefined ? undefined : body.category?.trim() || null,
      priority: body.priority,
      recurrencePattern: body.recurrencePattern,
      reminderMinutes: body.reminderMinutes,
      subtasksJson: parseOptionalArrayJson(body.subtasksJson),
      tagsJson: parseOptionalArrayJson(body.tagsJson),
      dueOffsetDays: body.dueOffsetDays,
    })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Template not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: updated } as ApiResponse<Template>)
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected JSON array') {
      return NextResponse.json(
        { success: false, error: 'subtasksJson and tagsJson must be JSON arrays' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    console.error('Error updating template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update template' } as ApiResponse<null>,
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
    const templateId = parseInt(id, 10)

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const success = await templateDB.delete(session.userId, templateId)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Template not found' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true } as ApiResponse<null>)
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
