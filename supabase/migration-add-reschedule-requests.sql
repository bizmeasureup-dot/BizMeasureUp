-- Create ask_reschedule_requests table
CREATE TABLE public.ask_reschedule_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  requested_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  current_due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_ask_reschedule_requests_task_id ON public.ask_reschedule_requests(task_id);
CREATE INDEX idx_ask_reschedule_requests_requested_by ON public.ask_reschedule_requests(requested_by);
CREATE INDEX idx_ask_reschedule_requests_status ON public.ask_reschedule_requests(status);
CREATE INDEX idx_ask_reschedule_requests_expires_at ON public.ask_reschedule_requests(expires_at);
CREATE INDEX idx_ask_reschedule_requests_pending ON public.ask_reschedule_requests(status, expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.ask_reschedule_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view requests for tasks they created or where they're admin/owner
CREATE POLICY "Users can view reschedule requests for their tasks"
  ON public.ask_reschedule_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = ask_reschedule_requests.task_id
      AND (
        tasks.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.organization_id = tasks.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('admin', 'owner')
        )
      )
    )
    OR requested_by = auth.uid()
  );

-- RLS Policy: Users can create requests for tasks in their organization
CREATE POLICY "Users can create reschedule requests"
  ON public.ask_reschedule_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      INNER JOIN public.organization_members ON organization_members.organization_id = tasks.organization_id
      WHERE tasks.id = ask_reschedule_requests.task_id
      AND organization_members.user_id = auth.uid()
    )
    AND requested_by = auth.uid()
  );

-- RLS Policy: Only task creator or admin/owner can approve/reject
CREATE POLICY "Task creators and admins can approve/reject requests"
  ON public.ask_reschedule_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = ask_reschedule_requests.task_id
      AND (
        tasks.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.organization_id = tasks.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role IN ('admin', 'owner')
        )
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ask_reschedule_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ask_reschedule_requests_updated_at
  BEFORE UPDATE ON public.ask_reschedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ask_reschedule_requests_updated_at();

-- Function to auto-approve expired requests
CREATE OR REPLACE FUNCTION auto_approve_expired_reschedule_requests()
RETURNS INTEGER AS $$
DECLARE
  approved_count INTEGER;
BEGIN
  UPDATE public.ask_reschedule_requests
  SET 
    status = 'approved',
    approved_by = (
      SELECT created_by FROM public.tasks WHERE tasks.id = ask_reschedule_requests.task_id
    ),
    approved_at = TIMEZONE('utc', NOW()),
    updated_at = TIMEZONE('utc', NOW())
  WHERE 
    status = 'pending'
    AND expires_at < TIMEZONE('utc', NOW());
  
  GET DIAGNOSTICS approved_count = ROW_COUNT;
  
  -- Update tasks with approved due dates (preserve original_due_date)
  UPDATE public.tasks
  SET 
    due_date = ask_reschedule_requests.requested_due_date,
    updated_at = TIMEZONE('utc', NOW())
  FROM public.ask_reschedule_requests
  WHERE 
    tasks.id = ask_reschedule_requests.task_id
    AND ask_reschedule_requests.status = 'approved'
    AND ask_reschedule_requests.approved_at = (
      SELECT MAX(approved_at) 
      FROM public.ask_reschedule_requests 
      WHERE task_id = tasks.id AND status = 'approved'
    );
  -- Note: original_due_date is preserved automatically by the protect_original_due_date_trigger
  
  RETURN approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle approval
CREATE OR REPLACE FUNCTION approve_reschedule_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request
  SELECT * INTO request_record
  FROM public.ask_reschedule_requests
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = request_record.task_id
    AND (
      tasks.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
      )
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Update request
  UPDATE public.ask_reschedule_requests
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = TIMEZONE('utc', NOW()),
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = request_id;
  
  -- Update task due_date (preserve original_due_date)
  UPDATE public.tasks
  SET 
    due_date = request_record.requested_due_date,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = request_record.task_id;
  -- Note: original_due_date is preserved automatically by the protect_original_due_date_trigger
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle rejection
CREATE OR REPLACE FUNCTION reject_reschedule_request(request_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request
  SELECT * INTO request_record
  FROM public.ask_reschedule_requests
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = request_record.task_id
    AND (
      tasks.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
      )
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Update request
  UPDATE public.ask_reschedule_requests
  SET 
    status = 'rejected',
    rejected_by = auth.uid(),
    rejected_at = TIMEZONE('utc', NOW()),
    rejection_reason = reason,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = request_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

