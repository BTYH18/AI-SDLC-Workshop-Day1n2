import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username?.trim()) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 },
    );
  }

  try {
    // Check if user already exists
    let user = userDB.findByUsername(username);
    
    if (!user) {
      // Create new user
      user = userDB.create(username);
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpID: process.env.RP_ID || 'localhost',
      rpName: 'Todo App',
      userName: username,
      userID: new TextEncoder().encode(username + user.id.toString()),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge
    userDB.setRegistrationChallenge(user.id, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Registration options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 },
    );
  }
}
