import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TaskStatus } from '@/types'
import { Card, Badge } from '@roketid/windmill-react-ui'
import TaskActionsButton from './TaskActionsButton'
import { getOverdueDisplay } from '@/lib/taskUtils'

interface SortableTaskCardProps {
  task: Task
  status: TaskStatus
  onNavigate: (taskId: string) => void
  onStatusUpdate: (taskId: string, newStatus: TaskStatus) => void
  getStatusColor: (status: string) => 'success' | 'primary' | 'danger' | 'warning'
  onReschedule?: () => void
}

function SortableTaskCard({
  task,
  status,
  onNavigate,
  onStatusUpdate,
  getStatusColor,
  onReschedule,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const overdueDisplay = getOverdueDisplay(task)

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="p-4 cursor-move hover:shadow-md"
        onClick={() => onNavigate(task.id)}
      >
        <h4 className="font-medium text-gray-700 dark:text-gray-200">{task.title}</h4>
        <div className="flex gap-2 mt-2">
          <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
          <Badge>{task.priority}</Badge>
          {overdueDisplay && (
            <Badge type="danger" className="text-xs">
              {overdueDisplay}
            </Badge>
          )}
        </div>
        {task.due_date && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </p>
            {overdueDisplay && (
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                {overdueDisplay}
              </p>
            )}
          </div>
        )}
        {status !== 'completed' && status !== 'not_applicable' && (
          <div className="mt-2 flex gap-1">
            <TaskActionsButton
              task={task}
              onMarkComplete={() => onStatusUpdate(task.id, 'completed')}
              onReschedule={onReschedule}
              onMarkNotApplicable={() => onStatusUpdate(task.id, 'not_applicable')}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default SortableTaskCard

