export function getTrackingStatus(task: { taskStatus: string; dueDate: string | Date | null; completionDate: string | Date | null }) {
  const getISTDateString = (date: Date | string | null): string | null => {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    const yyyy = istDate.getUTCFullYear();
    const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getISTDateString(new Date())!;
  const dueDateStr = getISTDateString(task.dueDate);
  const completionDateStr = getISTDateString(task.completionDate);

  const isCompleted = task.taskStatus === 'Completed' || !!completionDateStr;

  if (!isCompleted) {
    if (!dueDateStr) return "Not Yet Due";
    if (dueDateStr === todayStr) return "Due on Today";
    if (dueDateStr < todayStr) return "Over Due";
    return "Not Yet Due";
  } else {
    if (!completionDateStr || !dueDateStr) return "On-Time";
    if (completionDateStr === dueDateStr) return "On-Time";
    if (completionDateStr < dueDateStr) return "Early Closure";
    return "Delay in Closure";
  }
}

export const COMPLETION_STATUSES = ["On-Time", "Early Closure", "Delay in Closure"];

export const getEmailFromName = (name: string | null) => {
  if (!name || name === "Not Applicable" || name === "Choose") return null;
  
  const normalized = name.trim();
  const emailMap: Record<string, string> = {
    "Pavan": "pavanreddy@intellicar.in",
    "Pavan Reddy": "pavanreddy@intellicar.in",
    "Saikath": "saikatdas@intellicar.in",
    "Saikat Das": "saikatdas@intellicar.in",
    "Sami": "sami@intellicar.in",
    "Hanusha": "hanusha@intellicar.in",
    "Sreenivas": "sreenivasulu.t@intellicar.in",
    "Sreenivasulu T": "sreenivasulu.t@intellicar.in",
    "Sharath": "sharath.shetty@intellicar.in",
    "Sharath R Shetty": "sharath.shetty@intellicar.in",
    "Chandana": "chandanak@intellicar.in",
    "Nikhat": "nikhat@intellicar.in",
    "Nikhat Parveen": "nikhat@intellicar.in",
    "Venkat": "venkata.g@intellicar.in",
    "Venkat Gottapu": "venkata.g@intellicar.in",
    "Sidharth Saneja": "saneja@intellicar.in",
    "Saneja": "saneja@intellicar.in"
  };
  
  // Case-insensitive lookup
  const found = Object.entries(emailMap).find(([key]) => key.toLowerCase() === normalized.toLowerCase());
  if (found) return found[1];
  
  return null;
};
