import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { TaskPriority, RecurrenceType, User } from '@/types'
import { Button, Label, Input, Select } from '@roketid/windmill-react-ui'
import Modal from './Modal'

interface CreateRecurringTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

function CreateRecurringTaskModal({ isOpen, onClose, onSuccess }: CreateRecurringTaskModalProps) {
  const { organization, appUser } = useAuth()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    assigned_to: appUser?.id || '',
    attachment_required: false,
    recurrence_type: 'daily' as RecurrenceType,
    recurrence_interval: 1,
    recurrence_day_of_week: undefined as number | undefined,
    recurrence_day_of_month: undefined as number | undefined,
    recurrence_month: undefined as number | undefined,
    start_date: '',
    end_date: '',
    unlock_days_before_due: 0,
  })

  useEffect(() => {
    if (organization && isOpen) {
      fetchUsers()
    }
  }, [organization, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: appUser?.id || '',
        attachment_required: false,
        recurrence_type: 'daily',
        recurrence_interval: 1,
        recurrence_day_of_week: undefined,
        recurrence_day_of_month: undefined,
        recurrence_month: undefined,
        start_date: '',
        end_date: '',
        unlock_days_before_due: 0,
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
      // Create recurring template
      const templateData: any = {
        organization_id: organization.id,
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to || appUser.id,
        created_by: appUser.id,
        priority: formData.priority,
        attachment_required: formData.attachment_required,
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        unlock_days_before_due: formData.unlock_days_before_due,
      }

      // Add optional recurrence fields based on type
      if (formData.recurrence_type === 'weekly' && formData.recurrence_day_of_week !== undefined) {
        templateData.recurrence_day_of_week = formData.recurrence_day_of_week
      }
      if (formData.recurrence_type === 'monthly' && formData.recurrence_day_of_month !== undefined) {
        templateData.recurrence_day_of_month = formData.recurrence_day_of_month
      }
      if (formData.recurrence_type === 'yearly') {
        if (formData.recurrence_month !== undefined) {
          templateData.recurrence_month = formData.recurrence_month
        }
        if (formData.recurrence_day_of_month !== undefined) {
          templateData.recurrence_day_of_month = formData.recurrence_day_of_month
        }
      }

      const { data: template, error: templateError } = await supabase
        .from('recurring_task_templates')
        .insert(templateData)
        .select()
        .single()

      if (templateError) throw templateError

      // Create first task
      const { error: taskError } = await supabase
        .from('tasks')
        .insert({
          organization_id: organization.id,
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || appUser.id,
          created_by: appUser.id,
          status: 'pending',
          priority: formData.priority,
          due_date: formData.start_date,
          original_due_date: formData.start_date,
          attachment_required: formData.attachment_required,
          recurring_template_id: template.id,
        })

      if (taskError) throw taskError

      toast.success('Recurring task created successfully!')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error creating recurring task:', error)
      toast.error(error.message || 'Failed to create recurring task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Recurring Task">
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

        <Label className="mt-4">
          <span>Recurrence Type *</span>
          <Select
            className="mt-1"
            value={formData.recurrence_type}
            onChange={(e) => {
              const newType = e.target.value as RecurrenceType
              setFormData({
                ...formData,
                recurrence_type: newType,
                // Reset optional fields when type changes
                recurrence_day_of_week: undefined,
                recurrence_day_of_month: undefined,
                recurrence_month: undefined,
              })
            }}
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom (days)</option>
          </Select>
        </Label>

        <Label className="mt-4">
          <span>Repeat Every (Interval) *</span>
          <Input
            className="mt-1"
            type="number"
            min="1"
            value={formData.recurrence_interval}
            onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
            required
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            {formData.recurrence_type === 'daily' && 'days'}
            {formData.recurrence_type === 'weekly' && 'weeks'}
            {formData.recurrence_type === 'monthly' && 'months'}
            {formData.recurrence_type === 'yearly' && 'years'}
            {formData.recurrence_type === 'custom' && 'days'}
          </span>
        </Label>

        {formData.recurrence_type === 'weekly' && (
          <Label className="mt-4">
            <span>Day of Week</span>
            <Select
              className="mt-1"
              value={formData.recurrence_day_of_week ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recurrence_day_of_week: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            >
              <option value="">Any day</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </Select>
          </Label>
        )}

        {formData.recurrence_type === 'monthly' && (
          <Label className="mt-4">
            <span>Day of Month (1-31)</span>
            <Input
              className="mt-1"
              type="number"
              min="1"
              max="31"
              value={formData.recurrence_day_of_month ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recurrence_day_of_month: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </Label>
        )}

        {formData.recurrence_type === 'yearly' && (
          <>
            <Label className="mt-4">
              <span>Month (1-12)</span>
              <Select
                className="mt-1"
                value={formData.recurrence_month ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurrence_month: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              >
                <option value="">Any month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </Select>
            </Label>
            <Label className="mt-4">
              <span>Day of Month (1-31)</span>
              <Input
                className="mt-1"
                type="number"
                min="1"
                max="31"
                value={formData.recurrence_day_of_month ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurrence_day_of_month: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </Label>
          </>
        )}

        <Label className="mt-4">
          <span>Start Date *</span>
          <Input
            className="mt-1"
            type="datetime-local"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </Label>

        <Label className="mt-4">
          <span>End Date (Optional)</span>
          <Input
            className="mt-1"
            type="datetime-local"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </Label>

        <Label className="mt-4">
          <span>Unlock Days Before Due</span>
          <Input
            className="mt-1"
            type="number"
            min="0"
            value={formData.unlock_days_before_due}
            onChange={(e) => setFormData({ ...formData, unlock_days_before_due: parseInt(e.target.value) || 0 })}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            Task can only be completed this many days before the due date (0 = no restriction)
          </span>
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
            {loading ? 'Creating...' : 'Create Recurring Task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateRecurringTaskModal

