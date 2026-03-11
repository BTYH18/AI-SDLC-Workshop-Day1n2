// Type definitions for the todo app
export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: number
  title: string
  priority: Priority
  dueDate: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTodoInput {
  title: string
  priority?: Priority
  dueDate?: string
}

export interface UpdateTodoInput {
  title?: string
  priority?: Priority
  dueDate?: string | null
  completed?: boolean
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
  subtasksJson?: string
  tagsJson?: string
  dueOffsetDays?: number | null
}

export interface UpdateTemplateInput {
  name?: string
  category?: string | null
  priority?: Priority
  subtasksJson?: string
  tagsJson?: string
  dueOffsetDays?: number | null
}
