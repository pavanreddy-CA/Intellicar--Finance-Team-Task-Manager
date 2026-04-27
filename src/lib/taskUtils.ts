export function getTrackingStatus(task: { taskStatus: string; dueDate: string | Date | null; completionDate: string | Date | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  const completionDate = task.completionDate ? new Date(task.completionDate) : null;
  if (completionDate) completionDate.setHours(0, 0, 0, 0);

  const isCompleted = task.taskStatus === 'Completed' || !!completionDate;

  if (!isCompleted) {
    if (!dueDate) return "Not Yet Due";
    if (dueDate.getTime() === today.getTime()) return "Due on Today";
    if (dueDate < today) return "Over Due";
    return "Not Yet Due";
  } else {
    // If completed but no completion date recorded yet (fallback)
    if (!completionDate) return "On-Time";
    if (!dueDate) return "On-Time";

    if (completionDate.getTime() === dueDate.getTime()) return "On-Time";
    if (completionDate < dueDate) return "Early Closure";
    return "Delay in Closure";
  }
}

export const COMPLETION_STATUSES = ["On-Time", "Early Closure", "Delay in Closure"];
