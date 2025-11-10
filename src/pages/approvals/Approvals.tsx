import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRescheduleRequests } from '@/hooks/useRescheduleRequests'
import { RescheduleRequestStatus } from '@/types'
import { Card, Button, Badge } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'
import ApprovalCard from '@/components/ApprovalCard'
import { CardSkeleton } from '@/components/LoadingSkeleton'

function ApprovalsPage() {
  const { organization, appUser } = useAuth()
  const [filter, setFilter] = useState<RescheduleRequestStatus | 'all'>('all')
  
  const { requests, loading, error, refetch, approveRequest, rejectRequest } = useRescheduleRequests({
    organizationId: organization?.id || null,
    status: filter !== 'all' ? filter : null,
  })

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const approvedRequests = requests.filter(r => r.status === 'approved')
  const rejectedRequests = requests.filter(r => r.status === 'rejected')

  if (loading) {
    return (
      <div>
        <PageTitle>Approvals</PageTitle>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageTitle>Approvals</PageTitle>
        <Card>
          <div className="p-6 text-center text-red-600">{error}</div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <PageTitle>Reschedule Approvals</PageTitle>
        <div className="flex gap-2">
          <Button
            size="small"
            layout={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({requests.length})
          </Button>
          <Button
            size="small"
            layout={filter === 'pending' ? 'primary' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingRequests.length})
          </Button>
          <Button
            size="small"
            layout={filter === 'approved' ? 'primary' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            Approved ({approvedRequests.length})
          </Button>
          <Button
            size="small"
            layout={filter === 'rejected' ? 'primary' : 'outline'}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({rejectedRequests.length})
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-gray-500">
            {filter === 'all'
              ? 'No reschedule requests found'
              : `No ${filter} reschedule requests found`}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <ApprovalCard
              key={request.id}
              request={request}
              onApprove={approveRequest}
              onReject={rejectRequest}
              onUpdate={refetch}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ApprovalsPage

