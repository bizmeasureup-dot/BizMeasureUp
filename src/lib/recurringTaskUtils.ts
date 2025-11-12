import { RecurringTaskTemplate } from '@/types'

/**
 * Calculates the next due date for a recurring task based on the template and last due date.
 * Handles edge cases like month end, leap years, etc.
 */
export function calculateNextDueDate(
  template: RecurringTaskTemplate,
  lastDueDate: Date
): Date | null {
  if (template.is_paused || template.is_ended) {
    return null
  }

  // Check if end_date has been reached
  if (template.end_date) {
    const endDate = new Date(template.end_date)
    if (lastDueDate >= endDate) {
      return null
    }
  }

  const nextDate = new Date(lastDueDate)

  switch (template.recurrence_type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + template.recurrence_interval)
      break

    case 'weekly':
      // Add weeks
      nextDate.setDate(nextDate.getDate() + (template.recurrence_interval * 7))
      
      // If day_of_week is specified, adjust to that day
      if (template.recurrence_day_of_week !== undefined) {
        const currentDay = nextDate.getDay()
        const targetDay = template.recurrence_day_of_week
        const daysToAdd = (targetDay - currentDay + 7) % 7
        if (daysToAdd > 0) {
          nextDate.setDate(nextDate.getDate() + daysToAdd)
        }
      }
      break

    case 'monthly':
      // Add months
      nextDate.setMonth(nextDate.getMonth() + template.recurrence_interval)
      
      // If day_of_month is specified, try to set that day
      if (template.recurrence_day_of_month !== undefined) {
        const targetDay = template.recurrence_day_of_month
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
        
        // Handle month end edge case (e.g., 31st of month)
        if (targetDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth)
        } else {
          nextDate.setDate(targetDay)
        }
      }
      break

    case 'yearly':
      // Add years
      nextDate.setFullYear(nextDate.getFullYear() + template.recurrence_interval)
      
      // If month and day are specified, set them
      if (template.recurrence_month !== undefined && template.recurrence_day_of_month !== undefined) {
        const targetMonth = template.recurrence_month - 1 // JavaScript months are 0-indexed
        const targetDay = template.recurrence_day_of_month
        
        nextDate.setMonth(targetMonth)
        
        // Handle leap year edge case (Feb 29)
        if (targetMonth === 1 && targetDay === 29) {
          const isLeapYear = (year: number) => {
            return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
          }
          
          if (!isLeapYear(nextDate.getFullYear())) {
            nextDate.setDate(28) // Use Feb 28 if not a leap year
          } else {
            nextDate.setDate(targetDay)
          }
        } else {
          const lastDayOfMonth = new Date(nextDate.getFullYear(), targetMonth + 1, 0).getDate()
          if (targetDay > lastDayOfMonth) {
            nextDate.setDate(lastDayOfMonth)
          } else {
            nextDate.setDate(targetDay)
          }
        }
      }
      break

    case 'custom':
      // For custom, treat interval as days
      nextDate.setDate(nextDate.getDate() + template.recurrence_interval)
      break

    default:
      return null
  }

  // Check if calculated date exceeds end_date
  if (template.end_date) {
    const endDate = new Date(template.end_date)
    if (nextDate > endDate) {
      return null
    }
  }

  return nextDate
}

/**
 * Formats a human-readable description of the recurrence pattern.
 */
export function formatRecurrenceDescription(template: RecurringTaskTemplate): string {
  const interval = template.recurrence_interval > 1 ? `every ${template.recurrence_interval} ` : ''
  
  switch (template.recurrence_type) {
    case 'daily':
      return interval ? `${interval}days` : 'Daily'
    
    case 'weekly':
      if (template.recurrence_day_of_week !== undefined) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayName = dayNames[template.recurrence_day_of_week]
        return interval ? `${interval}weeks (${dayName})` : `Weekly (${dayName})`
      }
      return interval ? `${interval}weeks` : 'Weekly'
    
    case 'monthly':
      if (template.recurrence_day_of_month !== undefined) {
        const day = template.recurrence_day_of_month
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
        return interval ? `${interval}months (day ${day}${suffix})` : `Monthly (day ${day}${suffix})`
      }
      return interval ? `${interval}months` : 'Monthly'
    
    case 'yearly':
      if (template.recurrence_month !== undefined && template.recurrence_day_of_month !== undefined) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        const monthName = monthNames[template.recurrence_month - 1]
        const day = template.recurrence_day_of_month
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
        return interval ? `${interval}years (${monthName} ${day}${suffix})` : `Yearly (${monthName} ${day}${suffix})`
      }
      return interval ? `${interval}years` : 'Yearly'
    
    case 'custom':
      return `Every ${template.recurrence_interval} days`
    
    default:
      return 'Recurring'
  }
}

/**
 * Checks if a recurring task template is paused.
 */
export function isRecurringTaskPaused(template: RecurringTaskTemplate): boolean {
  return template.is_paused
}

/**
 * Checks if a recurring task template is ended.
 */
export function isRecurringTaskEnded(template: RecurringTaskTemplate): boolean {
  return template.is_ended
}

/**
 * Gets the status description of a recurring template.
 */
export function getRecurringTemplateStatus(template: RecurringTaskTemplate): string {
  if (template.is_ended) {
    return 'Ended'
  }
  if (template.is_paused) {
    return 'Paused'
  }
  return 'Active'
}

