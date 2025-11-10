import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RescheduleRequest, RescheduleRequestStatus, Task, User } from '@/types'

interface UseRescheduleRequestsOptions {
  organizationId?: string | null
  taskId?: string | null
  status?: RescheduleRequestStatus | null
  userId?: string | null
}

export function useRescheduleRequests(options: UseRescheduleRequestsOptions = {}) {
  const { organizationId, taskId, status, userId } = options
  const [requests, setRequests] = useState<RescheduleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId && !taskId && !userId) {
      setLoading(false)
      return
    }

    fetchRequests()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('reschedule-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ask_reschedule_requests',
        },
        () => {
          fetchRequests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, taskId, status, userId])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('ask_reschedule_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (taskId) {
        query = query.eq('task_id', taskId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      if (userId) {
        query = query.eq('requested_by', userId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // If organizationId is provided, filter by tasks in that organization
      let filteredData = data || []
      if (organizationId && data) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('organization_id', organizationId)

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(t => t.id)
          filteredData = data.filter((item: any) => taskIds.includes(item.task_id))
        } else {
          filteredData = []
        }
      }

      // Fetch related data
      const userIds = new Set<string>()
      const taskIds = new Set<string>()
      
      filteredData.forEach((item: any) => {
        if (item.task_id) taskIds.add(item.task_id)
        if (item.requested_by) userIds.add(item.requested_by)
        if (item.approved_by) userIds.add(item.approved_by)
        if (item.rejected_by) userIds.add(item.rejected_by)
      })

      // Fetch tasks
      const tasksMap = new Map()
      if (taskIds.size > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .in('id', Array.from(taskIds))
        
        tasks?.forEach((task: any) => {
          tasksMap.set(task.id, task)
        })
      }

      // Fetch users
      const usersMap = new Map()
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .in('id', Array.from(userIds))
        
        users?.forEach((user: any) => {
          usersMap.set(user.id, user)
        })
      }

      // Transform the data to match our interface
      const transformedData = filteredData.map((item: any) => ({
        ...item,
        task: tasksMap.get(item.task_id) || null,
        requester: usersMap.get(item.requested_by) || null,
        approver: item.approved_by ? usersMap.get(item.approved_by) || null : null,
        rejector: item.rejected_by ? usersMap.get(item.rejected_by) || null : null,
      }))

      setRequests(transformedData)
    } catch (err: any) {
      console.error('Error fetching reschedule requests:', err)
      setError(err.message || 'Failed to fetch reschedule requests')
    } finally {
      setLoading(false)
    }
  }

  const createRequest = async (taskId: string, requestedDueDate: string, expiresInDays: number = 7) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: 'User not authenticated' }
      }

      // Get current due date
      const { data: task } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('id', taskId)
        .single()

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      const { data, error: createError } = await supabase
        .from('ask_reschedule_requests')
        .insert({
          task_id: taskId,
          requested_by: user.id,
          requested_due_date: requestedDueDate,
          current_due_date: task?.due_date || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchRequests()
      return { data, error: null }
    } catch (err: any) {
      console.error('Error creating reschedule request:', err)
      return { data: null, error: err.message || 'Failed to create reschedule request' }
    }
  }

  const approveRequest = async (requestId: string) => {
    try {
      const { data, error: approveError } = await supabase.rpc('approve_reschedule_request', {
        request_id: requestId,
      })

      if (approveError) throw approveError

      await fetchRequests()
      return { success: true, error: null }
    } catch (err: any) {
      console.error('Error approving reschedule request:', err)
      return { success: false, error: err.message || 'Failed to approve reschedule request' }
    }
  }

  const rejectRequest = async (requestId: string, reason?: string) => {
    try {
      const { data, error: rejectError } = await supabase.rpc('reject_reschedule_request', {
        request_id: requestId,
        reason: reason || null,
      })

      if (rejectError) throw rejectError

      await fetchRequests()
      return { success: true, error: null }
    } catch (err: any) {
      console.error('Error rejecting reschedule request:', err)
      return { success: false, error: err.message || 'Failed to reject reschedule request' }
    }
  }

  const getPendingCount = () => {
    return requests.filter(r => r.status === 'pending').length
  }

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    getPendingCount,
  }
}

