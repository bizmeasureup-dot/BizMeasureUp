import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task, TaskStatus, FlowViewType } from '@/types'
import { Card, Badge, Button } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { TaskCardSkeleton } from '@/components/LoadingSkeleton'
import SortableTaskCard from '@/components/SortableTaskCard'
import DroppableColumn from '@/components/DroppableColumn'
import RescheduleTaskModal from '@/components/RescheduleTaskModal'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'

function FMSPage() {
  const { organization, appUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<FlowViewType>('kanban')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null)
  const [searchParams] = useSearchParams()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (organization) {
      fetchTasks()

      // Check for saved view in URL params
      const viewId = searchParams.get('view')
      const viewTypeParam = searchParams.get('type')
      if (viewId && viewTypeParam) {
        setViewType(viewTypeParam as FlowViewType)
      }

      // Subscribe to realtime updates
      const channel = supabase
        .channel('fms-tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `organization_id=eq.${organization.id}`,
          },
          () => {
            fetchTasks()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [organization, searchParams])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error: any) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', taskId)

      if (error) throw error
      toast.success('Task status updated')
      fetchTasks()
    } catch (error: any) {
      toast.error('Failed to update task status')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    // Validate status
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(newStatus)) {
      setActiveId(null)
      return
    }

    updateTaskStatus(taskId, newStatus)
    setActiveId(null)
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status)
  }

  const getTasksByDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter((task) => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date).toISOString().split('T')[0]
      return taskDate === dateStr
    })
  }

  const getTasksInDateRange = (startDate: Date, endDate: Date) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate >= startDate && taskDate <= endDate
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getWeekDays = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
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

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <PageTitle>Flow Management</PageTitle>
        <div className="flex gap-2">
          <Button
            size="small"
            layout={viewType === 'kanban' ? 'primary' : 'outline'}
            onClick={() => setViewType('kanban')}
          >
            Kanban
          </Button>
          <Button
            size="small"
            layout={viewType === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewType('list')}
          >
            List
          </Button>
          <Button
            size="small"
            layout={viewType === 'calendar' ? 'primary' : 'outline'}
            onClick={() => setViewType('calendar')}
          >
            Calendar
          </Button>
          <Button
            size="small"
            layout={viewType === 'gantt' ? 'primary' : 'outline'}
            onClick={() => setViewType('gantt')}
          >
            Gantt
          </Button>
        </div>
      </div>

      {viewType === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4">
            {(['pending', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map((status) => {
              const statusTasks = getTasksByStatus(status)
              return (
                <div key={status} className="flex flex-col">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 capitalize">
                      {status.replace('_', ' ')} ({statusTasks.length})
                    </h3>
                  </div>
                  <DroppableColumn id={status} items={statusTasks.map((t) => t.id)}>
                    {statusTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        status={status}
                        onNavigate={(id) => navigate('/delegation/tasks')}
                        onStatusUpdate={updateTaskStatus}
                        getStatusColor={getStatusColor}
                        onReschedule={() => setReschedulingTask(task)}
                      />
                    ))}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>
          <DragOverlay>
            {activeId ? (
              <Card className="p-4 opacity-90">
                <h4 className="font-medium">
                  {tasks.find((t) => t.id === activeId)?.title || 'Task'}
                </h4>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : viewType === 'calendar' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <Button
              size="small"
              layout="outline"
              onClick={() => {
                const prevMonth = new Date(selectedDate)
                prevMonth.setMonth(prevMonth.getMonth() - 1)
                setSelectedDate(prevMonth)
              }}
            >
              ← Previous
            </Button>
            <h2 className="text-xl font-semibold">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <Button
              size="small"
              layout="outline"
              onClick={() => {
                const nextMonth = new Date(selectedDate)
                nextMonth.setMonth(nextMonth.getMonth() + 1)
                setSelectedDate(nextMonth)
              }}
            >
              Next →
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                {day}
              </div>
            ))}
            {getDaysInMonth(selectedDate).map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="p-2"></div>
              }
              const dayTasks = getTasksByDate(date)
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <div
                  key={date.toISOString()}
                  className={`p-2 border rounded min-h-[100px] ${
                    isToday ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-purple-600' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <Card
                        key={task.id}
                        className="p-1 text-xs cursor-pointer hover:shadow-sm"
                        onClick={() => navigate('/delegation/tasks')}
                      >
                        <div className="truncate font-medium">{task.title}</div>
                        <Badge type={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </Card>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : viewType === 'gantt' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="font-semibold p-2 bg-gray-100 dark:bg-gray-800">Task</div>
                <div className="font-semibold p-2 bg-gray-100 dark:bg-gray-800">Timeline</div>
                {(() => {
                  const tasksWithDates = tasks.filter((task) => task.due_date)
                  if (tasksWithDates.length === 0) {
                    return (
                      <div className="col-span-2 p-4 text-center text-gray-500">
                        No tasks with due dates to display
                      </div>
                    )
                  }
                  
                  const dates = tasksWithDates.map((t) => new Date(t.due_date!).getTime())
                  const minDate = Math.min(...dates)
                  const maxDate = Math.max(...dates)
                  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1
                  
                  return tasksWithDates
                    .sort((a, b) => {
                      const dateA = new Date(a.due_date!).getTime()
                      const dateB = new Date(b.due_date!).getTime()
                      return dateA - dateB
                    })
                    .map((task) => {
                      const dueDate = new Date(task.due_date!)
                      const createdDate = new Date(task.created_at)
                      const daysDiff = Math.max(1, Math.ceil((dueDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))
                      const startPercent = totalDays > 0 ? ((createdDate.getTime() - minDate) / (maxDate - minDate)) * 100 : 0
                      const widthPercent = totalDays > 0 ? (daysDiff / totalDays) * 100 : 10

                    return (
                      <React.Fragment key={task.id}>
                        <div
                          className="p-2 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => navigate('/delegation/tasks')}
                        >
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(task.due_date!).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="p-2 border-b relative">
                          <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded">
                            <div
                              className={`absolute h-full rounded ${
                                task.status === 'completed'
                                  ? 'bg-green-500'
                                  : task.status === 'in_progress'
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{
                                left: `${Math.max(0, startPercent)}%`,
                                width: `${Math.max(5, widthPercent)}%`,
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                                {daysDiff}d
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="p-6 cursor-pointer hover:shadow-lg"
              onClick={() => navigate('/delegation/tasks')}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{task.title}</h3>
                  {task.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge type={getStatusColor(task.status)}>{task.status}</Badge>
                  <Badge>{task.priority}</Badge>
                </div>
              </div>
              {task.due_date && (
                <p className="mt-4 text-sm text-gray-500">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <RescheduleTaskModal
        isOpen={reschedulingTask !== null}
        onClose={() => setReschedulingTask(null)}
        onSuccess={() => {
          fetchTasks()
        }}
        task={reschedulingTask}
      />
    </div>
  )
}

export default FMSPage

