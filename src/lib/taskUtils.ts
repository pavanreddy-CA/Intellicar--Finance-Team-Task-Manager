export function getTrackingStatus(task: { taskStatus: string; dueDate: string | Date | null; completionDate: string | Date | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  const completionDate = task.completionDate ? new Date(task.completionDate) : null;
  if (completionDate) completionDate.setHours(0, 0, 0, 0);

  const isCompleted = task.taskStatus === 'Completed' || !!completionDate;

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  if (!isCompleted) {
    if (!dueDate) return "Not Yet Due";
    if (isSameDay(dueDate, today)) return "Due on Today";
    if (dueDate < today) return "Over Due";
    return "Not Yet Due";
  } else {
    if (!completionDate || !dueDate) return "On-Time";
    if (isSameDay(completionDate, dueDate)) return "On-Time";
    if (completionDate < dueDate) return "Early Closure";
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
    "Sami": "sami@intellicar.in",
    "Hanusha": "hanusha@intellicar.in",
    "Sreenivas": "sreenivasulu.t@intellicar.in",
    "Sharath": "sharath.shetty@intellicar.in",
    "Sharath R Shetty": "sharath.shetty@intellicar.in",
    "Chandana": "chandanak@intellicar.in",
    "Nikhat": "nikhat@intellicar.in",
    "Venkat": "venkata.g@intellicar.in",
    "Venkat Gottapu": "venkata.g@intellicar.in",
    "Sidharth Saneja": "saneja@intellicar.in",
    "Saneja": "saneja@intellicar.in"
  };
  
  if (emailMap[normalized]) return emailMap[normalized];
  
  const cleanName = normalized.toLowerCase().replace(/\s+/g, '');
  return `${cleanName}@intellicar.in`;
};
