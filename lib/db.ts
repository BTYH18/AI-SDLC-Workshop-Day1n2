import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  Priority,
  User,
  Authenticator,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  Holiday
} from './types'
import { getSingaporeNow } from './timezone'

const dbPath = path.join(process.cwd(), 'todos.db')
let sqlDb: any = null
let initPromise: Promise<void> | null = null

// Initialize database with sql.js
export async function initializeDb() {
  if (initPromise) return initPromise
  
  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
      }
    })
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      sqlDb = new SQL.Database(buffer)
    } else {
      sqlDb = new SQL.Database()
    }

    // Enable foreign keys
    sqlDb.run('PRAGMA foreign_keys = ON')

    // Create schema
    sqlDb.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_created_at ON todos(created_at)')
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_due_date ON todos(due_date)')

    // migration: scope todos by user
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN user_id INTEGER')
    } catch {
      // Column already exists
    }
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)')

    // migration: add recurrence pattern
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN recurrence_pattern TEXT')
    } catch {
      // Column already exists
    }

    // migration: reminders/notifications columns
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN reminder_minutes INTEGER')
    } catch {
      // Column already exists
    }
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN last_notification_sent TEXT')
    } catch {
      // Column already exists
    }
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN snoozed_until TEXT')
    } catch {
      // Column already exists
    }
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN next_instance_created INTEGER NOT NULL DEFAULT 0')
    } catch {
      // Column already exists
    }
    try {
      sqlDb.run('ALTER TABLE todos ADD COLUMN generated_from_todo_id INTEGER')
    } catch {
      // Column already exists
    }
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_todos_generated_from ON todos(generated_from_todo_id)')

    // auth tables
    sqlDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    sqlDb.run(`
      CREATE TABLE IF NOT EXISTS authenticators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    sqlDb.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        recurrence_pattern TEXT,
        reminder_minutes INTEGER,
        subtasks_json TEXT NOT NULL DEFAULT '[]',
        tags_json TEXT NOT NULL DEFAULT '[]',
        due_offset_days INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id)')

    try {
      sqlDb.run('ALTER TABLE templates ADD COLUMN recurrence_pattern TEXT')
    } catch {
      // Column already exists
    }
    try {
      sqlDb.run('ALTER TABLE templates ADD COLUMN reminder_minutes INTEGER')
    } catch {
      // Column already exists
    }

    // holidays table - for Singapore public holidays
    sqlDb.run(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date)')

    // backfill legacy todos to first user so existing data remains visible
    const firstUserRes = sqlDb.exec('SELECT id FROM users ORDER BY id LIMIT 1')
    const firstUserId = firstUserRes[0]?.values?.[0]?.[0]
    if (firstUserId) {
      sqlDb.run('UPDATE todos SET user_id = ? WHERE user_id IS NULL', [firstUserId])
    }

    saveDb()
  })()
  
  return initPromise
}

// Persist database to disk
export function saveDb() {
  if (!sqlDb) return
  const data = sqlDb.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

// Helper to ensure db is initialized
async function getDb(): Promise<any> {
  if (!sqlDb) {
    await initializeDb()
  }
  return sqlDb
}

// CRUD Operations
export const todoDB = {
  create: async (userId: number, input: CreateTodoInput): Promise<Todo> => {
    const db = await getDb()
    const now = new Date().toISOString()
    const priority = input.priority || 'medium'

    db.run(
      `INSERT INTO todos (
        user_id,
        title,
        priority,
        generated_from_todo_id,
        due_date,
        recurrence_pattern,
        reminder_minutes,
        last_notification_sent,
        next_instance_created,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        userId,
        input.title,
        priority,
        input.generatedFromTodoId ?? null,
        input.dueDate || null,
        input.recurrencePattern || null,
        input.reminderMinutes ?? null,
        null,
        0,
        now,
        now,
      ]
    )

    // Get the last inserted ID
    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] as number

    saveDb()

    return {
      id,
      title: input.title,
      priority: priority as Priority,
      generatedFromTodoId: input.generatedFromTodoId ?? null,
      dueDate: input.dueDate || null,
      recurrencePattern: input.recurrencePattern || null,
      reminderMinutes: input.reminderMinutes ?? null,
      lastNotificationSent: null,
      snoozedUntil: null,
      nextInstanceCreated: false,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }
  },

  getAll: async (userId: number): Promise<Todo[]> => {
    const db = await getDb()
    const result = db.exec(`
      SELECT id, title, priority, generated_from_todo_id as generatedFromTodoId, due_date as dueDate, recurrence_pattern as recurrencePattern, reminder_minutes as reminderMinutes, last_notification_sent as lastNotificationSent, snoozed_until as snoozedUntil, next_instance_created as nextInstanceCreated, completed, created_at as createdAt, updated_at as updatedAt
      FROM todos
      WHERE user_id = ?
      ORDER BY priority = 'high' DESC, priority = 'medium' DESC, due_date ASC, created_at DESC
    `, [userId])

    if (!result[0]) return []

    const columnNames = result[0].columns
    return result[0].values.map((row: any[]) => {
      const obj = {} as any
      columnNames.forEach((col: string, idx: number) => {
        obj[col] = row[idx]
      })
      return {
        ...obj,
        nextInstanceCreated: Boolean(obj.nextInstanceCreated),
        completed: Boolean(obj.completed),
      }
    })
  },

  getById: async (userId: number, id: number): Promise<Todo | null> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, title, priority, generated_from_todo_id as generatedFromTodoId, due_date as dueDate, recurrence_pattern as recurrencePattern, reminder_minutes as reminderMinutes, last_notification_sent as lastNotificationSent, snoozed_until as snoozedUntil, next_instance_created as nextInstanceCreated, completed, created_at as createdAt, updated_at as updatedAt
       FROM todos WHERE id = ? AND user_id = ?`,
      [id, userId]
    )

    if (!result[0] || !result[0].values[0]) return null

    const columnNames = result[0].columns
    const row = result[0].values[0]
    const obj = {} as any
    columnNames.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })

    return {
      ...obj,
      nextInstanceCreated: Boolean(obj.nextInstanceCreated),
      completed: Boolean(obj.completed),
    }
  },

  update: async (userId: number, id: number, input: UpdateTodoInput): Promise<Todo | null> => {
    const db = await getDb()
    const todo = await todoDB.getById(userId, id)
    if (!todo) return null

    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (input.title !== undefined) {
      updates.push('title = ?')
      values.push(input.title)
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?')
      values.push(input.priority)
    }
    if (input.dueDate !== undefined) {
      updates.push('due_date = ?')
      values.push(input.dueDate)
    }
    if (input.recurrencePattern !== undefined) {
      updates.push('recurrence_pattern = ?')
      values.push(input.recurrencePattern)
    }
    if (input.reminderMinutes !== undefined) {
      updates.push('reminder_minutes = ?')
      values.push(input.reminderMinutes)
    }
    if (input.lastNotificationSent !== undefined) {
      updates.push('last_notification_sent = ?')
      values.push(input.lastNotificationSent)
    }
    if (input.snoozedUntil !== undefined) {
      updates.push('snoozed_until = ?')
      values.push(input.snoozedUntil)
    }
    if (input.nextInstanceCreated !== undefined) {
      updates.push('next_instance_created = ?')
      values.push(input.nextInstanceCreated ? 1 : 0)
    }
    if (input.completed !== undefined) {
      updates.push('completed = ?')
      values.push(input.completed ? 1 : 0)
    }

    if (updates.length === 0) return todo

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.run(
      `UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, userId]
    )

    saveDb()

    return todoDB.getById(userId, id)
  },

  delete: async (userId: number, id: number): Promise<boolean> => {
    const db = await getDb()
    const todo = await todoDB.getById(userId, id)
    if (!todo) return false
    db.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId])
    saveDb()
    return true
  },

  hasActiveRecurringChild: async (
    userId: number,
    sourceTodoId: number,
    title: string,
    nextDueDateIso: string,
    recurrencePattern: string
  ): Promise<boolean> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id FROM todos
       WHERE user_id = ?
         AND completed = 0
         AND (
           generated_from_todo_id = ?
           OR (
             generated_from_todo_id IS NULL
             AND title = ?
             AND due_date = ?
             AND recurrence_pattern = ?
           )
         )
       LIMIT 1`,
      [userId, sourceTodoId, title, nextDueDateIso, recurrencePattern]
    )

    return Boolean(result[0]?.values?.[0])
  },

  getDueNotifications: async (userId: number, nowIso: string): Promise<Array<{ id: number; title: string }>> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, title, due_date as dueDate, reminder_minutes as reminderMinutes, last_notification_sent as lastNotificationSent, snoozed_until as snoozedUntil
       FROM todos
       WHERE user_id = ?
         AND completed = 0
         AND due_date IS NOT NULL
         AND reminder_minutes IS NOT NULL`,
      [userId]
    )

    if (!result[0]) return []

    const nowDate = new Date(nowIso)
    const nowMs = isNaN(nowDate.getTime()) ? getSingaporeNow().getTime() : nowDate.getTime()
    const fifteenMinutesMs = 15 * 60 * 1000

    const parseDueDate = (raw: string): Date => {
      // datetime-local values have no timezone; treat them as Singapore local time.
      const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(raw)
      if (!hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
        return new Date(`${raw}+08:00`)
      }
      return new Date(raw)
    }

    const rows = result[0].values
    return rows
      .map((row: any[]) => ({
        id: Number(row[0]),
        title: String(row[1]),
        dueDate: String(row[2]),
        reminderMinutes: Number(row[3]),
        lastNotificationSent: row[4] ? String(row[4]) : null,
        snoozedUntil: row[5] ? String(row[5]) : null,
      }))
      .filter((todo: any) => {
        const dueDate = parseDueDate(todo.dueDate)
        const dueMs = dueDate.getTime()
        if (isNaN(dueMs) || !Number.isFinite(todo.reminderMinutes)) return false

        if (todo.snoozedUntil) {
          const snoozedUntilMs = new Date(todo.snoozedUntil).getTime()
          if (!isNaN(snoozedUntilMs) && nowMs < snoozedUntilMs) {
            return false
          }
        }

        const triggerAtMs = dueMs - todo.reminderMinutes * 60 * 1000
        if (nowMs < triggerAtMs) return false

        if (!todo.lastNotificationSent) return true

        const lastSentMs = new Date(todo.lastNotificationSent).getTime()
        if (isNaN(lastSentMs)) return true
        return nowMs - lastSentMs >= fifteenMinutesMs
      })
      .map((todo: any) => ({ id: todo.id, title: todo.title }))
  },

  markNotificationsSent: async (userId: number, todoIds: number[], sentAtIso: string): Promise<void> => {
    if (todoIds.length === 0) return
    const db = await getDb()
    const placeholders = todoIds.map(() => '?').join(',')
    db.run(
      `UPDATE todos
       SET last_notification_sent = ?, updated_at = ?
       WHERE user_id = ? AND id IN (${placeholders})`,
      [sentAtIso, sentAtIso, userId, ...todoIds]
    )
    saveDb()
  },

  snoozeNotification: async (userId: number, todoId: number, snoozedUntilIso: string): Promise<boolean> => {
    const db = await getDb()
    const todo = await todoDB.getById(userId, todoId)
    if (!todo || todo.completed || !todo.dueDate || todo.reminderMinutes === null) return false

    const nowIso = getSingaporeNow().toISOString()
    db.run(
      `UPDATE todos
       SET snoozed_until = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [snoozedUntilIso, nowIso, todoId, userId]
    )
    saveDb()
    return true
  },
}

export const templateDB = {
  create: async (userId: number, input: CreateTemplateInput): Promise<Template> => {
    const db = await getDb()
    const now = getSingaporeNow().toISOString()
    const priority = input.priority || 'medium'
    const category = input.category || null
    const recurrencePattern = input.recurrencePattern ?? null
    const reminderMinutes = input.reminderMinutes ?? null
    const subtasksJson = input.subtasksJson || '[]'
    const tagsJson = input.tagsJson || '[]'
    const dueOffsetDays = input.dueOffsetDays ?? null

    db.run(
      `INSERT INTO templates (user_id, name, category, priority, recurrence_pattern, reminder_minutes, subtasks_json, tags_json, due_offset_days, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, input.name, category, priority, recurrencePattern, reminderMinutes, subtasksJson, tagsJson, dueOffsetDays, now, now]
    )

    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] as number

    saveDb()

    return {
      id,
      userId,
      name: input.name,
      category,
      priority: priority as Priority,
      recurrencePattern,
      reminderMinutes,
      subtasksJson,
      tagsJson,
      dueOffsetDays,
      createdAt: now,
      updatedAt: now,
    }
  },

  getAll: async (userId: number): Promise<Template[]> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, user_id as userId, name, category, priority, recurrence_pattern as recurrencePattern, reminder_minutes as reminderMinutes, subtasks_json as subtasksJson, tags_json as tagsJson,
              due_offset_days as dueOffsetDays, created_at as createdAt, updated_at as updatedAt
       FROM templates
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    )

    if (!result[0]) return []

    const columnNames = result[0].columns
    return result[0].values.map((row: any[]) => {
      const obj: any = {}
      columnNames.forEach((col: string, idx: number) => {
        obj[col] = row[idx]
      })
      return obj as Template
    })
  },

  getById: async (userId: number, id: number): Promise<Template | null> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, user_id as userId, name, category, priority, recurrence_pattern as recurrencePattern, reminder_minutes as reminderMinutes, subtasks_json as subtasksJson, tags_json as tagsJson,
              due_offset_days as dueOffsetDays, created_at as createdAt, updated_at as updatedAt
       FROM templates
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    )

    if (!result[0] || !result[0].values[0]) return null

    const columnNames = result[0].columns
    const row = result[0].values[0]
    const obj: any = {}
    columnNames.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })

    return obj as Template
  },

  update: async (userId: number, id: number, input: UpdateTemplateInput): Promise<Template | null> => {
    const db = await getDb()
    const template = await templateDB.getById(userId, id)
    if (!template) return null

    const now = getSingaporeNow().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }
    if (input.category !== undefined) {
      updates.push('category = ?')
      values.push(input.category)
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?')
      values.push(input.priority)
    }
    if (input.recurrencePattern !== undefined) {
      updates.push('recurrence_pattern = ?')
      values.push(input.recurrencePattern)
    }
    if (input.reminderMinutes !== undefined) {
      updates.push('reminder_minutes = ?')
      values.push(input.reminderMinutes)
    }
    if (input.subtasksJson !== undefined) {
      updates.push('subtasks_json = ?')
      values.push(input.subtasksJson)
    }
    if (input.tagsJson !== undefined) {
      updates.push('tags_json = ?')
      values.push(input.tagsJson)
    }
    if (input.dueOffsetDays !== undefined) {
      updates.push('due_offset_days = ?')
      values.push(input.dueOffsetDays)
    }

    if (updates.length === 0) return template

    updates.push('updated_at = ?')
    values.push(now)

    db.run(
      `UPDATE templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, id, userId]
    )

    saveDb()

    return templateDB.getById(userId, id)
  },

  delete: async (userId: number, id: number): Promise<boolean> => {
    const db = await getDb()
    const template = await templateDB.getById(userId, id)
    if (!template) return false
    db.run('DELETE FROM templates WHERE id = ? AND user_id = ?', [id, userId])
    saveDb()
    return true
  },
}

interface ImportTodoRecord {
  title: string
  priority: Priority
  dueDate: string | null
  recurrencePattern: string | null
  reminderMinutes: number | null
  completed: boolean
}

interface ImportTemplateRecord {
  name: string
  category: string | null
  priority: Priority
  recurrencePattern: string | null
  reminderMinutes: number | null
  subtasksJson: string
  tagsJson: string
  dueOffsetDays: number | null
}

export const dataTransferDB = {
  exportForUser: async (userId: number): Promise<{ todos: ImportTodoRecord[]; templates: ImportTemplateRecord[] }> => {
    const db = await getDb()

    const todosResult = db.exec(
      `SELECT title, priority, due_date as dueDate, recurrence_pattern as recurrencePattern,
              reminder_minutes as reminderMinutes, completed
       FROM todos
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    )

    const templatesResult = db.exec(
      `SELECT name, category, priority, recurrence_pattern as recurrencePattern, reminder_minutes as reminderMinutes,
              subtasks_json as subtasksJson, tags_json as tagsJson, due_offset_days as dueOffsetDays
       FROM templates
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    )

    const mapRows = <T>(result: any): T[] => {
      if (!result[0]) return []
      const columnNames = result[0].columns
      return result[0].values.map((row: any[]) => {
        const obj: any = {}
        columnNames.forEach((col: string, idx: number) => {
          obj[col] = row[idx]
        })
        return obj as T
      })
    }

    const todos = mapRows<ImportTodoRecord>(todosResult).map((todo) => ({
      ...todo,
      completed: Boolean((todo as any).completed),
    }))

    const templates = mapRows<ImportTemplateRecord>(templatesResult)

    return { todos, templates }
  },

  importForUser: async (
    userId: number,
    payload: { todos: ImportTodoRecord[]; templates: ImportTemplateRecord[] }
  ): Promise<{ todosImported: number; templatesImported: number }> => {
    const db = await getDb()
    const now = getSingaporeNow().toISOString()
    let todosImported = 0
    let templatesImported = 0

    db.run('BEGIN TRANSACTION')
    try {
      for (const todo of payload.todos) {
        db.run(
          `INSERT INTO todos (
            user_id,
            title,
            priority,
            generated_from_todo_id,
            due_date,
            recurrence_pattern,
            reminder_minutes,
            last_notification_sent,
            snoozed_until,
            next_instance_created,
            completed,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            todo.title,
            todo.priority,
            null,
            todo.dueDate,
            todo.recurrencePattern,
            todo.reminderMinutes,
            null,
            null,
            0,
            todo.completed ? 1 : 0,
            now,
            now,
          ]
        )
        todosImported += 1
      }

      for (const template of payload.templates) {
        db.run(
          `INSERT INTO templates (
            user_id,
            name,
            category,
            priority,
            recurrence_pattern,
            reminder_minutes,
            subtasks_json,
            tags_json,
            due_offset_days,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            template.name,
            template.category,
            template.priority,
            template.recurrencePattern,
            template.reminderMinutes,
            template.subtasksJson,
            template.tagsJson,
            template.dueOffsetDays,
            now,
            now,
          ]
        )
        templatesImported += 1
      }

      db.run('COMMIT')
      saveDb()
      return { todosImported, templatesImported }
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  },
}

// holidays operations
export const holidayDB = {
  create: async (date: string, name: string): Promise<Holiday> => {
    const db = await getDb()
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO holidays (date, name, created_at) VALUES (?, ?, ?)`,
      [date, name, now]
    )
    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] as number
    saveDb()
    return { id, date, name, createdAt: now }
  },

  getAll: async (): Promise<Holiday[]> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, date, name, created_at as createdAt FROM holidays ORDER BY date ASC`
    )
    if (!result[0]) return []
    const columnNames = result[0].columns
    return result[0].values.map((row: any[]) => {
      const obj: any = {}
      columnNames.forEach((col: string, idx: number) => {
        obj[col] = row[idx]
      })
      return obj as Holiday
    })
  },

  getByDate: async (date: string): Promise<Holiday | null> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, date, name, created_at as createdAt FROM holidays WHERE date = ?`,
      [date]
    )
    if (!result[0] || !result[0].values[0]) return null
    const columnNames = result[0].columns
    const row = result[0].values[0]
    const obj: any = {}
    columnNames.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })
    return obj as Holiday
  },

  delete: async (id: number): Promise<boolean> => {
    const db = await getDb()
    const result = db.exec('SELECT id FROM holidays WHERE id = ?', [id])
    if (!result[0] || !result[0].values[0]) return false
    db.run('DELETE FROM holidays WHERE id = ?', [id])
    saveDb()
    return true
  },

  deleteAll: async (): Promise<void> => {
    const db = await getDb()
    db.run('DELETE FROM holidays')
    saveDb()
  },
}

