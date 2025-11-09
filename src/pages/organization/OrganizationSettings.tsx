import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Organization } from '@/types'
import { Button, Card, Label, Input } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { hasPermission } from '@/lib/rbac'

function OrganizationSettingsPage() {
  const { organization, appUser, refreshUser } = useAuth()
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        description: organization.description || '',
      })
      setLoading(false)
    }
  }, [organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !appUser) return

    const canManage = hasPermission(appUser.role, 'organization.manage')
    if (!canManage) {
      toast.error('You do not have permission to manage organization settings')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          description: formData.description || null,
        })
        .eq('id', organization.id)

      if (error) throw error

      toast.success('Organization updated successfully!')
      await refreshUser()
    } catch (error: any) {
      console.error('Error updating organization:', error)
      toast.error(error.message || 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <CardSkeleton />
  }

  if (!organization) {
    return (
      <Card>
        <div className="p-6 text-center text-gray-500">
          You are not part of an organization
        </div>
      </Card>
    )
  }

  const canManage = appUser && hasPermission(appUser.role, 'organization.manage')

  return (
    <div>
      <PageTitle>Organization Settings</PageTitle>

      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Organization Details</h2>
          {canManage ? (
            <form onSubmit={handleSubmit}>
              <Label className="mt-4">
                <span>Organization Name *</span>
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
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Label>

              <div className="mt-6">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Name:</strong> {organization.name}
              </p>
              {organization.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  <strong>Description:</strong> {organization.description}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-4">
                You do not have permission to edit organization settings
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default OrganizationSettingsPage

