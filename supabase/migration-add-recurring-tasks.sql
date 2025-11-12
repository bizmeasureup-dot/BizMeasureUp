-- Migration: Add recurring task system
-- This migration creates the recurring_task_templates table and adds support for recurring tasks

-- Create recurring_task_templates table
CREATE TABLE public.recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  priority task_priority NOT NULL DEFAULT 'medium',
  attachment_required BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  recurrence_interval INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
  recurrence_day_of_week INTEGER CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6),
  recurrence_day_of_month INTEGER CHECK (recurrence_day_of_month >= 1 AND recurrence_day_of_month <= 31),
  recurrence_month INTEGER CHECK (recurrence_month >= 1 AND recurrence_month <= 12),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  unlock_days_before_due INTEGER NOT NULL DEFAULT 0 CHECK (unlock_days_before_due >= 0),
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  is_ended BOOLEAN NOT NULL DEFAULT FALSE,
  next_task_due_date TIMESTAMP WITH TIME ZONE,
  last_generated_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add recurring_template_id to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES public.recurring_task_templates(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_recurring_task_templates_organization_id ON public.recurring_task_templates(organization_id);
CREATE INDEX idx_recurring_task_templates_created_by ON public.recurring_task_templates(created_by);
CREATE INDEX idx_recurring_task_templates_assigned_to ON public.recurring_task_templates(assigned_to);
CREATE INDEX idx_recurring_task_templates_is_paused ON public.recurring_task_templates(is_paused);
CREATE INDEX idx_recurring_task_templates_is_ended ON public.recurring_task_templates(is_ended);
CREATE INDEX idx_tasks_recurring_template_id ON public.tasks(recurring_template_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurring_task_templates_updated_at
  BEFORE UPDATE ON public.recurring_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_task_templates_updated_at();

-- Function to calculate next recurring due date
CREATE OR REPLACE FUNCTION calculate_next_recurring_due_date(
  p_template_id UUID,
  p_last_due_date TIMESTAMP WITH TIME ZONE
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  template_record RECORD;
  next_date TIMESTAMP WITH TIME ZONE;
  days_to_add INTEGER;
  months_to_add INTEGER;
  years_to_add INTEGER;
  target_day INTEGER;
  target_month INTEGER;
  last_date DATE;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM public.recurring_task_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if template is paused or ended
  IF template_record.is_paused OR template_record.is_ended THEN
    RETURN NULL;
  END IF;
  
  -- Check if end_date has been reached
  IF template_record.end_date IS NOT NULL AND p_last_due_date >= template_record.end_date THEN
    RETURN NULL;
  END IF;
  
  last_date := DATE(p_last_due_date);
  
  -- Calculate next date based on recurrence type
  CASE template_record.recurrence_type
    WHEN 'daily' THEN
      next_date := last_date + (template_record.recurrence_interval || ' days')::INTERVAL;
    
    WHEN 'weekly' THEN
      -- For weekly, add weeks
      next_date := last_date + (template_record.recurrence_interval || ' weeks')::INTERVAL;
      -- If day_of_week is specified, adjust to that day
      IF template_record.recurrence_day_of_week IS NOT NULL THEN
        -- Find next occurrence of that weekday
        WHILE EXTRACT(DOW FROM next_date)::INTEGER != template_record.recurrence_day_of_week LOOP
          next_date := next_date + INTERVAL '1 day';
        END LOOP;
      END IF;
    
    WHEN 'monthly' THEN
      -- For monthly, add months
      next_date := last_date + (template_record.recurrence_interval || ' months')::INTERVAL;
      -- If day_of_month is specified, try to set that day
      IF template_record.recurrence_day_of_month IS NOT NULL THEN
        target_day := template_record.recurrence_day_of_month;
        -- Handle month end edge case (e.g., 31st of month)
        BEGIN
          next_date := DATE_TRUNC('month', next_date) + (target_day - 1 || ' days')::INTERVAL;
        EXCEPTION WHEN OTHERS THEN
          -- If day doesn't exist in month (e.g., Feb 31), use last day of month
          next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        END;
      END IF;
    
    WHEN 'yearly' THEN
      -- For yearly, add years
      next_date := last_date + (template_record.recurrence_interval || ' years')::INTERVAL;
      -- If month and day are specified, set them
      IF template_record.recurrence_month IS NOT NULL AND template_record.recurrence_day_of_month IS NOT NULL THEN
        target_month := template_record.recurrence_month;
        target_day := template_record.recurrence_day_of_month;
        BEGIN
          next_date := MAKE_DATE(
            EXTRACT(YEAR FROM next_date)::INTEGER,
            target_month,
            target_day
          );
        EXCEPTION WHEN OTHERS THEN
          -- Handle leap year edge case (Feb 29)
          IF target_month = 2 AND target_day = 29 THEN
            -- Use Feb 28 if not a leap year
            next_date := MAKE_DATE(
              EXTRACT(YEAR FROM next_date)::INTEGER,
              2,
              28
            );
          ELSE
            -- Use last day of month
            next_date := (DATE_TRUNC('month', MAKE_DATE(
              EXTRACT(YEAR FROM next_date)::INTEGER,
              target_month,
              1
            )) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
          END IF;
        END;
      END IF;
    
    WHEN 'custom' THEN
      -- For custom, treat interval as days
      next_date := last_date + (template_record.recurrence_interval || ' days')::INTERVAL;
    
    ELSE
      RETURN NULL;
  END CASE;
  
  -- Check if calculated date exceeds end_date
  IF template_record.end_date IS NOT NULL AND next_date > template_record.end_date THEN
    RETURN NULL;
  END IF;
  
  -- Preserve time from last_due_date if it had a time component
  IF p_last_due_date::TIME != '00:00:00' THEN
    next_date := next_date + (p_last_due_date::TIME);
  END IF;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next recurring task
CREATE OR REPLACE FUNCTION generate_next_recurring_task(p_completed_task_id UUID)
RETURNS UUID AS $$
DECLARE
  completed_task RECORD;
  template_record RECORD;
  next_due_date TIMESTAMP WITH TIME ZONE;
  new_task_id UUID;
BEGIN
  -- Get completed task
  SELECT * INTO completed_task
  FROM public.tasks
  WHERE id = p_completed_task_id
    AND status = 'completed'
    AND recurring_template_id IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get template
  SELECT * INTO template_record
  FROM public.recurring_task_templates
  WHERE id = completed_task.recurring_template_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if template is paused or ended
  IF template_record.is_paused OR template_record.is_ended THEN
    RETURN NULL;
  END IF;
  
  -- Check if there's already a pending task for this template
  -- (Only one future task should exist at a time)
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE recurring_template_id = template_record.id
      AND status = 'pending'
      AND (due_date IS NULL OR due_date > TIMEZONE('utc', NOW()))
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Calculate next due date
  next_due_date := calculate_next_recurring_due_date(
    template_record.id,
    COALESCE(completed_task.due_date, completed_task.original_due_date, TIMEZONE('utc', NOW()))
  );
  
  IF next_due_date IS NULL THEN
    -- End date reached or template ended
    UPDATE public.recurring_task_templates
    SET is_ended = TRUE
    WHERE id = template_record.id;
    RETURN NULL;
  END IF;
  
  -- Create new task
  INSERT INTO public.tasks (
    organization_id,
    title,
    description,
    assigned_to,
    created_by,
    status,
    priority,
    due_date,
    original_due_date,
    attachment_required,
    recurring_template_id
  ) VALUES (
    template_record.organization_id,
    template_record.title,
    template_record.description,
    template_record.assigned_to,
    template_record.created_by,
    'pending',
    template_record.priority,
    next_due_date,
    next_due_date,
    template_record.attachment_required,
    template_record.id
  )
  RETURNING id INTO new_task_id;
  
  -- Update template
  UPDATE public.recurring_task_templates
  SET 
    last_generated_task_id = new_task_id,
    next_task_due_date = calculate_next_recurring_due_date(template_record.id, next_due_date),
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = template_record.id;
  
  RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to pause recurring template
CREATE OR REPLACE FUNCTION pause_recurring_template(p_template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.recurring_task_templates
  SET 
    is_paused = TRUE,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_template_id
    AND is_ended = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resume recurring template
CREATE OR REPLACE FUNCTION resume_recurring_template(p_template_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  template_record RECORD;
  next_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM public.recurring_task_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND OR template_record.is_ended THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate next due date based on last generated task or start date
  IF template_record.last_generated_task_id IS NOT NULL THEN
    SELECT due_date INTO next_due_date
    FROM public.tasks
    WHERE id = template_record.last_generated_task_id;
    
    IF next_due_date IS NOT NULL THEN
      next_due_date := calculate_next_recurring_due_date(p_template_id, next_due_date);
    END IF;
  END IF;
  
  IF next_due_date IS NULL THEN
    next_due_date := calculate_next_recurring_due_date(p_template_id, template_record.start_date);
  END IF;
  
  UPDATE public.recurring_task_templates
  SET 
    is_paused = FALSE,
    next_task_due_date = next_due_date,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_template_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end recurring template
CREATE OR REPLACE FUNCTION end_recurring_template(p_template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.recurring_task_templates
  SET 
    is_ended = TRUE,
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_template_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate next recurring task when task is completed
CREATE OR REPLACE FUNCTION auto_generate_recurring_task_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if status changed to 'completed' and task has recurring_template_id
  IF NEW.status = 'completed' 
     AND OLD.status != 'completed'
     AND NEW.recurring_template_id IS NOT NULL THEN
    PERFORM generate_next_recurring_task(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_recurring_task_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION auto_generate_recurring_task_trigger();

-- Enable RLS
ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view templates in their organizations
CREATE POLICY "Users can view recurring templates in their organizations"
  ON public.recurring_task_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = recurring_task_templates.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Admins and owners can create templates
CREATE POLICY "Admins and owners can create recurring templates"
  ON public.recurring_task_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = recurring_task_templates.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'owner')
    )
    AND created_by = auth.uid()
  );

-- RLS Policy: Task creators can update their templates
CREATE POLICY "Task creators can update their recurring templates"
  ON public.recurring_task_templates FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policy: Admins can update any template
CREATE POLICY "Admins can update any recurring template"
  ON public.recurring_task_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = recurring_task_templates.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- RLS Policy: Owners can update templates
CREATE POLICY "Owners can update recurring templates"
  ON public.recurring_task_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = recurring_task_templates.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- RLS Policy: Task creators can delete their templates
CREATE POLICY "Task creators can delete their recurring templates"
  ON public.recurring_task_templates FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policy: Admins can delete any template
CREATE POLICY "Admins can delete any recurring template"
  ON public.recurring_task_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = recurring_task_templates.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

