import React, { useState } from 'react'
import { useToastContext } from '@/context/ToastContext'
import { RescheduleRequest } from '@/types'
import { Card, Button, Badge } from '@roketid/windmill-react-ui'

interface ApprovalCardProps {
  request: RescheduleRequest
  onApprove: (requestId: string) => Promise<{ success: boolean; error: string | null }>
  onReject: (requestId: string, reason?: string) => Promise<{ success: boolean; error: string | null }>
  onUpdate?: () => void
}

function ApprovalCard({ request, onApprove, onReject, onUpdate }: ApprovalCardProps) {
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = async () => {
    setLoading(true)
    try {
      const result = await onApprove(request.id)
      if (result.success) {
        toast.success('Reschedule request approved!')
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to approve request')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve request')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (showRejectReason && !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      const result = await onReject(request.id, rejectReason || undefined)
      if (result.success) {
        toast.success('Reschedule request rejected')
        setShowRejectReason(false)
        setRejectReason('')
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to reject request')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success'
      case 'rejected':
        return 'danger'
      default:
        return 'warning'
    }
  }

  const isExpired = request.status === 'pending' && new Date(request.expires_at) < new Date()
  const daysUntilExpiry = request.status === 'pending'
    ? Math.ceil((new Date(request.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200">
              {request.task?.title || 'Task'}
            </h4>
            <Badge type={getStatusColor(request.status)}>{request.status}</Badge>
            {isExpired && request.status === 'pending' && (
              <Badge type="danger">Expired</Badge>
            )}
          </div>
          {request.requester && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Requested by: {request.requester.full_name || request.requester.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Current Due Date:</span>
          <p className="font-medium text-gray-700 dark:text-gray-300">
            {request.current_due_date
              ? new Date(request.current_due_date).toLocaleString()
              : 'Not set'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Requested Due Date:</span>
          <p className="font-medium text-gray-700 dark:text-gray-300">
            {new Date(request.requested_due_date).toLocaleString()}
          </p>
        </div>
      </div>

      {request.status === 'pending' && (
        <div className="mb-4">
          {daysUntilExpiry !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {isExpired
                ? 'This request has expired and will be auto-approved'
                : `Auto-approves in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}

      {request.status === 'rejected' && request.rejection_reason && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          <p className="text-sm text-red-600 dark:text-red-400">
            <strong>Rejection reason:</strong> {request.rejection_reason}
          </p>
        </div>
      )}

      {request.status === 'pending' && !isExpired && (
        <div className="flex gap-2">
          <Button
            size="small"
            onClick={handleApprove}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Processing...' : 'Approve'}
          </Button>
          {!showRejectReason ? (
            <Button
              size="small"
              layout="outline"
              onClick={() => setShowRejectReason(true)}
              disabled={loading}
            >
              Reject
            </Button>
          ) : (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Rejection reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleReject()
                  } else if (e.key === 'Escape') {
                    setShowRejectReason(false)
                    setRejectReason('')
                  }
                }}
              />
              <Button
                size="small"
                layout="outline"
                onClick={handleReject}
                disabled={loading}
              >
                Submit
              </Button>
              <Button
                size="small"
                layout="outline"
                onClick={() => {
                  setShowRejectReason(false)
                  setRejectReason('')
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {request.status === 'approved' && request.approver && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Approved by {request.approver.full_name || request.approver.email} on{' '}
          {request.approved_at ? new Date(request.approved_at).toLocaleString() : ''}
        </p>
      )}

      {request.status === 'rejected' && request.rejector && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Rejected by {request.rejector.full_name || request.rejector.email} on{' '}
          {request.rejected_at ? new Date(request.rejected_at).toLocaleString() : ''}
        </p>
      )}
    </Card>
  )
}

export default ApprovalCard