// user/authenticator operations
export const userDB = {
  create: async (username: string): Promise<User> => {
    const db = await getDb()
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO users (username, created_at, updated_at) VALUES (?, ?, ?)`,
      [username, now, now]
    )
    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] as number
    saveDb()
    return { id, username, createdAt: now, updatedAt: now }
  },

  findByUsername: async (username: string): Promise<User | null> => {
    const db = await getDb()
    const res = db.exec(
      `SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE username = ?`,
      [username]
    )
    if (!res[0] || !res[0].values[0]) return null
    const row = res[0].values[0]
    const cols = res[0].columns
    const obj: any = {}
    cols.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })
    return obj as User
  },

  findById: async (id: number): Promise<User | null> => {
    const db = await getDb()
    const res = db.exec(
      `SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?`,
      [id]
    )
    if (!res[0] || !res[0].values[0]) return null
    const row = res[0].values[0]
    const cols = res[0].columns
    const obj: any = {}
    cols.forEach((col: string, idx: number) => {
      obj[col] = row[idx]
    })
    return obj as User
  },

  addAuthenticator: async (
    userId: number,
    credentialId: string,
    publicKey: string,
    counter: number
  ): Promise<Authenticator> => {
    const db = await getDb()
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO authenticators (user_id, credential_id, public_key, counter, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, credentialId, publicKey, counter, now, now]
    )
    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] as number
    saveDb()
    return {
      id,
      userId,
      credentialId,
      publicKey,
      counter,
      createdAt: now,
      updatedAt: now,
    }
  },

  getAuthenticatorsByUserId: async (userId: number): Promise<Authenticator[]> => {
    const db = await getDb()
    const res = db.exec(
      `SELECT id, user_id as userId, credential_id as credentialId, public_key as publicKey, counter, created_at as createdAt, updated_at as updatedAt
       FROM authenticators WHERE user_id = ?`,
      [userId]
    )
    if (!res[0]) return []
    const cols = res[0].columns
    return res[0].values.map((row: any[]) => {
      const obj: any = {}
      cols.forEach((col: string, idx: number) => {
        obj[col] = row[idx]
      })
      return obj as Authenticator
    })
  },

  updateCounter: async (id: number, counter: number): Promise<void> => {
    const db = await getDb()
    const now = new Date().toISOString()
    db.run(
      `UPDATE authenticators SET counter = ?, updated_at = ? WHERE id = ?`,
      [counter, now, id]
    )
    saveDb()
  },
}

