-- Create storage bucket for task attachments
-- Note: This needs to be run in Supabase Dashboard > Storage
-- The bucket creation must be done via the Supabase Dashboard or API
-- This file contains the SQL for RLS policies only

-- Storage bucket policies for task-attachments
-- First, create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: task-attachments
-- 4. Public bucket: Yes (to allow viewing attachments)
-- 5. File size limit: Set as needed (default is fine)
-- 6. Allowed MIME types: Leave empty to allow all types

-- After creating the bucket, run the following policies:

-- Policy: Allow authenticated users to upload files for tasks in their organizations
-- Extract task ID from folder name (format: task-{taskId})
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments' AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id::text = REPLACE((storage.foldername(name))[1], 'task-', '')
    AND (
      -- User is assigned to the task
      tasks.assigned_to = auth.uid()
      OR
      -- User is in the same organization as the task
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  )
);

-- Policy: Allow users to view/download attachments for tasks they can see
-- Extract task ID from folder name (format: task-{taskId})
CREATE POLICY "Users can view task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id::text = REPLACE((storage.foldername(name))[1], 'task-', '')
    AND (
      -- User is assigned to the task
      tasks.assigned_to = auth.uid()
      OR
      -- User is in the same organization as the task
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  )
);

-- Policy: Allow users to delete their own uploaded attachments (optional)
-- Extract task ID from folder name (format: task-{taskId})
CREATE POLICY "Users can delete task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id::text = REPLACE((storage.foldername(name))[1], 'task-', '')
    AND (
      tasks.assigned_to = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
      )
    )
  )
);

