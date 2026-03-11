import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { userDB } from '@/lib/db'

const rpName = process.env.RP_NAME || 'Todo App'
const rpID = process.env.RP_ID || 'localhost'

export async function POST(req: Request) {
  const { username } = await req.json()
  if (!username) {
    return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 })
  }

  const existing = await userDB.findByUsername(username)
  if (existing) {
    return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 })
  }

  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: username,
    userName: username,
    attestationType: 'none',
    timeout: 120000,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  const res = NextResponse.json({ success: true, data: options })
  res.cookies.set('registration_challenge', options.challenge, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })
  return res
}