-- Add original_due_date field to tasks table
ALTER TABLE public.tasks
ADD COLUMN original_due_date TIMESTAMP WITH TIME ZONE;

-- Set original_due_date = due_date for existing tasks that have a due_date
UPDATE public.tasks
SET original_due_date = due_date
WHERE due_date IS NOT NULL AND original_due_date IS NULL;

-- Create function to set original_due_date on task creation
CREATE OR REPLACE FUNCTION set_original_due_date_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If original_due_date is not set and due_date is set, set original_due_date = due_date
  IF NEW.original_due_date IS NULL AND NEW.due_date IS NOT NULL THEN
    NEW.original_due_date := NEW.due_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set original_due_date when a task is created
CREATE TRIGGER set_original_due_date_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_original_due_date_on_insert();

-- Create function to prevent updating original_due_date after it's been set
-- (unless explicitly setting it for the first time)
CREATE OR REPLACE FUNCTION protect_original_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow setting original_due_date if it's currently NULL and new value is not NULL
  IF OLD.original_due_date IS NULL AND NEW.original_due_date IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- If original_due_date was already set, don't allow it to be changed
  -- (unless the new value is the same)
  IF OLD.original_due_date IS NOT NULL AND OLD.original_due_date IS DISTINCT FROM NEW.original_due_date THEN
    NEW.original_due_date := OLD.original_due_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to protect original_due_date from being updated
CREATE TRIGGER protect_original_due_date_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.original_due_date IS DISTINCT FROM NEW.original_due_date)
  EXECUTE FUNCTION protect_original_due_date();

