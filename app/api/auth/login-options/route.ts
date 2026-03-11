import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { userDB } from '@/lib/db'

export async function POST(req: Request) {
  const { username } = await req.json()
  if (!username) {
    return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 })
  }

  const user = await userDB.findByUsername(username)
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  const authenticators = await userDB.getAuthenticatorsByUserId(user.id)
  if (authenticators.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No passkey registered for this user. Register first.' },
      { status: 400 }
    )
  }

  const rpID = process.env.RP_ID || 'localhost'
  const options = generateAuthenticationOptions({
    rpID,
    // Use discoverable credentials to reduce NotAllowedError caused by stale/strict ID matching.
    timeout: 120000,
    userVerification: 'preferred',
  })

  const res = NextResponse.json({ success: true, data: options })
  res.cookies.set('login_challenge', options.challenge, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })
  return res
}