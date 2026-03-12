import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB } from '@/lib/db'
import { getSingaporeNow } from '@/lib/timezone'
import { ApiResponse } from '@/lib/types'

interface SnoozeBody {
  todoId?: number
  minutes?: number
}

const VALID_SNOOZE_MINUTES = new Set([15, 30, 60, 120, 1440, 2880, 10080])

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    let body: SnoozeBody
    try {
      body = (await request.json()) as SnoozeBody
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' } as ApiResponse<null>,
        { status: 400 }
      )
    }
    const todoId = Number(body.todoId)
    const minutes = Number(body.minutes)

    if (!Number.isInteger(todoId) || todoId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid todo ID' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (!Number.isInteger(minutes) || !VALID_SNOOZE_MINUTES.has(minutes)) {
      return NextResponse.json(
        { success: false, error: 'Invalid snooze duration' } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const now = getSingaporeNow()
    const snoozedUntilIso = new Date(now.getTime() + minutes * 60 * 1000).toISOString()
    const success = await todoDB.snoozeNotification(session.userId, todoId, snoozedUntilIso)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Todo not found or already completed' } as ApiResponse<null>,
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: { todoId, snoozedUntil: snoozedUntilIso } } as ApiResponse<{ todoId: number; snoozedUntil: string }>,
      { status: 200 }
    )
  } catch (error) {
    console.error('Error snoozing reminder:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to snooze reminder' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
