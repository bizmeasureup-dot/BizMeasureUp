import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { Button, Card, Badge, Select } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { hasPermission } from '@/lib/rbac'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import TaskActionsButton from '@/components/TaskActionsButton'
import RescheduleTaskModal from '@/components/RescheduleTaskModal'
import CompleteTaskModal from '@/components/CompleteTaskModal'
import ApprovalCard from '@/components/ApprovalCard'
import TaskHistoryModal from '@/components/TaskHistoryModal'
import { useRescheduleRequests } from '@/hooks/useRescheduleRequests'
import { useTaskHistory } from '@/hooks/useTaskHistory'

function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { appUser, organization } = useAuth()
  const toast = useToastContext()
  const [task, setTask] = useState<Task | null>(null)
  const [assignedUser, setAssignedUser] = useState<User | null>(null)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  
  const { requests, refetch: refetchRequests, approveRequest, rejectRequest } = useRescheduleRequests({
    taskId: id || null,
  })
  
  const { history, loading: historyLoading, refetch: refetchHistory } = useTaskHistory(id || null)
  
  const pendingRequests = requests.filter(r => r.status === 'pending')

  useEffect(() => {
    if (id) {
      fetchTask()
    }
  }, [id])

  useEffect(() => {
    if (organization) {
      fetchUsers()
    }
  }, [organization])

  useEffect(() => {
    if (task?.assigned_to) {
      fetchAssignedUser()
    }
  }, [task?.assigned_to])

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setTask(data)
    } catch (error) {
      console.error('Error fetching task:', error)
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, users(*)')
        .eq('organization_id', organization?.id)

      if (error) throw error
      const users = (data || []).map((member: any) => member.users).filter(Boolean) as User[]
      setAvailableUsers(users)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAssignedUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', task?.assigned_to)
        .single()

      if (error) throw error
      setAssignedUser(data)
    } catch (error) {
      console.error('Error fetching assigned user:', error)
    }
  }

  const updateTaskStatus = async (newStatus: Task['status']) => {
    if (!task || !id) return

    // If marking as completed, use the CompleteTaskModal instead
    if (newStatus === 'completed') {
      setIsCompleteModalOpen(true)
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      toast.success('Task status updated')
      fetchTask()
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task status')
    }
  }

  const updateTaskAssignment = async (userId: string) => {
    if (!task || !id) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: userId })
        .eq('id', id)

      if (error) throw error
      toast.success('Task assignment updated')
      fetchTask()
    } catch (error: any) {
      console.error('Error updating assignment:', error)
      toast.error(error.message || 'Failed to update assignment')
    }
  }

  if (loading) {
    return <CardSkeleton />
  }

  if (!task) {
    return (
      <Card>
        <div className="p-6 text-center text-gray-500">Task not found</div>
      </Card>
    )
  }

  const canEdit = appUser && (hasPermission(appUser.role, 'tasks.edit') || task.assigned_to === appUser.id)
  const canDelete = appUser && hasPermission(appUser.role, 'tasks.delete')

  const deleteTask = async () => {
    if (!task || !id || !window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Task deleted successfully')
      navigate('/delegation/tasks')
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <PageTitle>{task.title}</PageTitle>
      </div>

      <Card className="mb-6 relative">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{task.title}</h2>
            <button
              onClick={() => {
                setIsHistoryModalOpen(true)
                refetchHistory()
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="View task history"
              aria-label="View task history"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-4 mb-4">
            <Badge type={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'primary' : 'warning'}>
              {task.status}
            </Badge>
            <Badge type={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'primary'}>
              {task.priority}
            </Badge>
          </div>

          {task.description && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400">{task.description}</p>
            </div>
          )}

          {task.due_date && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Due Date</h3>
              <p>{new Date(task.due_date).toLocaleDateString()}</p>
            </div>
          )}

          {canEdit && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Assigned To</h3>
              <Select
                value={task.assigned_to}
                onChange={(e) => updateTaskAssignment(e.target.value)}
                className="mt-1"
              >
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {(canEdit || canDelete) && (
            <TaskActionsButton
              task={task}
              onStartTask={canEdit && task.status === 'pending' ? () => updateTaskStatus('in_progress') : undefined}
              onMarkComplete={canEdit && task.status === 'in_progress' ? () => updateTaskStatus('completed') : undefined}
              onReschedule={canEdit ? () => setIsRescheduleModalOpen(true) : undefined}
              onEdit={canEdit ? () => navigate(`/delegation/tasks/${id}/edit`) : undefined}
              onDelete={canDelete ? deleteTask : undefined}
              position="bottom-right"
              size="regular"
            />
          )}
        </div>
      </Card>

      {pendingRequests.length > 0 && (
        <Card className="mb-6">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Pending Reschedule Requests</h3>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <ApprovalCard
                  key={request.id}
                  request={request}
                  onApprove={approveRequest}
                  onReject={rejectRequest}
                  onUpdate={() => {
                    refetchRequests()
                    fetchTask()
                  }}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      <Button layout="outline" onClick={() => navigate('/delegation/tasks')}>
        Back to Tasks
      </Button>

      <RescheduleTaskModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSuccess={() => {
          fetchTask()
        }}
        task={task}
      />

      <CompleteTaskModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onSuccess={() => {
          fetchTask()
        }}
        task={task}
      />

      <TaskHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        loading={historyLoading}
      />
    </div>
  )
}

export default TaskDetailPage

