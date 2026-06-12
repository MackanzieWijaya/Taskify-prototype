import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreVertical,
  PlusCircle,
  X
} from "lucide-react";
import {
  addLocalDays,
  buildDeadlineValue,
  compareDeadlines,
  formatDeadline,
  formatDeadlineTime,
  formatFullDate,
  formatMonthHeading,
  getDeadlineDateKey,
  getDeadlineUrgency,
  getLocalDateKey,
  hasDeadlineTime,
  parseDeadline
} from "../deadlineUtils";
import TaskCard from "./TaskCard";

const formAnimationDuration = 220;
const taskHighlightDuration = 760;
const timelineHourHeight = 64;
const taskWorkspaceStorageKey = "taskify:lastTaskWorkspace";
const taskStickyStorageKey = "taskify:stickyTaskStatusById";
const weekdayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const hourSlots = Array.from({ length: 24 }, (_, hour) => hour);

const workspaceItems = [
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "time", label: "Time", icon: Clock3 }
];

function getAvailableWorkspace(preferredWorkspace, disabledWorkspaces = []) {
  const disabledSet = new Set(disabledWorkspaces);
  const preferredItem = workspaceItems.find((item) => item.id === preferredWorkspace);

  if (preferredItem && !disabledSet.has(preferredWorkspace)) {
    return preferredWorkspace;
  }

  return workspaceItems.find((item) => !disabledSet.has(item.id))?.id || "tasks";
}

function readStoredStickyTasks() {
  try {
    return JSON.parse(window.sessionStorage.getItem(taskStickyStorageKey) || "{}");
  } catch {
    return {};
  }
}

function writeStoredStickyTasks(stickyTasks) {
  if (Object.keys(stickyTasks).length === 0) {
    window.sessionStorage.removeItem(taskStickyStorageKey);
    return;
  }

  window.sessionStorage.setItem(taskStickyStorageKey, JSON.stringify(stickyTasks));
}

function createInitialForm() {
  return {
    title: "",
    assignedTo: "Andy",
    deadlineDate: getLocalDateKey(new Date()),
    deadlineTime: ""
  };
}

function dateFromKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function getCalendarDays(anchorDate) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = addLocalDays(firstOfMonth, -mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addLocalDays(gridStart, index);

    return {
      date,
      key: getLocalDateKey(date),
      isCurrentMonth: date.getMonth() === month
    };
  });
}

function formatClock(dateValue) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(dateValue);
}

function formatDayHeading(dateValue) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(dateValue);
}

function formatHourLabel(hour) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric"
  }).format(new Date(2026, 0, 1, hour));
}

function formatElapsedDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function getTaskElapsedMs(task, now = new Date()) {
  const baseElapsedMs = Number(task.elapsedMs) > 0 ? Number(task.elapsedMs) : 0;
  const startedAt = task.timerStartedAt ? new Date(task.timerStartedAt) : null;
  const runningMs =
    task.status === "In Progress" && startedAt && !Number.isNaN(startedAt.getTime())
      ? Math.max(0, now.getTime() - startedAt.getTime())
      : 0;

  return baseElapsedMs + runningMs;
}

function getTimelinePosition(deadline) {
  const dueDate = parseDeadline(deadline, { dateOnlyTime: "start" });

  if (!dueDate) return 0;

  return ((dueDate.getHours() * 60 + dueDate.getMinutes()) / 60) * timelineHourHeight;
}

function getClockTimelinePosition(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return 0;

  return ((date.getHours() * 60 + date.getMinutes()) / 60) * timelineHourHeight;
}

function getDeadlineTimeKey(deadline) {
  const dueDate = parseDeadline(deadline, { dateOnlyTime: "start" });

  if (!dueDate) return "00:00";

  return `${String(dueDate.getHours()).padStart(2, "0")}:${String(dueDate.getMinutes()).padStart(2, "0")}`;
}

