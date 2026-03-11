import { NextResponse } from 'next/server'
import { invalidateSession } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.json({ success: true })
  invalidateSession(res)
  return res
}