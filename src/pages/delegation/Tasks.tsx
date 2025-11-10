import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTasks } from '@/hooks/useTasks'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task, User, TaskHistory } from '@/types'
import { Button, Card, Badge, Input } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { TaskCardSkeleton } from '@/components/LoadingSkeleton'
import Pagination from '@/components/Pagination'
import CreateTaskModal from '@/components/CreateTaskModal'
import EditTaskModal from '@/components/EditTaskModal'
import CompleteTaskModal from '@/components/CompleteTaskModal'
import TaskActionsButton from '@/components/TaskActionsButton'
import RescheduleTaskModal from '@/components/RescheduleTaskModal'
import ApprovalCard from '@/components/ApprovalCard'
import { useTaskHistory } from '@/hooks/useTaskHistory'
import { useRescheduleRequests } from '@/hooks/useRescheduleRequests'
import { motion, AnimatePresence } from 'framer-motion'
import { hasPermission } from '@/lib/rbac'

interface ExpandedTaskDetailsProps {
  task: Task
  canEdit: boolean
  usersMap: Record<string, User>
  historyExpanded: boolean
  onToggleHistory: () => void
  onRefetch: () => void
  formatHistoryEntry: (entry: TaskHistory) => React.ReactNode
  getUserName: (userId: string | undefined) => string
  setHistoryUserMap: React.Dispatch<React.SetStateAction<Map<string, User>>>
}

