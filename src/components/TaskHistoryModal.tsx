import React, { useEffect, useState } from 'react'
import { TaskHistory, User } from '@/types'
import { Card, Badge } from '@roketid/windmill-react-ui'
import { supabase } from '@/lib/supabase'
import Modal from './Modal'
import { CardSkeleton } from './LoadingSkeleton'

interface TaskHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: TaskHistory[]
  loading: boolean
}

function TaskHistoryModal({ isOpen, onClose, history, loading }: TaskHistoryModalProps) {
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map())

  useEffect(() => {
    if (history.length === 0) return

    // Collect all user IDs from assignment changes
    const userIds = new Set<string>()
    history.forEach((entry) => {
      if (entry.change_type === 'assignment') {
        if (entry.old_value?.assigned_to) userIds.add(entry.old_value.assigned_to)
        if (entry.new_value?.assigned_to) userIds.add(entry.new_value.assigned_to)
      }
    })

    if (userIds.size === 0) return

    // Fetch user information
    supabase
      .from('users')
      .select('*')
      .in('id', Array.from(userIds))
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching users for history:', error)
          return
        }

        const map = new Map<string, User>()
        data?.forEach((user: any) => {
          map.set(user.id, user)
        })
        setUserMap(map)
      })
  }, [history])

  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unassigned'
    const user = userMap.get(userId)
    return user ? user.full_name || user.email : 'Unknown User'
  }

  const formatChangeDescription = (entry: TaskHistory): string => {
    switch (entry.change_type) {
      case 'status':
        const oldStatus = entry.old_value?.status || 'N/A'
        const newStatus = entry.new_value?.status || 'N/A'
        return `Status changed from '${oldStatus}' to '${newStatus}'`

      case 'assignment':
        const oldUserId = entry.old_value?.assigned_to
        const newUserId = entry.new_value?.assigned_to
        const oldUserName = getUserName(oldUserId)
        const newUserName = getUserName(newUserId)
        return `Assigned to ${newUserName}${oldUserId ? ` (was: ${oldUserName})` : ''}`

      case 'due_date':
        const oldDate = entry.old_value?.due_date
          ? new Date(entry.old_value.due_date).toLocaleDateString()
          : 'Not set'
        const newDate = entry.new_value?.due_date
          ? new Date(entry.new_value.due_date).toLocaleDateString()
          : 'Not set'
        return `Due date changed to ${newDate}${oldDate !== 'Not set' ? ` (was: ${oldDate})` : ''}`

      case 'reschedule_request':
        const action = entry.metadata?.action || 'processed'
        const requestedDate = entry.new_value?.due_date
          ? new Date(entry.new_value.due_date).toLocaleDateString()
          : 'N/A'
        if (action === 'approved') {
          return `Reschedule request approved - due date changed to ${requestedDate}`
        } else if (action === 'rejected') {
          const reason = entry.metadata?.rejection_reason
            ? ` - ${entry.metadata.rejection_reason}`
            : ''
          return `Reschedule request rejected${reason}`
        }
        return 'Reschedule request processed'

      default:
        return 'Task updated'
    }
  }

  const formatUserName = (entry: TaskHistory): string => {
    if (entry.changed_by_user) {
      return entry.changed_by_user.full_name || entry.changed_by_user.email
    }
    return 'Unknown User'
  }

  const getChangeTypeBadge = (changeType: TaskHistory['change_type']) => {
    const badges = {
      status: { type: 'primary' as const, label: 'Status' },
      assignment: { type: 'success' as const, label: 'Assignment' },
      due_date: { type: 'warning' as const, label: 'Due Date' },
      reschedule_request: { type: 'primary' as const, label: 'Reschedule' },
    }
    return badges[changeType] || { type: 'primary' as const, label: changeType }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task History">
      <div className="space-y-4">
        {loading ? (
          <CardSkeleton />
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No history available for this task.
          </div>
        ) : (
          history.map((entry) => {
            const badge = getChangeTypeBadge(entry.change_type)
            return (
              <Card key={entry.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge type={badge.type}>{badge.label}</Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {formatChangeDescription(entry)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Changed by: {formatUserName(entry)}
                </p>
              </Card>
            )
          })
        )}
      </div>
    </Modal>
  )
}

export default TaskHistoryModal

