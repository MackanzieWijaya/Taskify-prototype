import { useMemo, useState } from "react";
import {
  Ban,
  Bell,
  CheckCircle2,
  Clock3,
  MoreVertical,
  Sparkles,
  Wand2
} from "lucide-react";
import TaskPanel from "./TaskPanel";
import TaskPaneToggle from "./TaskPaneToggle";
import { formatDeadline } from "../deadlineUtils";
import { isTaskMentionForUser, parseTaskIntent } from "../taskParser";

const notificationIcons = {
  deadline: Clock3,
  status: Bell,
  completed: CheckCircle2,
  task: Sparkles,
  activity: Bell
};

function formatTime(dateValue) {
  if (!dateValue) {
    return "Just now";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function NotificationList({
  notifications,
  title = "Notifications",
  view = "panel",
  messages = [],
  tasks = [],
  teams = [],
  selectedTeam,
  selectedTeamId,
  user,
  onCreateTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onIgnoreTaskMention,
  isTasksCollapsed = false,
  onToggleTasksPanel = () => {}
}) {
  const [activeTab, setActiveTab] = useState("updates");
  const [pendingMessageIds, setPendingMessageIds] = useState(() => new Set());
  const [addedTaskIdsByMessageId, setAddedTaskIdsByMessageId] = useState({});
  const [reopenedMessageIds, setReopenedMessageIds] = useState(() => new Set());
  const [ignoredMessageIds, setIgnoredMessageIds] = useState(() => new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const taskBySourceMessageId = useMemo(() => {
    const taskMap = new Map();

    tasks.forEach((task) => {
      if (task.sourceMessageId !== null && task.sourceMessageId !== undefined) {
        taskMap.set(Number(task.sourceMessageId), task);
      }
    });

    return taskMap;
  }, [tasks]);
  const activeTeam = selectedTeam || teams.find((team) => team.id === selectedTeamId) || teams[0];
  const activeTeamTasks = activeTeam ? tasks.filter((task) => task.teamId === activeTeam.id) : [];
  const taskMentions = useMemo(() => {
    if (!user) return [];

    return messages
      .map((message) => {
        const team = teamById.get(message.teamId);
        const taskIntent = parseTaskIntent(message.content, {
          members: team?.members || [],
          fallbackAssignee: user.username
        });

        return {
          message,
          team,
          taskIntent
        };
      })
      .filter(({ message, taskIntent }) => {
        if (ignoredMessageIds.has(message.id)) return false;
        if (!isTaskMentionForUser(message, taskIntent, user.username)) return false;

        const wasAddedBeforeThisVisit = taskBySourceMessageId.has(message.id);
        const wasAddedDuringThisVisit = Boolean(addedTaskIdsByMessageId[message.id]);
        const wasReopenedDuringThisVisit = reopenedMessageIds.has(message.id);

        return !wasAddedBeforeThisVisit || wasAddedDuringThisVisit || wasReopenedDuringThisVisit;
      })
      .sort((first, second) => new Date(second.message.createdAt) - new Date(first.message.createdAt));
  }, [addedTaskIdsByMessageId, ignoredMessageIds, messages, reopenedMessageIds, taskBySourceMessageId, teamById, user]);

  const setMessagePending = (messageId, isPending) => {
    setPendingMessageIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isPending) {
        nextIds.add(messageId);
      } else {
        nextIds.delete(messageId);
      }

      return nextIds;
    });
  };

  const getAttachedTask = (messageId) => {
    const addedTaskId = addedTaskIdsByMessageId[messageId];
    const localTask = addedTaskId
      ? tasks.find((task) => task.id === Number(addedTaskId))
      : null;

    return localTask || taskBySourceMessageId.get(Number(messageId)) || (addedTaskId ? { id: addedTaskId } : null);
  };

  const handleCreateTaskFromPanel = async (task) => {
    const createdTask = await onCreateTask(task);

    if (createdTask?.id) {
      setHighlightedTaskId(createdTask.id);
    }

    return createdTask;
  };

  const handleToggleTaskFromMention = async ({ message, team, taskIntent }) => {
    if (!taskIntent || !team || pendingMessageIds.has(message.id)) return;

    const attachedTask = getAttachedTask(message.id);
    setMessagePending(message.id, true);

    try {
      if (attachedTask) {
        await onDeleteTask(attachedTask.id);
        setAddedTaskIdsByMessageId((currentMap) => {
          const nextMap = { ...currentMap };
          delete nextMap[message.id];
          return nextMap;
        });
        setReopenedMessageIds((currentIds) => new Set(currentIds).add(message.id));

        if (highlightedTaskId === attachedTask.id) {
          setHighlightedTaskId(null);
        }

        return;
      }

      const createdTask = await onCreateTask({
        teamId: team.id,
        title: taskIntent.title,
        assignedTo: taskIntent.assignedTo,
        deadline: taskIntent.deadline,
        sourceMessageId: message.id,
        status: "To Do"
      });

      if (createdTask?.id) {
        setAddedTaskIdsByMessageId((currentMap) => ({
          ...currentMap,
          [message.id]: createdTask.id
        }));
        setReopenedMessageIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(message.id);
          return nextIds;
        });
        setHighlightedTaskId(createdTask.id);
      }
    } finally {
      setMessagePending(message.id, false);
    }
  };

  const handleIgnoreTaskMention = async (taskMention) => {
    const { message } = taskMention;

    setIgnoredMessageIds((currentIds) => new Set(currentIds).add(message.id));
    setOpenMenuId(null);

    try {
      await onIgnoreTaskMention?.(taskMention);
    } catch (error) {
      console.warn("Could not notify the sender about the ignored task.", error);
    }
  };

  const renderUpdateList = () => (
    <div className={view === "page" ? "notification-page-list" : "notification-list"}>
      {notifications.map((notification) => {
        const Icon = notificationIcons[notification.type] || Bell;

        return (
          <article className="notification-item" key={notification.id}>
            <div className={`notification-icon ${notification.type}`}>
              <Icon size={17} />
            </div>
            <div>
              <strong>{notification.text}</strong>
              <span>{formatTime(notification.createdAt)}</span>
            </div>
          </article>
        );
      })}

      {notifications.length === 0 && <div className="empty-state">No updates yet.</div>}
    </div>
  );

  const renderTaskMentions = () => (
    <div className="notification-page-list" onClick={() => setOpenMenuId(null)}>
      {taskMentions.map((taskMention) => {
        const { message, team, taskIntent } = taskMention;
        const attachedTask = getAttachedTask(message.id);
        const isTaskAdded = Boolean(attachedTask);
        const isPending = pendingMessageIds.has(message.id);
        const buttonLabel = isPending
          ? isTaskAdded
            ? "Removing..."
            : "Adding..."
          : isTaskAdded
            ? "Task Added!"
            : "Add Task";

        return (
          <article className="notification-item task-mention-item" key={message.id}>
            <div className="notification-icon task">
              <Wand2 size={17} />
            </div>
            <div className="task-mention-content">
              <strong>{taskIntent.title}</strong>
              <p>{message.content}</p>
              <span>
                {team?.name || "Group"} - due {formatDeadline(taskIntent.deadline)} - assigned to {taskIntent.assignedTo}
              </span>
            </div>
            <div className="task-mention-actions">
              <button
                type="button"
                className={isTaskAdded ? "primary-button small task-add-button added" : "primary-button small task-add-button"}
                disabled={isPending}
                onClick={() => handleToggleTaskFromMention(taskMention)}
              >
                <Wand2 size={16} />
                {buttonLabel}
              </button>
              <div className="task-mention-menu-wrap">
                <button
                  type="button"
                  className="task-mention-more-button"
                  title="Task mention options"
                  aria-expanded={openMenuId === message.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId((currentId) => (currentId === message.id ? null : message.id));
                  }}
                >
                  <MoreVertical size={17} />
                </button>
                {openMenuId === message.id && (
                  <div className="task-mention-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                    <button type="button" role="menuitem" onClick={() => handleIgnoreTaskMention(taskMention)}>
                      <Ban size={15} />
                      Ignore task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
      {taskMentions.length === 0 && (
        <div className="empty-state">No task mentions yet. Messages need @you or @all plus a due date.</div>
      )}
    </div>
  );

  if (view !== "page") {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Updates</p>
            <h2>{title}</h2>
          </div>
        </div>
        {renderUpdateList()}
      </section>
    );
  }

  return (
    <div className="workspace-page notification-workspace-page">
      <section className={isTasksCollapsed ? "workspace-grid notification-workspace-grid tasks-collapsed" : "workspace-grid notification-workspace-grid"}>
        <section className="notification-main page-stack">
          <header className="page-header notification-page-header">
            <div>
              <p className="eyebrow">Updates</p>
              <h1>Notifications</h1>
              <p className="muted">Simple alerts for deadlines, task changes, and group progress.</p>
            </div>
            <TaskPaneToggle
              className="notification-task-toggle"
              isCollapsed={isTasksCollapsed}
              onToggle={onToggleTasksPanel}
            />
          </header>

          <div className="notification-tabs" role="tablist" aria-label="Notification type">
            <button
              type="button"
              className={activeTab === "updates" ? "active" : ""}
              onClick={() => setActiveTab("updates")}
              role="tab"
              aria-selected={activeTab === "updates"}
            >
              Updates
            </button>
            <button
              type="button"
              className={activeTab === "task-mentions" ? "active" : ""}
              onClick={() => setActiveTab("task-mentions")}
              role="tab"
              aria-selected={activeTab === "task-mentions"}
            >
              Task Mentions
            </button>
          </div>

          {activeTab === "updates" && renderUpdateList()}
          {activeTab === "task-mentions" && renderTaskMentions()}
        </section>

        <div className={isTasksCollapsed ? "task-pane-shell collapsed" : "task-pane-shell"}>
          {activeTeam && (
            <TaskPanel
              team={activeTeam}
              tasks={activeTeamTasks}
              user={user}
              onCreateTask={handleCreateTaskFromPanel}
              onUpdateTask={onUpdateTask}
              onUpdateTaskStatus={onUpdateTaskStatus}
              onDeleteTask={onDeleteTask}
              isCollapsed={isTasksCollapsed}
              highlightedTaskId={highlightedTaskId}
            />
          )}
        </div>
      </section>
    </div>
  );
}
