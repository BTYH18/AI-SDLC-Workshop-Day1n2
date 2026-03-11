'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

interface NotificationTodo {
  id: number
  title: string
}

const POLL_INTERVAL_MS = 30_000

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const canNotify = typeof window !== 'undefined' && 'Notification' in window
    setSupported(canNotify)
    if (canNotify) {
      setPermission(Notification.permission)
    }
  }, [])

  const enabled = useMemo(() => supported && permission === 'granted', [permission, supported])

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

  const checkNotifications = useCallback(async () => {
    if (!enabled) return

    const res = await fetch('/api/notifications/check')
    if (!res.ok) return

    const body = await res.json()
    const todos = (body?.data || []) as NotificationTodo[]

    todos.forEach((todo) => {
      showNotification(todo)
    })
  }, [enabled, showNotification])

  useEffect(() => {
    if (!enabled) return

    void checkNotifications()
    const timer = window.setInterval(() => {
      void checkNotifications()
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [enabled, checkNotifications])

  return {
    enabled,
    supported,
    permission,
    requestPermission,
  }
}
