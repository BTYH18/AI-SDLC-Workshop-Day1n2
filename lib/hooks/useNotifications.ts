'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

interface NotificationTodo {
  id: number
  title: string
}

const POLL_INTERVAL_MS = 30_000
const NOTIFICATIONS_ENABLED_STORAGE_KEY = 'todo.notifications.enabled'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)
  const [pendingReminders, setPendingReminders] = useState<NotificationTodo[]>([])
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true)

  useEffect(() => {
    const canNotify = typeof window !== 'undefined' && 'Notification' in window
    setSupported(canNotify)
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY)
      if (stored === 'false') {
        setIsNotificationsEnabled(false)
      }
    }
    if (canNotify) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      NOTIFICATIONS_ENABLED_STORAGE_KEY,
      isNotificationsEnabled ? 'true' : 'false'
    )
  }, [isNotificationsEnabled])

  const enabled = useMemo(
    () => supported && permission === 'granted' && isNotificationsEnabled,
    [isNotificationsEnabled, permission, supported]
  )

  const requestPermission = useCallback(async () => {
    if (!supported) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [supported])

  const showNotification = useCallback((todo: NotificationTodo) => {
    if (!enabled) return
    new Notification('Todo Reminder', {
      body: todo.title,
      tag: `todo-reminder-${todo.id}`,
    })
  }, [enabled])

  const enqueueInAppReminder = useCallback((todo: NotificationTodo) => {
    setPendingReminders((current) => {
      if (current.some((item) => item.id === todo.id)) {
        return current
      }
      return [...current, todo]
    })
  }, [])

  const dismissReminder = useCallback((id: number) => {
    setPendingReminders((current) => current.filter((todo) => todo.id !== id))
  }, [])

  const clearPendingReminders = useCallback(() => {
    setPendingReminders([])
  }, [])

  const checkNotifications = useCallback(async () => {
    if (!isNotificationsEnabled) return

    const res = await fetch('/api/notifications/check')
    if (!res.ok) return

    const body = await res.json()
    const todos = (body?.data || []) as NotificationTodo[]

    todos.forEach((todo) => {
      enqueueInAppReminder(todo)
      showNotification(todo)
    })
  }, [enqueueInAppReminder, isNotificationsEnabled, showNotification])

  useEffect(() => {
    if (!isNotificationsEnabled) {
      clearPendingReminders()
      return
    }

    void checkNotifications()
    const timer = window.setInterval(() => {
      void checkNotifications()
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [checkNotifications, clearPendingReminders, isNotificationsEnabled])

  return {
    enabled,
    supported,
    permission,
    requestPermission,
    isNotificationsEnabled,
    setIsNotificationsEnabled,
    pendingReminders,
    dismissReminder,
    clearPendingReminders,
  }
}
