import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskStatus } from '@/types'

interface DroppableColumnProps {
  id: TaskStatus
  children: React.ReactNode
  items: string[]
}

function DroppableColumn({ id, children, items }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-b-lg space-y-2 min-h-[400px] ${
          isOver ? 'bg-blue-100 dark:bg-blue-900' : ''
        }`}
      >
        {children}
      </div>
    </SortableContext>
  )
}

export default DroppableColumn

