import { expect, test } from '@playwright/test'

test.describe('Todos API Auth and Validation', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip(({ browserName }) => browserName !== 'chromium', 'API coverage runs once in chromium to reduce shared DB flakiness')

  test('rejects unauthenticated list/create', async ({ request }) => {
    const listRes = await request.get('/api/todos')
    expect(listRes.status()).toBe(401)

    const createRes = await request.post('/api/todos', {
      data: { title: 'Should fail unauthenticated' },
    })
    expect(createRes.status()).toBe(401)
  })

  test('rejects invalid due date format', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const res = await request.post('/api/todos', {
      data: {
        title: `InvalidDueDate-${Date.now()}`,
        dueDate: 'not-a-date',
      },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid due date format')
  })

  test('rejects invalid recurrence and reminder values', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const recurrenceRes = await request.post('/api/todos', {
      data: {
        title: `InvalidRecurrence-${Date.now()}`,
        dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        recurrencePattern: 'hourly',
      },
    })

    expect(recurrenceRes.status()).toBe(400)
    const recurrenceBody = await recurrenceRes.json()
    expect(recurrenceBody.error).toContain('Invalid recurrence pattern')

    const reminderRes = await request.post('/api/todos', {
      data: {
        title: `InvalidReminder-${Date.now()}`,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        reminderMinutes: 10,
      },
    })

    expect(reminderRes.status()).toBe(400)
    const reminderBody = await reminderRes.json()
    expect(reminderBody.error).toContain('Invalid reminder timing')
  })

  test('create then list includes trimmed todo title', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const title = `Trimmed-${Date.now()}`
    const createRes = await request.post('/api/todos', {
      data: { title: `   ${title}   ` },
    })

    expect(createRes.status()).toBe(201)
    const createBody = await createRes.json()
    expect(createBody.data.title).toBe(title)

    const listRes = await request.get('/api/todos')
    expect(listRes.status()).toBe(200)
    const listBody = await listRes.json()

    const found = (listBody.data as Array<{ title: string }>).some((todo) => todo.title === title)
    expect(found).toBeTruthy()
  })
})
