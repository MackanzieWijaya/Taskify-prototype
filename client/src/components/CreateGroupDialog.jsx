import { Plus, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const defaultColor = "#7c3aed";

export default function CreateGroupDialog({ user, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    members: user.username,
    color: defaultColor
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      setError("Group name is required.");
      return;
    }

    const members = form.members
      .split(",")
      .map((member) => member.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      setError("");
      await onCreate({
        name,
        description: form.description.trim() || `Workspace for ${name}.`,
        members: members.length > 0 ? members : [user.username],
        color: form.color || defaultColor
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="create-group-dialog" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
        <button
          type="button"
          className="modal-close-button"
          onClick={onClose}
          title="Close dialog"
          disabled={isSubmitting}
        >
          <X size={18} />
        </button>

        <div className="create-group-icon">
          <UsersRound size={24} />
        </div>

        <div>
          <p className="eyebrow">New group</p>
          <h2 id="create-group-title">Create Group</h2>
          <p className="muted">Start a shared workspace for chat, tasks, and progress updates.</p>
        </div>

        <form className="create-group-form" onSubmit={handleSubmit}>
          <label>
            Group name
            <input
              ref={nameInputRef}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Research Group"
              disabled={isSubmitting}
            />
          </label>

          <label>
            Description
            <input
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What will this group work on?"
              disabled={isSubmitting}
            />
          </label>

          <div className="form-row">
            <label>
              Members
              <input
                value={form.members}
                onChange={(event) => updateField("members", event.target.value)}
                placeholder="Andy, Maya, Rafi"
                disabled={isSubmitting}
              />
            </label>

            <label>
              Color
              <input
                type="color"
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
                disabled={isSubmitting}
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button small" disabled={isSubmitting}>
            <Plus size={17} />
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </form>
      </section>
    </div>
  );
}
