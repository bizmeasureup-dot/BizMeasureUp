import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TaskStatus } from '@/types'
import { Card, Badge } from '@roketid/windmill-react-ui'
import TaskActionsButton from './TaskActionsButton'
import { getOverdueDisplay, isTaskOverdue } from '@/lib/taskUtils'

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
  const isOverdue = isTaskOverdue(task)

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`p-4 cursor-move hover:shadow-md ${
          isOverdue
            ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 dark:border-red-500'
            : ''
        }`}
        onClick={() => onNavigate(task.id)}
      >
        <h4 className="font-medium text-gray-700 dark:text-gray-200">{task.title}</h4>
        <div className="flex gap-2 mt-2">
          <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
          <Badge>{task.priority}</Badge>
        </div>
        {task.due_date && (
          <div className="mt-2">
            <p className={`text-xs ${isOverdue ? 'font-bold text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1">
                {isOverdue && (
                  <svg
                    className="w-4 h-4 text-red-600 dark:text-red-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            </p>
            {overdueDisplay && (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
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

