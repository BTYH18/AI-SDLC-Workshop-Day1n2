import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { userDB } from '@/lib/db'

const DEV_TEST_USERNAME = 'dev_test_account'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  let user = await userDB.findByUsername(DEV_TEST_USERNAME)
  if (!user) {
    user = await userDB.create(DEV_TEST_USERNAME)
  }

  const res = NextResponse.json({
    success: true,
    data: { userId: user.id, username: user.username },
  })

  createSession(res, { userId: user.id, username: user.username })
  return res
}
