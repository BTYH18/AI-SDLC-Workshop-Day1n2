// Type definitions for the todo app
export type Priority = 'low' | 'medium' | 'high'
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Tag {
  id: number
  userId: number
  name: string
  color: string | null
  createdAt: string
  updatedAt: string
}

export interface Todo {
  id: number
  title: string
  priority: Priority
  generatedFromTodoId: number | null
  dueDate: string | null
  recurrencePattern: RecurrencePattern | null
  reminderMinutes: number | null
  lastNotificationSent: string | null
  snoozedUntil: string | null
  nextInstanceCreated: boolean
  completed: boolean
  tags?: Tag[]
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: number
  todoId: number
  title: string
  position: number
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTodoInput {
  title: string
  priority?: Priority
  generatedFromTodoId?: number | null
  dueDate?: string
  recurrencePattern?: RecurrencePattern
  reminderMinutes?: number | null
  tagIds?: number[]
}

export interface UpdateTodoInput {
  title?: string
  priority?: Priority
  dueDate?: string | null
  recurrencePattern?: RecurrencePattern | null
  reminderMinutes?: number | null
  lastNotificationSent?: string | null
  snoozedUntil?: string | null
  nextInstanceCreated?: boolean
  completed?: boolean
  tagIds?: number[]
}

export interface CreateSubtaskInput {
  title: string
}

export interface UpdateSubtaskInput {
  title?: string
  completed?: boolean
  position?: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Authentication models
export interface User {
  id: number
  username: string
  createdAt: string
  updatedAt: string
}

export interface Authenticator {
  id: number
  userId: number
  credentialId: string
  publicKey: string
  counter: number
  createdAt: string
  updatedAt: string
}

// Template models
export interface Template {
  id: number
  userId: number
  name: string
  category: string | null
  priority: Priority
  recurrencePattern: RecurrencePattern | null
  reminderMinutes: number | null
  subtasksJson: string
  tagsJson: string
  dueOffsetDays: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateInput {
  name: string
  category?: string | null
  priority?: Priority
  recurrencePattern?: RecurrencePattern | null
  reminderMinutes?: number | null
  subtasksJson?: string
  tagsJson?: string
  dueOffsetDays?: number | null
}

export interface UpdateTemplateInput {
  name?: string
  category?: string | null
  priority?: Priority
  recurrencePattern?: RecurrencePattern | null
  reminderMinutes?: number | null
  subtasksJson?: string
  tagsJson?: string
  dueOffsetDays?: number | null
}

// Holiday model
export interface Holiday {
  id: number
  date: string
  name: string
  createdAt: string
}
