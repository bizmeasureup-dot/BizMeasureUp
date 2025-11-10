import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TaskHistory, User } from '@/types'

export function useTaskHistory(taskId: string | null) {
  const [history, setHistory] = useState<TaskHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) {
      setLoading(false)
      return
    }

    fetchHistory()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('task-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ask_history',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchHistory()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  const fetchHistory = async () => {
    if (!taskId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('ask_history')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Fetch user information for changed_by
      const userIds = new Set<string>()
      data?.forEach((item: any) => {
        if (item.changed_by) userIds.add(item.changed_by)
      })

      const usersMap = new Map<string, User>()
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .in('id', Array.from(userIds))

        users?.forEach((user: any) => {
          usersMap.set(user.id, user)
        })
      }

      // Transform the data
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        changed_by_user: usersMap.get(item.changed_by) || null,
      }))

      setHistory(transformedData)
    } catch (err: any) {
      console.error('Error fetching task history:', err)
      setError(err.message || 'Failed to fetch task history')
    } finally {
      setLoading(false)
    }
  }

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  }
}


