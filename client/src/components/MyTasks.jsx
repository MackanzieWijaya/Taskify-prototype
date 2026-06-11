import { useMemo, useState } from "react";
import TaskCard from "./TaskCard";

export default function MyTasks({ teams = [], tasks, user, onUpdateTask, onUpdateTaskStatus, onDeleteTask }) {
  const [assigneeFilter, setAssigneeFilter] = useState("me");
  const members = useMemo(() => {
    return [...new Set(teams.flatMap((team) => team.members))];
  }, [teams]);
  const assigneeOptions = [
    { label: "My Tasks", value: "me" },
    { label: "Everyone", value: "all" },
    ...members.map((member) => ({ label: member, value: member }))
  ];
  const visibleTasks =
    assigneeFilter === "all"
      ? tasks
      : tasks.filter((task) =>
          assigneeFilter === "me" ? task.assignedTo === user.username : task.assignedTo === assigneeFilter
        );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Task Queue</p>
          <h1>Tasks</h1>
          <p className="muted">Filter tasks by yourself, everyone, or a specific member.</p>
        </div>
        <div className="task-page-filter" aria-label="Task owner filter">
          {assigneeOptions.map((option) => (
            <button
              type="button"
              className={assigneeFilter === option.value ? "active" : ""}
              key={option.value}
              onClick={() => setAssigneeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="my-task-grid">
        {visibleTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            onUpdateTask={onUpdateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
          />
        ))}
        {visibleTasks.length === 0 && (
          <div className="empty-state">No tasks match this view yet.</div>
        )}
      </section>
    </div>
  );
}
