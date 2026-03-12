import { expect, test } from '@playwright/test'

function futureIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString()
}

test.describe('Recurring and Reminder Rules', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip(({ browserName }) => browserName !== 'chromium', 'API coverage runs once in chromium to reduce shared DB flakiness')

  test('rejects recurring todo without due date', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const res = await request.post('/api/todos', {
      data: {
        title: `RecurringNoDue-${Date.now()}`,
        recurrencePattern: 'daily',
      },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Due date is required for recurring todos')
  })

  test('rejects reminder without due date', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const res = await request.post('/api/todos', {
      data: {
        title: `ReminderNoDue-${Date.now()}`,
        reminderMinutes: 15,
      },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Due date is required when reminder is set')
  })

  test('rejects reminder that is later than due window', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const res = await request.post('/api/todos', {
      data: {
        title: `ReminderLate-${Date.now()}`,
        dueDate: futureIso(20),
        reminderMinutes: 30,
      },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Reminder must be earlier than due date')
  })

  test('completing recurring todo creates next instance', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const title = `RecurringComplete-${Date.now()}`
    const createRes = await request.post('/api/todos', {
      data: {
        title,
        priority: 'high',
        dueDate: futureIso(24 * 60),
        recurrencePattern: 'daily',
        reminderMinutes: 15,
      },
    })

    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    const originalId = created.data.id as number

    const completeRes = await request.put(`/api/todos/${originalId}`, {
      data: { completed: true },
    })
    expect(completeRes.status()).toBe(200)

    const listRes = await request.get('/api/todos')
    expect(listRes.status()).toBe(200)
    const listBody = await listRes.json()

    const todos = listBody.data as Array<{
      id: number
      title: string
      completed: boolean
      recurrencePattern: string | null
      reminderMinutes: number | null
    }>

    const nextInstance = todos.find(
      (todo) =>
        todo.id !== originalId &&
        todo.title === title &&
        todo.completed === false &&
        todo.recurrencePattern === 'daily'
    )

    expect(nextInstance).toBeTruthy()
    expect(nextInstance?.reminderMinutes).toBe(15)
  })
})
