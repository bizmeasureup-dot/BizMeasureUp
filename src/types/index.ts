// User and Organization Types
export type UserRole = 'admin' | 'owner' | 'doer' | 'viewer'

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: UserRole
  created_at: string
}

// Task Types
export type TaskStatus = 'pending' | 'rescheduling' | 'completed' | 'not_applicable'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RescheduleRequestStatus = 'pending' | 'approved' | 'rejected'

export interface RescheduleRequest {
  id: string
  task_id: string
  requested_by: string
  requested_due_date: string
  current_due_date?: string
  status: RescheduleRequestStatus
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  expires_at: string
  created_at: string
  updated_at: string
  // Joined fields
  task?: Task
  requester?: User
  approver?: User
  rejector?: User
}

export interface Task {
  id: string
  organization_id: string
  title: string
  description?: string
  assigned_to: string
  created_by: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  original_due_date?: string
  completed_at?: string
  attachment_required: boolean
  completion_attachment_url?: string
  completion_notes?: string
  created_at: string
  updated_at: string
}

// Checklist Types
export interface Checklist {
  id: string
  task_id: string
  title: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  title: string
  description?: string
  is_completed: boolean
  completed_by?: string
  completed_at?: string
  order_index: number
  created_at: string
  updated_at: string
}

// Scoreboard Types
export type MetricType = 'task_completion' | 'checklist_completion' | 'custom'
export type MetricPeriod = 'daily' | 'weekly' | 'monthly'

export interface ScoreboardMetric {
  id: string
  organization_id: string
  name: string
  description?: string
  metric_type: MetricType
  target_value: number
  current_value: number
  period: MetricPeriod
  created_at: string
  updated_at: string
}

// Flow View Types
export type FlowViewType = 'kanban' | 'list' | 'calendar' | 'gantt'

export interface FlowView {
  id: string
  organization_id: string
  name: string
  description?: string
  view_type: FlowViewType
  filter_config?: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}

// Task History Types
export type TaskHistoryChangeType = 'status' | 'assignment' | 'due_date' | 'reschedule_request'

export interface TaskHistory {
  id: string
  task_id: string
  changed_by: string
  change_type: TaskHistoryChangeType
  old_value?: Record<string, any>
  new_value?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  // Joined fields
  changed_by_user?: User
}