function ExpandedTaskDetails({
  task,
  canEdit,
  usersMap,
  historyExpanded,
  onToggleHistory,
  onRefetch,
  formatHistoryEntry,
  getUserName,
  setHistoryUserMap,
}: ExpandedTaskDetailsProps) {
  const { history, loading: historyLoading, refetch: refetchHistory } = useTaskHistory(task.id)
  const { requests, refetch: refetchRequests, approveRequest, rejectRequest } = useRescheduleRequests({
    taskId: task.id,
  })

  const pendingRequests = requests.filter(r => r.status === 'pending')

  // Update history user map when history changes
  useEffect(() => {
    if (history.length === 0) return

    const userIds = new Set<string>()
    history.forEach((entry) => {
      if (entry.changed_by) userIds.add(entry.changed_by)
      if (entry.change_type === 'assignment') {
        if (entry.old_value?.assigned_to) userIds.add(entry.old_value.assigned_to)
        if (entry.new_value?.assigned_to) userIds.add(entry.new_value.assigned_to)
      }
    })

    if (userIds.size === 0) return

    supabase
      .from('users')
      .select('*')
      .in('id', Array.from(userIds))
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching users for history:', error)
          return
        }

        setHistoryUserMap(prev => {
          const newMap = new Map(prev)
          data?.forEach((user: any) => {
            newMap.set(user.id, user)
          })
          return newMap
        })
      })
  }, [history, setHistoryUserMap])

  const handleApproveRequest = async (requestId: string) => {
    const result = await approveRequest(requestId)
    if (result.success) {
      refetchRequests()
      onRefetch()
    }
    return result
  }

  const handleRejectRequest = async (requestId: string, reason?: string) => {
    const result = await rejectRequest(requestId, reason)
    if (result.success) {
      refetchRequests()
      onRefetch()
    }
    return result
  }

  return (
    <div className="px-4 py-2.5 space-y-4">
      {task.description && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{task.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
        {task.due_date && (
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Date</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {new Date(task.due_date).toLocaleString()}
            </p>
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assigned from</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {getUserName(task.created_by)}
          </p>
        </div>

        {task.completed_at && (
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completed At</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {new Date(task.completed_at).toLocaleString()}
            </p>
          </div>
        )}

        {task.completion_notes && (
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completion Notes</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {task.completion_notes}
            </p>
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created At</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {new Date(task.created_at).toLocaleString()}
          </p>
        </div>

        {task.completion_attachment_url && (
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completion Attachment</span>
            <a
              href={task.completion_attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              View Attachment
            </a>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Task History</h4>
          <button
            type="button"
            onClick={onToggleHistory}
            className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={historyExpanded ? "Hide task history" : "Show task history"}
            aria-label={historyExpanded ? "Hide task history" : "Show task history"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {historyLoading ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading history...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No history available for this task.
                  </div>
                ) : (
                  history.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      {formatHistoryEntry(entry)}
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reschedule Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Pending Reschedule Requests</h4>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <ApprovalCard
                key={request.id}
                request={request}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                onUpdate={() => {
                  refetchRequests()
                  onRefetch()
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TasksPage() {
  const { organization, appUser } = useAuth()
  const toast = useToastContext()
  const [filter, setFilter] = useState<'all' | 'assigned' | 'created'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [usersMap, setUsersMap] = useState<Record<string, User>>({})
  const [historyExpandedTasks, setHistoryExpandedTasks] = useState<Set<string>>(new Set())
  const [historyUserMap, setHistoryUserMap] = useState<Map<string, User>>(new Map())
  const itemsPerPage = 10

  const { tasks, loading, error, refetch } = useTasks(
    organization?.id || null,
    filter,
    appUser?.id
  )

  // Fetch users when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      fetchUsersForTasks()
    }
  }, [tasks])

  const fetchUsersForTasks = async () => {
    try {
      const userIds = [
        ...new Set([
          ...tasks.map(t => t.assigned_to).filter(Boolean),
          ...tasks.map(t => t.created_by).filter(Boolean)
        ])
      ]
      if (userIds.length === 0) return

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)

      if (error) throw error
      
      const map: Record<string, User> = {}
      data?.forEach(user => {
        map[user.id] = user
      })
      setUsersMap(map)
    } catch (error) {
      console.error('Error fetching users for tasks:', error)
    }
  }


  // Filter tasks by search query
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Paginate tasks
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (error) {
    toast.error(error)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'primary'
      case 'cancelled':
        return 'danger'
      default:
        return 'warning'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'primary'
      default:
        return 'neutral'
    }
  }

  const toggleExpanded = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId)
  }

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    // If marking as completed, use the CompleteTaskModal instead
    if (newStatus === 'completed') {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setCompletingTask(task)
        return
      }
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus, 
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}) 
        })
        .eq('id', taskId)

      if (error) throw error
      toast.success('Task status updated')
      refetch()
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast.error(error.message || 'Failed to update task status')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      toast.success('Task deleted successfully')
      if (expandedTaskId === taskId) {
        setExpandedTaskId(null)
      }
      refetch()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    }
  }

  const getAssignedUserName = (userId: string) => {
    const user = usersMap[userId]
    return user ? (user.full_name || user.email) : 'Unknown'
  }

  const toggleHistoryExpanded = (taskId: string) => {
    setHistoryExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unassigned'
    const user = historyUserMap.get(userId) || usersMap[userId]
    return user ? (user.full_name || user.email) : 'Unknown User'
  }

  const formatHistoryEntry = (entry: TaskHistory) => {
    const getChangeTypeBadge = (changeType: TaskHistory['change_type']) => {
      const badges = {
        status: { type: 'primary' as const, label: 'Status' },
        assignment: { type: 'success' as const, label: 'Assignment' },
        due_date: { type: 'warning' as const, label: 'Due Date' },
        reschedule_request: { type: 'primary' as const, label: 'Reschedule' },
      }
      return badges[changeType] || { type: 'primary' as const, label: changeType }
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

    const badge = getChangeTypeBadge(entry.change_type)
    
    return (
      <div>
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
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <PageTitle>Tasks</PageTitle>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create Task</Button>
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch()
        }}
      />

      <EditTaskModal
        isOpen={editingTaskId !== null}
        onClose={() => setEditingTaskId(null)}
        onSuccess={() => {
          refetch()
        }}
        taskId={editingTaskId}
      />

      <CompleteTaskModal
        isOpen={completingTask !== null}
        onClose={() => setCompletingTask(null)}
        onSuccess={() => {
          refetch()
        }}
        task={completingTask}
      />

      <RescheduleTaskModal
        isOpen={reschedulingTask !== null}
        onClose={() => setReschedulingTask(null)}
        onSuccess={() => {
          refetch()
        }}
        task={reschedulingTask}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="small"
            layout={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => {
              setFilter('all')
              setCurrentPage(1)
            }}
          >
            All
          </Button>
          <Button
            size="small"
            layout={filter === 'assigned' ? 'primary' : 'outline'}
            onClick={() => {
              setFilter('assigned')
              setCurrentPage(1)
            }}
          >
            Assigned to Me
          </Button>
          <Button
            size="small"
            layout={filter === 'created' ? 'primary' : 'outline'}
            onClick={() => {
              setFilter('created')
              setCurrentPage(1)
            }}
          >
            Created by Me
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? 'No tasks match your search' : 'No tasks found'}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase border-b dark:border-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden md:table-cell">Priority</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Assigned To</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Due Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
                  {paginatedTasks.map((task) => {
                    const isExpanded = expandedTaskId === task.id
                    const canEdit = appUser && (hasPermission(appUser.role, 'tasks.edit') || task.assigned_to === appUser.id)
                    const canDelete = appUser && hasPermission(appUser.role, 'tasks.delete')
                    
                    return (
                      <React.Fragment key={task.id}>
                        <tr
                          className="text-gray-700 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={(e) => {
                            // Don't expand if clicking on Actions button
                            const target = e.target as HTMLElement
                            if (target.closest('[data-actions-button]')) {
                              return
                            }
                            toggleExpanded(task.id)
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <svg
                                className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium">{task.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge type={getPriorityColor(task.priority)}>{task.priority}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">
                            {getAssignedUserName(task.assigned_to)}
                          </td>
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {(canEdit || canDelete) && (
                              <div data-actions-button onClick={(e) => e.stopPropagation()}>
                                <TaskActionsButton
                                  task={task}
                                  onStartTask={canEdit && task.status === 'pending' ? () => updateTaskStatus(task.id, 'in_progress') : undefined}
                                  onMarkComplete={canEdit && task.status === 'in_progress' ? () => {
                                    const taskToComplete = tasks.find(t => t.id === task.id)
                                    if (taskToComplete) {
                                      setCompletingTask(taskToComplete)
                                    }
                                  } : undefined}
                                  onReschedule={canEdit ? () => {
                                    const taskToReschedule = tasks.find(t => t.id === task.id)
                                    if (taskToReschedule) {
                                      setReschedulingTask(taskToReschedule)
                                    }
                                  } : undefined}
                                  onEdit={canEdit ? () => {
                                    setEditingTaskId(task.id)
                                  } : undefined}
                                  onDelete={canDelete ? () => {
                                    deleteTask(task.id)
                                  } : undefined}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-gray-50 dark:bg-gray-900 p-0 border-l-2 border-blue-200 dark:border-blue-800">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="max-h-[600px] overflow-y-auto">
                                    <ExpandedTaskDetails
                                      task={task}
                                      canEdit={canEdit}
                                      usersMap={usersMap}
                                      historyExpanded={historyExpandedTasks.has(task.id)}
                                      onToggleHistory={() => toggleHistoryExpanded(task.id)}
                                      onRefetch={refetch}
                                      formatHistoryEntry={formatHistoryEntry}
                                      getUserName={getUserName}
                                      setHistoryUserMap={setHistoryUserMap}
                                    />
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}

export default TasksPage