function getActiveProgressBlock(task, dateKey, now) {
  if (task.status !== "In Progress" || !task.timerStartedAt) return null;

  const startDate = new Date(task.timerStartedAt);

  if (Number.isNaN(startDate.getTime())) return null;

  const dayStart = dateFromKey(dateKey);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addLocalDays(dayStart, 1);
  const visibleEnd = now < dayEnd ? now : dayEnd;
  const visibleStart = startDate > dayStart ? startDate : dayStart;

  if (visibleEnd <= dayStart || visibleStart >= dayEnd || visibleEnd <= visibleStart) {
    return null;
  }

  const startMinutes = visibleStart.getHours() * 60 + visibleStart.getMinutes();
  const durationMinutes = Math.max(12, Math.round((visibleEnd.getTime() - visibleStart.getTime()) / 60000));

  return {
    task,
    top: (startMinutes / 60) * timelineHourHeight,
    height: (durationMinutes / 60) * timelineHourHeight,
    elapsedMs: getTaskElapsedMs(task, now)
  };
}

function getTasksForDate(tasks, dateKey) {
  return tasks
    .filter((task) => getDeadlineDateKey(task.deadline) === dateKey)
    .sort(compareDeadlines);
}

function getUpcomingTasks(tasks, now) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const windowEnd = addLocalDays(now, 5);

  return tasks
    .filter((task) => {
      const dueDate = parseDeadline(task.deadline);

      return dueDate && dueDate >= todayStart && dueDate <= windowEnd;
    })
    .sort(compareDeadlines);
}

function DeadlineWarningItem({ task, now }) {
  const urgency = getDeadlineUrgency(task.deadline, now);

  return (
    <article className={`deadline-warning ${urgency.level}`}>
      <div className="deadline-warning-pulse" aria-hidden="true" />
      <div>
        <div className="deadline-warning-top">
          <strong>{task.title}</strong>
          <span>{urgency.label}</span>
        </div>
        <p>{task.assignedTo} - {task.status}</p>
        <time>{formatDeadline(task.deadline, { weekday: true })}</time>
      </div>
    </article>
  );
}

