import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTasks } from '@/hooks/useTasks'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task, User, TaskHistory, TaskStatus, TaskPriority } from '@/types'
import { Button, Card, Badge, Input, Select, Label } from '@roketid/windmill-react-ui'
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
import { getOverdueDisplay, isTaskOverdue } from '@/lib/taskUtils'

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
            {(() => {
              const overdueDisplay = getOverdueDisplay(task)
              return overdueDisplay && (
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                  {overdueDisplay}
                </p>
              )
            })()}
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
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'overdue' | 'today' | 'this_week' | 'upcoming' | 'no_due_date'>('all')
  const [assignedToFilter, setAssignedToFilter] = useState<string | 'all'>('all')
  
  const itemsPerPage = 10

  const { tasks, loading, error, refetch } = useTasks(
    organization?.id || null,
    filter,
    appUser?.id
  )

  const fetchOrganizationUsers = useCallback(async () => {
    if (!organization) return
    
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, users(*)')
        .eq('organization_id', organization.id)

      if (error) throw error
      
      const users = (data || []).map((member: any) => member.users).filter(Boolean) as User[]
      setAvailableUsers(users)
      
      // Also update usersMap for display purposes
      const map: Record<string, User> = {}
      users.forEach(user => {
        map[user.id] = user
      })
      setUsersMap(prev => ({ ...prev, ...map }))
    } catch (error) {
      console.error('Error fetching organization users:', error)
    }
  }, [organization])

  const fetchUsersForTasks = useCallback(async () => {
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
      setUsersMap(prev => ({ ...prev, ...map }))
    } catch (error) {
      console.error('Error fetching users for tasks:', error)
    }
  }, [tasks])

  // Fetch all organization users for filter dropdown
  useEffect(() => {
    if (organization) {
      fetchOrganizationUsers()
    }
  }, [organization, fetchOrganizationUsers])

  // Fetch users when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      fetchUsersForTasks()
    }
  }, [tasks, fetchUsersForTasks])


  // Helper function to check if task matches due date filter
  const matchesDueDateFilter = (task: Task): boolean => {
    if (dueDateFilter === 'all') return true
    if (!task.due_date) return dueDateFilter === 'no_due_date'
    if (dueDateFilter === 'no_due_date') return false
    
    const now = new Date()
    const dueDate = new Date(task.due_date)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    switch (dueDateFilter) {
      case 'overdue':
        return dueDate < now && task.status !== 'completed'
      case 'today':
        return dueDate >= todayStart && dueDate <= todayEnd
      case 'this_week':
        return dueDate >= todayStart && dueDate <= weekEnd
      case 'upcoming':
        return dueDate > now
      default:
        return true
    }
  }

  // Filter tasks by all filters
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false
    }
    
    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false
    }
    
    // Due date filter
    if (!matchesDueDateFilter(task)) {
      return false
    }
    
    // Assigned to filter
    if (assignedToFilter !== 'all' && task.assigned_to !== assignedToFilter) {
      return false
    }
    
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(query)
      const matchesDescription = task.description?.toLowerCase().includes(query) || false
      if (!matchesTitle && !matchesDescription) {
        return false
      }
    }
    
    return true
  })

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
      case 'rescheduling':
        return 'primary'
      case 'not_applicable':
        return 'neutral'
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

  const clearFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setDueDateFilter('all')
    setAssignedToFilter('all')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters = () => {
    return statusFilter !== 'all' || 
           priorityFilter !== 'all' || 
           dueDateFilter !== 'all' || 
           assignedToFilter !== 'all' || 
           searchQuery !== ''
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

      <div className="mb-4 space-y-4">
        {/* Search and Ownership Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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

        {/* Advanced Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Status</span>
              <Select
                className="mt-1"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TaskStatus | 'all')
                  setCurrentPage(1)
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="rescheduling">Rescheduling</option>
                <option value="completed">Completed</option>
                <option value="not_applicable">Not Applicable</option>
              </Select>
            </Label>

            <Label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Priority</span>
              <Select
                className="mt-1"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as TaskPriority | 'all')
                  setCurrentPage(1)
                }}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Label>

            <Label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Due Date</span>
              <Select
                className="mt-1"
                value={dueDateFilter}
                onChange={(e) => {
                  setDueDateFilter(e.target.value as typeof dueDateFilter)
                  setCurrentPage(1)
                }}
              >
                <option value="all">All Due Dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="upcoming">Upcoming</option>
                <option value="no_due_date">No Due Date</option>
              </Select>
            </Label>

            <Label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Assigned To</span>
              <Select
                className="mt-1"
                value={assignedToFilter}
                onChange={(e) => {
                  setAssignedToFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">All Users</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </Select>
            </Label>
          </div>

          {hasActiveFilters() && (
            <Button
              size="small"
              layout="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
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
            {hasActiveFilters() ? 'No tasks match your filters' : 'No tasks found'}
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
                    const isOverdue = isTaskOverdue(task)
                    
                    return (
                      <React.Fragment key={task.id}>
                        <tr
                          className={`text-gray-700 dark:text-gray-400 cursor-pointer transition-colors ${
                            isOverdue
                              ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={(e) => {
                            // Don't expand if clicking on Actions button
                            const target = e.target as HTMLElement
                            if (target.closest('[data-actions-button]')) {
                              return
                            }
                            toggleExpanded(task.id)
                          }}
                        >
                          <td className={`px-4 py-3 ${isOverdue ? 'border-l-4 border-red-600 dark:border-red-500' : ''}`}>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge type={getPriorityColor(task.priority)}>{task.priority}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">
                            {getAssignedUserName(task.assigned_to)}
                          </td>
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">
                            {task.due_date ? (
                              <div>
                                <div className={`font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
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
                                  {new Date(task.due_date).toLocaleDateString()}
                                </div>
                                {(() => {
                                  const overdueDisplay = getOverdueDisplay(task)
                                  return overdueDisplay && (
                                    <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                                      {overdueDisplay}
                                    </div>
                                  )
                                })()}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {(canEdit || canDelete) && (
                              <div data-actions-button onClick={(e) => e.stopPropagation()}>
                                <TaskActionsButton
                                  task={task}
                                  onMarkComplete={canEdit && task.status === 'pending' ? () => {
                                    const taskToComplete = tasks.find(t => t.id === task.id)
                                    if (taskToComplete) {
                                      setCompletingTask(taskToComplete)
                                    }
                                  } : undefined}
                                  onReschedule={canEdit && task.status !== 'completed' && task.status !== 'not_applicable' ? () => {
                                    const taskToReschedule = tasks.find(t => t.id === task.id)
                                    if (taskToReschedule) {
                                      setReschedulingTask(taskToReschedule)
                                    }
                                  } : undefined}
                                  onMarkNotApplicable={canEdit && task.status !== 'completed' && task.status !== 'not_applicable' ? () => {
                                    updateTaskStatus(task.id, 'not_applicable')
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

