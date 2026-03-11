import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { userDB } from '@/lib/db'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, assertionResponse } = body
    if (!username || !assertionResponse) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    const user = await userDB.findByUsername(username)
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const authenticators = await userDB.getAuthenticatorsByUserId(user.id)
    const expectedAuthenticator = authenticators.find(
      (a) =>
        a.credentialId === assertionResponse.id ||
        a.credentialId === assertionResponse.rawId
    )
    if (!expectedAuthenticator) {
      return NextResponse.json({ success: false, error: 'Authenticator not found' }, { status: 400 })
    }

    const expectedChallenge = req.cookies.get('login_challenge')?.value
    if (!expectedChallenge) {
      return NextResponse.json({ success: false, error: 'No challenge' }, { status: 400 })
    }

    const rpID = process.env.RP_ID || 'localhost'
    const expectedOrigin = process.env.RP_ORIGIN || `http://${rpID}:3000`

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(expectedAuthenticator.credentialId),
        credentialPublicKey: isoBase64URL.toBuffer(expectedAuthenticator.publicKey),
        counter: expectedAuthenticator.counter,
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 400 })
    }

    await userDB.updateCounter(
      expectedAuthenticator.id,
      verification.authenticationInfo.newCounter ?? 0
    )

    const res = NextResponse.json({ success: true })
    createSession(res, { userId: user.id, username: user.username })
    res.cookies.delete('login_challenge')
    return res
  } catch (error) {
    console.error('login verify error:', error)
    return NextResponse.json({ success: false, error: 'Login verification failed' }, { status: 400 })
  }
}