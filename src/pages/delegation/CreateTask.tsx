import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { TaskPriority, TaskStatus, User } from '@/types'
import { Button, Card, Label, Input, Select } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'

function CreateTaskPage() {
  const { organization, appUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to: appUser?.id || '',
  })

  useEffect(() => {
    if (organization) {
      fetchUsers()
    }
  }, [organization])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, users(*)')
        .eq('organization_id', organization?.id)

      if (error) throw error
      const users = (data || []).map((member: any) => member.users).filter(Boolean) as User[]
      setAvailableUsers(users)
      if (users.length > 0 && !formData.assigned_to) {
        setFormData((prev) => ({ ...prev, assigned_to: appUser?.id || users[0].id }))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !appUser) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          organization_id: organization.id,
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || appUser.id,
          created_by: appUser.id,
          status: 'pending' as TaskStatus,
          priority: formData.priority,
          due_date: formData.due_date || null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Task created successfully!')
      navigate(`/delegation/tasks/${data.id}`)
    } catch (error: any) {
      console.error('Error creating task:', error)
      toast.error(error.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageTitle>Create New Task</PageTitle>

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
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
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

export default CreateTaskPage

