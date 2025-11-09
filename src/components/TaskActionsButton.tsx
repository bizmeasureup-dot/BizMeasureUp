import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@roketid/windmill-react-ui'
import { Task } from '@/types'

interface TaskActionsButtonProps {
  task: Task
  onStartTask?: () => void
  onMarkComplete?: () => void
  onReschedule?: () => void
  onEdit?: () => void
  onDelete?: () => void
  size?: 'small' | 'regular' | 'large'
  className?: string
  position?: 'default' | 'bottom-right'
}

function TaskActionsButton({
  task,
  onStartTask,
  onMarkComplete,
  onReschedule,
  onEdit,
  onDelete,
  size = 'small',
  className = '',
  position = 'default',
}: TaskActionsButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<number | null>(null)

  // Calculate menu position
  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 192 // w-48 = 192px
      
      if (position === 'bottom-right') {
        // If menu is already rendered, use its actual height
        let menuHeight = 0
        if (menuRef.current) {
          menuHeight = menuRef.current.offsetHeight
        } else {
          // Estimate based on number of items (each item ~40px, padding ~8px)
          let itemCount = 0
          if (task.status === 'pending' && onStartTask) itemCount++
          if (task.status === 'in_progress' && onMarkComplete) itemCount++
          if (onReschedule) itemCount++
          if (onEdit) itemCount++
          if (onDelete) itemCount++
          menuHeight = itemCount * 40 + 8 // 8px padding
        }
        
        setMenuPosition({
          top: buttonRect.top - menuHeight - 4, // 4px gap above
          left: Math.max(8, buttonRect.right - menuWidth), // Ensure it doesn't go off left edge
          width: menuWidth
        })
      } else {
        // Position below the button
        setMenuPosition({
          top: buttonRect.bottom + 4, // 4px below button
          left: Math.max(8, buttonRect.right - menuWidth), // Ensure it doesn't go off left edge
          width: menuWidth
        })
      }
    }
  }, [position, task.status, onStartTask, onMarkComplete, onReschedule, onEdit, onDelete])

  // Update position on scroll/resize
  useEffect(() => {
    if (isHovered) {
      const handleScroll = () => {
        updateMenuPosition()
      }
      const handleResize = () => {
        updateMenuPosition()
      }
      
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isHovered, updateMenuPosition])

  // Handle hover with delay for smoother UX
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    updateMenuPosition()
    setIsHovered(true)
    // Small delay before showing to prevent flicker, then update position with actual height
    setTimeout(() => {
      setIsVisible(true)
      // Update position again after menu is rendered to get actual height
      setTimeout(() => updateMenuPosition(), 10)
    }, 50)
  }

  const handleMouseLeave = () => {
    // Delay closing to allow moving mouse to menu
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      setIsVisible(false)
    }, 150) // 150ms delay
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsHovered(false)
        setIsVisible(false)
      }
    }

    if (isHovered) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isHovered])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const handleStartTask = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    onStartTask?.()
    setIsHovered(false)
    setIsVisible(false)
  }

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    onMarkComplete?.()
    setIsHovered(false)
    setIsVisible(false)
  }

  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    onReschedule?.()
    setIsHovered(false)
    setIsVisible(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    onEdit?.()
    setIsHovered(false)
    setIsVisible(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    onDelete?.()
    setIsHovered(false)
    setIsVisible(false)
  }

  // Check if we have any actions to show
  const hasStatusActions = task.status !== 'completed' && task.status !== 'cancelled' && (onStartTask || onMarkComplete)
  const hasOtherActions = onReschedule || onEdit || onDelete
  const hasActions = hasStatusActions || hasOtherActions
  
  if (!hasActions) {
    return null
  }

  const containerClasses = position === 'bottom-right' 
    ? `absolute bottom-2 right-2 ${className}`
    : `relative inline-block ${className}`

  const menuPositionClasses = position === 'bottom-right'
    ? 'bottom-full right-0 mb-1'
    : 'right-0 top-full mt-1'

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        ref={buttonRef}
        size={size}
        layout="outline"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        className="relative transition-all duration-200"
      >
        <span className="text-sm font-medium">⋯ Actions</span>
      </Button>

      {/* Menu - rendered via portal to avoid overflow clipping */}
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={`fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] transition-all duration-200 ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : position === 'bottom-right'
              ? 'opacity-0 translate-y-2 pointer-events-none'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            pointerEvents: isVisible ? 'auto' : 'none'
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {task.status === 'pending' && onStartTask && (
              <button
                onClick={handleStartTask}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
              >
                <span className="text-green-500">🟢</span>
                Start Task
              </button>
            )}
            {task.status === 'in_progress' && onMarkComplete && (
              <button
                onClick={handleMarkComplete}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
              >
                <span className="text-green-500">✅</span>
                Mark Complete
              </button>
            )}
            {onReschedule && task.status !== 'completed' && (
              <button
                onClick={handleReschedule}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
              >
                <span>🔁</span>
                Reschedule
              </button>
            )}
            {onEdit && (
              <button
                onClick={handleEdit}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
              >
                <span>✏️</span>
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 flex items-center gap-2"
              >
                <span>🗑️</span>
                Delete
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default TaskActionsButton

