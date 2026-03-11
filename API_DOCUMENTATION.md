# API Documentation - Todo App

## Overview

The Todo App provides a RESTful API for managing todos. All requests/responses use JSON format.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All API responses follow this structure:

```typescript
{
  success: boolean
  data?: T          // Only on success
  error?: string    // Only on error
}
```

## Endpoints

### 1. List All Todos

**Request:**
```
GET /api/todos
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Buy groceries",
      "priority": "high",
      "dueDate": "2025-03-12T10:00:00.000Z",
      "completed": false,
      "createdAt": "2025-03-11T15:30:00.000Z",
      "updatedAt": "2025-03-11T15:30:00.000Z"
    }
  ]
}
```

### 2. Create a Todo

**Request:**
```
POST /api/todos
Content-Type: application/json

{
  "title": "Buy groceries",
  "priority": "high",           // Optional: 'low' | 'medium' | 'high'
  "dueDate": "2025-03-12T10:00:00.000Z"  // Optional: ISO format
}
```

**Validation:**
- ✅ `title` is required (non-empty string)
- ✅ `dueDate` must be at least 1 minute in the future
- ✅ `priority` defaults to 'medium' if omitted

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Buy groceries",
    "priority": "high",
    "dueDate": "2025-03-12T10:00:00.000Z",
    "completed": false,
    "createdAt": "2025-03-11T15:30:00.000Z",
    "updatedAt": "2025-03-11T15:30:00.000Z"
  }
}
```

**Error Examples:**

Empty title (400 Bad Request):
```json
{
  "success": false,
  "error": "Title is required"
}
```

Invalid due date (400 Bad Request):
```json
{
  "success": false,
  "error": "Due date must be at least 1 minute in the future"
}
```

### 3. Get Single Todo

**Request:**
```
GET /api/todos/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Buy groceries",
    "priority": "high",
    "dueDate": "2025-03-12T10:00:00.000Z",
    "completed": false,
    "createdAt": "2025-03-11T15:30:00.000Z",
    "updatedAt": "2025-03-11T15:30:00.000Z"
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Todo not found"
}
```

### 4. Update a Todo

**Request:**
```
PUT /api/todos/1
Content-Type: application/json

{
  "title": "Buy groceries and cook dinner",
  "priority": "medium",
  "dueDate": "2025-03-12T18:00:00.000Z",
  "completed": false
}
```

**Notes:**
- All fields are optional
- Omitted fields are not updated
- `dueDate` can be set to `null` to remove due date
- Same validation rules apply for `title` and `dueDate`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Buy groceries and cook dinner",
    "priority": "medium",
    "dueDate": "2025-03-12T18:00:00.000Z",
    "completed": false,
    "createdAt": "2025-03-11T15:30:00.000Z",
    "updatedAt": "2025-03-11T16:00:00.000Z"
  }
}
```

### 5. Delete a Todo

**Request:**
```
DELETE /api/todos/1
```

**Response (204 No Content):**
```json
{
  "success": true
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": "Todo not found"
}
```

## Error Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | ✅ Success | GET, PUT successful |
| 201 | ✅ Created | POST successful |
| 204 | ✅ Deleted | DELETE successful |
| 400 | ❌ Bad Request | Invalid input (title empty, date in past) |
| 404 | ❌ Not Found | Todo ID doesn't exist |
| 500 | ❌ Server Error | Database error (rare) |

## Examples Using cURL

### Create a Todo
```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Next.js",
    "priority": "high",
    "dueDate": "2025-03-15T14:00:00Z"
  }'
```

### Get All Todos
```bash
curl http://localhost:3000/api/todos
```

### Update a Todo
```bash
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Delete a Todo
```bash
curl -X DELETE http://localhost:3000/api/todos/1
```

## Examples Using JavaScript/Fetch

### Create a Todo
```javascript
const response = await fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Learn Next.js',
    priority: 'high',
    dueDate: '2025-03-15T14:00:00Z'
  })
})

const { success, data, error } = await response.json()

if (!response.ok) {
  console.error('Error:', error)
} else {
  console.log('Created todo:', data)
}
```

### Get All Todos
```javascript
const response = await fetch('/api/todos')
const { data: todos } = await response.json()
console.log(todos)
```

### Toggle Todo Completion
```javascript
const todoId = 1
const response = await fetch(`/api/todos/${todoId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ completed: true })
})

const { data: updatedTodo } = await response.json()
console.log('Updated:', updatedTodo)
```

### Delete a Todo
```javascript
const todoId = 1
const response = await fetch(`/api/todos/${todoId}`, {
  method: 'DELETE'
})

if (response.ok) {
  console.log('Todo deleted!')
}
```

## Data Types

### Todo Object

```typescript
interface Todo {
  id: number
  title: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null        // ISO format
  completed: boolean
  createdAt: string             // ISO format
  updatedAt: string             // ISO format
}
```

### Priority Levels

| Level | Color | Usage |
|-------|-------|-------|
| `high` | 🔴 Red | Urgent tasks |
| `medium` | 🟡 Yellow | Normal tasks |
| `low` | 🟢 Green | Can wait |

## Notes

- **Timezone**: All dates are in ISO 8601 format (UTC). The app handles Singapore timezone conversion internally.
- **Sorting**: When fetching todos, they're automatically sorted by:
  1. Priority (high → medium → low)
  2. Due date (earliest first)
  3. Creation date (newest first)
- **Future Dates**: Due dates must be at least 1 minute in the future
- **Immutability**: API only returns new objects, never modifies request body

---

**Last Updated**: March 11, 2025