export default function TaskPanel({
  team,
  tasks,
  user,
  onCreateTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  isCollapsed = false,
  highlightedTaskId = null,
  defaultWorkspace = "tasks",
  defaultAssigneeFilter = "all",
  disabledWorkspaces = []
}) {
  const [form, setForm] = useState(createInitialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState("To Do");
  const [assigneeFilter, setAssigneeFilter] = useState(defaultAssigneeFilter);
  const [isTaskViewOpen, setIsTaskViewOpen] = useState(false);
  const [animatedTaskId, setAnimatedTaskId] = useState(null);
  const [stickyTaskStatusById, setStickyTaskStatusById] = useState(readStoredStickyTasks);
  const [activeWorkspace, setActiveWorkspace] = useState(() =>
    getAvailableWorkspace(window.localStorage.getItem(taskWorkspaceStorageKey) || defaultWorkspace, disabledWorkspaces)
  );
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState(null);
  const [timeDate, setTimeDate] = useState(() => new Date());
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const titleInputRef = useRef(null);
  const timeScrollRef = useRef(null);
  const dayTimelineRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const stickyLaneRef = useRef(null);
  const shouldShowForm = isFormOpen || isFormClosing;
  const disabledWorkspaceKey = disabledWorkspaces.join("|");
  const isTaskWorkspaceDisabled = disabledWorkspaces.includes("tasks");
  const filterItems = [
    { label: "To Do", value: "To Do" },
    { label: "In Progress", value: "In Progress" },
    { label: "Completed", value: "Completed" }
  ];
  const assigneeOptions = [
    { label: "My Tasks", value: "me" },
    { label: "Everyone", value: "all" },
    ...team.members.map((member) => ({ label: member, value: member }))
  ];
  const assigneeLabel =
    assigneeOptions.find((option) => option.value === assigneeFilter)?.label || "My Tasks";
  const assigneeFilteredTasks =
    assigneeFilter === "all"
      ? tasks
      : tasks.filter((task) =>
          assigneeFilter === "me" ? task.assignedTo === user.username : task.assignedTo === assigneeFilter
        );
  const visibleTasks =
    activeFilter === "All"
      ? assigneeFilteredTasks
      : assigneeFilteredTasks.filter(
          (task) => task.status === activeFilter || stickyTaskStatusById[task.id] === activeFilter
        );
  const tasksWithDeadlines = assigneeFilteredTasks.filter((task) => getDeadlineDateKey(task.deadline));
  const calendarDays = useMemo(() => getCalendarDays(calendarMonthDate), [calendarMonthDate]);
  const deadlineCountsByDate = useMemo(() => {
    const counts = new Map();

    tasksWithDeadlines.forEach((task) => {
      const dateKey = getDeadlineDateKey(task.deadline);
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
    });

    return counts;
  }, [tasksWithDeadlines]);
  const todayKey = getLocalDateKey(currentTime);
  const selectedCalendarTasks = selectedCalendarDateKey
    ? getTasksForDate(tasksWithDeadlines, selectedCalendarDateKey)
    : [];
  const upcomingTasks = getUpcomingTasks(tasksWithDeadlines, currentTime);
  const timeDateKey = getLocalDateKey(timeDate);
  const timeDateTasks = getTasksForDate(tasksWithDeadlines, timeDateKey);
  const timedTasks = timeDateTasks.filter((task) => hasDeadlineTime(task.deadline));
  const allDayTasks = timeDateTasks.filter((task) => !hasDeadlineTime(task.deadline));
  const timelineHeight = timelineHourHeight * hourSlots.length;
  const currentTimePosition = getClockTimelinePosition(currentTime);

  useEffect(() => {
    if (isFormOpen) {
      titleInputRef.current?.focus();
    }
  }, [isFormOpen]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(closeTimeoutRef.current);
      window.clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!team.members.includes(form.assignedTo)) {
      setForm((currentForm) => ({
        ...currentForm,
        assignedTo: team.members.includes(user.username) ? user.username : team.members[0] || "Andy"
      }));
    }
  }, [form.assignedTo, team.members, user.username]);

  useEffect(() => {
    setActiveWorkspace((currentWorkspace) => getAvailableWorkspace(currentWorkspace, disabledWorkspaces));
  }, [defaultWorkspace, disabledWorkspaceKey]);

  useEffect(() => {
    setAssigneeFilter(defaultAssigneeFilter);
  }, [defaultAssigneeFilter]);

  useEffect(() => {
    window.localStorage.setItem(taskWorkspaceStorageKey, activeWorkspace);
  }, [activeWorkspace]);

  useEffect(() => {
    writeStoredStickyTasks(stickyTaskStatusById);
  }, [stickyTaskStatusById]);

  useEffect(() => {
    const laneKey = `${activeFilter}|${activeWorkspace}|${isCollapsed}`;

    if (stickyLaneRef.current === null) {
      stickyLaneRef.current = laneKey;
      return;
    }

    if (stickyLaneRef.current !== laneKey) {
      setStickyTaskStatusById({});
    }

    stickyLaneRef.current = laneKey;
  }, [activeFilter, activeWorkspace, isCollapsed]);

  const centerTimelineOnTime = (dateValue = new Date()) => {
    window.requestAnimationFrame(() => {
      const scrollElement = timeScrollRef.current;

      if (!scrollElement) return;

      const timelinePosition = getClockTimelinePosition(dateValue);
      const timelineOffset = dayTimelineRef.current?.offsetTop || 0;
      scrollElement.scrollTop = Math.max(0, timelineOffset + timelinePosition - scrollElement.clientHeight / 2);
    });
  };

  useEffect(() => {
    if (activeWorkspace === "time" && timeDateKey === todayKey) {
      centerTimelineOnTime(currentTime);
    }
  }, [activeWorkspace, timeDateKey, todayKey]);

  const animateTask = (taskId) => {
    if (taskId === null || taskId === undefined) return;

    window.clearTimeout(highlightTimeoutRef.current);
    setAnimatedTaskId(taskId);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setAnimatedTaskId(null);
    }, taskHighlightDuration);
  };

  useEffect(() => {
    animateTask(highlightedTaskId);
  }, [highlightedTaskId]);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const openTaskForm = () => {
    if (isTaskWorkspaceDisabled) return;

    setActiveWorkspace("tasks");
    window.clearTimeout(closeTimeoutRef.current);
    setIsFormClosing(false);
    setIsFormOpen(true);
  };

  const closeTaskForm = ({ resetForm = false } = {}) => {
    setIsFormOpen(false);
    setIsFormClosing(true);

    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsFormClosing(false);

      if (resetForm) {
        setForm(createInitialForm());
      }
    }, formAnimationDuration);
  };

  const handleFormToggle = () => {
    if (isFormOpen) {
      closeTaskForm({ resetForm: true });
      return;
    }

    openTaskForm();
  };

  const handleWorkspaceChange = (workspaceId) => {
    if (disabledWorkspaces.includes(workspaceId)) {
      setActiveWorkspace(getAvailableWorkspace("calendar", disabledWorkspaces));
      return;
    }

    setActiveWorkspace(workspaceId);

    if (workspaceId !== "tasks" && isFormOpen) {
      closeTaskForm({ resetForm: false });
    }

    if (workspaceId === "time") {
      const now = new Date();
      setCurrentTime(now);
      setTimeDate(now);
      centerTimelineOnTime(now);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const deadline = buildDeadlineValue(form.deadlineDate, form.deadlineTime);

    if (!form.title.trim() || !deadline) return;

    setIsCreating(true);

    try {
      const createdTask = await onCreateTask({
        title: form.title.trim(),
        assignedTo: form.assignedTo,
        deadline,
        status: "To Do",
        teamId: team.id
      });
      animateTask(createdTask?.id);
      closeTaskForm({ resetForm: true });
    } finally {
      setIsCreating(false);
    }
  };

  const moveCalendarMonth = (offset) => {
    setCalendarMonthDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const selectCalendarDate = (day) => {
    setSelectedCalendarDateKey(day.key);
    setCalendarMonthDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
  };

  const moveTimeDate = (offset) => {
    setTimeDate((currentDate) => addLocalDays(currentDate, offset));
  };

  const getNextStatusValue = (statusUpdate) =>
    typeof statusUpdate === "string" ? statusUpdate : statusUpdate?.status;

  const handleTaskStatusUpdate = async (taskId, statusUpdate) => {
    const task = tasks.find((item) => item.id === taskId);
    const nextStatus = getNextStatusValue(statusUpdate);
    const shouldKeepInCurrentLane =
      activeWorkspace === "tasks" &&
      task &&
      nextStatus &&
      task.status !== nextStatus &&
      (task.status === "Completed" || nextStatus === "Completed");

    if (shouldKeepInCurrentLane) {
      setStickyTaskStatusById((currentItems) => ({
        ...currentItems,
        [taskId]: activeFilter
      }));
    }

    try {
      return await onUpdateTaskStatus(taskId, statusUpdate);
    } catch (error) {
      if (shouldKeepInCurrentLane) {
        setStickyTaskStatusById((currentItems) => {
          const nextItems = { ...currentItems };
          delete nextItems[taskId];
          return nextItems;
        });
      }

      throw error;
    }
  };

  const showTodayInTime = () => {
    const now = new Date();
    setCurrentTime(now);
    setTimeDate(now);
    centerTimelineOnTime(now);
  };

  const renderWorkspaceSwitch = () => (
    <div className="task-workspace-switch" role="tablist" aria-label="Task workspaces">
      {workspaceItems.map((item) => {
        const Icon = item.icon;
        const isDisabled = disabledWorkspaces.includes(item.id);
        const isActive = activeWorkspace === item.id;

        return (
          <button
            type="button"
            className={[
              "task-workspace-button",
              isActive ? "active" : "",
              isDisabled ? "disabled" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            key={item.id}
            onClick={() => handleWorkspaceChange(item.id)}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            title={isDisabled ? `${item.label} is already open here` : item.label}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );

  const renderTaskWorkspace = () => (
    <>
      <div className="task-tabs" role="tablist" aria-label="Task status filter">
        {filterItems.map((item) => (
          <button
            type="button"
            className={activeFilter === item.value ? "task-tab active" : "task-tab"}
            key={item.value}
            onClick={() => setActiveFilter(item.value)}
            role="tab"
            aria-selected={activeFilter === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      {shouldShowForm && (
        <div className={isFormClosing ? "task-form-reveal closing" : "task-form-reveal"}>
          <form id="new-task-form" className="task-form" onSubmit={handleSubmit}>
            <label>
              Task title
              <input
                ref={titleInputRef}
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Add a task..."
              />
            </label>

            <div className="form-row">
              <label>
                Assign to
                <select
                  value={form.assignedTo}
                  onChange={(event) => handleChange("assignedTo", event.target.value)}
                >
                  {team.members.map((member) => (
                    <option value={member} key={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Deadline date
                <input
                  type="date"
                  value={form.deadlineDate}
                  onChange={(event) => handleChange("deadlineDate", event.target.value)}
                />
              </label>
            </div>

            <label>
              Time
              <input
                type="time"
                value={form.deadlineTime}
                onChange={(event) => handleChange("deadlineTime", event.target.value)}
              />
            </label>

            <button type="submit" className="primary-button small" disabled={isCreating}>
              <PlusCircle size={17} />
              {isCreating ? "Adding..." : "Add Task"}
            </button>
          </form>
        </div>
      )}

      <div className="task-list">
        {visibleTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={team.members}
            onUpdateTask={onUpdateTask}
            onUpdateTaskStatus={handleTaskStatusUpdate}
            onDeleteTask={onDeleteTask}
            isNew={task.id === animatedTaskId}
          />
        ))}
        {visibleTasks.length === 0 && <div className="empty-state compact">No tasks in this lane.</div>}
      </div>
    </>
  );

  const renderCalendarDetails = () => {
    if (selectedCalendarDateKey) {
      const selectedDate = dateFromKey(selectedCalendarDateKey);

      if (selectedCalendarTasks.length === 0) {
        return (
          <div className="empty-state compact">
            No deadlines on {formatFullDate(selectedDate)} :)
          </div>
        );
      }

      return selectedCalendarTasks.map((task) => (
        <DeadlineWarningItem task={task} now={currentTime} key={task.id} />
      ));
    }

    if (upcomingTasks.length === 0) {
      return <div className="empty-state compact">No deadlines in the next 5 days.</div>;
    }

    return upcomingTasks.map((task) => (
      <DeadlineWarningItem task={task} now={currentTime} key={task.id} />
    ));
  };

  const renderCalendarWorkspace = () => (
    <div className="task-workspace-content calendar-workspace">
      <div className="mini-calendar">
        <div className="mini-calendar-header">
          <strong>{formatMonthHeading(calendarMonthDate)}</strong>
          <div>
            <button type="button" onClick={() => moveCalendarMonth(-1)} title="Previous month">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => setCalendarMonthDate(new Date())} title="Today">
              Today
            </button>
            <button type="button" onClick={() => moveCalendarMonth(1)} title="Next month">
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        <div className="mini-calendar-grid">
          {weekdayLabels.map((label) => (
            <span className="mini-calendar-weekday" key={label}>
              {label}
            </span>
          ))}
          {calendarDays.map((day) => {
            const deadlineCount = deadlineCountsByDate.get(day.key) || 0;

            return (
              <button
                type="button"
                className={[
                  "mini-calendar-day",
                  day.isCurrentMonth ? "" : "muted-day",
                  day.key === todayKey ? "today" : "",
                  day.key === selectedCalendarDateKey ? "selected" : "",
                  deadlineCount > 0 ? "has-deadline" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={day.key}
                onClick={() => selectCalendarDate(day)}
                title={deadlineCount > 0 ? `${deadlineCount} deadline${deadlineCount === 1 ? "" : "s"}` : "No deadlines"}
              >
                <span>{day.date.getDate()}</span>
                {deadlineCount > 0 && <i aria-hidden="true">{Math.min(deadlineCount, 3)}</i>}
              </button>
            );
          })}
        </div>
      </div>

      <section className="calendar-deadline-details">
        <div className="calendar-detail-heading">
          <div>
            <span>{selectedCalendarDateKey ? "Selected Day" : "Next 5 Days"}</span>
            <strong>
              {selectedCalendarDateKey
                ? formatFullDate(dateFromKey(selectedCalendarDateKey))
                : "Upcoming Deadlines"}
            </strong>
          </div>
          {selectedCalendarDateKey && (
            <button type="button" onClick={() => setSelectedCalendarDateKey(null)} title="Show upcoming deadlines">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="deadline-warning-list">{renderCalendarDetails()}</div>
      </section>
    </div>
  );

  const renderTimeWorkspace = () => {
    const isViewingToday = timeDateKey === todayKey;
    const slotUsage = new Map();
    const timelineTasks = timedTasks.map((task) => {
      const timeKey = getDeadlineTimeKey(task.deadline);
      const slotIndex = slotUsage.get(timeKey) || 0;
      slotUsage.set(timeKey, slotIndex + 1);

      return { task, slotIndex };
    });
    const activeProgressItems = assigneeFilteredTasks
      .map((task) => getActiveProgressBlock(task, timeDateKey, currentTime))
      .filter(Boolean);

    return (
      <div className="task-workspace-content time-workspace">
        <div className="local-clock-card">
          <div>
            <span>Local Time</span>
            <strong>{formatClock(currentTime)}</strong>
          </div>
          <p>{formatDayHeading(currentTime)}</p>
        </div>

        <div className="time-day-nav">
          <button type="button" onClick={() => moveTimeDate(-1)} title="Previous day">
            <ChevronLeft size={17} />
          </button>
          <button type="button" onClick={showTodayInTime} title="Today">
            Today
          </button>
          <button type="button" onClick={() => moveTimeDate(1)} title="Next day">
            <ChevronRight size={17} />
          </button>
          <strong>{formatFullDate(timeDate)}</strong>
        </div>

        <div className="time-scroll-region" ref={timeScrollRef}>
          {allDayTasks.length > 0 && (
            <div className="all-day-deadlines">
              {allDayTasks.map((task) => (
                <div className="all-day-deadline" key={task.id}>
                  <CalendarDays size={14} />
                  <span>{task.title}</span>
                </div>
              ))}
            </div>
          )}

          {timeDateTasks.length === 0 && activeProgressItems.length === 0 && (
            <div className="empty-state compact">No deadlines on {formatFullDate(timeDate)} :)</div>
          )}

          <div className="day-timeline" ref={dayTimelineRef} style={{ height: `${timelineHeight}px` }}>
            {hourSlots.map((hour) => (
              <div className="timeline-hour" key={hour} style={{ height: `${timelineHourHeight}px` }}>
                <span>{formatHourLabel(hour)}</span>
                <div />
              </div>
            ))}

            <div className="timeline-event-layer">
              {activeProgressItems.map(({ task, top, height, elapsedMs }) => (
                <article
                  className="timeline-active-progress"
                  key={`active-${task.id}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`
                  }}
                >
                  <strong>On Progress: {task.title}</strong>
                  <span>{formatElapsedDuration(elapsedMs)} - {task.assignedTo}</span>
                </article>
              ))}

              {timelineTasks.map(({ task, slotIndex }) => (
                <article
                  className="timeline-deadline"
                  key={task.id}
                  style={{
                    top: `${getTimelinePosition(task.deadline)}px`,
                    marginLeft: `${slotIndex * 8}px`,
                    width: `calc(100% - ${slotIndex * 8}px)`
                  }}
                >
                  <strong>{task.title}</strong>
                  <span>{formatDeadlineTime(task.deadline)} - {task.assignedTo}</span>
                </article>
              ))}

              {isViewingToday && (
                <div className="timeline-now-line" style={{ top: `${currentTimePosition}px` }}>
                  <span />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isCollapsed) {
    return <aside className="task-panel task-panel-collapsed" aria-label="Collapsed tasks panel" />;
  }

  return (
    <aside className="task-panel">
      <div className="panel-header compact">
        <div className="task-title-menu-wrap">
          <button
            type="button"
            className="task-title-menu-button"
            onClick={() => setIsTaskViewOpen((isOpen) => !isOpen)}
            aria-expanded={isTaskViewOpen}
            title="Choose task filter"
          >
            <span>Tasks</span>
            <strong>{assigneeLabel}</strong>
            <ChevronDown size={17} />
          </button>
          {isTaskViewOpen && (
            <div className="task-view-menu task-title-menu">
              {assigneeOptions.map((option) => (
                <button
                  type="button"
                  className={assigneeFilter === option.value ? "active" : ""}
                  key={option.value}
                  onClick={() => {
                    setAssigneeFilter(option.value);
                    setIsTaskViewOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="task-panel-actions">
          {!isTaskWorkspaceDisabled && (
            <button
              type="button"
              className={isFormOpen ? "new-task-button active" : "new-task-button"}
              aria-expanded={isFormOpen}
              aria-controls="new-task-form"
              onClick={handleFormToggle}
              disabled={isCreating}
              title={isFormOpen ? "Cancel new task" : "New task"}
            >
              {isFormOpen ? <X size={17} /> : <PlusCircle size={17} />}
            </button>
          )}
          <button type="button" className="task-view-button" title="More task options">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {renderWorkspaceSwitch()}

      {activeWorkspace === "tasks" && renderTaskWorkspace()}
      {activeWorkspace === "calendar" && renderCalendarWorkspace()}
      {activeWorkspace === "time" && renderTimeWorkspace()}
    </aside>
  );
}
