const monthIndexByName = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

const weekdayIndexByName = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};

const duePrefix = String.raw`(?:by|on|at|before|due(?:\s+(?:by|on))?)`;
const mentionPattern = /@([a-z0-9_-]+)/gi;
const dueTimePattern = /\b(?:(?:at|by|before)\s+)?([01]?\d|2[0-3]):([0-5]\d)\s*(a\.?m\.?|p\.?m\.?)?\b/i;

function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDeadlineWithTime(deadline, timeMatch) {
  if (!timeMatch) return deadline;

  const hour = String(timeMatch.hour).padStart(2, "0");
  const minute = String(timeMatch.minute).padStart(2, "0");

  return `${deadline}T${hour}:${minute}`;
}

function addDays(date, dayCount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + dayCount);
  return nextDate;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidDateParts(year, month, day) {
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

function getTeamMentions(content, members = []) {
  const memberByKey = new Map(members.map((member) => [normalize(member), member]));
  const mentions = [];
  let mentionsAll = false;

  for (const match of String(content || "").matchAll(mentionPattern)) {
    const mentionKey = normalize(match[1]);

    if (mentionKey === "all" || mentionKey === "everyone") {
      mentionsAll = true;
      continue;
    }

    const member = memberByKey.get(mentionKey);

    if (member && !mentions.includes(member)) {
      mentions.push(member);
    }
  }

  return { mentions, mentionsAll };
}

function parseRelativeDueDate(content, baseDate) {
  const patterns = [
    {
      regex: new RegExp(String.raw`\b${duePrefix}\s+(today)\b`, "i"),
      getDate: () => baseDate
    },
    {
      regex: new RegExp(String.raw`\b${duePrefix}\s+(tomorrow)\b`, "i"),
      getDate: () => addDays(baseDate, 1)
    },
    {
      regex: new RegExp(String.raw`\b${duePrefix}\s+(?:the\s+)?(?:next|in)\s+(\d{1,2})\s+days?\b`, "i"),
      getDate: (match) => addDays(baseDate, Number(match[1]))
    },
    {
      regex: /\bin\s+(\d{1,2})\s+days?\b/i,
      getDate: (match) => addDays(baseDate, Number(match[1]))
    }
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern.regex);

    if (match) {
      return {
        deadline: toDateOnly(pattern.getDate(match)),
        dateText: match[0],
        start: match.index,
        end: match.index + match[0].length
      };
    }
  }

  return null;
}

function parseWeekdayDueDate(content, baseDate) {
  const weekdayAlternatives = Object.keys(weekdayIndexByName).join("|");
  const weekdayPattern = new RegExp(
    String.raw`\b${duePrefix}\s+(next\s+)?(${weekdayAlternatives})\b`,
    "i"
  );
  const weekdayMatch = content.match(weekdayPattern);

  if (!weekdayMatch) return null;

  const targetWeekday = weekdayIndexByName[normalize(weekdayMatch[2])];
  const currentWeekday = baseDate.getDay();
  let dayOffset = (targetWeekday - currentWeekday + 7) % 7;

  if (dayOffset === 0) {
    dayOffset = 7;
  }

  const deadline = addDays(baseDate, dayOffset);

  return {
    deadline: toDateOnly(deadline),
    dateText: weekdayMatch[0],
    start: weekdayMatch.index,
    end: weekdayMatch.index + weekdayMatch[0].length
  };
}

