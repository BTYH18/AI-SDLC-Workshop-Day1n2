import { expect, test } from '@playwright/test'

test.describe('Priority System API', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip(({ browserName }) => browserName !== 'chromium', 'API coverage runs once in chromium to reduce shared DB flakiness')

  test('defaults priority to medium when omitted', async ({ request }) => {
    const loginRes = await request.post('/api/auth/dev-login')
    expect(loginRes.ok()).toBeTruthy()

    const title = `DefaultPriority-${Date.now()}`
    const createRes = await request.post('/api/todos', {
      data: { title },
    })

    expect(createRes.status()).toBe(201)
    const body = await createRes.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe(title)
    expect(body.data.priority).toBe('medium')
  })

  test('sorts todos by priority high -> medium -> low', async ({ request }) => {
    const loginRes = await request.post('/api/auth/dev-login')
    expect(loginRes.ok()).toBeTruthy()

    const uid = Date.now()
    const highTitle = `PriorityHigh-${uid}`
    const mediumTitle = `PriorityMedium-${uid}`
    const lowTitle = `PriorityLow-${uid}`

    const lowRes = await request.post('/api/todos', { data: { title: lowTitle, priority: 'low' } })
    const highRes = await request.post('/api/todos', { data: { title: highTitle, priority: 'high' } })
    const mediumRes = await request.post('/api/todos', { data: { title: mediumTitle, priority: 'medium' } })

    expect(lowRes.status()).toBe(201)
    expect(highRes.status()).toBe(201)
    expect(mediumRes.status()).toBe(201)

    const listRes = await request.get('/api/todos')
    expect(listRes.status()).toBe(200)

    const listBody = await listRes.json()
    expect(listBody.success).toBe(true)

    const todos = listBody.data as Array<{ title: string; priority: 'high' | 'medium' | 'low' }>
    const highIndex = todos.findIndex((todo) => todo.title === highTitle)
    const mediumIndex = todos.findIndex((todo) => todo.title === mediumTitle)
    const lowIndex = todos.findIndex((todo) => todo.title === lowTitle)

    expect(highIndex).toBeGreaterThanOrEqual(0)
    expect(mediumIndex).toBeGreaterThanOrEqual(0)
    expect(lowIndex).toBeGreaterThanOrEqual(0)

    expect(highIndex).toBeLessThan(mediumIndex)
    expect(mediumIndex).toBeLessThan(lowIndex)
  })
})
