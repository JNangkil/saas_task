export const formatDateRange = (start: Date, end: Date): string => {
  const intl = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${intl.format(start)} – ${intl.format(end)}`;
};

export const isOverdue = (dueDate: Date): boolean => dueDate.getTime() < Date.now();
