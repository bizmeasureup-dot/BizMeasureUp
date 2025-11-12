import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RecurringTaskTemplate, Task } from '@/types'

export function useRecurringTasks(organizationId: string | null) {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('recurring_task_templates')
        .select(`
          *,
          last_generated_task:tasks!recurring_task_templates_last_generated_task_id_fkey(*)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setTemplates((data || []) as RecurringTaskTemplate[])
    } catch (err: any) {
      console.error('Error fetching recurring templates:', err)
      setError(err.message || 'Failed to fetch recurring templates')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchTemplates()

    // Subscribe to realtime changes
    if (!organizationId) return

    const channel = supabase
      .channel('recurring-templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_task_templates',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchTemplates()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, fetchTemplates])

  return { templates, loading, error, refetch: fetchTemplates }
}

export function useRecurringTaskTemplate(templateId: string | null) {
  const [template, setTemplate] = useState<RecurringTaskTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplate = useCallback(async () => {
    if (!templateId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('recurring_task_templates')
        .select(`
          *,
          last_generated_task:tasks!recurring_task_templates_last_generated_task_id_fkey(*)
        `)
        .eq('id', templateId)
        .single()

      if (fetchError) throw fetchError

      setTemplate(data as RecurringTaskTemplate)
    } catch (err: any) {
      console.error('Error fetching recurring template:', err)
      setError(err.message || 'Failed to fetch recurring template')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  return { template, loading, error, refetch: fetchTemplate }
}

export async function pauseRecurringTask(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('pause_recurring_template', {
      p_template_id: templateId,
    })

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Error pausing recurring task:', err)
    return { success: false, error: err.message || 'Failed to pause recurring task' }
  }
}

export async function resumeRecurringTask(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('resume_recurring_template', {
      p_template_id: templateId,
    })

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Error resuming recurring task:', err)
    return { success: false, error: err.message || 'Failed to resume recurring task' }
  }
}

export async function endRecurringTask(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('end_recurring_template', {
      p_template_id: templateId,
    })

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Error ending recurring task:', err)
    return { success: false, error: err.message || 'Failed to end recurring task' }
  }
}

export async function getRecurringTaskHistory(templateId: string): Promise<{ tasks: Task[]; error?: string }> {
  try {
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('recurring_template_id', templateId)
      .order('due_date', { ascending: false, nullsFirst: false })

    if (fetchError) throw fetchError

    return { tasks: (data || []) as Task[] }
  } catch (err: any) {
    console.error('Error fetching recurring task history:', err)
    return { tasks: [], error: err.message || 'Failed to fetch recurring task history' }
  }
}

