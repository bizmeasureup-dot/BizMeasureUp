import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { ScoreboardMetric, Task } from '@/types'
import { Card, Button } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'

function ScoreboardPage() {
  const { organization } = useAuth()
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
                    <div>
                      <h3 className="font-semibold">{metric.name}</h3>
                      {metric.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{metric.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{metric.current_value}</p>
                      <p className="text-sm text-gray-500">/ {metric.target_value}</p>
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

