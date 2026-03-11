import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

interface SessionPayload {
  userId: number
  username: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'changeme'
const COOKIE_NAME = 'session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export function createSession(res: NextResponse, payload: SessionPayload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  })
}

export function getSession(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch (err) {
    return null
  }
}

export function invalidateSession(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
}