import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { User, UserRole, OrganizationMember } from '@/types'
import { Button, Card, Label, Input, Select, Badge } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { hasPermission } from '@/lib/rbac'

function TeamManagementPage() {
  const { organization, appUser } = useAuth()
  const toast = useToastContext()
  const [members, setMembers] = useState<(OrganizationMember & { user: User })[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (organization) {
      fetchMembers()
    }
  }, [organization])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, users(*)')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMembers((data || []).map((m: any) => ({ ...m, user: m.users })) as (OrganizationMember & { user: User })[])
    } catch (error: any) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !appUser) return

    setInviting(true)

    try {
      // First check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .maybeSingle()

      if (userError && userError.code !== 'PGRST116') throw userError

      if (!existingUser) {
        toast.error('User with this email does not exist. They need to sign up first.')
        setInviting(false)
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (existingMember) {
        toast.error('User is already a member of this organization')
        setInviting(false)
        return
      }

      // Add member
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: existingUser.id,
          role: inviteRole,
        })

      if (error) throw error

      toast.success('Team member added successfully!')
      setInviteEmail('')
      setInviteRole('viewer')
      fetchMembers()
    } catch (error: any) {
      console.error('Error adding team member:', error)
      toast.error(error.message || 'Failed to add team member')
    } finally {
      setInviting(false)
    }
  }

  const updateMemberRole = async (memberId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      toast.success('Member role updated')
      fetchMembers()
    } catch (error: any) {
      console.error('Error updating member role:', error)
      toast.error(error.message || 'Failed to update member role')
    }
  }

  const removeMember = async (memberId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from the team?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      toast.success('Team member removed')
      fetchMembers()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || 'Failed to remove team member')
    }
  }

  if (loading) {
    return <CardSkeleton />
  }

  const canManage = appUser && hasPermission(appUser.role, 'team.manage')

  return (
    <div>
      <PageTitle>Team Management</PageTitle>

      {canManage && (
        <Card className="mt-6 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Invite Team Member</h2>
            <form onSubmit={handleInvite}>
              <Label className="mt-4">
                <span>Email Address *</span>
                <Input
                  className="mt-1"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  User must already have an account
                </p>
              </Label>

              <Label className="mt-4">
                <span>Role</span>
                <Select
                  className="mt-1"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="doer">Doer</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </Select>
              </Label>

              <div className="mt-6">
                <Button type="submit" disabled={inviting}>
                  {inviting ? 'Adding...' : 'Add Team Member'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Team Members</h2>
          {members.length === 0 ? (
            <p className="text-gray-500">No team members found</p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {member.user.full_name || member.user.email}
                    </p>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge type={member.role === 'admin' ? 'danger' : member.role === 'owner' ? 'warning' : 'primary'}>
                      {member.role}
                    </Badge>
                    {canManage && member.user.id !== appUser?.id && (
                      <div className="flex gap-2">
                        <Select
                          size="small"
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as UserRole)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="doer">Doer</option>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </Select>
                        <Button
                          size="small"
                          layout="outline"
                          onClick={() => removeMember(member.id, member.user.full_name || member.user.email)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
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

export default TeamManagementPage

