import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (session) {
    return NextResponse.json(session);
  }
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
