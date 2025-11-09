import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { FlowView, FlowViewType } from '@/types'
import { Button, Card, Label, Input, Select } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { hasPermission } from '@/lib/rbac'

function FlowViewsPage() {
  const { organization, appUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [views, setViews] = useState<FlowView[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    view_type: 'kanban' as FlowViewType,
  })

  useEffect(() => {
    if (organization) {
      fetchViews()
    }
  }, [organization])

  const fetchViews = async () => {
    try {
      const { data, error } = await supabase
        .from('flow_views')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setViews(data || [])
    } catch (error: any) {
      console.error('Error fetching flow views:', error)
      toast.error('Failed to load flow views')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !appUser) return

    try {
      if (editingId) {
        const { error } = await supabase
          .from('flow_views')
          .update({
            name: formData.name,
            description: formData.description || null,
            view_type: formData.view_type,
          })
          .eq('id', editingId)

        if (error) throw error
        toast.success('Flow view updated successfully!')
      } else {
        const { error } = await supabase
          .from('flow_views')
          .insert({
            organization_id: organization.id,
            name: formData.name,
            description: formData.description || null,
            view_type: formData.view_type,
            created_by: appUser.id,
          })

        if (error) throw error
        toast.success('Flow view created successfully!')
      }

      setIsCreating(false)
      setEditingId(null)
      setFormData({ name: '', description: '', view_type: 'kanban' })
      fetchViews()
    } catch (error: any) {
      console.error('Error saving flow view:', error)
      toast.error(error.message || 'Failed to save flow view')
    }
  }

  const deleteView = async (viewId: string) => {
    if (!window.confirm('Are you sure you want to delete this flow view? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('flow_views')
        .delete()
        .eq('id', viewId)

      if (error) throw error
      toast.success('Flow view deleted successfully')
      fetchViews()
    } catch (error: any) {
      console.error('Error deleting flow view:', error)
      toast.error(error.message || 'Failed to delete flow view')
    }
  }

  const startEdit = (view: FlowView) => {
    setEditingId(view.id)
    setFormData({
      name: view.name,
      description: view.description || '',
      view_type: view.view_type,
    })
    setIsCreating(true)
  }

  const cancelEdit = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData({ name: '', description: '', view_type: 'kanban' })
  }

  const loadView = (view: FlowView) => {
    navigate(`/fms?view=${view.id}&type=${view.view_type}`)
  }

  if (loading) {
    return <CardSkeleton />
  }

  const canManage = appUser && hasPermission(appUser.role, 'flow_views.create')

  return (
    <div>
      <PageTitle>Flow Views</PageTitle>

      {canManage && (
        <div className="mt-6 mb-4">
          <Button onClick={() => setIsCreating(true)}>Create New View</Button>
        </div>
      )}

      {isCreating && (
        <Card className="mt-6 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Flow View' : 'Create Flow View'}
            </h2>
            <form onSubmit={handleSubmit}>
              <Label className="mt-4">
                <span>View Name *</span>
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
                <span>View Type</span>
                <Select
                  className="mt-1"
                  value={formData.view_type}
                  onChange={(e) => setFormData({ ...formData, view_type: e.target.value as FlowViewType })}
                >
                  <option value="kanban">Kanban</option>
                  <option value="list">List</option>
                  <option value="calendar">Calendar</option>
                  <option value="gantt">Gantt</option>
                </Select>
              </Label>

              <div className="mt-6 flex gap-4">
                <Button type="submit">
                  {editingId ? 'Save Changes' : 'Create View'}
                </Button>
                <Button layout="outline" type="button" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {views.length === 0 ? (
        <Card className="mt-6">
          <div className="p-6 text-center text-gray-500">
            No flow views created yet
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 mt-6">
          {views.map((view) => (
            <Card key={view.id}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{view.name}</h3>
                    {view.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {view.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Type: <span className="capitalize">{view.view_type}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="small" onClick={() => loadView(view)}>
                      Load View
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          size="small"
                          layout="outline"
                          onClick={() => startEdit(view)}
                        >
                          Edit
                        </Button>
                        {hasPermission(appUser!.role, 'flow_views.delete') && (
                          <Button
                            size="small"
                            layout="outline"
                            onClick={() => deleteView(view.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default FlowViewsPage

