import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock3, Sparkles, Wand2 } from "lucide-react";
import { isTaskMentionForUser, parseTaskIntent } from "../taskParser";

const notificationIcons = {
  deadline: Clock3,
  status: Bell,
  completed: CheckCircle2,
  task: Sparkles,
  activity: Bell
};

function formatTime(dateValue) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

export default function NotificationList({
  notifications,
  title = "Notifications",
  view = "panel",
  messages = [],
  tasks = [],
  teams = [],
  user,
  onCreateTask
}) {
  const [activeTab, setActiveTab] = useState("updates");
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const taskSourceMessageIds = useMemo(() => {
    return new Set(
      tasks
        .map((task) => task.sourceMessageId)
        .filter((sourceMessageId) => sourceMessageId !== null && sourceMessageId !== undefined)
    );
  }, [tasks]);
  const taskMentions = useMemo(() => {
    if (!user) return [];

    return messages
      .map((message) => {
        const team = teamById.get(message.teamId);
        const taskIntent = parseTaskIntent(message.content, {
          members: team?.members || [],
          fallbackAssignee: user.username,
          baseDate: message.createdAt
        });

        return {
          message,
          team,
          taskIntent
        };
      })
      .filter(({ message, taskIntent }) => isTaskMentionForUser(message, taskIntent, user.username))
      .sort((first, second) => new Date(second.message.createdAt) - new Date(first.message.createdAt));
  }, [messages, teamById, user]);

  const handleCreateTaskFromMention = async ({ message, team, taskIntent }) => {
    if (!taskIntent || !team || taskSourceMessageIds.has(message.id)) return;

    await onCreateTask({
      teamId: team.id,
      title: taskIntent.title,
      assignedTo: taskIntent.assignedTo,
      deadline: taskIntent.deadline,
      sourceMessageId: message.id,
      status: "To Do"
    });
  };

  return (
    <section className={view === "page" ? "page-stack" : "panel"}>
      {view === "page" ? (
        <header className="page-header">
          <div>
            <p className="eyebrow">Updates</p>
            <h1>Notifications</h1>
            <p className="muted">Simple alerts for deadlines, task changes, and group progress.</p>
          </div>
        </header>
      ) : (
        <div className="panel-header">
          <div>
            <p className="eyebrow">Updates</p>
            <h2>{title}</h2>
          </div>
        </div>
      )}

      {view === "page" && (
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
      )}

      {(view !== "page" || activeTab === "updates") && (
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
        </div>
      )}

      {view === "page" && activeTab === "task-mentions" && (
        <div className="notification-page-list">
          {taskMentions.map((taskMention) => {
            const { message, team, taskIntent } = taskMention;
            const isTaskAdded = taskSourceMessageIds.has(message.id);

            return (
              <article className="notification-item task-mention-item" key={message.id}>
                <div className="notification-icon task">
                  <Wand2 size={17} />
                </div>
                <div>
                  <strong>{taskIntent.title}</strong>
                  <p>{message.content}</p>
                  <span>
                    {team?.name || "Group"} - due {taskIntent.deadline} - assigned to {taskIntent.assignedTo}
                  </span>
                </div>
                <button
                  type="button"
                  className="primary-button small"
                  disabled={isTaskAdded}
                  onClick={() => handleCreateTaskFromMention(taskMention)}
                >
                  <Wand2 size={16} />
                  {isTaskAdded ? "Task Added" : "Add Task"}
                </button>
              </article>
            );
          })}
          {taskMentions.length === 0 && (
            <div className="empty-state">No task mentions yet. Messages need @you or @all plus a due date.</div>
          )}
        </div>
      )}
    </section>
  );
}
