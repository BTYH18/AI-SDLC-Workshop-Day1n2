import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { holidayDB } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const holidays = await holidayDB.getAll()

    return NextResponse.json({
      success: true,
      data: holidays,
    })
  } catch (error) {
    console.error('Failed to fetch holidays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 }
    )
  }
}
