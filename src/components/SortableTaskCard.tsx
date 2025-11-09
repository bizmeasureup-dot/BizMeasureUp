import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TaskStatus } from '@/types'
import { Card, Badge, Button } from '@roketid/windmill-react-ui'

interface SortableTaskCardProps {
  task: Task
  status: TaskStatus
  onNavigate: (taskId: string) => void
  onStatusUpdate: (taskId: string, newStatus: TaskStatus) => void
  getStatusColor: (status: string) => 'success' | 'primary' | 'danger' | 'warning'
}

function SortableTaskCard({
  task,
  status,
  onNavigate,
  onStatusUpdate,
  getStatusColor,
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
        </div>
        {task.due_date && (
          <p className="mt-2 text-xs text-gray-500">
            Due: {new Date(task.due_date).toLocaleDateString()}
          </p>
        )}
        {status !== 'completed' && status !== 'cancelled' && (
          <div className="mt-2 flex gap-1">
            {status === 'pending' && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusUpdate(task.id, 'in_progress')
                }}
              >
                Start
              </Button>
            )}
            {status === 'in_progress' && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusUpdate(task.id, 'completed')
                }}
              >
                Complete
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default SortableTaskCard

