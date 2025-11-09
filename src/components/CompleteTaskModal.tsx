import React, { useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToastContext } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Task } from '@/types'
import { Button, Label, Input } from '@roketid/windmill-react-ui'
import Modal from './Modal'

interface CompleteTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  task: Task | null
}

function CompleteTaskModal({ isOpen, onClose, onSuccess, task }: CompleteTaskModalProps) {
  const { appUser } = useAuth()
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const uploadAttachment = async (file: File, taskId: string): Promise<string | null> => {
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${taskId}-${Date.now()}.${fileExt}`
      const filePath = `task-${taskId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.error === 'Bucket not found') {
          toast.error(
            'Storage bucket not found. Please create the "task-attachments" bucket in Supabase Dashboard > Storage.',
            5000
          )
          console.error(
            'Setup required: Create a storage bucket named "task-attachments" in Supabase Dashboard:\n' +
            '1. Go to Storage in Supabase Dashboard\n' +
            '2. Click "New bucket"\n' +
            '3. Name: task-attachments\n' +
            '4. Public bucket: Yes\n' +
            '5. Then run the policies from supabase/storage-setup.sql'
          )
          return null
        }
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL')
      }

      return urlData.publicUrl
    } catch (error: any) {
      console.error('Error uploading attachment:', error)
      toast.error(error.message || 'Failed to upload attachment')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !appUser) return

    // Validate attachment requirement
    if (task.attachment_required && !selectedFile) {
      toast.error('Attachment is required to complete this task')
      return
    }

    setLoading(true)

    try {
      let attachmentUrl: string | null = null

      // Upload attachment if provided
      if (selectedFile) {
        attachmentUrl = await uploadAttachment(selectedFile, task.id)
        if (task.attachment_required && !attachmentUrl) {
          // Upload failed and attachment is required
          setLoading(false)
          return
        }
      }

      // Update task status to completed
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes || null,
          completion_attachment_url: attachmentUrl,
        })
        .eq('id', task.id)

      if (error) throw error

      toast.success('Task marked as complete!')
      onSuccess?.()
      onClose()
      
      // Reset form
      setCompletionNotes('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error completing task:', error)
      toast.error(error.message || 'Failed to complete task')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCompletionNotes('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!task) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mark Task as Complete">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task: {task.title}
          </h4>
          {task.attachment_required && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ This task requires an attachment to be completed.
              </p>
            </div>
          )}
        </div>

        <Label className="mt-4">
          <span>Completion Notes</span>
          <Input
            className="mt-1"
            tag="textarea"
            rows={4}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Add any notes about task completion..."
          />
        </Label>

        <Label className="mt-4">
          <span>
            Attachment {task.attachment_required && <span className="text-red-500">*</span>}
          </span>
          <input
            ref={fileInputRef}
            className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-blue-900 dark:file:text-blue-300
              dark:hover:file:bg-blue-800
              cursor-pointer"
            type="file"
            onChange={handleFileSelect}
            required={task.attachment_required}
          />
          {selectedFile && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </Label>

        <div className="mt-6 flex gap-4 justify-end">
          <Button layout="outline" type="button" onClick={handleClose} disabled={loading || uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploading}>
            {uploading ? 'Uploading...' : loading ? 'Completing...' : 'Mark Complete'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CompleteTaskModal

