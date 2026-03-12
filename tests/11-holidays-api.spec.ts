import { expect, test } from '@playwright/test'

test.describe('Holidays API', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip(({ browserName }) => browserName !== 'chromium', 'API coverage runs once in chromium to reduce shared DB flakiness')

  test('requires authentication', async ({ request }) => {
    const res = await request.get('/api/holidays')
    expect(res.status()).toBe(401)

    const body = await res.json()
    expect(body.error).toContain('Not authenticated')
  })

  test('returns holidays payload when authenticated', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const res = await request.get('/api/holidays')
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBeTruthy()

    if (body.data.length > 0) {
      const first = body.data[0] as { id: number; date: string; name: string }
      expect(typeof first.id).toBe('number')
      expect(typeof first.date).toBe('string')
      expect(typeof first.name).toBe('string')
    }
  })
})
