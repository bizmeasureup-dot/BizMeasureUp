import React, { useState, useEffect } from 'react'
import { Task, TaskStatus } from '@/types'
import { getRecurringTaskHistory } from '@/hooks/useRecurringTasks'
import { getOverdueDisplay, isTaskOverdue } from '@/lib/taskUtils'
import { Button, Card, Badge, Select, Label } from '@roketid/windmill-react-ui'
import Modal from './Modal'

interface RecurringTaskHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  templateId: string | null
}

function RecurringTaskHistoryModal({ isOpen, onClose, templateId }: RecurringTaskHistoryModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')

  useEffect(() => {
    if (isOpen && templateId) {
      fetchHistory()
    }
  }, [isOpen, templateId])

  const fetchHistory = async () => {
    if (!templateId) return

    setLoading(true)
    try {
      const result = await getRecurringTaskHistory(templateId)
      if (result.error) {
        console.error('Error fetching history:', result.error)
      } else {
        setTasks(result.tasks)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'all') return true
    return task.status === statusFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'rescheduling':
        return 'primary'
      case 'not_applicable':
        return 'neutral'
      default:
        return 'warning'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recurring Task History">
      <div className="space-y-4">
        <Label>
          <span>Filter by Status</span>
          <Select
            className="mt-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="rescheduling">Rescheduling</option>
            <option value="completed">Completed</option>
            <option value="not_applicable">Not Applicable</option>
          </Select>
        </Label>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading history...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No tasks found in this recurring series.
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredTasks.map((task) => {
              const isOverdue = isTaskOverdue(task)
              const overdueDisplay = getOverdueDisplay(task)

              return (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
                        {isOverdue && (
                          <Badge type="danger">Overdue</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
                    {task.due_date && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Due Date: </span>
                        <span className={`font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {new Date(task.due_date).toLocaleString()}
                        </span>
                        {overdueDisplay && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                            {overdueDisplay}
                          </div>
                        )}
                      </div>
                    )}

                    {task.completed_at && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Completed: </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {new Date(task.completed_at).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {task.created_at && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Created: </span>
                        <span className="font-medium">
                          {new Date(task.created_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button layout="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default RecurringTaskHistoryModal

