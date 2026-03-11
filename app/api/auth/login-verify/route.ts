import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64URLToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.substring(0, (3 - (base64.length % 4)) % 3);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function POST(request: NextRequest) {
  const { username, assertionObject } = await request.json();

  if (!username?.trim() || !assertionObject) {
    return NextResponse.json(
      { error: 'Username and assertionObject are required' },
      { status: 400 },
    );
  }

  try {
    const user = userDB.findByUsername(username);
    if (!user || !user.authentication_challenge) {
      return NextResponse.json(
        { error: 'User not found or challenge expired' },
        { status: 400 },
      );
    }

    // Find the authenticator being used
    const authenticator = authenticatorDB.findByCredentialId(assertionObject.id);

    if (!authenticator || authenticator.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Authenticator not found' },
        { status: 400 },
      );
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: assertionObject,
      expectedChallenge: user.authentication_challenge,
      expectedRPID: process.env.RP_ID || 'localhost',
      expectedOrigin: process.env.ORIGIN || 'http://localhost:3000',
      credential: {
        id: authenticator.credential_id,
        publicKey: base64URLToBuffer(authenticator.public_key) as any,
        counter: authenticator.counter ?? 0,
        transports: authenticator.transports?.split(',') as any[] | undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 },
      );
    }

    // Update counter
    if (verification.authenticationInfo) {
      authenticatorDB.updateCounter(authenticator.id, verification.authenticationInfo.newCounter);
    }

    // Clear challenge
    userDB.setAuthenticationChallenge(user.id, '');

    // Create session
    await createSession({ userId: user.id, username: user.username });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login verify error:', error);
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 500 },
    );
  }
}
