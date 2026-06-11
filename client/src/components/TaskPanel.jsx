import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreVertical, PlusCircle, X } from "lucide-react";
import TaskCard from "./TaskCard";

const formAnimationDuration = 220;

const initialForm = {
  title: "",
  assignedTo: "Andy",
  deadline: "2026-06-07",
  status: "To Do"
};

export default function TaskPanel({
  team,
  tasks,
  user,
  onCreateTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  isCollapsed = false
}) {
  const [form, setForm] = useState(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("me");
  const [isTaskViewOpen, setIsTaskViewOpen] = useState(false);
  const titleInputRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const shouldShowForm = isFormOpen || isFormClosing;
  const filterItems = [
    { label: "All", value: "All" },
    { label: "To Do", value: "To Do" },
    { label: "In Progress", value: "In Progress" },
    { label: "Done", value: "Completed" }
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
      : assigneeFilteredTasks.filter((task) => task.status === activeFilter);

  useEffect(() => {
    if (isFormOpen) {
      titleInputRef.current?.focus();
    }
  }, [isFormOpen]);

  useEffect(() => {
    return () => window.clearTimeout(closeTimeoutRef.current);
  }, []);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const openTaskForm = () => {
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
        setForm(initialForm);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;

    setIsCreating(true);

    try {
      await onCreateTask({
        ...form,
        title: form.title.trim(),
        teamId: team.id
      });
      closeTaskForm({ resetForm: true });
    } finally {
      setIsCreating(false);
    }
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
          <button type="button" className="task-view-button" title="More task options">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

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
                Deadline
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(event) => handleChange("deadline", event.target.value)}
                />
              </label>
            </div>

            <label>
              Status
              <select value={form.status} onChange={(event) => handleChange("status", event.target.value)}>
                <option>To Do</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
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
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
          />
        ))}
        {visibleTasks.length === 0 && <div className="empty-state compact">No tasks in this lane.</div>}
      </div>
    </aside>
  );
}
