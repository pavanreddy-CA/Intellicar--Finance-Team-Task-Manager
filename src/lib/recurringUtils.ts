/**
 * Helper utilities for Recurring Tasks
 */

export type Frequency = 'D' | 'W' | 'M' | 'Q' | 'H' | 'Y' | '2Y' | 'BW' | 'Ad';

export const FREQUENCIES: Frequency[] = ['D', 'W', 'M', 'Q', 'H', 'Y', '2Y', 'BW', 'Ad'];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Resolves dynamic placeholders in task names
 */
export function resolveTaskName(pattern: string, date: Date): string {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString();
  const shortYear = year.slice(-2);
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
    case 'D':
      return `${year}-${month.toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    case 'W':
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${weekNum.toString().padStart(2, '0')}`;
    case 'BW':
      // Semi-Monthly: Year-Month-1 or Year-Month-2
      const isSecond = date.getDate() > 14 ? '2' : '1';
      return `${year}-${month.toString().padStart(2, '0')}-BW${isSecond}`;
    case 'M':
      return `${year}-${month.toString().padStart(2, '0')}`;
    case 'Q':
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `${year}-Q${q}`;
    case 'H':
      const h = date.getMonth() < 6 ? 1 : 2;
      return `${year}-H${h}`;
    case 'Y':
      return `${year}`;
    case '2Y':
      return `${year}-2Y`;
    case 'Ad':
      return `Adhoc-${year}-${month}-${date.getDate()}`;
    default:
      return `${year}-${month}`;
  }
}

function formatDateShort(d: Date) {
  return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}`;
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
  const excluded = Array.isArray(template.excludedDates) ? template.excludedDates : [];
  
  let current = new Date(templateStart);
  
  // Align current to search window AND desired weekday if weekly
  if (template.frequency === 'W' && template.weeklyDay) {
    const targetDayIndex = WEEKDAYS.indexOf(template.weeklyDay) + 1; // 1=Mon, 7=Sun
    let currentDayIndex = current.getDay() === 0 ? 7 : current.getDay();
    let diff = targetDayIndex - currentDayIndex;
    current.setDate(current.getDate() + diff);
    
    // Ensure we start after templateStart and align with 7-day jumps
    while (current < templateStart) {
      current.setDate(current.getDate() + 7);
    }
  }

  while (current < searchStart) {
      if (template.frequency === 'D') current.setDate(current.getDate() + 1);
      else if (template.frequency === 'W') current.setDate(current.getDate() + 7);
      else if (template.frequency === 'BW') current.setDate(current.getDate() + 14);
      else if (template.frequency === 'M') current.setMonth(current.getMonth() + 1);
      else if (template.frequency === 'Q') current.setMonth(current.getMonth() + 3);
      else if (template.frequency === 'H') current.setMonth(current.getMonth() + 6);
      else if (template.frequency === 'Y') current.setFullYear(current.getFullYear() + 1);
      else if (template.frequency === '2Y') current.setFullYear(current.getFullYear() + 2);
      else break;
      if (current > searchEnd) break;
  }

  // Generate iterations
  while (current <= searchEnd && current <= templateEnd) {
    const pk = getPeriodKey(template.frequency, current);
    
    if (current >= searchStart && !template.isStopped && !excluded.includes(pk)) {
      if (!template.stopDate || current <= new Date(template.stopDate)) {
        occurrences.push({ date: new Date(current), periodKey: pk });
      }
    }
    
    // Advance
    if (template.frequency === 'D') current.setDate(current.getDate() + 1);
    else if (template.frequency === 'W') current.setDate(current.getDate() + 7);
    else if (template.frequency === 'BW') {
      // If we just did the first one (e.g. 1st), go to 15th
      // If we just did the second one (e.g. 15th), go to 1st of next month
      if (current.getDate() <= 14) {
        current.setDate(current.getDate() + 14);
      } else {
        current.setMonth(current.getMonth() + 1);
        current.setDate(templateStart.getDate());
      }
    }
    else if (template.frequency === 'M') current.setMonth(current.getMonth() + 1);
    else if (template.frequency === 'Q') current.setMonth(current.getMonth() + 3);
    else if (template.frequency === 'H') current.setMonth(current.getMonth() + 6);
    else if (template.frequency === 'Y') current.setFullYear(current.getFullYear() + 1);
    else if (template.frequency === '2Y') current.setFullYear(current.getFullYear() + 2);
    else break;

    if (occurrences.length > 500) break; 
  }
  
  return occurrences;
}

export function isWithinLeadTime(frequency: Frequency, dueDate: Date): boolean {
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  switch (frequency) {
    case 'Y':
    case '2Y':
    case 'Q':
    case 'H':
      return diffDays <= 45;
    case 'M':
    case 'BW':
      return diffDays <= 15;
    case 'W':
      return diffDays <= 7;
    case 'D':
      return diffDays <= 1;
    default:
      return diffDays <= 15;
  }
}
