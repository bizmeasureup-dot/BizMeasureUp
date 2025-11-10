-- Migration: Update task_status enum to remove in_progress and cancelled, add rescheduling and not_applicable
-- This migration:
-- 1. Adds new enum values (rescheduling, not_applicable)
-- 2. Migrates existing data (in_progress -> pending, cancelled -> not_applicable)
-- 3. Note: PostgreSQL doesn't allow removing enum values, so we'll rely on application-level constraints

-- Step 1: Add new enum values if they don't exist
DO $$ 
BEGIN
    -- Add 'rescheduling' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'rescheduling' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
    ) THEN
        ALTER TYPE task_status ADD VALUE 'rescheduling';
    END IF;
    
    -- Add 'not_applicable' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'not_applicable' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
    ) THEN
        ALTER TYPE task_status ADD VALUE 'not_applicable';
    END IF;
END $$;

-- Step 2: Migrate existing data
-- Convert 'in_progress' to 'pending'
UPDATE public.tasks
SET status = 'pending'::task_status
WHERE status = 'in_progress'::task_status;

-- Convert 'cancelled' to 'not_applicable'
UPDATE public.tasks
SET status = 'not_applicable'::task_status
WHERE status = 'cancelled'::task_status;

-- Step 3: Create function to update task status when reschedule request is created
CREATE OR REPLACE FUNCTION update_task_status_on_reschedule_request()
RETURNS TRIGGER AS $$
BEGIN
    -- When a reschedule request is created with status 'pending', set task status to 'rescheduling'
    IF NEW.status = 'pending' THEN
        UPDATE public.tasks
        SET 
            status = 'rescheduling'::task_status,
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = NEW.task_id
        AND status != 'completed'::task_status
        AND status != 'not_applicable'::task_status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger to automatically update task status when reschedule request is created
DROP TRIGGER IF EXISTS trigger_update_task_status_on_reschedule_request ON public.ask_reschedule_requests;
CREATE TRIGGER trigger_update_task_status_on_reschedule_request
    AFTER INSERT ON public.ask_reschedule_requests
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION update_task_status_on_reschedule_request();

-- Step 5: Create function to check and update task status when reschedule request is resolved
CREATE OR REPLACE FUNCTION update_task_status_on_reschedule_resolution()
RETURNS TRIGGER AS $$
DECLARE
    pending_count INTEGER;
    task_status_record RECORD;
BEGIN
    -- Only process if status changed from 'pending' to 'approved' or 'rejected'
    IF OLD.status = 'pending' AND (NEW.status = 'approved' OR NEW.status = 'rejected') THEN
        -- Check if there are other pending requests for this task
        SELECT COUNT(*) INTO pending_count
        FROM public.ask_reschedule_requests
        WHERE task_id = NEW.task_id
        AND status = 'pending'
        AND id != NEW.id;
        
        -- Get current task status
        SELECT status INTO task_status_record
        FROM public.tasks
        WHERE id = NEW.task_id;
        
        -- If no pending requests remain and task is in 'rescheduling' status, revert to 'pending'
        IF pending_count = 0 AND task_status_record.status = 'rescheduling'::task_status THEN
            UPDATE public.tasks
            SET 
                status = 'pending'::task_status,
                updated_at = TIMEZONE('utc', NOW())
            WHERE id = NEW.task_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to update task status when reschedule request is resolved
DROP TRIGGER IF EXISTS trigger_update_task_status_on_reschedule_resolution ON public.ask_reschedule_requests;
CREATE TRIGGER trigger_update_task_status_on_reschedule_resolution
    AFTER UPDATE ON public.ask_reschedule_requests
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND (NEW.status = 'approved' OR NEW.status = 'rejected'))
    EXECUTE FUNCTION update_task_status_on_reschedule_resolution();

