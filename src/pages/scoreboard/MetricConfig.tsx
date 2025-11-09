import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { MetricType, MetricPeriod } from '@/types'
import { Button, Card, Label, Input, Select } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'

function MetricConfigPage() {
  const { organization, appUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric_type: 'task_completion' as MetricType,
    target_value: 100,
    period: 'monthly' as MetricPeriod,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !appUser) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('scoreboard_metrics')
        .insert({
          organization_id: organization.id,
          name: formData.name,
          description: formData.description || null,
          metric_type: formData.metric_type,
          target_value: formData.target_value,
          current_value: 0,
          period: formData.period,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Metric created successfully!')
      navigate('/scoreboard')
    } catch (error: any) {
      console.error('Error creating metric:', error)
      toast.error(error.message || 'Failed to create metric')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageTitle>Create Metric</PageTitle>

      <Card className="mt-6">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <Label className="mt-4">
              <span>Metric Name *</span>
              <Input
                className="mt-1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Label>

            <Label className="mt-4">
              <span>Description</span>
              <Input
                className="mt-1"
                tag="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Label>

            <Label className="mt-4">
              <span>Metric Type</span>
              <Select
                className="mt-1"
                value={formData.metric_type}
                onChange={(e) => setFormData({ ...formData, metric_type: e.target.value as MetricType })}
              >
                <option value="task_completion">Task Completion</option>
                <option value="checklist_completion">Checklist Completion</option>
                <option value="custom">Custom</option>
              </Select>
            </Label>

            <Label className="mt-4">
              <span>Target Value</span>
              <Input
                className="mt-1"
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })}
                required
              />
            </Label>

            <Label className="mt-4">
              <span>Period</span>
              <Select
                className="mt-1"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as MetricPeriod })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Label>

            <div className="mt-6 flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Metric'}
              </Button>
              <Button layout="outline" type="button" onClick={() => navigate('/scoreboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default MetricConfigPage

