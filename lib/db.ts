import Database from 'better-sqlite3';
import { getSingaporeNow, toSingaporeISOString } from '@/lib/timezone';

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  created_at: string;
  registration_challenge: string | null;
  authentication_challenge: string | null;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  backed_up: number;
  device_type: string;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  completed: number;
  priority: Priority;
  due_date: string | null;
  recurrence_pattern: RecurrencePattern;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface Template {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  subtasks_json: string;
  created_at: string;
}

const db = new Database('todos.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  registration_challenge TEXT,
  authentication_challenge TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  transports TEXT,
  backed_up INTEGER DEFAULT 0,
  device_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  recurrence_pattern TEXT NOT NULL DEFAULT 'none',
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#16a34a',
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL UNIQUE
);
`);

export const userDB = {
  create(username: string): User {
    const now = toSingaporeISOString(getSingaporeNow());
    const stmt = db.prepare(
      'INSERT INTO users (username, created_at) VALUES (?, ?) RETURNING *',
    );
    return stmt.get(username, now) as User;
  },
  findByUsername(username: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return (stmt.get(username) as User) ?? null;
  },
  findById(id: number): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return (stmt.get(id) as User) ?? null;
  },
  setRegistrationChallenge(userId: number, challenge: string): void {
    db.prepare('UPDATE users SET registration_challenge = ? WHERE id = ?').run(challenge, userId);
  },
  setAuthenticationChallenge(userId: number, challenge: string): void {
    db.prepare('UPDATE users SET authentication_challenge = ? WHERE id = ?').run(challenge, userId);
  },
};

export const authenticatorDB = {
  create(params: Omit<Authenticator, 'id' | 'created_at'>): Authenticator {
    const now = toSingaporeISOString(getSingaporeNow());
    const stmt = db.prepare(`
      INSERT INTO authenticators
      (user_id, credential_id, public_key, counter, transports, backed_up, device_type, created_at)
      VALUES (@user_id, @credential_id, @public_key, @counter, @transports, @backed_up, @device_type, @created_at)
      RETURNING *
    `);
    return stmt.get({ ...params, created_at: now }) as Authenticator;
  },
  findByCredentialId(credentialId: string): Authenticator | null {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE credential_id = ?');
    return (stmt.get(credentialId) as Authenticator) ?? null;
  },
  findByUserId(userId: number): Authenticator[] {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE user_id = ?');
    return stmt.all(userId) as Authenticator[];
  },
  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

export const todoDB = {
  listByUser(userId: number): Todo[] {
    const stmt = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Todo[];
  },
  create(input: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Todo {
    const now = toSingaporeISOString(getSingaporeNow());
    const stmt = db.prepare(`
      INSERT INTO todos
      (user_id, title, description, completed, priority, due_date, recurrence_pattern, reminder_minutes, last_notification_sent, created_at, updated_at)
      VALUES (@user_id, @title, @description, @completed, @priority, @due_date, @recurrence_pattern, @reminder_minutes, @last_notification_sent, @created_at, @updated_at)
      RETURNING *
    `);
    return stmt.get({ ...input, created_at: now, updated_at: now }) as Todo;
  },
  update(id: number, userId: number, input: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at'>>): Todo | null {
    const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId) as Todo | undefined;
    if (!existing) {
      return null;
    }

    const next: Todo = {
      ...existing,
      ...input,
      updated_at: toSingaporeISOString(getSingaporeNow()),
    };

    db.prepare(`
      UPDATE todos
      SET title = @title,
          description = @description,
          completed = @completed,
          priority = @priority,
          due_date = @due_date,
          recurrence_pattern = @recurrence_pattern,
          reminder_minutes = @reminder_minutes,
          last_notification_sent = @last_notification_sent,
          updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `).run(next);

    return db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo;
  },
  delete(id: number, userId: number): boolean {
    const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  },
};

export const subtaskDB = {
  listByTodo(todoId: number): Subtask[] {
    return db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC').all(todoId) as Subtask[];
  },
};

export const tagDB = {
  listByUser(userId: number): Tag[] {
    return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[];
  },
};

export const templateDB = {
  listByUser(userId: number): Template[] {
    return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Template[];
  },
};

export const holidayDB = {
  list(): { id: number; name: string; date: string }[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as { id: number; name: string; date: string }[];
  },
};
