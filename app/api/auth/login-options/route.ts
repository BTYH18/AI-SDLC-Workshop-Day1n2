import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';

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
  const { username } = await request.json();

  if (!username?.trim()) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 },
    );
  }

  try {
    const user = userDB.findByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Get user's authenticators
    const authenticators = authenticatorDB.findByUserId(user.id);
    if (authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No authenticators found for user' },
        { status: 400 },
      );
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID || 'localhost',
      allowCredentials: authenticators.map((auth) => ({
        id: auth.credential_id,
        type: 'public-key' as const,
        transports: auth.transports?.split(',') as any[] | undefined,
      })),
      userVerification: 'preferred',
    });

    // Store challenge
    userDB.setAuthenticationChallenge(user.id, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Login options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate login options' },
      { status: 500 },
    );
  }
}
