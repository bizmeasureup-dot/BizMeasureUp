import { Task, RecurringTaskTemplate } from '@/types'
import { supabase } from './supabase'

/**
 * Calculates the "can complete after" date for a task based on its recurring template.
 * Returns null if task is not recurring or has no unlock_days_before_due.
 */
export async function calculateCanCompleteAfter(task: Task): Promise<Date | null> {
  if (!task.recurring_template_id || !task.due_date) {
    return null
  }

  try {
    const { data: template, error } = await supabase
      .from('recurring_task_templates')
      .select('unlock_days_before_due')
      .eq('id', task.recurring_template_id)
      .single()

    if (error || !template) {
      return null
    }

    if (template.unlock_days_before_due === 0) {
      return null // No unlock restriction
    }

    const dueDate = new Date(task.due_date)
    const canCompleteAfter = new Date(dueDate)
    canCompleteAfter.setDate(canCompleteAfter.getDate() - template.unlock_days_before_due)

    return canCompleteAfter
  } catch (error) {
    console.error('Error calculating can complete after:', error)
    return null
  }
}

/**
 * Checks if a task can be completed now based on unlock_days_before_due.
 */
export async function canCompleteTask(task: Task): Promise<boolean> {
  if (!task.recurring_template_id) {
    return true // Non-recurring tasks can always be completed
  }

  const canCompleteAfter = await calculateCanCompleteAfter(task)
  if (canCompleteAfter === null) {
    return true // No unlock restriction
  }

  const now = new Date()
  return now >= canCompleteAfter
}

/**
 * Gets recurring task template info for a task.
 */
export async function getRecurringTaskInfo(task: Task): Promise<RecurringTaskTemplate | null> {
  if (!task.recurring_template_id) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .eq('id', task.recurring_template_id)
      .single()

    if (error || !data) {
      return null
    }

    return data as RecurringTaskTemplate
  } catch (error) {
    console.error('Error fetching recurring task info:', error)
    return null
  }
}

/**
 * Calculates the number of days a task is overdue based on the original due date.
 * 
 * Business logic:
 * - If task is completed, return null (not overdue)
 * - If task has no original_due_date, return null
 * - If current date < original_due_date, return null (not overdue yet)
 * - Calculate days overdue based on original_due_date vs current date
 * - If task has been rescheduled (current due_date > original_due_date), 
 *   stop counting overdue when current date reaches rescheduled due_date
 * 
 * @param task The task to calculate overdue days for
 * @returns Number of days overdue, or null if not overdue or cannot calculate
 */
export function calculateOverdueDays(task: Task): number | null {
  // If task is completed, it's not overdue
  if (task.status === 'completed' || task.completed_at) {
    return null
  }

  // If task has no original due date, we can't calculate overdue
  if (!task.original_due_date) {
    return null
  }

  const now = new Date()
  // Set to start of current day for consistent day-based comparison
  const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const originalDueDate = new Date(task.original_due_date)
  // Set to start of original due date for consistent day-based comparison
  const originalDueDateStartOfDay = new Date(originalDueDate.getFullYear(), originalDueDate.getMonth(), originalDueDate.getDate())
  
  // If current date is before original due date, task is not overdue yet
  if (nowStartOfDay < originalDueDateStartOfDay) {
    return null
  }

  // Calculate days overdue based on original due date
  // Count full days: if due date is 11-11, then 12-11 is 1 day overdue
  const diffTime = nowStartOfDay.getTime() - originalDueDateStartOfDay.getTime()
  const daysOverdueFromOriginal = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // If task has been rescheduled (current due_date > original_due_date),
  // cap the overdue count at the rescheduled due date
  if (task.due_date) {
    const currentDueDate = new Date(task.due_date)
    const currentDueDateStartOfDay = new Date(currentDueDate.getFullYear(), currentDueDate.getMonth(), currentDueDate.getDate())
    
    // Only apply cap if rescheduled due date is after original due date
    if (currentDueDateStartOfDay > originalDueDateStartOfDay) {
      // Calculate maximum overdue days
      // Overdue stops increasing on the rescheduled due date itself
      // So we calculate days from original due date to the day before rescheduled due date
      // Example: original 11-11, rescheduled 14-11
      //   - Days difference: (14-11) - (11-11) = 3 days
      //   - But overdue stops on 14-11, so max overdue is 2 (12-11 is 1 day, 13-11 is 2 days)
      //   - Formula: (rescheduled - original) - 1
      const daysDifference = Math.floor(
        (currentDueDateStartOfDay.getTime() - originalDueDateStartOfDay.getTime()) / (1000 * 60 * 60 * 24)
      )
      // Max overdue is one less than the days difference (since overdue stops on rescheduled date)
      const maxOverdueDays = Math.max(0, daysDifference - 1)
      
      // If we've reached or passed the rescheduled due date, return the capped value
      // (overdue stops increasing at the rescheduled due date)
      if (nowStartOfDay >= currentDueDateStartOfDay) {
        return maxOverdueDays > 0 ? maxOverdueDays : null
      }
      
      // If we're before the rescheduled due date, return current overdue (capped at max)
      return Math.min(daysOverdueFromOriginal, maxOverdueDays)
    }
  }

  // Return days overdue (should be 0 or positive)
  return daysOverdueFromOriginal >= 0 ? daysOverdueFromOriginal : null
}

/**
 * Gets a formatted string displaying the overdue status of a task.
 * 
 * @param task The task to get overdue display for
 * @returns Formatted string like "1 day overdue" or "2 days overdue", or null if not overdue
 */
export function getOverdueDisplay(task: Task): string | null {
  const overdueDays = calculateOverdueDays(task)
  
  if (overdueDays === null || overdueDays === 0) {
    return null
  }

  return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`
}

/**
 * Checks if a task is currently overdue.
 * 
 * @param task The task to check
 * @returns true if the task is overdue, false otherwise
 */
export function isTaskOverdue(task: Task): boolean {
  return calculateOverdueDays(task) !== null
}

