import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task, TaskPriority, TaskStatus, User } from '@/types'
import { Button, Card, Label, Input, Select } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'

function EditTaskPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organization } = useAuth()
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [task, setTask] = useState<Task | null>(null)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to: '',
  })

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

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    setSaving(true)

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
        .eq('id', id)

      if (error) throw error

      toast.success('Task updated successfully!')
      navigate('/delegation/tasks')
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <CardSkeleton />
  }

  if (!task) {
    return <div>Task not found</div>
  }

  return (
    <div>
      <PageTitle>Edit Task</PageTitle>

      <Card className="mt-6">
        <div className="p-6">
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
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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

            <div className="mt-6 flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button layout="outline" type="button" onClick={() => navigate('/delegation/tasks')}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default EditTaskPage

