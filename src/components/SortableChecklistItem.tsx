import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChecklistItem } from '@/types'
import { Button, Input } from '@roketid/windmill-react-ui'

interface SortableChecklistItemProps {
  item: ChecklistItem
  isEditing: boolean
  editingTitle: string
  onToggle: (itemId: string, currentStatus: boolean) => void
  onEdit: () => void
  onDelete: (itemId: string) => void
  onSaveEdit: (itemId: string) => void
  onCancelEdit: () => void
  onTitleChange: (title: string) => void
  canEdit: boolean
}

function SortableChecklistItem({
  item,
  isEditing,
  editingTitle,
  onToggle,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onTitleChange,
  canEdit,
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="Drag to reorder"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={() => onToggle(item.id, item.is_completed)}
        className="w-4 h-4 text-purple-600 rounded"
      />
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') onSaveEdit(item.id)
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="flex-1"
          />
          <Button size="small" onClick={() => onSaveEdit(item.id)}>
            Save
          </Button>
          <Button size="small" layout="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}
          >
            {item.title}
          </span>
          {canEdit && (
            <div className="flex gap-1">
              <Button size="small" layout="outline" onClick={onEdit}>
                Edit
              </Button>
              <Button size="small" layout="outline" onClick={() => onDelete(item.id)}>
                Delete
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SortableChecklistItem

