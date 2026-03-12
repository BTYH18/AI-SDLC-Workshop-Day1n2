'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Todo, Priority, RecurrencePattern, Template, UpdateTodoInput } from '@/lib/types'
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone'
import { useNotifications } from '@/lib/hooks/useNotifications'

const REMINDER_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: '15m before' },
  { value: 30, label: '30m before' },
  { value: 60, label: '1h before' },
  { value: 120, label: '2h before' },
  { value: 1440, label: '1d before' },
  { value: 2880, label: '2d before' },
  { value: 10080, label: '1w before' },
]

const SEARCH_DEBOUNCE_MS = 200
const ALL_PRIORITIES: Priority[] = ['high', 'medium', 'low']

type TodoStatusFilter = 'all' | 'active' | 'completed'
type TodoDueFilter = 'all' | 'overdue' | 'today' | 'next7days' | 'noDueDate'
type TodoRecurrenceFilter = 'all' | 'recurring' | 'nonRecurring'
type TodoReminderFilter = 'all' | 'withReminder' | 'withoutReminder'

interface ParsedSearchQuery {
  textTerms: string[]
  priorityTokens: Priority[]
  tagTokens: string[]
}

const normalizeSearchText = (value: string): string => value.trim().toLowerCase()

const unique = <T extends string>(values: T[]): T[] => Array.from(new Set(values))

const getSingaporeDayWindow = (date: Date): { startMs: number; endMs: number } => {
  const parts = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value || '1970')
  const month = Number(parts.find((part) => part.type === 'month')?.value || '01')
  const day = Number(parts.find((part) => part.type === 'day')?.value || '01')

  const startMs = new Date(
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+08:00`
  ).getTime()
  const endMs = new Date(
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+08:00`
  ).getTime()

  return { startMs, endMs }
}

