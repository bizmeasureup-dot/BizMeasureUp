import React, { useState } from 'react'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
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
      const { error } = await supabase
        .from('tasks')
        .update({
          due_date: dueDate || null,
        })
        .eq('id', task.id)

      if (error) throw error

      toast.success('Task rescheduled successfully!')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error rescheduling task:', error)
      toast.error(error.message || 'Failed to reschedule task')
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
            {loading ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default RescheduleTaskModal

