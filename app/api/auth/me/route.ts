import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(req: Request) {
  const session = getSession(req as any)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ success: true, data: session })
}