/**
 * Helper utilities for Recurring Tasks
 */

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | '2_YEARLY';

export const FREQUENCIES: Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', '2_YEARLY'];

/**
 * Resolves dynamic placeholders in task names
 * @param pattern e.g. "GSTR 3B for {{MONTH}} {{YEAR}}"
 * @param date The performance date (not the due date)
 */
export function resolveTaskName(pattern: string, date: Date): string {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString();
  const shortYear = year.slice(-2);
  
  // Also support Quarterly tags
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  
  return pattern
    .replace(/{{MONTH}}/g, month)
    .replace(/{{YEAR}}/g, year)
    .replace(/{{YY}}/g, shortYear)
    .replace(/{{MM}}/g, (date.getMonth() + 1).toString().padStart(2, '0'))
    .replace(/{{QUARTER}}/g, `Q${quarter}`);
}

/**
 * Generates a period key for duplicate prevention
 */
export function getPeriodKey(frequency: Frequency, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  switch (frequency) {
    case 'DAILY':
      return `${year}-${month.toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    case 'WEEKLY':
      // Get a week identifier (e.g., Year-WeekNumber)
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${weekNum.toString().padStart(2, '0')}`;
    case 'MONTHLY':
      return `${year}-${month.toString().padStart(2, '0')}`;
    case 'QUARTERLY':
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `${year}-Q${q}`;
    case 'HALF_YEARLY':
      const h = date.getMonth() < 6 ? 1 : 2;
      return `${year}-H${h}`;
    case 'YEARLY':
      return `${year}`;
    case '2_YEARLY':
      return `2Y-${year}`;
    default:
      return `${year}-${month}`;
  }
}

/**
 * Generates all occurrences for a template between two dates
 */
export function getOccurrencesBetween(
  template: any, 
  searchStart: Date, 
  searchEnd: Date
): { date: Date; periodKey: string }[] {
  const occurrences: { date: Date; periodKey: string }[] = [];
  
  const templateStart = template.startDate ? new Date(template.startDate) : new Date(2000, 0, 1);
  const templateEnd = template.endDate ? new Date(template.endDate) : new Date(2100, 0, 1);
  
  // The actual start is the later of the template start and the search window start
  let current = new Date(templateStart);
  
  // Loop through all occurrences from template start until search end
  while (current <= searchEnd && current <= templateEnd) {
    // Only add to results if it falls within the search window
    if (current >= searchStart && !template.isStopped) {
      // Check if it's after the stop date if applicable
      if (!template.stopDate || current <= new Date(template.stopDate)) {
        occurrences.push({
          date: new Date(current),
          periodKey: getPeriodKey(template.frequency, current)
        });
      }
    }
    
    // Advance current based on frequency
    switch (template.frequency) {
      case 'DAILY':
        current.setDate(current.getDate() + 1);
        break;
      case 'WEEKLY':
        current.setDate(current.getDate() + 7);
        break;
      case 'MONTHLY':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'QUARTERLY':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'HALF_YEARLY':
        current.setMonth(current.getMonth() + 6);
        break;
      case 'YEARLY':
        current.setFullYear(current.getFullYear() + 1);
        break;
      case '2_YEARLY':
        current.setFullYear(current.getFullYear() + 2);
        break;
      default:
        current.setMonth(current.getMonth() + 1);
        break;
    }
    
    // Safety break to prevent infinite loops
    if (occurrences.length > 500) break; 
  }
  
  return occurrences;
}

/**
 * Calculates if a task should be visible in the staging area
 */
export function isWithinLeadTime(frequency: Frequency, dueDate: Date): boolean {
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  switch (frequency) {
    case 'YEARLY':
    case 'HALF_YEARLY':
    case '2_YEARLY':
    case 'QUARTERLY':
      return diffDays <= 45;
    case 'MONTHLY':
      return diffDays <= 15;
    case 'WEEKLY':
      return diffDays <= 7; // Weekly tasks should show a week in advance
    case 'DAILY':
      return diffDays <= 1;
    default:
      return diffDays <= 15;
  }
}
