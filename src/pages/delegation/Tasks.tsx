import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTasks } from '@/hooks/useTasks'
import { useToastContext } from '@/context/ToastContext'
import { Task } from '@/types'
import { Button, Card, Badge, Input } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { TaskCardSkeleton } from '@/components/LoadingSkeleton'
import Pagination from '@/components/Pagination'

function TasksPage() {
  const { organization, appUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [filter, setFilter] = useState<'all' | 'assigned' | 'created'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { tasks, loading, error } = useTasks(
    organization?.id || null,
    filter,
    appUser?.id
  )

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <PageTitle>Tasks</PageTitle>
        <Button onClick={() => navigate('/delegation/tasks/new')}>Create Task</Button>
      </div>

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
          <div className="grid gap-4">
            {paginatedTasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/delegation/tasks/${task.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
                    <Badge type={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </div>
                </div>
                {task.due_date && (
                  <p className="mt-4 text-sm text-gray-500">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </Card>
            ))}
          </div>
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

