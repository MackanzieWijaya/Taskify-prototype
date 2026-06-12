const deadlinePattern = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

export function padDatePart(value) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(dateValue = new Date()) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function addLocalDays(dateValue, dayCount) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + dayCount);
  return date;
}

export function hasDeadlineTime(deadline) {
  return /T\d{2}:\d{2}/.test(String(deadline || ""));
}

export function getDeadlineDateKey(deadline) {
  const match = String(deadline || "").trim().match(deadlinePattern);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

export function parseDeadline(deadline, { dateOnlyTime = "end" } = {}) {
  const match = String(deadline || "").trim().match(deadlinePattern);

  if (!match) {
    return null;
  }

  const hasTime = match[4] !== undefined;
  const hour = hasTime ? Number(match[4]) : dateOnlyTime === "start" ? 0 : 23;
  const minute = hasTime ? Number(match[5]) : dateOnlyTime === "start" ? 0 : 59;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function splitDeadlineValue(deadline, fallbackDate = new Date()) {
  const value = String(deadline || "").trim();
  const dateKey = getDeadlineDateKey(value) || getLocalDateKey(fallbackDate);
  const timeMatch = value.match(/T(\d{2}:\d{2})/);

  return {
    deadlineDate: dateKey,
    deadlineTime: timeMatch ? timeMatch[1] : ""
  };
}

export function buildDeadlineValue(deadlineDate, deadlineTime = "") {
  const cleanDate = String(deadlineDate || "").trim();
  const cleanTime = String(deadlineTime || "").trim();

  if (!cleanDate) {
    return "";
  }

  return /^\d{2}:\d{2}$/.test(cleanTime) ? `${cleanDate}T${cleanTime}` : cleanDate;
}

export function formatDeadline(deadline, { year = "numeric", weekday = false } = {}) {
  const date = parseDeadline(deadline);

  if (!date) {
    return String(deadline || "No deadline");
  }

  const dateText = new Intl.DateTimeFormat("en", {
    weekday: weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year
  }).format(date);

  if (!hasDeadlineTime(deadline)) {
    return dateText;
  }

  return `${dateText}, ${formatDeadlineTime(deadline)}`;
}

export function formatDeadlineTime(deadline) {
  const date = parseDeadline(deadline);

  if (!date || !hasDeadlineTime(deadline)) {
    return "Any time";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatFullDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "that day";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatMonthHeading(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(new Date(dateValue));
}

export function compareDeadlines(firstTask, secondTask) {
  const firstDeadline = parseDeadline(firstTask.deadline)?.getTime() || 0;
  const secondDeadline = parseDeadline(secondTask.deadline)?.getTime() || 0;

  return firstDeadline - secondDeadline;
}

export function getDeadlineUrgency(deadline, now = new Date()) {
  const dueDate = parseDeadline(deadline);

  if (!dueDate) {
    return { level: "calm", label: "No date" };
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / 36e5;

  if (diffMs < 0) {
    return { level: "overdue", label: "Overdue" };
  }

  if (diffHours <= 8) {
    return { level: "critical", label: "Due very soon" };
  }

  if (diffHours <= 24) {
    return { level: "urgent", label: "Due today" };
  }

  if (diffHours <= 48) {
    return { level: "soon", label: "Due soon" };
  }

  if (diffHours <= 120) {
    return { level: "watch", label: "Coming up" };
  }

  return { level: "calm", label: "Scheduled" };
}
