import { UserRole } from '@/types'

export type Permission = 
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.view_all'
  | 'tasks.view_assigned'
  | 'tasks.assign'
  | 'checklists.create'
  | 'checklists.edit'
  | 'checklists.delete'
  | 'checklists.complete'
  | 'checklists.view'
  | 'metrics.view'
  | 'metrics.create'
  | 'metrics.edit'
  | 'metrics.delete'
  | 'flow_views.create'
  | 'flow_views.edit'
  | 'flow_views.delete'
  | 'team.manage'
  | 'organization.manage'

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.view_all',
    'tasks.assign',
    'checklists.create',
    'checklists.edit',
    'checklists.delete',
    'checklists.complete',
    'metrics.view',
    'metrics.create',
    'metrics.edit',
    'metrics.delete',
    'flow_views.create',
    'flow_views.edit',
    'flow_views.delete',
    'team.manage',
    'organization.manage',
  ],
  owner: [
    'tasks.create',
    'tasks.edit',
    'tasks.view_all',
    'tasks.assign',
    'checklists.create',
    'checklists.edit',
    'checklists.complete',
    'metrics.view',
    'metrics.create',
    'metrics.edit',
    'flow_views.create',
    'flow_views.edit',
    'team.manage',
  ],
  doer: [
    'tasks.view_assigned',
    'tasks.edit', // Only for assigned tasks
    'checklists.complete',
    'metrics.view',
  ],
  viewer: [
    'tasks.view_all',
    'checklists.view',
    'metrics.view',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  // Define route access rules
  const routePermissions: Record<string, Permission[]> = {
    '/delegation': ['tasks.view_all', 'tasks.view_assigned'],
    '/delegation/tasks/new': ['tasks.create'],
    '/checklists': ['checklists.view'],
    '/scoreboard': ['metrics.view'],
    '/fms': ['flow_views.create'],
    '/admin': ['organization.manage'],
  }

  const requiredPermissions = routePermissions[route]
  if (!requiredPermissions) return true // Public routes

  return requiredPermissions.some(permission => hasPermission(role, permission))
}

