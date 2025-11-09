-- Migration: Add attachment fields to tasks table
-- Run this migration if you have an existing database
-- This adds the new columns for task attachment functionality

-- Add attachment_required column
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS attachment_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Add completion_attachment_url column
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completion_attachment_url TEXT;

-- Add completion_notes column
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Add comment to columns for documentation
COMMENT ON COLUMN public.tasks.attachment_required IS 'Whether an attachment is required to complete this task';
COMMENT ON COLUMN public.tasks.completion_attachment_url IS 'URL to the attachment file uploaded when task was completed';
COMMENT ON COLUMN public.tasks.completion_notes IS 'Notes added when the task was marked as complete';

