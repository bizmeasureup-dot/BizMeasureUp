import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Task } from '@/types'
import { Button, Card } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import TaskCompletionChart from '@/components/Charts/TaskCompletionChart'

function DashboardPage() {
  const { appUser, organization } = useAuth()
  const navigate = useNavigate()
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization) {
      fetchDashboardData()
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('dashboard-tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `organization_id=eq.${organization.id}`,
          },
          () => {
            fetchDashboardData()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } else {
      // No organization - set loading to false
      setLoading(false)
    }
  }, [organization])

  const fetchDashboardData = async () => {
    if (!organization) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organization.id)

      if (error) throw error

      const tasks = data || []
      setRecentTasks(tasks.slice(0, 5))
      
      setStats({
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        pending: tasks.filter((t) => t.status === 'pending').length,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!organization) {
    return (
      <div>
        <PageTitle>Dashboard</PageTitle>
        <Card className="mt-6">
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              You are not part of an organization yet. Please contact an administrator.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>

      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="mt-2 text-3xl font-semibold text-gray-700 dark:text-gray-200">
                  {stats.total}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="mt-2 text-3xl font-semibold text-green-600">
                  {stats.completed}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="mt-2 text-3xl font-semibold text-blue-600">
                  {stats.inProgress}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="mt-2 text-3xl font-semibold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
            </Card>
          </>
        )}
      </div>

      <Card className="mb-8">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Task Status Chart</h2>
          <div className="h-64 mb-6">
            <TaskCompletionChart taskStats={stats} />
          </div>
        </div>
      </Card>

      <Card className="mb-8">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Recent Tasks</h2>
          {loading ? (
            <p>Loading...</p>
          ) : recentTasks.length === 0 ? (
            <p className="text-gray-500">No tasks yet</p>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => navigate(`/delegation/tasks/${task.id}`)}
                >
                  <h3 className="font-medium text-gray-700 dark:text-gray-200">{task.title}</h3>
                  <p className="text-sm text-gray-500">{task.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={() => navigate('/delegation/tasks/new')}>Create New Task</Button>
        <Button layout="outline" onClick={() => navigate('/delegation/tasks')}>
          View All Tasks
        </Button>
      </div>
    </div>
  )
}

export default DashboardPage

