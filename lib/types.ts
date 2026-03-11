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
