import { expect, test } from '@playwright/test'

const REMINDER_MINUTES = 15

function getFutureIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString()
}

test.describe('Notification Snooze API', () => {
  test('rejects unauthenticated snooze request', async ({ request }) => {
    const res = await request.post('/api/notifications/snooze', {
      data: { todoId: 1, minutes: 30 },
    })

    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('rejects invalid JSON payload', async ({ page }) => {
    const loginRes = await page.request.post('/api/auth/dev-login')
    expect(loginRes.ok()).toBeTruthy()

    const res = await page.request.fetch('/api/notifications/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: '{invalid-json',
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Invalid JSON')
  })

  test('snoozes a remindable todo', async ({ page }) => {
    const loginRes = await page.request.post('/api/auth/dev-login')
    expect(loginRes.ok()).toBeTruthy()

    const createRes = await page.request.post('/api/todos', {
      data: {
        title: `Snooze test ${Date.now()}`,
        priority: 'medium',
        dueDate: getFutureIso(45),
        reminderMinutes: REMINDER_MINUTES,
      },
    })
    expect(createRes.ok()).toBeTruthy()

    const created = await createRes.json()
    const todoId = created?.data?.id as number
    expect(Number.isInteger(todoId)).toBeTruthy()

    const snoozeRes = await page.request.post('/api/notifications/snooze', {
      data: { todoId, minutes: 30 },
    })

    expect(snoozeRes.status()).toBe(200)
    const snoozeBody = await snoozeRes.json()
    expect(snoozeBody.success).toBe(true)
    expect(snoozeBody.data.todoId).toBe(todoId)
    expect(typeof snoozeBody.data.snoozedUntil).toBe('string')
  })
})