const parseSearchQuery = (query: string): ParsedSearchQuery => {
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

  const priorityTokens: Priority[] = []
  const tagTokens: string[] = []
  const textTerms: string[] = []

  for (const token of tokens) {
    const normalizedToken = normalizeSearchText(token)

    if (normalizedToken.startsWith('priority:')) {
      const value = normalizedToken.slice('priority:'.length)
      if (value === 'high' || value === 'medium' || value === 'low') {
        priorityTokens.push(value)
        continue
      }
      textTerms.push(normalizedToken)
      continue
    }

    if (normalizedToken.startsWith('tag:')) {
      const value = normalizedToken.slice('tag:'.length).replace(/^#/, '')
      if (value) {
        tagTokens.push(value)
        continue
      }
      textTerms.push(normalizedToken)
      continue
    }

    textTerms.push(normalizedToken)
  }

  return {
    textTerms,
    priorityTokens: unique(priorityTokens),
    tagTokens: unique(tagTokens),
  }
}

const extractHashtagsFromTitle = (title: string): string[] => {
  const hashtagMatches = title.toLowerCase().match(/#[\p{L}\p{N}_-]+/gu) || []
  return unique(hashtagMatches.map((tag) => tag.replace(/^#/, '')))
}

const getTodoTagNames = (todo: Todo): string[] => {
  const runtimeTodo = todo as Todo & {
    tags?: Array<string | { name?: string | null }>
    tagNames?: string[]
  }

  const tagsFromRuntime = [
    ...(runtimeTodo.tagNames || []),
    ...((runtimeTodo.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag?.name || ''))),
  ]
    .map((tag) => normalizeSearchText(tag))
    .filter(Boolean)

  return unique([...tagsFromRuntime, ...extractHashtagsFromTitle(todo.title)])
}

export default function Home() {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formDueDate, setFormDueDate] = useState('')
  const [formReminderMinutes, setFormReminderMinutes] = useState<number | ''>('')
  const [formIsRecurring, setFormIsRecurring] = useState(false)
  const [formRecurrencePattern, setFormRecurrencePattern] = useState<RecurrencePattern>('daily')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [showTodoAdvancedFilters, setShowTodoAdvancedFilters] = useState(false)
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>(ALL_PRIORITIES)
  const [statusFilter, setStatusFilter] = useState<TodoStatusFilter>('all')
  const [dueFilter, setDueFilter] = useState<TodoDueFilter>('all')
  const [recurrenceFilter, setRecurrenceFilter] = useState<TodoRecurrenceFilter>('all')
  const [reminderFilter, setReminderFilter] = useState<TodoReminderFilter>('all')
  const [tagFilterInput, setTagFilterInput] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [togglingTodoIds, setTogglingTodoIds] = useState<number[]>([])
  const [snoozingReminderIds, setSnoozingReminderIds] = useState<number[]>([])
  const [markingReminderDoneIds, setMarkingReminderDoneIds] = useState<number[]>([])
  const [dismissingReminderIds, setDismissingReminderIds] = useState<number[]>([])
  const [dismissedReminderTodoIds, setDismissedReminderTodoIds] = useState<number[]>([])
  const [selectedSnoozeMinutes, setSelectedSnoozeMinutes] = useState<number>(30)
  const [countdownNowMs, setCountdownNowMs] = useState<number>(() => getSingaporeNow().getTime())
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('medium')
  const [editDueDate, setEditDueDate] = useState('')
  const [editReminderMinutes, setEditReminderMinutes] = useState<number | ''>('')
  const [editIsRecurring, setEditIsRecurring] = useState(false)
  const [editRecurrencePattern, setEditRecurrencePattern] = useState<RecurrencePattern>('daily')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const {
    enabled: notificationsEnabled,
    supported: notificationsSupported,
    requestPermission,
    isNotificationsEnabled,
    setIsNotificationsEnabled,
    clearPendingReminders,
    pendingReminders,
    dismissReminder,
  } = useNotifications()

  const minutesUntilDue = formDueDate
    ? Math.floor((new Date(formDueDate).getTime() - getSingaporeNow().getTime()) / 60000)
    : null
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [showTemplatesView, setShowTemplatesView] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [templateCategory, setTemplateCategory] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isUsingTemplate, setIsUsingTemplate] = useState(false)

  // Fetch todos on mount
  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  useEffect(() => {
    if (formReminderMinutes === '' || minutesUntilDue === null) return
    if (minutesUntilDue < formReminderMinutes) {
      setFormReminderMinutes('')
    }
  }, [formReminderMinutes, minutesUntilDue])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchQuery])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownNowMs(getSingaporeNow().getTime())
    }, 30000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const checkSessionAndLoad = async () => {
    try {
      const authRes = await fetch('/api/auth/me', { method: 'GET' })
      if (!authRes.ok) {
        router.replace('/login')
        return
      }
      await Promise.all([fetchTodos(), fetchTemplates()])
    } catch {
      router.replace('/login')
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Failed to fetch todos')
      const data = await res.json()
      setTodos(data.data || [])
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
    if (formIsRecurring && !formDueDate) {
      setError('Due date is required for recurring todos')
      return
    }
    if (formReminderMinutes !== '' && !formDueDate) {
      setError('Due date is required when reminder is set')
      return
    }
    if (formReminderMinutes !== '' && minutesUntilDue !== null && formReminderMinutes > minutesUntilDue) {
      setError('Reminder must be earlier than the selected due time')
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
          recurrencePattern: formIsRecurring ? formRecurrencePattern : undefined,
          reminderMinutes: formReminderMinutes === '' ? undefined : formReminderMinutes,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create todo')

      setFormTitle('')
      setFormPriority('medium')
      setFormDueDate('')
      setFormReminderMinutes('')
      setFormIsRecurring(false)
      setFormRecurrencePattern('daily')
      setError(null)
      fetchTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (todo: Todo) => {
    if (togglingTodoIds.includes(todo.id)) return

    const nextCompleted = !todo.completed
    setTogglingTodoIds((current) => [...current, todo.id])
    setTodos((currentTodos) =>
      currentTodos.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              completed: nextCompleted,
              reminderMinutes: nextCompleted ? null : item.reminderMinutes,
              snoozedUntil: nextCompleted ? null : item.snoozedUntil,
            }
          : item
      )
    )

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          nextCompleted
            ? { completed: true, reminderMinutes: null, snoozedUntil: null }
            : { completed: false }
        ),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update todo')

      if (nextCompleted) {
        dismissReminder(todo.id)
        setDismissedReminderTodoIds((current) => (current.includes(todo.id) ? current : [...current, todo.id]))
      } else {
        setDismissedReminderTodoIds((current) => current.filter((id) => id !== todo.id))
      }

      await fetchTodos()
    } catch (err) {
      setTodos((currentTodos) =>
        currentTodos.map((item) =>
          item.id === todo.id
            ? {
                ...item,
                completed: todo.completed,
                reminderMinutes: todo.reminderMinutes,
                snoozedUntil: todo.snoozedUntil,
              }
            : item
        )
      )
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setTogglingTodoIds((current) => current.filter((id) => id !== todo.id))
    }
  }

  const toDateTimeLocalValue = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const calculateDueOffsetDays = () => {
    if (!formDueDate) return null
    const dueDate = new Date(formDueDate)
    if (isNaN(dueDate.getTime())) return null
    const diffMs = dueDate.getTime() - getSingaporeNow().getTime()
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
  }

  const handleSaveTemplate = async () => {
    if (!formTitle.trim()) {
      setError('Enter a todo title before saving a template')
      return
    }

    setIsSavingTemplate(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formTitle.trim(),
          category: templateCategory.trim() || null,
          priority: formPriority,
          recurrencePattern: formIsRecurring ? formRecurrencePattern : null,
          reminderMinutes: formReminderMinutes === '' ? null : formReminderMinutes,
          dueOffsetDays: calculateDueOffsetDays(),
          subtasksJson: '[]',
          tagsJson: '[]',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save template')

      setTemplateCategory('')
      setError(null)
      await fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const selectedTemplate = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId) || null : null

  const getTemplateCategoryLabel = (template: Template) => {
    const category = template.category?.trim()
    return category && category.length > 0 ? category : 'Uncategorized'
  }

  const groupedTemplates = templates.reduce<Record<string, Template[]>>((groups, template) => {
    const category = getTemplateCategoryLabel(template)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category] = [...groups[category], template]
    return groups
  }, {})

  const sortedTemplateGroups = Object.entries(groupedTemplates).sort(([left], [right]) => left.localeCompare(right))

  const loadTemplateToForm = (template: Template) => {
    setSelectedTemplateId(template.id)
    setShowTemplatesView(false)
    setShowAdvancedOptions(true)

    setFormTitle(template.name)
    setFormPriority(template.priority)
    setFormIsRecurring(template.recurrencePattern !== null)
    setFormRecurrencePattern(template.recurrencePattern ?? 'daily')
    setFormReminderMinutes(template.reminderMinutes ?? '')

    if (template.dueOffsetDays === null) {
      setFormDueDate('')
    } else {
      const date = new Date(getSingaporeNow().getTime() + template.dueOffsetDays * 24 * 60 * 60 * 1000)
      setFormDueDate(toDateTimeLocalValue(date))
    }
    setError(null)
  }

  const handleLoadTemplateToForm = () => {
    if (!selectedTemplate) {
      setError('Select a template first')
      return
    }

    loadTemplateToForm(selectedTemplate)
  }

  const useTemplate = async (templateId: number) => {
    setSelectedTemplateId(templateId)
    setIsUsingTemplate(true)
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to use template')

      setError(null)
      await fetchTodos()
      setShowTemplatesView(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUsingTemplate(false)
    }
  }

  const handleUseTemplate = async () => {
    if (!selectedTemplateId) {
      setError('Select a template first')
      return
    }

    await useTemplate(selectedTemplateId)
  }

  const deleteTemplate = async (templateId: number) => {
    setSelectedTemplateId(templateId)

    if (!window.confirm('Delete selected template? This cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete template')

      setSelectedTemplateId((currentId) => (currentId === templateId ? null : currentId))
      setError(null)
      await fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) {
      setError('Select a template first')
      return
    }

    await deleteTemplate(selectedTemplateId)
  }

  const renameTemplate = async (template: Template) => {
    setSelectedTemplateId(template.id)

    const newName = window.prompt('New template name', template.name)
    if (newName === null) return

    if (!newName.trim()) {
      setError('Template name cannot be empty')
      return
    }

    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rename template')

      setError(null)
      await fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleRenameTemplate = async () => {
    if (!selectedTemplateId || !selectedTemplate) {
      setError('Select a template first')
      return
    }

    await renameTemplate(selectedTemplate)
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

  const openEditTodo = (todo: Todo) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditPriority(todo.priority)
    setEditDueDate(todo.dueDate ? toDateTimeLocalValue(parseTodoDate(todo.dueDate)) : '')
    setEditReminderMinutes(todo.reminderMinutes ?? '')
    setEditIsRecurring(todo.recurrencePattern !== null)
    setEditRecurrencePattern(todo.recurrencePattern ?? 'daily')
    setEditError(null)
    setError(null)
  }

  const closeEditTodo = () => {
    setEditingId(null)
    setEditTitle('')
    setEditPriority('medium')
    setEditDueDate('')
    setEditReminderMinutes('')
    setEditIsRecurring(false)
    setEditRecurrencePattern('daily')
    setEditError(null)
    setIsSavingEdit(false)
  }

  const handleSaveEditTodo = async () => {
    if (editingId === null) return

    const currentTodo = todos.find((todo) => todo.id === editingId)
    if (!currentTodo) {
      setEditError('Todo not found')
      return
    }

    const nextTitle = editTitle.trim()
    if (!nextTitle) {
      setEditError('Please enter a title')
      return
    }

    if (editIsRecurring && !editDueDate) {
      setEditError('Due date is required for recurring todos')
      return
    }

    if (editReminderMinutes !== '' && !editDueDate) {
      setEditError('Due date is required when reminder is set')
      return
    }

    if (editReminderMinutes !== '' && editDueDate) {
      const minutesUntilDue = Math.floor((new Date(editDueDate).getTime() - getSingaporeNow().getTime()) / 60000)
      if (editReminderMinutes > minutesUntilDue) {
        setEditError('Reminder must be earlier than the selected due time')
        return
      }
    }

    const nextDueDate = editDueDate || null
    const nextRecurrencePattern = editIsRecurring ? editRecurrencePattern : null
    const nextReminderMinutes = editReminderMinutes === '' ? null : editReminderMinutes

    const payload: UpdateTodoInput = {}
    if (nextTitle !== currentTodo.title) payload.title = nextTitle
    if (editPriority !== currentTodo.priority) payload.priority = editPriority
    if (nextDueDate !== (currentTodo.dueDate ?? null)) payload.dueDate = nextDueDate
    if (nextRecurrencePattern !== (currentTodo.recurrencePattern ?? null)) payload.recurrencePattern = nextRecurrencePattern
    if (nextReminderMinutes !== (currentTodo.reminderMinutes ?? null)) payload.reminderMinutes = nextReminderMinutes

    if (Object.keys(payload).length === 0) {
      closeEditTodo()
      return
    }

    setIsSavingEdit(true)
  setEditError(null)
    try {
      const res = await fetch(`/api/todos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update todo')

      closeEditTodo()
      setError(null)
      await fetchTodos()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'An error occurred')
      setIsSavingEdit(false)
    }
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
    return parseTodoDate(todo.dueDate).getTime() < getSingaporeNow().getTime()
  }

  const getReminderLabel = (minutes: number | null) => {
    const map: Record<number, string> = {
      15: '15m',
      30: '30m',
      60: '1h',
      120: '2h',
      1440: '1d',
      2880: '2d',
      10080: '1w',
    }
    if (minutes === null) return ''
    return map[minutes] || `${minutes}m`
  }

  const handleToggleNotifications = async () => {
    if (!notificationsSupported) {
      setError('Notifications are not supported in this browser.')
      return
    }

    if (isNotificationsEnabled) {
      setIsNotificationsEnabled(false)
      clearPendingReminders()
      setError(null)
      return
    }

    const granted = await requestPermission()
    if (!granted) {
      setError('Notifications were not enabled. Please allow browser notification permission.')
      return
    }

    setIsNotificationsEnabled(true)
    setError(null)
  }

  const handleSnoozeReminder = async (todoId: number, minutes: number) => {
    if (snoozingReminderIds.includes(todoId)) return

    setSnoozingReminderIds((current) => [...current, todoId])
    try {
      const res = await fetch('/api/notifications/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoId, minutes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to snooze reminder')

      const snoozedUntil = typeof data?.data?.snoozedUntil === 'string' ? data.data.snoozedUntil : null
      if (snoozedUntil) {
        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  snoozedUntil,
                }
              : todo
          )
        )
      }

      dismissReminder(todoId)
      setDismissedReminderTodoIds((current) => current.filter((id) => id !== todoId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSnoozingReminderIds((current) => current.filter((id) => id !== todoId))
    }
  }

  const handleDismissAlarm = (todoId: number) => {
    if (dismissingReminderIds.includes(todoId)) return

    setDismissingReminderIds((current) => [...current, todoId])
    void (async () => {
      try {
        const res = await fetch(`/api/todos/${todoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminderMinutes: null, snoozedUntil: null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to dismiss reminder')

        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  reminderMinutes: null,
                  snoozedUntil: null,
                }
              : todo
          )
        )
        dismissReminder(todoId)
        setDismissedReminderTodoIds((current) => (current.includes(todoId) ? current : [...current, todoId]))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setDismissingReminderIds((current) => current.filter((id) => id !== todoId))
      }
    })()
  }

  const handleMarkDoneFromReminder = async (todoId: number) => {
    if (markingReminderDoneIds.includes(todoId)) return

    setMarkingReminderDoneIds((current) => [...current, todoId])
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, reminderMinutes: null, snoozedUntil: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to mark todo as done')

      dismissReminder(todoId)
      setDismissedReminderTodoIds((current) => current.filter((id) => id !== todoId))
      setError(null)
      await fetchTodos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setMarkingReminderDoneIds((current) => current.filter((id) => id !== todoId))
    }
  }

  const parseTodoDate = (raw: string): Date => {
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(raw)
    if (!hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
      return new Date(`${raw}+08:00`)
    }
    return new Date(raw)
  }

  const getNextAlarmAtMs = (todo: Todo): number | null => {
    if (todo.completed || !todo.dueDate || todo.reminderMinutes === null) return null

    const dueDateMs = parseTodoDate(todo.dueDate).getTime()
    if (isNaN(dueDateMs)) return null

    let nextAlarmAtMs = dueDateMs - todo.reminderMinutes * 60 * 1000
    if (todo.snoozedUntil) {
      const snoozedUntilMs = new Date(todo.snoozedUntil).getTime()
      if (!isNaN(snoozedUntilMs) && snoozedUntilMs > nextAlarmAtMs) {
        nextAlarmAtMs = snoozedUntilMs
      }
    }

    return nextAlarmAtMs
  }

  const formatAlarmCountdown = (remainingMs: number): string => {
    if (remainingMs <= 0) return 'now'

    const totalMinutes = Math.ceil(remainingMs / 60000)
    if (totalMinutes < 60) return `in ${totalMinutes}m`

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours < 24) {
      if (minutes === 0) return `in ${hours}h`
      return `in ${hours}h ${minutes}m`
    }

    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `in ${days}d`
    return `in ${days}d ${remainingHours}h`
  }

  const formatElapsedDuration = (elapsedMs: number): string => {
    const totalMinutes = Math.max(1, Math.floor(elapsedMs / 60000))
    if (totalMinutes < 60) return `${totalMinutes}m`

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours < 24) {
      if (minutes === 0) return `${hours}h`
      return `${hours}h ${minutes}m`
    }

    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days}d`
    return `${days}d ${remainingHours}h`
  }

  const getOverdueLabel = (todo: Todo): string | null => {
    if (todo.completed || !todo.dueDate) return null
    const dueDateMs = parseTodoDate(todo.dueDate).getTime()
    if (isNaN(dueDateMs)) return null

    const overdueMs = countdownNowMs - dueDateMs
    if (overdueMs <= 0) return null

    return `Overdue by ${formatElapsedDuration(overdueMs)}`
  }

  const parsedSearchQuery = useMemo(() => parseSearchQuery(debouncedSearchQuery), [debouncedSearchQuery])

  const manualTagTerms = useMemo(
    () =>
      unique(
        tagFilterInput
          .split(',')
          .map((value) => normalizeSearchText(value).replace(/^#/, ''))
          .filter(Boolean)
      ),
    [tagFilterInput]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (debouncedSearchQuery.trim()) count += 1
    if (selectedPriorities.length !== ALL_PRIORITIES.length) count += 1
    if (statusFilter !== 'all') count += 1
    if (dueFilter !== 'all') count += 1
    if (recurrenceFilter !== 'all') count += 1
    if (reminderFilter !== 'all') count += 1
    if (manualTagTerms.length > 0) count += 1
    return count
  }, [debouncedSearchQuery, selectedPriorities, statusFilter, dueFilter, recurrenceFilter, reminderFilter, manualTagTerms])

  const togglePrioritySelection = (priority: Priority) => {
    setSelectedPriorities((current) => {
      if (current.includes(priority)) {
        const next = current.filter((value) => value !== priority)
        return next.length === 0 ? ALL_PRIORITIES : next
      }
      return [...current, priority]
    })
  }

  const clearAllTodoFilters = () => {
    setSearchQuery('')
    setDebouncedSearchQuery('')
    setSelectedPriorities(ALL_PRIORITIES)
    setStatusFilter('all')
    setDueFilter('all')
    setRecurrenceFilter('all')
    setReminderFilter('all')
    setTagFilterInput('')
  }

  const filteredTodos = useMemo(() => {
    const now = getSingaporeNow()
    const nowMs = now.getTime()
    const singaporeToday = getSingaporeDayWindow(now)
    const nextSevenDaysMs = nowMs + 7 * 24 * 60 * 60 * 1000

    const allTagTerms = unique([...manualTagTerms, ...parsedSearchQuery.tagTokens])

    return todos.filter((todo) => {
      const todoTitle = normalizeSearchText(todo.title)
      const todoTagNames = getTodoTagNames(todo)

      const matchesText = parsedSearchQuery.textTerms.every(
        (term) => todoTitle.includes(term) || todoTagNames.some((tag) => tag.includes(term))
      )

      const matchesPrioritySelection = selectedPriorities.includes(todo.priority)
      const matchesPriorityToken =
        parsedSearchQuery.priorityTokens.length === 0 || parsedSearchQuery.priorityTokens.includes(todo.priority)

      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? !todo.completed : todo.completed)

      const hasReminder = todo.reminderMinutes !== null
      const matchesReminder =
        reminderFilter === 'all' || (reminderFilter === 'withReminder' ? hasReminder : !hasReminder)

      const isRecurringTodo = Boolean(todo.recurrencePattern)
      const matchesRecurrence =
        recurrenceFilter === 'all' || (recurrenceFilter === 'recurring' ? isRecurringTodo : !isRecurringTodo)

      const parsedDueDate = todo.dueDate ? parseTodoDate(todo.dueDate) : null
      const dueDateMs = parsedDueDate?.getTime() ?? NaN

      let matchesDueFilter = true
      if (dueFilter === 'noDueDate') {
        matchesDueFilter = !todo.dueDate
      } else if (dueFilter === 'overdue') {
        matchesDueFilter = !todo.completed && Boolean(todo.dueDate) && !isNaN(dueDateMs) && dueDateMs < nowMs
      } else if (dueFilter === 'today') {
        matchesDueFilter =
          Boolean(todo.dueDate) && !isNaN(dueDateMs) && dueDateMs >= singaporeToday.startMs && dueDateMs <= singaporeToday.endMs
      } else if (dueFilter === 'next7days') {
        matchesDueFilter =
          Boolean(todo.dueDate) && !isNaN(dueDateMs) && dueDateMs >= nowMs && dueDateMs <= nextSevenDaysMs
      }

      const matchesTagTerms =
        allTagTerms.length === 0 || allTagTerms.every((term) => todoTagNames.some((tag) => tag.includes(term)))

      return (
        matchesText &&
        matchesPrioritySelection &&
        matchesPriorityToken &&
        matchesStatus &&
        matchesReminder &&
        matchesRecurrence &&
        matchesDueFilter &&
        matchesTagTerms
      )
    })
  }, [todos, parsedSearchQuery, selectedPriorities, statusFilter, dueFilter, recurrenceFilter, reminderFilter, manualTagTerms])

  const activeTodos = useMemo(
    () => filteredTodos.filter((todo) => !todo.completed).sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority)),
    [filteredTodos]
  )
  const completedTodos = useMemo(() => filteredTodos.filter((todo) => todo.completed), [filteredTodos])

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
            <button
              onClick={() => setShowTemplatesView((prev) => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🎁 Templates
            </button>
            <button
              onClick={handleToggleNotifications}
              disabled={!notificationsSupported}
              aria-label={isNotificationsEnabled ? 'Turn notifications off' : 'Turn notifications on'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isNotificationsEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              } ${!notificationsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isNotificationsEnabled ? '🔔' : '🔕'}
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
                data-testid="create-todo-title-input"
                className="w-full px-4 py-3 bg-slate-700/50 border border-blue-500/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isSubmitting}
              />
            </div>

            {/* Priority, Due Date, Reminder, Recurrence, and Add */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as Priority)}
                  data-testid="create-todo-priority-select"
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

              <div>
                <select
                  value={formReminderMinutes}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormReminderMinutes(value === '' ? '' : Number(value))
                  }}
                  disabled={!formDueDate || isSubmitting}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white disabled:text-slate-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">No reminder</option>
                  {REMINDER_OPTIONS.map((option) => {
                    const optionDisabled = minutesUntilDue !== null && option.value > minutesUntilDue
                    return (
                      <option key={option.value} value={option.value} disabled={optionDisabled}>
                        {option.label}
                        {optionDisabled ? ' (too late)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg">
                <input
                  id="recurring-toggle"
                  type="checkbox"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="recurring-toggle" className="text-sm text-white">
                  Repeat
                </label>
              </div>

              <div>
                <select
                  value={formRecurrencePattern}
                  onChange={(e) => setFormRecurrencePattern(e.target.value as RecurrencePattern)}
                  disabled={!formIsRecurring || isSubmitting}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white disabled:text-slate-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="create-todo-submit"
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
            {/* Advanced Options */}
            <button
              type="button"
              onClick={() => setShowAdvancedOptions((prev) => !prev)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {showAdvancedOptions ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
            </button>

            {showAdvancedOptions && (
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Template category (optional)"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSavingTemplate}
                  />
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {isSavingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                  <div className="text-xs text-slate-400 flex items-center">
                    Saves current title, priority, due date offset, reminder, and repeat settings.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={selectedTemplateId ?? ''}
                    onChange={(e) => setSelectedTemplateId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select template to load/use</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.priority})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleLoadTemplateToForm}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Load Into Form
                  </button>
                  <button
                    type="button"
                    onClick={handleUseTemplate}
                    disabled={isUsingTemplate}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {isUsingTemplate ? 'Creating...' : 'Use Template Now'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRenameTemplate}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Rename Selected
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Delete Selected
                  </button>
                  {selectedTemplate && (
                    <span className="text-xs text-slate-300 flex items-center">
                      Offset: {selectedTemplate.dueOffsetDays === null ? 'No due date' : `${selectedTemplate.dueOffsetDays} day(s)`}
                    </span>
                  )}
                </div>
              </div>
            )}
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
                  placeholder="Search todos (try priority:high or tag:work)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="todo-search-input"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">Token search: priority:high, priority:medium, priority:low, tag:work</p>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TodoStatusFilter)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTodoAdvancedFilters((prev) => !prev)}
              data-testid="todo-advanced-filters-toggle"
              className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              {showTodoAdvancedFilters ? '▼' : '▶'} Advanced Filters
            </button>

            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
              </span>
            )}

            <button
              type="button"
              onClick={clearAllTodoFilters}
              data-testid="todo-filters-clear-all"
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Clear all
            </button>
          </div>

          {showTodoAdvancedFilters && (
            <div className="mt-4 bg-slate-700/20 border border-slate-600/40 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-300 mb-2">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_PRIORITIES.map((priority) => {
                    const isActive = selectedPriorities.includes(priority)
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => togglePrioritySelection(priority)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                          isActive
                            ? 'bg-blue-600/30 text-blue-200 border-blue-500/50'
                            : 'bg-slate-700/40 text-slate-400 border-slate-600/50 hover:text-slate-200'
                        }`}
                      >
                        {priority.toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-300 mb-1">Due Date</label>
                  <select
                    value={dueFilter}
                    onChange={(e) => setDueFilter(e.target.value as TodoDueFilter)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Any due date</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due today</option>
                    <option value="next7days">Due in next 7 days</option>
                    <option value="noDueDate">No due date</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-300 mb-1">Recurrence</label>
                  <select
                    value={recurrenceFilter}
                    onChange={(e) => setRecurrenceFilter(e.target.value as TodoRecurrenceFilter)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Any recurrence</option>
                    <option value="recurring">Recurring only</option>
                    <option value="nonRecurring">Non-recurring only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-300 mb-1">Reminder</label>
                  <select
                    value={reminderFilter}
                    onChange={(e) => setReminderFilter(e.target.value as TodoReminderFilter)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Any reminder</option>
                    <option value="withReminder">With reminder</option>
                    <option value="withoutReminder">Without reminder</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wide text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagFilterInput}
                  onChange={(e) => setTagFilterInput(e.target.value)}
                  placeholder="work, urgent"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">Tag matching currently uses todo tags when present, otherwise falls back to hashtags in the title.</p>
              </div>
            </div>
          )}
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
                const overdueLabel = getOverdueLabel(todo)
                return (
                <div
                  key={todo.id}
                  className={`bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4 transition-colors ${getPriorityBgColor(todo.priority)} ${
                    isOverdue(todo) ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggle(todo)}
                    disabled={togglingTodoIds.includes(todo.id)}
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
                    {overdueLabel && (
                      <p className="text-xs mt-1 text-red-300 font-semibold">
                        ⚠ {overdueLabel}
                      </p>
                    )}
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityColor(todo.priority)}`}>
                    {todo.priority.toUpperCase()}
                  </div>

                  {todo.recurrencePattern && (
                    <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      🔄 {todo.recurrencePattern}
                    </div>
                  )}

                  {todo.reminderMinutes !== null && (
                    (() => {
                      const nextAlarmAtMs = getNextAlarmAtMs(todo)
                      const shouldHideAlarm = dismissedReminderTodoIds.includes(todo.id)
                      if (nextAlarmAtMs === null || shouldHideAlarm) return null

                      return (
                        <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          🔔 {formatAlarmCountdown(nextAlarmAtMs - countdownNowMs)}
                        </div>
                      )
                    })()
                  )}

                  <button
                    onClick={() => openEditTodo(todo)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-600 hover:bg-slate-500 text-white transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => setDeleteConfirm(todo.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )})}
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
                    disabled={togglingTodoIds.includes(todo.id)}
                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-through text-slate-500">
                      {todo.title}
                    </p>
                    {todo.recurrencePattern && (
                      <p className="text-xs mt-1 text-purple-300">
                        🔄 {todo.recurrencePattern}
                      </p>
                    )}
                    {todo.reminderMinutes !== null && (
                      <p className="text-xs mt-1 text-orange-300">
                        🔔 {getReminderLabel(todo.reminderMinutes)}
                      </p>
                    )}
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

        {!loading && todos.length > 0 && filteredTodos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-300 text-lg">No results match your current search and filters.</p>
            <button
              type="button"
              onClick={clearAllTodoFilters}
              className="mt-3 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
            >
              Clear search and filters
            </button>
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

      {/* Edit Todo Modal */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Todo</h3>
            <div className="space-y-4">
              {editError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-3 py-2 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Todo title"
                disabled={isSavingEdit}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSavingEdit}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>

                <input
                  type="datetime-local"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSavingEdit}
                />

                <select
                  value={editReminderMinutes}
                  onChange={(e) => {
                    const value = e.target.value
                    setEditReminderMinutes(value === '' ? '' : Number(value))
                  }}
                  disabled={isSavingEdit || !editDueDate}
                  className="px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white disabled:text-slate-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No reminder</option>
                  {REMINDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-lg">
                  <input
                    id="edit-recurring-toggle"
                    type="checkbox"
                    checked={editIsRecurring}
                    onChange={(e) => setEditIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded"
                    disabled={isSavingEdit}
                  />
                  <label htmlFor="edit-recurring-toggle" className="text-sm text-white">Repeat</label>
                </div>

                <select
                  value={editRecurrencePattern}
                  onChange={(e) => setEditRecurrencePattern(e.target.value as RecurrencePattern)}
                  disabled={isSavingEdit || !editIsRecurring}
                  className="px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white disabled:text-slate-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeEditTodo}
                  disabled={isSavingEdit}
                  className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditTodo}
                  disabled={isSavingEdit}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app Reminder Popup */}
      {isNotificationsEnabled && notificationsEnabled && pendingReminders.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
          <div className="bg-slate-800 border border-orange-400/50 rounded-xl shadow-2xl p-4">
            <p className="text-orange-300 font-semibold mb-1">Reminder</p>
            <p className="text-white text-sm mb-4">{pendingReminders[0].title}</p>
            <div className="mb-3">
              <label className="block text-xs text-slate-300 mb-1">Snooze for</label>
              <select
                value={selectedSnoozeMinutes}
                onChange={(e) => setSelectedSnoozeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleMarkDoneFromReminder(pendingReminders[0].id)}
                disabled={markingReminderDoneIds.includes(pendingReminders[0].id)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900/60 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition"
              >
                {markingReminderDoneIds.includes(pendingReminders[0].id) ? 'Marking...' : 'Mark Done'}
              </button>
              <button
                onClick={() => handleSnoozeReminder(pendingReminders[0].id, selectedSnoozeMinutes)}
                disabled={snoozingReminderIds.includes(pendingReminders[0].id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/60 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition"
              >
                {snoozingReminderIds.includes(pendingReminders[0].id)
                  ? 'Snoozing...'
                  : `Snooze ${getReminderLabel(selectedSnoozeMinutes)}`}
              </button>
              <button
                onClick={() => handleDismissAlarm(pendingReminders[0].id)}
                disabled={dismissingReminderIds.includes(pendingReminders[0].id)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-900/60 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition"
              >
                {dismissingReminderIds.includes(pendingReminders[0].id) ? 'Dismissing...' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplatesView && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTemplatesView(false)}
        >
          <div
            data-testid="templates-view"
            className="w-full max-w-5xl max-h-[85vh] overflow-y-auto bg-slate-800/95 border border-slate-700 shadow-2xl rounded-2xl p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-white">Templates Library</h3>
                <p className="text-sm text-slate-400 mt-1">Browse saved templates grouped by category.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesView(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>

            {sortedTemplateGroups.length === 0 ? (
              <div className="border border-dashed border-slate-600 rounded-xl p-8 text-center text-slate-400">
                No templates saved yet. Use Save Template under Advanced Options to add one.
              </div>
            ) : (
              <div className="space-y-6">
                {sortedTemplateGroups.map(([category, categoryTemplates]) => (
                  <section key={category} className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">{category}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {categoryTemplates.map((template) => (
                        <div
                          key={template.id}
                          data-testid="template-card"
                          className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-white font-semibold">{template.name}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {template.dueOffsetDays === null ? 'No due date' : `Due in ${template.dueOffsetDays} day(s)`}
                              </p>
                              {template.recurrencePattern && (
                                <p className="text-xs text-purple-300 mt-1">🔄 {template.recurrencePattern}</p>
                              )}
                              {template.reminderMinutes !== null && (
                                <p className="text-xs text-orange-300 mt-1">🔔 {getReminderLabel(template.reminderMinutes)}</p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityColor(template.priority)}`}>
                              {template.priority.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => loadTemplateToForm(template)}
                              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={() => useTemplate(template.id)}
                              disabled={isUsingTemplate}
                              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => renameTemplate(template)}
                              className="bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTemplate(template.id)}
                              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