function parseNamedDueDate(content, baseDate) {
  const monthAlternatives = Object.keys(monthIndexByName).join("|");
  const dayMonthPattern = new RegExp(
    String.raw`\b${duePrefix}\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(${monthAlternatives})(?:\s*,?\s*(\d{4}))?\b`,
    "i"
  );
  const monthDayPattern = new RegExp(
    String.raw`\b${duePrefix}\s+(?:the\s+)?(${monthAlternatives})\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b`,
    "i"
  );
  const numericPattern = new RegExp(
    String.raw`\b${duePrefix}\s+(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b`,
    "i"
  );

  const dayMonthMatch = content.match(dayMonthPattern);

  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const month = monthIndexByName[normalize(dayMonthMatch[2])];
    const year = dayMonthMatch[3] ? Number(dayMonthMatch[3]) : baseDate.getFullYear();

    if (isValidDateParts(year, month, day)) {
      return {
        deadline: toDateOnly(new Date(year, month, day)),
        dateText: dayMonthMatch[0],
        start: dayMonthMatch.index,
        end: dayMonthMatch.index + dayMonthMatch[0].length
      };
    }
  }

  const monthDayMatch = content.match(monthDayPattern);

  if (monthDayMatch) {
    const month = monthIndexByName[normalize(monthDayMatch[1])];
    const day = Number(monthDayMatch[2]);
    const year = monthDayMatch[3] ? Number(monthDayMatch[3]) : baseDate.getFullYear();

    if (isValidDateParts(year, month, day)) {
      return {
        deadline: toDateOnly(new Date(year, month, day)),
        dateText: monthDayMatch[0],
        start: monthDayMatch.index,
        end: monthDayMatch.index + monthDayMatch[0].length
      };
    }
  }

  const numericMatch = content.match(numericPattern);

  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]) - 1;
    const rawYear = numericMatch[3];
    const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : baseDate.getFullYear();

    if (isValidDateParts(year, month, day)) {
      return {
        deadline: toDateOnly(new Date(year, month, day)),
        dateText: numericMatch[0],
        start: numericMatch.index,
        end: numericMatch.index + numericMatch[0].length
      };
    }
  }

  return null;
}

function parseDueTime(content) {
  const timeMatch = content.match(dueTimePattern);

  if (!timeMatch) return null;

  const meridiem = normalize(timeMatch[3]).replaceAll(".", "");
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return {
    hour,
    minute,
    timeText: timeMatch[0],
    start: timeMatch.index,
    end: timeMatch.index + timeMatch[0].length
  };
}

function cleanTaskTitle(content, dateMatch, timeMatch = null) {
  const removalRanges = [dateMatch, timeMatch]
    .filter(Boolean)
    .sort((firstRange, secondRange) => secondRange.start - firstRange.start);
  let cleanedContent = content;

  removalRanges.forEach((range) => {
    cleanedContent = `${cleanedContent.slice(0, range.start)} ${cleanedContent.slice(range.end)}`;
  });

  const withoutDate = cleanedContent
    .replace(mentionPattern, " ")
    .replace(/\b(can\s+you|could\s+you|can\s+u|could\s+u|please|pls|kindly|to\s+do)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;!?-\s]+|[,.:;!?-\s]+$/g, "")
    .trim();

  return withoutDate || content.replace(mentionPattern, "").trim() || "New task";
}

export function parseTaskIntent(content, { members = [], fallbackAssignee = "Andy", baseDate = new Date() } = {}) {
  const text = String(content || "").trim();
  const parsedBaseDate = new Date(baseDate);

  if (!text) return null;

  const dateMatch =
    parseRelativeDueDate(text, parsedBaseDate) ||
    parseWeekdayDueDate(text, parsedBaseDate) ||
    parseNamedDueDate(text, parsedBaseDate);

  if (!dateMatch) return null;

  const { mentions, mentionsAll } = getTeamMentions(text, members);
  const assignedTo = mentions[0] || fallbackAssignee;
  const timeMatch = parseDueTime(text);
  const title = cleanTaskTitle(text, dateMatch, timeMatch);

  return {
    title,
    assignedTo,
    deadline: toDeadlineWithTime(dateMatch.deadline, timeMatch),
    status: "To Do",
    mentions,
    mentionsAll,
    dateText: dateMatch.dateText,
    timeText: timeMatch?.timeText || ""
  };
}

export function isTaskMentionForUser(message, taskIntent, username) {
  if (!taskIntent || !username) return false;

  return taskIntent.mentionsAll || taskIntent.mentions.some((mention) => normalize(mention) === normalize(username));
}
