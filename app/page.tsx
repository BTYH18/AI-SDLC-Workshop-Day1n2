'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Todo, Priority, RecurrencePattern, Template } from '@/lib/types'
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
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [togglingTodoIds, setTogglingTodoIds] = useState<number[]>([])
  const [snoozingReminderIds, setSnoozingReminderIds] = useState<number[]>([])
  const [dismissedReminderTodoIds, setDismissedReminderTodoIds] = useState<number[]>([])
  const [selectedSnoozeMinutes, setSelectedSnoozeMinutes] = useState<number>(30)
  const [countdownNowMs, setCountdownNowMs] = useState<number>(() => getSingaporeNow().getTime())
  const {
    enabled: notificationsEnabled,
    supported: notificationsSupported,
    requestPermission,
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
  const [showCalendarView, setShowCalendarView] = useState(false)
  const [holidays, setHolidays] = useState<Array<{ id: number; date: string; name: string }>>([
    // Singapore public holidays seeded as fallback (will be overridden by API)
    // 2024
    { id: 1,  date: '2024-01-01', name: "New Year's Day" },
    { id: 2,  date: '2024-02-10', name: 'Chinese New Year' },
    { id: 3,  date: '2024-02-11', name: 'Second Day of Chinese New Year' },
    { id: 4,  date: '2024-02-12', name: 'Chinese New Year (Day off)' },
    { id: 5,  date: '2024-03-29', name: 'Good Friday' },
    { id: 6,  date: '2024-04-10', name: 'Hari Raya Puasa' },
    { id: 7,  date: '2024-05-01', name: 'Labour Day' },
    { id: 8,  date: '2024-05-22', name: 'Vesak Day' },
    { id: 9,  date: '2024-06-17', name: 'Hari Raya Haji' },
    { id: 10, date: '2024-08-09', name: 'National Day' },
    { id: 11, date: '2024-10-31', name: 'Deepavali' },
    { id: 12, date: '2024-12-25', name: 'Christmas Day' },
    // 2025
    { id: 13, date: '2025-01-01', name: "New Year's Day" },
    { id: 14, date: '2025-01-29', name: 'Chinese New Year' },
    { id: 15, date: '2025-01-30', name: 'Second Day of Chinese New Year' },
    { id: 16, date: '2025-03-31', name: 'Hari Raya Puasa' },
    { id: 17, date: '2025-04-18', name: 'Good Friday' },
    { id: 18, date: '2025-05-01', name: 'Labour Day' },
    { id: 19, date: '2025-05-12', name: 'Vesak Day' },
    { id: 20, date: '2025-06-07', name: 'Hari Raya Haji' },
    { id: 21, date: '2025-08-09', name: 'National Day' },
    { id: 22, date: '2025-10-20', name: 'Deepavali' },
    { id: 23, date: '2025-12-25', name: 'Christmas Day' },
    // 2026
    { id: 24, date: '2026-01-01', name: "New Year's Day" },
    { id: 25, date: '2026-02-17', name: 'Chinese New Year' },
    { id: 26, date: '2026-02-18', name: 'Second Day of Chinese New Year' },
    { id: 27, date: '2026-03-21', name: 'Hari Raya Puasa' },
    { id: 28, date: '2026-04-03', name: 'Good Friday' },
    { id: 29, date: '2026-05-01', name: 'Labour Day' },
    { id: 30, date: '2026-05-27', name: 'Hari Raya Haji' },
    { id: 31, date: '2026-05-31', name: 'Vesak Day' },
    { id: 32, date: '2026-06-01', name: 'Vesak Day (Day off)' },
    { id: 33, date: '2026-08-09', name: 'National Day' },
    { id: 34, date: '2026-08-10', name: 'National Day (Day off)' },
    { id: 35, date: '2026-11-08', name: 'Deepavali' },
    { id: 36, date: '2026-11-09', name: 'Deepavali (Day off)' },
    { id: 37, date: '2026-12-25', name: 'Christmas Day' },
  ])
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => getSingaporeNow())

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
      await Promise.all([fetchTodos(), fetchTemplates(), fetchHolidays()])
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

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/holidays')
      if (!res.ok) return
      const data = await res.json()
      if (data.data?.length) {
        setHolidays(data.data)
      }
    } catch {
      // Keep using fallback holidays already in state
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
            }
          : item
      )
    )

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
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

  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    if (!granted) {
      setError('Notifications were not enabled. Please allow browser notification permission.')
    }
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
    dismissReminder(todoId)
    setDismissedReminderTodoIds((current) => (current.includes(todoId) ? current : [...current, todoId]))
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

  // Calendar helper functions
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getTodosForDate = (dateStr: string): Todo[] => {
    return todos.filter((todo) => {
      if (!todo.dueDate) return false
      const todoDueDate = parseTodoDate(todo.dueDate).toISOString().split('T')[0]
      return todoDueDate === dateStr
    })
  }

  const getHolidayForDate = (dateStr: string): string | null => {
    const holiday = holidays.find((h) => h.date === dateStr)
    return holiday ? holiday.name : null
  }

  const previousMonth = () => {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    setCurrentCalendarDate(getSingaporeNow())
  }

  // Filter todos based on search and priority
  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase())
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
            <button
              onClick={() => setShowCalendarView((prev) => !prev)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setShowTemplatesView((prev) => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🎁 Templates
            </button>
            <button
              onClick={handleEnableNotifications}
              disabled={!notificationsSupported || notificationsEnabled}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                notificationsEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              } ${!notificationsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
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

            {/* Priority, Due Date, Reminder, Recurrence, and Add */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

      {/* In-app Reminder Popup */}
      {pendingReminders.length > 0 && (
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
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-3 rounded-lg transition"
              >
                Dismiss
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

      {showCalendarView && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCalendarView(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-800/95 border border-slate-700 shadow-2xl rounded-2xl p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-semibold text-white">Monthly Calendar</h3>
                <p className="text-sm text-slate-400 mt-1">View your todos across the month.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarView(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                type="button"
                onClick={previousMonth}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ← Previous
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">
                  {currentCalendarDate.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Today Button */}
            <div className="flex justify-center mb-6">
              <button
                type="button"
                onClick={goToToday}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Today
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-900/50 rounded-xl p-4 overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-full">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center font-bold text-slate-300 text-sm">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: getFirstDayOfMonth(currentCalendarDate) }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="p-2 min-h-24 bg-slate-900/30 rounded-lg" />
                ))}

                {/* Calendar cells */}
                {Array.from({ length: getDaysInMonth(currentCalendarDate) }).map((_, idx) => {
                  const day = idx + 1
                  const dateStr = getDateString(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day)
                  const dayTodos = getTodosForDate(dateStr)
                  const holiday = getHolidayForDate(dateStr)
                  const isToday =
                    day === getSingaporeNow().getDate() &&
                    currentCalendarDate.getMonth() === getSingaporeNow().getMonth() &&
                    currentCalendarDate.getFullYear() === getSingaporeNow().getFullYear()

                  return (
                    <div
                      key={day}
                      className={`p-2 min-h-24 rounded-lg border-2 transition-colors font-medium ${
                        holiday
                          ? 'bg-emerald-500/40 border-emerald-500 text-emerald-50'
                          : isToday
                          ? 'bg-blue-900/40 border-blue-500'
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className={`text-sm font-bold mb-1 ${holiday ? 'text-emerald-100' : 'text-white'}`}>{day}</div>

                        {/* Holiday badge and name */}
                        {holiday && (
                          <div className="bg-emerald-600/60 text-emerald-50 px-2 py-1 rounded text-xs font-semibold mb-1 truncate">
                            🏛️ {holiday}
                          </div>
                        )}

                        {/* Today indicator */}
                        {isToday && !holiday && <div className="text-xs text-blue-200 font-semibold mb-1">📍 Today</div>}

                        {/* Todo badges */}
                        <div className="flex flex-wrap gap-1">
                          {dayTodos.map((todo) => (
                            <div
                              key={todo.id}
                              className={`text-xs px-2 py-1 rounded font-medium truncate ${getPriorityColor(todo.priority)}`}
                              title={todo.title}
                            >
                              {todo.priority === 'high' ? '●' : todo.priority === 'medium' ? '◐' : '○'} {todo.title.substring(0, 8)}
                            </div>
                          ))}
                        </div>

                        {/* Todo count indicator */}
                        {dayTodos.length > 2 && (
                          <div className={`text-xs mt-auto pt-1 ${holiday ? 'text-emerald-200' : 'text-slate-400'}`}>+{dayTodos.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Holidays for this month */}
            {holidays.length > 0 && (
              <div className="mt-6 bg-slate-700/50 border border-emerald-500/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-emerald-300 mb-3">🏛️ Holidays This Month</h4>
                {holidays.filter(h => h.date.startsWith(currentCalendarDate.getFullYear() + '-' + String(currentCalendarDate.getMonth() + 1).padStart(2, '0'))).length > 0 ? (
                  <div className="space-y-2">
                    {holidays.filter(h => h.date.startsWith(currentCalendarDate.getFullYear() + '-' + String(currentCalendarDate.getMonth() + 1).padStart(2, '0'))).map(h => (
                      <div key={h.date} className="flex items-center justify-between bg-emerald-900/40 border border-emerald-600/50 rounded px-3 py-2 text-sm">
                        <span className="text-emerald-100 font-medium">{h.name}</span>
                        <span className="text-emerald-300 text-xs">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No holidays this month</p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/30 border border-red-500/50 rounded" />
                <span className="text-slate-300">High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500/30 border border-yellow-500/50 rounded" />
                <span className="text-slate-300">Medium Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500/30 border border-blue-500/50 rounded" />
                <span className="text-slate-300">Low Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/40 border border-emerald-500 rounded" />
                <span className="text-slate-300">🏛️ Holiday</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

