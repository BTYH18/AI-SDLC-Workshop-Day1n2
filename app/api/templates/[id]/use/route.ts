import { NextRequest, NextResponse } from 'next/server'
import { templateDB, todoDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ApiResponse, Todo } from '@/lib/types'
import { getSingaporeNow } from '@/lib/timezone'

interface RouteParams {
  params: Promise<{ id: string }>
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

    try {
      JSON.parse(template.subtasksJson)
      JSON.parse(template.tagsJson)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Template data is malformed' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const now = getSingaporeNow()
    const dueDate =
      template.dueOffsetDays === null
        ? undefined
        : new Date(now.getTime() + template.dueOffsetDays * 24 * 60 * 60 * 1000).toISOString()

    const todo = await todoDB.create(session.userId, {
      title: template.name,
      priority: template.priority,
      dueDate,
    })

    return NextResponse.json({ success: true, data: todo } as ApiResponse<Todo>, { status: 201 })
  } catch (error) {
    console.error('Error using template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to use template' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
