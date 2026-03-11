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
  dueDate?: string
}

export interface UpdateTodoInput {
  title?: string
  priority?: Priority
  dueDate?: string | null
  completed?: boolean
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
