import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Loader2,
  UsersRound
} from "lucide-react";
import NotificationList from "./NotificationList";

const statusMeta = {
  "Total Tasks": { icon: ClipboardList, className: "summary-total" },
  "To Do": { icon: Clock3, className: "summary-todo" },
  "In Progress": { icon: Loader2, className: "summary-progress" },
  Completed: { icon: CheckCircle2, className: "summary-completed" }
};

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(dateValue));
}

export default function Dashboard({ teams, tasks, notifications, onOpenTeam }) {
  const summary = [
    { label: "Total Tasks", value: tasks.length },
    { label: "To Do", value: tasks.filter((task) => task.status === "To Do").length },
    {
      label: "In Progress",
      value: tasks.filter((task) => task.status === "In Progress").length
    },
    {
      label: "Completed",
      value: tasks.filter((task) => task.status === "Completed").length
    }
  ];

  const upcomingTasks = [...tasks]
    .filter((task) => task.status !== "Completed")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p className="muted">Track group progress, deadlines, and recent work updates.</p>
        </div>
        <div className="header-chip">
          <CalendarDays size={18} />
          <span>June Sprint</span>
        </div>
      </header>

      <section className="summary-grid" aria-label="Task summary">
        {summary.map((item) => {
          const meta = statusMeta[item.label];
          const Icon = meta.icon;

          return (
            <article className={`summary-card ${meta.className}`} key={item.label}>
              <div className="summary-icon">
                <Icon size={20} />
              </div>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Upcoming Deadlines</h2>
            </div>
          </div>
          <div className="deadline-list">
            {upcomingTasks.map((task) => (
              <div className="deadline-item" key={task.id}>
                <div className="date-tile">
                  <span>{formatDate(task.deadline).split(" ")[0]}</span>
                  <strong>{formatDate(task.deadline).split(" ")[1]}</strong>
                </div>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.assignedTo} - {task.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <NotificationList notifications={notifications.slice(0, 4)} title="Recent Activity" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Groups</p>
            <h2>Your Workspaces</h2>
          </div>
        </div>
        <div className="team-grid">
          {teams.map((team) => (
            <button className="team-card" key={team.id} type="button" onClick={() => onOpenTeam(team.id)}>
              <div className="team-card-top">
                <div className="team-icon" style={{ backgroundColor: team.color }}>
                  {team.avatarUrl ? <img src={team.avatarUrl} alt="" /> : <UsersRound size={20} />}
                </div>
                <ArrowRight size={18} />
              </div>
              <strong>{team.name}</strong>
              <p>{team.description}</p>
              <span>{team.members.length} members</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
