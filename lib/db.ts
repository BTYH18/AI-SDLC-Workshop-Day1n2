import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import { Todo, CreateTodoInput, UpdateTodoInput, Priority } from './types'

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
  create: async (input: CreateTodoInput): Promise<Todo> => {
    const db = await getDb()
    const now = new Date().toISOString()
    const priority = input.priority || 'medium'

    db.run(
      `INSERT INTO todos (title, priority, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [input.title, priority, input.dueDate || null, now, now]
    )

    // Get the last inserted ID
    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0]?.values[0]?.[0] as number

    saveDb()

    return {
      id,
      title: input.title,
      priority: priority as Priority,
      dueDate: input.dueDate || null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }
  },

  getAll: async (): Promise<Todo[]> => {
    const db = await getDb()
    const result = db.exec(`
      SELECT id, title, priority, due_date as dueDate, completed, created_at as createdAt, updated_at as updatedAt
      FROM todos
      ORDER BY priority = 'high' DESC, priority = 'medium' DESC, due_date ASC, created_at DESC
    `)

    if (!result[0]) return []

    const columnNames = result[0].columns
    return result[0].values.map((row) => {
      const obj = {} as any
      columnNames.forEach((col, idx) => {
        obj[col] = row[idx]
      })
      return {
        ...obj,
        completed: Boolean(obj.completed),
      }
    })
  },

  getById: async (id: number): Promise<Todo | null> => {
    const db = await getDb()
    const result = db.exec(
      `SELECT id, title, priority, due_date as dueDate, completed, created_at as createdAt, updated_at as updatedAt
       FROM todos WHERE id = ?`,
      [id]
    )

    if (!result[0] || !result[0].values[0]) return null

    const columnNames = result[0].columns
    const row = result[0].values[0]
    const obj = {} as any
    columnNames.forEach((col, idx) => {
      obj[col] = row[idx]
    })

    return {
      ...obj,
      completed: Boolean(obj.completed),
    }
  },

  update: async (id: number, input: UpdateTodoInput): Promise<Todo | null> => {
    const db = await getDb()
    const todo = await todoDB.getById(id)
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
    if (input.completed !== undefined) {
      updates.push('completed = ?')
      values.push(input.completed ? 1 : 0)
    }

    if (updates.length === 0) return todo

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.run(
      `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    saveDb()

    return todoDB.getById(id)
  },

  delete: async (id: number): Promise<boolean> => {
    const db = await getDb()
    db.run('DELETE FROM todos WHERE id = ?', [id])
    saveDb()
    return true
  },
}
