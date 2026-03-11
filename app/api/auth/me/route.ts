import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ success: true, data: session })
}