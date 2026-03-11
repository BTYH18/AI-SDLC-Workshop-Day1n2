import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB } from '@/lib/db'
import { getSingaporeNow } from '@/lib/timezone'
import { ApiResponse } from '@/lib/types'

interface NotificationTodo {
  id: number
  title: string
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

    const nowIso = getSingaporeNow().toISOString()
    const todos = await todoDB.getDueNotifications(session.userId, nowIso)

    if (todos.length > 0) {
      await todoDB.markNotificationsSent(
        session.userId,
        todos.map((todo) => todo.id),
        nowIso
      )
    }

    return NextResponse.json(
      { success: true, data: todos } as ApiResponse<NotificationTodo[]>,
      { status: 200 }
    )
  } catch (error) {
    console.error('Error checking notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check notifications' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
