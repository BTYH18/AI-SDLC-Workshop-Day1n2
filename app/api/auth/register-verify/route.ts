import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

function bufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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
  const { username, attestationObject } = await request.json();

  if (!username?.trim() || !attestationObject) {
    return NextResponse.json(
      { error: 'Username and attestationObject are required' },
      { status: 400 },
    );
  }

  try {
    const user = userDB.findByUsername(username);
    if (!user || !user.registration_challenge) {
      return NextResponse.json(
        { error: 'User not found or challenge expired' },
        { status: 400 },
      );
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: attestationObject,
      expectedChallenge: user.registration_challenge,
      expectedRPID: process.env.RP_ID || 'localhost',
      expectedOrigin: process.env.ORIGIN || 'http://localhost:3000',
      supportedAlgorithmIDs: [-7, -257],
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 },
      );
    }

    const { registrationInfo } = verification;

    // Store authenticator
    authenticatorDB.create({
      user_id: user.id,
      credential_id: registrationInfo.credential.id as string,
      public_key: bufferToBase64URL(registrationInfo.credential.publicKey),
      counter: 0,
      transports: attestationObject.response?.transports?.join(',') || null,
      backed_up: registrationInfo.credentialBackedUp ? 1 : 0,
      device_type: registrationInfo.credentialDeviceType,
    });

    // Clear challenge
    userDB.setRegistrationChallenge(user.id, '');

    // Create session and redirect
    await createSession({ userId: user.id, username: user.username });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration verify error:', error);
    return NextResponse.json(
      { error: 'Registration verification failed' },
      { status: 500 },
    );
  }
}
