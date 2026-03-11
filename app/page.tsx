'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Todo, Priority, Subtask } from '@/lib/types'
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone'

export default function Home() {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formDueDate, setFormDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [expandedTodoIds, setExpandedTodoIds] = useState<number[]>([])
  const [subtasksByTodoId, setSubtasksByTodoId] = useState<Record<number, Subtask[]>>({})
  const [newSubtaskTitleByTodoId, setNewSubtaskTitleByTodoId] = useState<Record<number, string>>({})

  // Fetch todos on mount
  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  const checkSessionAndLoad = async () => {
    try {
      const authRes = await fetch('/api/auth/me', { method: 'GET' })
      if (!authRes.ok) {
        router.replace('/login')
        return
      }
      await fetchTodos()
    } catch {
      router.replace('/login')
    }
  }

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Failed to fetch todos')
      const data = await res.json()
      const nextTodos = data.data || []
      setTodos(nextTodos)
      const activeTodoIds = new Set<number>(nextTodos.map((todo: Todo) => todo.id))
      setSubtasksByTodoId((prev) => {
        const next = Object.entries(prev).reduce<Record<number, Subtask[]>>((acc, [key, value]) => {
          const parsedKey = Number(key)
          if (activeTodoIds.has(parsedKey)) {
            acc[parsedKey] = value
          }
          return acc
        }, {})
        return next
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } finally {
      router.replace('/login')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setError('Please enter a title')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          priority: formPriority,
          dueDate: formDueDate || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create todo')

      setFormTitle('')
      setFormPriority('medium')
      setFormDueDate('')
      setError(null)
      fetchTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (todo: Todo) => {
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update todo')

      fetchTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete todo')
      setDeleteConfirm(null)
      fetchTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const fetchSubtasks = async (todoId: number) => {
    const res = await fetch(`/api/todos/${todoId}/subtasks`)
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to fetch subtasks')
    }

    const data = await res.json()
    setSubtasksByTodoId((prev) => ({
      ...prev,
      [todoId]: data.data?.subtasks || [],
    }))
  }

  const toggleSubtaskPanel = async (todoId: number) => {
    const isExpanded = expandedTodoIds.includes(todoId)
    if (isExpanded) {
      setExpandedTodoIds((prev) => prev.filter((id) => id !== todoId))
      return
    }

    setExpandedTodoIds((prev) => [...prev, todoId])
    try {
      await fetchSubtasks(todoId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleCreateSubtask = async (todoId: number) => {
    const nextTitle = newSubtaskTitleByTodoId[todoId]?.trim() || ''
    if (!nextTitle) return

    try {
      const res = await fetch(`/api/todos/${todoId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create subtask')

      setNewSubtaskTitleByTodoId((prev) => ({
        ...prev,
        [todoId]: '',
      }))
      await fetchSubtasks(todoId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleUpdateSubtask = async (todoId: number, subtaskId: number, update: { title?: string; completed?: boolean; position?: number }) => {
    try {
      const res = await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update subtask')

      await fetchSubtasks(todoId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDeleteSubtask = async (todoId: number, subtaskId: number) => {
    try {
      const res = await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete subtask')
      await fetchSubtasks(todoId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const getSubtaskProgress = (todoId: number) => {
    const subtasks = subtasksByTodoId[todoId] || []
    if (subtasks.length === 0) {
      return { total: 0, completed: 0, percent: 0 }
    }

    const completed = subtasks.filter((subtask) => subtask.completed).length
    const percent = Math.round((completed / subtasks.length) * 100)
    return { total: subtasks.length, completed, percent }
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    }
  }

  const getPriorityBgColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'hover:bg-red-500/10'
      case 'medium':
        return 'hover:bg-yellow-500/10'
      case 'low':
        return 'hover:bg-blue-500/10'
    }
  }

  const getPriorityValue = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 3
      case 'medium':
        return 2
      case 'low':
        return 1
    }
  }

  const isOverdue = (todo: Todo) => {
    if (!todo.dueDate || todo.completed) return false
    return new Date(todo.dueDate) < getSingaporeNow()
  }

  // Filter todos based on search and priority
  const filteredTodos = todos.filter((todo) => {
    const query = searchQuery.toLowerCase()
    const matchesTitle = todo.title.toLowerCase().includes(query)
    const matchesSubtask = (subtasksByTodoId[todo.id] || []).some((subtask) => subtask.title.toLowerCase().includes(query))
    const matchesSearch = matchesTitle || matchesSubtask
    const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter
    return matchesSearch && matchesPriority
  })

  const activeTodos = filteredTodos.filter((t) => !t.completed).sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority))
  const completedTodos = filteredTodos.filter((t) => t.completed)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">Todo App</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              📊 Data
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              📅 Calendar
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              🎁 Templates
            </button>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              🔔
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Welcome, bt</h2>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Create Form */}
        <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Input */}
            <div>
              <input
                type="text"
                placeholder="Add a new todo..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-blue-500/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isSubmitting}
              />
            </div>

            {/* Priority and Due Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as Priority)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isSubmitting}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div>
                <input
                  type="datetime-local"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>

            {/* Advanced Options */}
            <button type="button" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              ▶ Show Advanced Options
            </button>
          </form>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input
                  type="text"
                  placeholder="Search todos and subtasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🟢 Low Priority</option>
            </select>
          </div>

          <div className="mt-3">
            <button className="flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors">
              ▶ Advanced
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Active Todos */}
        {!loading && activeTodos.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Active Todos ({activeTodos.length})</h3>
            <div className="space-y-2">
              {activeTodos.map((todo) => {
                const isExpanded = expandedTodoIds.includes(todo.id)
                const subtasks = subtasksByTodoId[todo.id] || []
                const progress = getSubtaskProgress(todo.id)

                return (
                  <div
                    key={todo.id}
                    className={`bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-lg p-4 transition-colors ${getPriorityBgColor(todo.priority)} ${
                      isOverdue(todo) ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggle(todo)}
                        className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-base break-words ${isOverdue(todo) ? 'text-red-400' : 'text-white'}`}>
                          {todo.title}
                        </p>
                        {todo.dueDate && (
                          <p className={`text-xs mt-1.5 font-medium ${isOverdue(todo) ? 'text-red-400' : 'text-slate-400'}`}>
                            📅 {formatSingaporeDate(new Date(todo.dueDate))}
                          </p>
                        )}
                        {subtasks.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                              <span>Progress</span>
                              <span>{progress.completed}/{progress.total} ({progress.percent}%)</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden" data-testid={`progress-bar-${todo.id}`}>
                              <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityColor(todo.priority)}`}>
                        {todo.priority.toUpperCase()}
                      </div>

                      <button
                        onClick={() => toggleSubtaskPanel(todo.id)}
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        aria-label="Toggle subtasks"
                      >
                        {isExpanded ? '▾' : '▸'}
                      </button>

                      <button
                        onClick={() => setDeleteConfirm(todo.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pl-9 border-l border-slate-700/70 space-y-2">
                        {subtasks.length === 0 && (
                          <p className="text-sm text-slate-500">No subtasks yet</p>
                        )}

                        {subtasks.map((subtask, index) => (
                          <div key={subtask.id} className="flex items-center gap-2" data-testid="subtask-item">
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={() => handleUpdateSubtask(todo.id, subtask.id, { completed: !subtask.completed })}
                              className="w-4 h-4 rounded border border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                            />
                            <p className={`flex-1 text-sm ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {subtask.title}
                            </p>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleUpdateSubtask(todo.id, subtask.id, { position: subtask.position - 1 })}
                              className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300 disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === subtasks.length - 1}
                              onClick={() => handleUpdateSubtask(todo.id, subtask.id, { position: subtask.position + 1 })}
                              className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300 disabled:opacity-40"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => handleDeleteSubtask(todo.id, subtask.id)}
                              className="text-slate-500 hover:text-red-500 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newSubtaskTitleByTodoId[todo.id] || ''}
                            onChange={(e) => setNewSubtaskTitleByTodoId((prev) => ({ ...prev, [todo.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleCreateSubtask(todo.id)
                              }
                            }}
                            placeholder="Add subtask"
                            className="flex-1 px-3 py-2 bg-slate-700/60 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateSubtask(todo.id)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                          >
                            Add Subtask
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed Todos */}
        {!loading && completedTodos.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-400 mb-3">Completed ({completedTodos.length})</h3>
            <div className="space-y-2">
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggle(todo)}
                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-through text-slate-500">
                      {todo.title}
                    </p>
                  </div>

                  <button
                    onClick={() => setDeleteConfirm(todo.id)}
                    className="text-slate-500 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && todos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">No todos yet. Add one above!</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Todo?</h3>
            <p className="text-slate-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
