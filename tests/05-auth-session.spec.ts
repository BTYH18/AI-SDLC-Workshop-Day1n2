import { expect, test } from '@playwright/test'

test.describe('Auth Session API', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip(({ browserName }) => browserName !== 'chromium', 'API coverage runs once in chromium to reduce shared DB flakiness')

  test('GET /api/auth/me is unauthorized without session', async ({ request }) => {
    const res = await request.get('/api/auth/me')
    expect(res.status()).toBe(401)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Not authenticated')
  })

  test('dev-login creates session and /api/auth/me returns user', async ({ request }) => {
    const loginRes = await request.post('/api/auth/dev-login')
    expect(loginRes.status()).toBe(200)

    const loginBody = await loginRes.json()
    expect(loginBody.success).toBe(true)
    expect(typeof loginBody.data.userId).toBe('number')
    expect(typeof loginBody.data.username).toBe('string')

    const meRes = await request.get('/api/auth/me')
    expect(meRes.status()).toBe(200)

    const meBody = await meRes.json()
    expect(meBody.success).toBe(true)
    expect(meBody.data.userId).toBe(loginBody.data.userId)
  })

  test('logout invalidates current session', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const logoutRes = await request.post('/api/auth/logout')
    expect(logoutRes.status()).toBe(200)

    const afterLogoutRes = await request.get('/api/auth/me')
    expect(afterLogoutRes.status()).toBe(401)
  })
})
