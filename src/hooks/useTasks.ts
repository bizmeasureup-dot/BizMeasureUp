import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Task } from '@/types'

export function useTasks(organizationId: string | null, filter?: 'all' | 'assigned' | 'created', userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    fetchTasks()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Task change received:', payload)
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, filter, userId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId!)

      if (filter === 'assigned' && userId) {
        query = query.eq('assigned_to', userId)
      } else if (filter === 'created' && userId) {
        query = query.eq('created_by', userId)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setTasks(data || [])
    } catch (err: any) {
      console.error('Error fetching tasks:', err)
      setError(err.message || 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  return { tasks, loading, error, refetch: fetchTasks }
}

