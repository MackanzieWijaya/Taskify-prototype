import { useState } from "react";
import { AlertTriangle, CalendarDays, Circle, Pencil, Save, Trash2, X } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateValue));
}

export default function TaskCard({ task, members = [], onUpdateTask, onUpdateTaskStatus, onDeleteTask }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    title: task.title,
    assignedTo: task.assignedTo,
    deadline: task.deadline,
    status: task.status
  });
  const statusClass = task.status.toLowerCase().replaceAll(" ", "-");

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
      deadline: task.deadline,
      status: task.status
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

    try {
      setIsSaving(true);
      setEditError("");
      await onUpdateTask(task.id, {
        ...editForm,
        title: editForm.title.trim()
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      setEditError(error.message || "Could not update task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <article className="task-card">
        <div className="task-card-top">
          <div className="task-title-row">
            <Circle size={22} />
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
            {formatDate(task.deadline)}
          </span>
        </div>

        <div className="task-card-actions">
          <label className="status-control">
            <select
              value={task.status}
              onChange={(event) => onUpdateTaskStatus(task.id, event.target.value)}
              aria-label={`Update ${task.title} status`}
            >
              <option>To Do</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </label>

          <button type="button" className="delete-task-button" onClick={openDeleteDialog} title="Delete task">
            <Trash2 size={15} />
          </button>

          <button type="button" className="task-more-button" onClick={openEditDialog} title="Edit task">
            <Pencil size={16} />
          </button>
        </div>
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
                  Deadline
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={(event) => updateEditField("deadline", event.target.value)}
                  />
                </label>
              </div>

              <label>
                Status
                <select value={editForm.status} onChange={(event) => updateEditField("status", event.target.value)}>
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
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
