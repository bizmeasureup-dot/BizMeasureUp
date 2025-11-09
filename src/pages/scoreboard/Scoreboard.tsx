import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { ScoreboardMetric, Task } from '@/types'
import { Card, Button } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { hasPermission } from '@/lib/rbac'
import MetricTrendChart from '@/components/Charts/MetricTrendChart'

function ScoreboardPage() {
  const { organization, appUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [metrics, setMetrics] = useState<ScoreboardMetric[]>([])
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization) {
      fetchMetrics()
      fetchTaskStats()

      // Subscribe to realtime updates
      const channel = supabase
        .channel('scoreboard-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `organization_id=eq.${organization.id}`,
          },
          () => {
            fetchTaskStats()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [organization])

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('scoreboard_metrics')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMetrics(data || [])
    } catch (error: any) {
      console.error('Error fetching metrics:', error)
      toast.error('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  const fetchTaskStats = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .eq('organization_id', organization?.id)

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        completed: data?.filter((t) => t.status === 'completed').length || 0,
        inProgress: data?.filter((t) => t.status === 'in_progress').length || 0,
        pending: data?.filter((t) => t.status === 'pending').length || 0,
      }

      setTaskStats(stats)
    } catch (error: any) {
      console.error('Error fetching task stats:', error)
      toast.error('Failed to load statistics')
    }
  }

  const completionRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0

  const deleteMetric = async (metricId: string) => {
    if (!window.confirm('Are you sure you want to delete this metric? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('scoreboard_metrics')
        .delete()
        .eq('id', metricId)

      if (error) throw error
      toast.success('Metric deleted successfully')
      fetchMetrics()
    } catch (error: any) {
      console.error('Error deleting metric:', error)
      toast.error(error.message || 'Failed to delete metric')
    }
  }

  const updateMetricValue = async (metricId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('scoreboard_metrics')
        .update({ current_value: newValue })
        .eq('id', metricId)

      if (error) throw error
      toast.success('Metric value updated')
      fetchMetrics()
    } catch (error: any) {
      console.error('Error updating metric:', error)
      toast.error(error.message || 'Failed to update metric')
    }
  }

  // Auto-update metric values based on metric_type
  useEffect(() => {
    if (!organization || metrics.length === 0) return

    const updateMetricValues = async () => {
      for (const metric of metrics) {
        // Skip custom metrics - they need manual updates
        if (metric.metric_type === 'custom') continue

        let newValue = 0

        if (metric.metric_type === 'task_completion') {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('status')
            .eq('organization_id', organization.id)

          if (tasks) {
            const completed = tasks.filter((t) => t.status === 'completed').length
            const total = tasks.length
            newValue = total > 0 ? (completed / total) * 100 : 0
          }
        } else if (metric.metric_type === 'checklist_completion') {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('organization_id', organization.id)

          if (tasks && tasks.length > 0) {
            const taskIds = tasks.map(t => t.id)
            const { data: checklists } = await supabase
              .from('checklists')
              .select('id')
              .in('task_id', taskIds)

            if (checklists && checklists.length > 0) {
              let totalItems = 0
              let completedItems = 0

              for (const checklist of checklists) {
                const { data: items } = await supabase
                  .from('checklist_items')
                  .select('is_completed')
                  .eq('checklist_id', checklist.id)

                if (items) {
                  totalItems += items.length
                  completedItems += items.filter((i) => i.is_completed).length
                }
              }

              newValue = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
            }
          }
        }

        // Only update if value changed significantly
        if (Math.abs(newValue - metric.current_value) > 0.01) {
          await updateMetricValue(metric.id, newValue)
        }
      }
    }

    // Debounce updates to avoid too frequent calls
    const timeoutId = setTimeout(() => {
      updateMetricValues()
    }, 1000)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskStats.total, taskStats.completed, organization?.id, metrics.length])

  return (
    <div>
      <PageTitle>Scoreboard</PageTitle>

      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4 mt-6">
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
            <p className="mt-2 text-3xl font-semibold text-gray-700 dark:text-gray-200">
              {taskStats.total}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">{taskStats.completed}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
            <p className="mt-2 text-3xl font-semibold text-blue-600">{taskStats.inProgress}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</p>
            <p className="mt-2 text-3xl font-semibold text-purple-600">{Math.round(completionRate)}%</p>
          </div>
        </Card>
      </div>

      {metrics.length > 0 && (
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Metrics Overview</h2>
            <div className="h-64">
              <MetricTrendChart metrics={metrics} />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Custom Metrics</h2>
            <Button size="small" onClick={() => navigate('/scoreboard/metrics/new')}>
              Add Metric
            </Button>
          </div>
          {loading ? (
            <CardSkeleton />
          ) : metrics.length === 0 ? (
            <p className="text-gray-500">No custom metrics configured</p>
          ) : (
            <div className="space-y-4">
              {metrics.map((metric) => (
                <div key={metric.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{metric.name}</h3>
                      {metric.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{metric.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{Math.round(metric.current_value)}</p>
                        <p className="text-sm text-gray-500">/ {metric.target_value}</p>
                      </div>
                      {appUser && (hasPermission(appUser.role, 'metrics.edit') || hasPermission(appUser.role, 'metrics.delete')) && (
                        <div className="flex gap-2">
                          {hasPermission(appUser.role, 'metrics.edit') && (
                            <Button
                              size="small"
                              layout="outline"
                              onClick={() => navigate(`/scoreboard/metrics/${metric.id}/edit`)}
                            >
                              Edit
                            </Button>
                          )}
                          {hasPermission(appUser.role, 'metrics.delete') && (
                            <Button
                              size="small"
                              layout="outline"
                              onClick={() => deleteMetric(metric.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full"
                      style={{
                        width: `${Math.min((metric.current_value / metric.target_value) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default ScoreboardPage

