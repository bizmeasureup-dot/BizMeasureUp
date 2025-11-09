import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { TaskPriority, TaskStatus, User } from '@/types'
import { Button, Card, Label, Input, Select } from '@roketid/windmill-react-ui'
import Modal from './Modal'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

function CreateTaskModal({ isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const { organization, appUser } = useAuth()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to: appUser?.id || '',
    attachment_required: false,
  })

  useEffect(() => {
    if (organization && isOpen) {
      fetchUsers()
    }
  }, [organization, isOpen])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: appUser?.id || '',
        attachment_required: false,
      })
    }
  }, [isOpen, appUser?.id])

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
          attachment_required: formData.attachment_required,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Task created successfully!')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error creating task:', error)
      toast.error(error.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
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

        <Label className="mt-4 flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={formData.attachment_required}
            onChange={(e) => setFormData({ ...formData, attachment_required: e.target.checked })}
          />
          <span>Attachment Required</span>
        </Label>

        <div className="mt-6 flex gap-4 justify-end">
          <Button layout="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateTaskModal

