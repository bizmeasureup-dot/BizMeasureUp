import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task, TaskPriority, TaskStatus, User } from '@/types'
import { Button, Label, Input, Select } from '@roketid/windmill-react-ui'
import Modal from './Modal'
import { CardSkeleton } from './LoadingSkeleton'

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  taskId: string | null
}

function EditTaskModal({ isOpen, onClose, onSuccess, taskId }: EditTaskModalProps) {
  const { organization } = useAuth()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to: '',
  })

  useEffect(() => {
    if (organization && isOpen) {
      fetchUsers()
    }
  }, [organization, isOpen])

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask()
    } else if (!isOpen) {
      // Reset form when modal closes
      setTask(null)
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        assigned_to: '',
      })
    }
  }, [isOpen, taskId])

  const fetchTask = async () => {
    if (!taskId) return

    setFetching(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error
      setTask(data)
      setFormData({
        title: data.title,
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        due_date: data.due_date ? new Date(data.due_date).toISOString().slice(0, 16) : '',
        assigned_to: data.assigned_to,
      })
    } catch (error) {
      console.error('Error fetching task:', error)
      toast.error('Failed to load task')
      onClose()
    } finally {
      setFetching(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskId) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          priority: formData.priority,
          due_date: formData.due_date || null,
          assigned_to: formData.assigned_to,
          ...(formData.status === 'completed' && !task?.completed_at
            ? { completed_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', taskId)

      if (error) throw error

      toast.success('Task updated successfully!')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task">
      {fetching ? (
        <div className="py-8">
          <CardSkeleton />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Label className="mt-4">
            <span>Title *</span>
            <Input
              className="mt-1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </Label>

          <Label className="mt-4">
            <span>Description</span>
            <Input
              className="mt-1"
              tag="textarea"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Label>

          <Label className="mt-4">
            <span>Status</span>
            <Select
              className="mt-1"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
            >
              <option value="pending">Pending</option>
              <option value="rescheduling">Rescheduling</option>
              <option value="completed">Completed</option>
              <option value="not_applicable">Not Applicable</option>
            </Select>
          </Label>

          <Label className="mt-4">
            <span>Priority</span>
            <Select
              className="mt-1"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Label>

          <Label className="mt-4">
            <span>Due Date</span>
            <Input
              className="mt-1"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </Label>

          <Label className="mt-4">
            <span>Assign To</span>
            <Select
              className="mt-1"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            >
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </Select>
          </Label>

          <div className="mt-6 flex gap-4 justify-end">
            <Button layout="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default EditTaskModal

