import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { useRecurringTasks, pauseRecurringTask, resumeRecurringTask, endRecurringTask } from '@/hooks/useRecurringTasks'
import { RecurringTaskTemplate } from '@/types'
import { formatRecurrenceDescription, getRecurringTemplateStatus } from '@/lib/recurringTaskUtils'
import { Button, Card, Badge, Input } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import CreateRecurringTaskModal from './CreateRecurringTaskModal'
import RecurringTaskHistoryModal from './RecurringTaskHistoryModal'
import { hasPermission } from '@/lib/rbac'

function RecurringTaskManager() {
  const { organization, appUser } = useAuth()
  const toast = useToastContext()
  const { templates, loading, error, refetch } = useRecurringTasks(organization?.id || null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewingHistoryTemplateId, setViewingHistoryTemplateId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const canCreate = appUser && hasPermission(appUser.role, 'tasks.create')

  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      template.title.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      false
    )
  })

  const handlePause = async (templateId: string) => {
    const result = await pauseRecurringTask(templateId)
    if (result.success) {
      toast.success('Recurring task paused')
      refetch()
    } else {
      toast.error(result.error || 'Failed to pause recurring task')
    }
  }

  const handleResume = async (templateId: string) => {
    const result = await resumeRecurringTask(templateId)
    if (result.success) {
      toast.success('Recurring task resumed')
      refetch()
    } else {
      toast.error(result.error || 'Failed to resume recurring task')
    }
  }

  const handleEnd = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to end this recurring task series? This action cannot be undone.')) {
      return
    }

    const result = await endRecurringTask(templateId)
    if (result.success) {
      toast.success('Recurring task series ended')
      refetch()
    } else {
      toast.error(result.error || 'Failed to end recurring task')
    }
  }

  const canManage = (template: RecurringTaskTemplate): boolean => {
    if (!appUser) return false
    return (
      template.created_by === appUser.id ||
      hasPermission(appUser.role, 'tasks.edit')
    )
  }

  const getStatusBadge = (template: RecurringTaskTemplate) => {
    const status = getRecurringTemplateStatus(template)
    if (status === 'Ended') {
      return <Badge type="neutral">Ended</Badge>
    }
    if (status === 'Paused') {
      return <Badge type="warning">Paused</Badge>
    }
    return <Badge type="success">Active</Badge>
  }

  if (error) {
    return (
      <div>
        <PageTitle>Recurring Tasks</PageTitle>
        <Card>
          <div className="p-6 text-center text-red-600 dark:text-red-400">
            Error: {error}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <PageTitle>Recurring Tasks</PageTitle>
        {canCreate && (
          <Button onClick={() => setIsCreateModalOpen(true)}>Create Recurring Task</Button>
        )}
      </div>

      <CreateRecurringTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch()
        }}
      />

      <RecurringTaskHistoryModal
        isOpen={viewingHistoryTemplateId !== null}
        onClose={() => setViewingHistoryTemplateId(null)}
        templateId={viewingHistoryTemplateId}
      />

      <div className="mb-4">
        <Input
          placeholder="Search recurring tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <Card>
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No recurring tasks match your search' : 'No recurring tasks found'}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {template.title}
                    </h3>
                    {getStatusBadge(template)}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Recurrence: </span>
                  <span className="font-medium">
                    {formatRecurrenceDescription(template)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Start Date: </span>
                  <span className="font-medium">
                    {new Date(template.start_date).toLocaleDateString()}
                  </span>
                </div>
                {template.end_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">End Date: </span>
                    <span className="font-medium">
                      {new Date(template.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {template.next_task_due_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Next Due: </span>
                    <span className="font-medium">
                      {new Date(template.next_task_due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Unlock Days: </span>
                  <span className="font-medium">
                    {template.unlock_days_before_due}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Priority: </span>
                  <Badge type={template.priority === 'urgent' ? 'danger' : template.priority === 'high' ? 'warning' : 'primary'}>
                    {template.priority}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {canManage(template) && (
                  <>
                    {!template.is_ended && (
                      <>
                        {template.is_paused ? (
                          <Button
                            size="small"
                            layout="outline"
                            onClick={() => handleResume(template.id)}
                          >
                            Resume
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            layout="outline"
                            onClick={() => handlePause(template.id)}
                          >
                            Pause
                          </Button>
                        )}
                        <Button
                          size="small"
                          layout="outline"
                          onClick={() => handleEnd(template.id)}
                        >
                          End Series
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button
                  size="small"
                  layout="outline"
                  onClick={() => setViewingHistoryTemplateId(template.id)}
                >
                  View History
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecurringTaskManager

