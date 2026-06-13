import {
  ArrowRight,
  ListTodo,
  UsersRound
} from "lucide-react";
import GroupAvatar from "./GroupAvatar";
import ProfileAvatar from "./ProfileAvatar";

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatMessageTime(dateValue) {
  if (!dateValue) return "No messages yet";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getLatestMessage(messages) {
  return [...messages].sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  })[0];
}

export default function ChatDirectory({
  teams = [],
  tasks = [],
  messages = [],
  user,
  onOpenTeam
}) {
  const username = user?.username || "";
  const visibleTeams = teams.filter((team) => !username || team.members.includes(username));
  const totalUnfinishedTasks = tasks.filter((task) => {
    return task.assignedTo === username && task.status !== "Completed";
  }).length;

  return (
    <div className="page-stack chat-directory-page">
      <header className="page-header chat-directory-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h1>Group Chats</h1>
          <p className="muted">Your conversations with unfinished work counts.</p>
        </div>
        <div className="chat-directory-summary">
          <ListTodo size={18} />
          <span>{pluralize(totalUnfinishedTasks, "unfinished task")}</span>
        </div>
      </header>

      <section className="chat-directory-grid" aria-label="Group chats">
        {visibleTeams.map((team) => {
          const teamTasks = tasks.filter((task) => task.teamId === team.id);
          const userUnfinishedTasks = teamTasks.filter((task) => {
            return task.assignedTo === username && task.status !== "Completed";
          });
          const teamMessages = messages.filter((message) => message.teamId === team.id);
          const latestMessage = getLatestMessage(teamMessages);

          return (
            <button
              className="chat-directory-card"
              key={team.id}
              type="button"
              onClick={() => onOpenTeam(team.id)}
            >
              <div className="chat-directory-card-top">
                <GroupAvatar group={team} className="chat-directory-avatar" />
                <span className="chat-directory-open">
                  <ArrowRight size={18} />
                </span>
              </div>

              <div className="chat-directory-title-row">
                <strong>{team.name}</strong>
                <span className={userUnfinishedTasks.length > 0 ? "unfinished-badge active" : "unfinished-badge"}>
                  {userUnfinishedTasks.length}
                </span>
              </div>

              <p className="chat-directory-preview">
                {latestMessage ? (
                  <>
                    <b>{latestMessage.sender}</b>
                    {" - "}
                    {latestMessage.content}
                  </>
                ) : (
                  "No messages yet."
                )}
              </p>

              <div className="chat-directory-meta">
                <span>
                  <UsersRound size={15} />
                  {pluralize(team.members.length, "member")}
                </span>
                <span>
                  <ListTodo size={15} />
                  {pluralize(userUnfinishedTasks.length, "unfinished task")}
                </span>
              </div>

              <div className="chat-directory-footer">
                <div className="member-stack compact" aria-hidden="true">
                  {team.members.slice(0, 4).map((member) => (
                    <ProfileAvatar key={member} name={member} size="xs" />
                  ))}
                </div>
                <span>{formatMessageTime(latestMessage?.createdAt)}</span>
              </div>
            </button>
          );
        })}

        {visibleTeams.length === 0 && (
          <div className="empty-state">No group chats yet.</div>
        )}
      </section>
    </div>
  );
}
