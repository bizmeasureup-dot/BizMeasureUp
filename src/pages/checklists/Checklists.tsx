import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Checklist, Task } from '@/types'
import { Card } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'

function ChecklistsPage() {
  const { organization } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [checklists, setChecklists] = useState<(Checklist & { task: Task })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization) {
      fetchChecklists()
    }
  }, [organization])

  const fetchChecklists = async () => {
    try {
      // First get tasks for the organization
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('organization_id', organization?.id)

      if (tasksError) throw tasksError

      const taskIds = (tasks || []).map((t) => t.id)

      if (taskIds.length === 0) {
        setChecklists([])
        setLoading(false)
        return
      }

      // Then get checklists for those tasks
      const { data, error } = await supabase
        .from('checklists')
        .select('*, tasks(*)')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChecklists(data || [])
    } catch (error: any) {
      console.error('Error fetching checklists:', error)
      toast.error('Failed to load checklists')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageTitle>Checklists</PageTitle>

      {loading ? (
        <div className="grid gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : checklists.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-gray-500">No checklists found</div>
        </Card>
      ) : (
        <div className="grid gap-4 mt-6">
          {checklists.map((checklist) => (
            <Card
              key={checklist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/checklists/${checklist.task_id}`)}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                  {checklist.title}
                </h3>
                {checklist.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {checklist.description}
                  </p>
                )}
                {checklist.task && (
                  <p className="mt-2 text-sm text-gray-500">
                    Task: {(checklist.task as Task).title}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChecklistsPage

