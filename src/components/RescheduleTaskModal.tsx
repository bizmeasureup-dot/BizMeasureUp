import React, { useState } from 'react'
import { useToastContext } from '@/context/ToastContext'
import { useRescheduleRequests } from '@/hooks/useRescheduleRequests'
import { Task } from '@/types'
import { Button, Label, Input } from '@roketid/windmill-react-ui'
import Modal from './Modal'

interface RescheduleTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  task: Task | null
}

function RescheduleTaskModal({ isOpen, onClose, onSuccess, task }: RescheduleTaskModalProps) {
  const toast = useToastContext()
  const { createRequest } = useRescheduleRequests()
  const [loading, setLoading] = useState(false)
  const [dueDate, setDueDate] = useState('')

  React.useEffect(() => {
    if (task && isOpen) {
      // Set initial due date if task has one
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '')
    } else if (!isOpen) {
      setDueDate('')
    }
  }, [task, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setLoading(true)

    try {
      const { data, error } = await createRequest(task.id, dueDate, 7)

      if (error) throw new Error(error)

      toast.success('Reschedule request submitted! The task creator will be notified for approval.')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error creating reschedule request:', error)
      toast.error(error.message || 'Failed to submit reschedule request')
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Task">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current due date: {task.due_date ? new Date(task.due_date).toLocaleString() : 'Not set'}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            Note: This will create a reschedule request that requires approval from the task creator or an admin/owner.
          </p>
        </div>

        <Label>
          <span>New Due Date</span>
          <Input
            className="mt-1"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </Label>

        <div className="mt-6 flex gap-4 justify-end">
          <Button layout="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default RescheduleTaskModal

