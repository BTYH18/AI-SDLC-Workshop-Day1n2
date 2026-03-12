import { expect, test } from '@playwright/test'

test.describe('Tag System', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip(({ browserName }) => browserName !== 'chromium', 'API/UI tag coverage runs once in chromium')

  test('tag CRUD endpoints work with user-scoped uniqueness', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const uniqueName = `work-${Date.now()}`
    const createRes = await request.post('/api/tags', {
      data: { name: uniqueName, color: '#22c55e' },
    })
    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    const tagId = created.data.id as number

    const duplicateRes = await request.post('/api/tags', {
      data: { name: uniqueName.toUpperCase(), color: '#22c55e' },
    })
    expect(duplicateRes.status()).toBe(409)

    const renameRes = await request.put('/api/tags', {
      data: { id: tagId, name: `${uniqueName}-renamed`, color: '#f97316' },
    })
    expect(renameRes.status()).toBe(200)

    const listRes = await request.get('/api/tags')
    expect(listRes.status()).toBe(200)
    const listed = await listRes.json()
    expect((listed.data as Array<{ id: number }>).some((tag) => tag.id === tagId)).toBeTruthy()

    const deleteRes = await request.delete('/api/tags', {
      data: { id: tagId },
    })
    expect(deleteRes.status()).toBe(200)
  })

  test('assign and unassign tag from todo', async ({ request }) => {
    await request.post('/api/auth/dev-login')

    const tagRes = await request.post('/api/tags', {
      data: { name: `assign-${Date.now()}`, color: '#0ea5e9' },
    })
    expect(tagRes.status()).toBe(201)
    const tagId = (await tagRes.json()).data.id as number

    const todoRes = await request.post('/api/todos', {
      data: { title: `TaggedTodo-${Date.now()}` },
    })
    expect(todoRes.status()).toBe(201)
    const todoId = (await todoRes.json()).data.id as number

    const assignRes = await request.post(`/api/todos/${todoId}/tags`, {
      data: { tagId },
    })
    expect(assignRes.status()).toBe(200)

    const getTodoRes = await request.get(`/api/todos/${todoId}`)
    expect(getTodoRes.status()).toBe(200)
    const getTodoBody = await getTodoRes.json()
    expect((getTodoBody.data.tags as Array<{ id: number }>).some((tag) => tag.id === tagId)).toBeTruthy()

    const removeRes = await request.delete(`/api/todos/${todoId}/tags`, {
      data: { tagId },
    })
    expect(removeRes.status()).toBe(200)

    const getAfterRemoveRes = await request.get(`/api/todos/${todoId}`)
    expect(getAfterRemoveRes.status()).toBe(200)
    const afterRemoveBody = await getAfterRemoveRes.json()
    expect((afterRemoveBody.data.tags as Array<{ id: number }>).some((tag) => tag.id === tagId)).toBeFalsy()
  })

  test('tag token search matches real assigned tags in UI', async ({ page }) => {
    await page.goto('/login')
    const bypassButton = page.getByRole('button', { name: 'Dev Bypass Login (test account)' })
    if (await bypassButton.isVisible()) {
      await bypassButton.click()
    }
    await page.waitForURL('**/')

    const uid = Date.now()
    const tagName = `ui-tag-${uid}`

    const createTagRes = await page.request.post('/api/tags', {
      data: { name: tagName, color: '#22c55e' },
    })
    expect(createTagRes.status()).toBe(201)
    const tagId = (await createTagRes.json()).data.id as number

    const taggedTodoTitle = `Tagged-${uid}`
    const untaggedTodoTitle = `Untagged-${uid}`

    const taggedRes = await page.request.post('/api/todos', {
      data: { title: taggedTodoTitle, priority: 'medium', tagIds: [tagId] },
    })
    expect(taggedRes.status()).toBe(201)

    const plainRes = await page.request.post('/api/todos', {
      data: { title: untaggedTodoTitle, priority: 'medium' },
    })
    expect(plainRes.status()).toBe(201)

    await page.reload()

    const searchInput = page.getByTestId('todo-search-input')
    await searchInput.fill(`tag:${tagName}`)

    await expect(page.locator('p', { hasText: taggedTodoTitle }).first()).toBeVisible()
    await expect.poll(async () => page.locator('p', { hasText: untaggedTodoTitle }).count()).toBe(0)
  })
})
