import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  Priority,
  User,
  Authenticator
} from './types'

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

