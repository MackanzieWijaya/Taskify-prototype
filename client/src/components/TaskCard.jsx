import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Pause,
  Pencil,
  Play,
  Save,
  Square,
  Trash2,
  X
} from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";
import { buildDeadlineValue, formatDeadline, splitDeadlineValue } from "../deadlineUtils";

function getTaskElapsedMs(task, now = Date.now()) {
  const baseElapsedMs = Number(task.elapsedMs) > 0 ? Number(task.elapsedMs) : 0;
  const startedAt = task.timerStartedAt ? new Date(task.timerStartedAt).getTime() : null;
  const runningMs =
    task.status === "In Progress" && startedAt && !Number.isNaN(startedAt) ? Math.max(0, now - startedAt) : 0;

  return baseElapsedMs + runningMs;
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

export default function TaskCard({
  task,
  members = [],
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  isNew = false,
  variant = "card"
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isStatusPopping, setIsStatusPopping] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [deleteError, setDeleteError] = useState("");
  const [editError, setEditError] = useState("");
  const [actionError, setActionError] = useState("");
  const popTimeoutRef = useRef(null);
  const initialDeadlineFields = splitDeadlineValue(task.deadline);
  const [editForm, setEditForm] = useState({
    title: task.title,
    assignedTo: task.assignedTo,
    deadlineDate: initialDeadlineFields.deadlineDate,
    deadlineTime: initialDeadlineFields.deadlineTime
  });
  const statusClass = task.status.toLowerCase().replaceAll(" ", "-");
  const isCompleted = task.status === "Completed";
  const isRunning = task.status === "In Progress" && Boolean(task.timerStartedAt);
  const isPaused = task.status === "In Progress" && !task.timerStartedAt;
  const elapsedMs = getTaskElapsedMs(task, now);
  const shouldShowElapsed = elapsedMs > 0 || task.status === "In Progress";

  useEffect(() => {
    if (task.status !== "In Progress") return undefined;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [task.status]);

  useEffect(() => {
    return () => window.clearTimeout(popTimeoutRef.current);
  }, []);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError("");
      await onDeleteTask(task.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error.message || "Could not delete task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  };

  const openEditDialog = () => {
    setEditError("");
    setEditForm({
      title: task.title,
      assignedTo: task.assignedTo,
      ...splitDeadlineValue(task.deadline)
    });
    setIsEditDialogOpen(true);
  };

  const updateEditField = (field, value) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editForm.title.trim()) return;

    const deadline = buildDeadlineValue(editForm.deadlineDate, editForm.deadlineTime);

    if (!deadline) {
      setEditError("Deadline date is required.");
      return;
    }

    try {
      setIsSaving(true);
      setEditError("");
      await onUpdateTask(task.id, {
        ...editForm,
        title: editForm.title.trim(),
        deadline
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      setEditError(error.message || "Could not update task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const showStatusPop = () => {
    window.clearTimeout(popTimeoutRef.current);
    setIsStatusPopping(true);
    popTimeoutRef.current = window.setTimeout(() => {
      setIsStatusPopping(false);
    }, 420);
  };

  const updateStatus = async (statusUpdate) => {
    if (isStatusUpdating) return;

    try {
      setIsStatusUpdating(true);
      setActionError("");
      showStatusPop();
      await onUpdateTaskStatus(task.id, statusUpdate);
    } catch (error) {
      setActionError(error.message || "Could not update task status.");
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const toggleCompleted = () => {
    updateStatus(isCompleted ? task.previousStatus || "To Do" : "Completed");
  };

  const cardClassName = [
    "task-card",
    isCompleted ? "completed-task" : "",
    isStatusPopping ? "status-pop" : "",
    variant === "list" ? "list-task-card" : "",
    isNew ? "new-task-pop" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <article className={cardClassName}>
        <div className="task-card-top">
          <div className="task-title-row">
            <button
              type="button"
              className={isCompleted ? "task-complete-button completed" : "task-complete-button"}
              onClick={toggleCompleted}
              disabled={isStatusUpdating}
              title={isCompleted ? "Undo completed task" : "Complete task"}
            >
              {isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
            </button>
            <h3>{task.title}</h3>
          </div>
          <span className={`status-pill ${statusClass}`}>{task.status}</span>
        </div>

        <div className="task-meta">
          <span className="task-meta-item">
            <ProfileAvatar name={task.assignedTo} size="xs" />
            Assigned to {task.assignedTo}
          </span>
          <span className="task-meta-item">
            <CalendarDays size={15} />
            {formatDeadline(task.deadline)}
          </span>
          {shouldShowElapsed && (
            <span className="task-meta-item task-timer-meta">
              <Clock3 size={15} />
              {isRunning ? "Working" : isPaused ? "Paused" : "Tracked"} {formatElapsedDuration(elapsedMs)}
            </span>
          )}
        </div>

        <div className="task-card-actions">
          <div className="task-flow-actions">
            {task.status === "To Do" && (
              <button
                type="button"
                className="task-action-button start"
                onClick={() => updateStatus("In Progress")}
                disabled={isStatusUpdating}
              >
                <Play size={15} />
                Start Task
              </button>
            )}

            {task.status === "In Progress" && (
              <>
                <button
                  type="button"
                  className={isRunning ? "task-action-button pause" : "task-action-button start"}
                  onClick={() =>
                    updateStatus({
                      status: "In Progress",
                      timerAction: isRunning ? "pause" : "resume"
                    })
                  }
                  disabled={isStatusUpdating}
                >
                  {isRunning ? <Pause size={15} /> : <Play size={15} />}
                  {isRunning ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  className="task-action-button stop"
                  onClick={() => updateStatus("To Do")}
                  disabled={isStatusUpdating}
                >
                  <Square size={14} />
                  Stop
                </button>
              </>
            )}
          </div>

          <button type="button" className="delete-task-button" onClick={openDeleteDialog} title="Delete task">
            <Trash2 size={15} />
          </button>

          <button type="button" className="task-more-button" onClick={openEditDialog} title="Edit task">
            <Pencil size={16} />
          </button>
        </div>

        {actionError && <p className="form-error compact-error">{actionError}</p>}
      </article>

      {isEditDialogOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="delete-dialog task-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-task-title-${task.id}`}
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setIsEditDialogOpen(false)}
              title="Close dialog"
              disabled={isSaving}
            >
              <X size={18} />
            </button>

            <div>
              <p className="eyebrow">Edit Task</p>
              <h2 id={`edit-task-title-${task.id}`}>{task.title}</h2>
            </div>

            <form className="task-edit-form" onSubmit={handleEditSubmit}>
              <label>
                Task title
                <input
                  value={editForm.title}
                  onChange={(event) => updateEditField("title", event.target.value)}
                />
              </label>

              <div className="form-row">
                <label>
                  Assign to
                  <select
                    value={editForm.assignedTo}
                    onChange={(event) => updateEditField("assignedTo", event.target.value)}
                  >
                    {(members.length > 0 ? members : [task.assignedTo]).map((member) => (
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
                    value={editForm.deadlineDate}
                    onChange={(event) => updateEditField("deadlineDate", event.target.value)}
                  />
                </label>
              </div>

              <label>
                Time
                <input
                  type="time"
                  value={editForm.deadlineTime}
                  onChange={(event) => updateEditField("deadlineTime", event.target.value)}
                />
              </label>

              {editError && <p className="form-error">{editError}</p>}

              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button small" disabled={isSaving}>
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isDeleteDialogOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-task-title-${task.id}`}
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setIsDeleteDialogOpen(false)}
              title="Close dialog"
              disabled={isDeleting}
            >
              <X size={18} />
            </button>

            <div className="delete-dialog-icon">
              <AlertTriangle size={24} />
            </div>

            <div>
              <p className="eyebrow">Delete task</p>
              <h2 id={`delete-task-title-${task.id}`}>{task.title}</h2>
              <p className="delete-dialog-warning">
                Are you sure you want to delete this task? Other member will notice the deleted task in
                notification
              </p>
            </div>

            {deleteError && <p className="form-error">{deleteError}</p>}

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 size={16} />
                {isDeleting ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
