-- Create enum type for change types
CREATE TYPE task_history_change_type AS ENUM ('status', 'assignment', 'due_date', 'reschedule_request');

-- Create ask_history table
CREATE TABLE public.ask_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  change_type task_history_change_type NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_ask_history_task_id ON public.ask_history(task_id);
CREATE INDEX idx_ask_history_created_at ON public.ask_history(created_at);
CREATE INDEX idx_ask_history_changed_by ON public.ask_history(changed_by);

-- Enable RLS
ALTER TABLE public.ask_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view history for tasks in their organizations
CREATE POLICY "Users can view task history in their organizations"
  ON public.ask_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = ask_history.task_id
      AND (
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_members.organization_id = tasks.organization_id
          AND organization_members.user_id = auth.uid()
        )
        OR tasks.assigned_to = auth.uid()
      )
    )
  );

-- RLS Policy: System can insert history (via triggers and functions)
CREATE POLICY "System can insert task history"
  ON public.ask_history FOR INSERT
  WITH CHECK (true);

-- Function to log task history
CREATE OR REPLACE FUNCTION log_task_history(
  p_task_id UUID,
  p_changed_by UUID,
  p_change_type task_history_change_type,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  history_id UUID;
BEGIN
  INSERT INTO public.ask_history (
    task_id,
    changed_by,
    change_type,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_task_id,
    p_changed_by,
    p_change_type,
    p_old_value,
    p_new_value,
    p_metadata
  ) RETURNING id INTO history_id;
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log task changes via trigger
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_user UUID;
BEGIN
  -- Get the current user (from auth context)
  changed_by_user := auth.uid();
  
  -- If no user context, skip logging (shouldn't happen in normal operation)
  IF changed_by_user IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_task_history(
      NEW.id,
      changed_by_user,
      'status',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  
  -- Log assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    PERFORM log_task_history(
      NEW.id,
      changed_by_user,
      'assignment',
      jsonb_build_object('assigned_to', OLD.assigned_to),
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  END IF;
  
  -- Log due date changes
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    PERFORM log_task_history(
      NEW.id,
      changed_by_user,
      'due_date',
      CASE WHEN OLD.due_date IS NOT NULL THEN jsonb_build_object('due_date', OLD.due_date) ELSE NULL END,
      CASE WHEN NEW.due_date IS NOT NULL THEN jsonb_build_object('due_date', NEW.due_date) ELSE NULL END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log task changes
CREATE TRIGGER task_changes_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR
    OLD.due_date IS DISTINCT FROM NEW.due_date
  )
  EXECUTE FUNCTION log_task_changes();

-- Function to log reschedule request history
CREATE OR REPLACE FUNCTION log_reschedule_request_history(
  p_request_id UUID,
  p_action TEXT -- 'approved' or 'rejected'
)
RETURNS UUID AS $$
DECLARE
  request_record RECORD;
  history_id UUID;
BEGIN
  -- Get the request details
  SELECT * INTO request_record
  FROM public.ask_reschedule_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Determine who made the change
  DECLARE
    changed_by_user UUID;
  BEGIN
    IF p_action = 'approved' THEN
      changed_by_user := request_record.approved_by;
    ELSIF p_action = 'rejected' THEN
      changed_by_user := request_record.rejected_by;
    END IF;
    
    IF changed_by_user IS NULL THEN
      RETURN NULL;
    END IF;
    
    -- Log the history
    INSERT INTO public.ask_history (
      task_id,
      changed_by,
      change_type,
      old_value,
      new_value,
      metadata
    ) VALUES (
      request_record.task_id,
      changed_by_user,
      'reschedule_request',
      jsonb_build_object(
        'current_due_date', request_record.current_due_date,
        'requested_due_date', request_record.requested_due_date,
        'status', 'pending'
      ),
      jsonb_build_object(
        'due_date', CASE WHEN p_action = 'approved' THEN request_record.requested_due_date ELSE request_record.current_due_date END,
        'status', p_action
      ),
      jsonb_build_object(
        'request_id', request_record.id,
        'requested_by', request_record.requested_by,
        'action', p_action,
        'rejection_reason', CASE WHEN p_action = 'rejected' THEN request_record.rejection_reason ELSE NULL END
      )
    ) RETURNING id INTO history_id;
    
    RETURN history_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update approve_reschedule_request function to log history
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
  
  -- Update task due_date
  UPDATE public.tasks
  SET 
    due_date = request_record.requested_due_date,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = request_record.task_id;
  
  -- Log history
  PERFORM log_reschedule_request_history(request_id, 'approved');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reject_reschedule_request function to log history
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
  
  -- Log history
  PERFORM log_reschedule_request_history(request_id, 'rejected');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


