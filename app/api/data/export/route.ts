import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dataTransferDB } from '@/lib/db'
import { getSingaporeNow } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await dataTransferDB.exportForUser(session.userId)
    const now = getSingaporeNow()
    const filenameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    return NextResponse.json(
      {
        version: 1,
        exportedAt: now.toISOString(),
        todos: payload.todos,
        templates: payload.templates,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="todo-backup-${filenameDate}.json"`,
        },
      }
    )
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ success: false, error: 'Failed to export data' }, { status: 500 })
  }
}
