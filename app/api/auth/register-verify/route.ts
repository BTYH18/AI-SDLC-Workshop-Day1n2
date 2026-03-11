import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { userDB } from '@/lib/db'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, attestationResponse } = body
    if (!username || !attestationResponse) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }
    if (
      typeof attestationResponse !== 'object' ||
      !attestationResponse.id ||
      !attestationResponse.response ||
      !attestationResponse.response.attestationObject ||
      !attestationResponse.response.clientDataJSON
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Malformed attestation payload. Refresh /login and try again.',
        },
        { status: 400 }
      )
    }

    const expectedChallenge = req.cookies.get('registration_challenge')?.value
    if (!expectedChallenge) {
      return NextResponse.json({ success: false, error: 'No challenge stored' }, { status: 400 })
    }

    const rpID = process.env.RP_ID || 'localhost'
    const expectedOrigin = process.env.RP_ORIGIN || `http://${rpID}:3000`

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    })

    if (!verification.verified) {
      return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 400 })
    }

    if (!verification.registrationInfo) {
      return NextResponse.json({ success: false, error: 'Missing registration info' }, { status: 400 })
    }

    // create user and store authenticator
    let user = await userDB.findByUsername(username)
    if (!user) {
      user = await userDB.create(username)
    }

    const { registrationInfo } = verification
    const { credentialPublicKey, credentialID, counter } = registrationInfo

    await userDB.addAuthenticator(
      user.id,
      isoBase64URL.fromBuffer(credentialID),
      isoBase64URL.fromBuffer(credentialPublicKey),
      counter ?? 0
    )

    // create session cookie
    const res = NextResponse.json({ success: true })
    createSession(res, { userId: user.id, username: user.username })
    res.cookies.delete('registration_challenge')
    return res
  } catch (error) {
    console.error('register verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration verification failed' },
      { status: 400 }
    )
  }
}
