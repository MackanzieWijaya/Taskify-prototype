import { ImagePlus, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GroupAvatar from "./GroupAvatar";

const maxPictureSize = 2.5 * 1024 * 1024;

export default function EditGroupDialog({ team, onClose, onUpdate }) {
  const [form, setForm] = useState({
    name: team?.name || "",
    description: team?.description || "",
    avatarUrl: team?.avatarUrl || ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setForm({
      name: team?.name || "",
      description: team?.description || "",
      avatarUrl: team?.avatarUrl || ""
    });
    setError("");
  }, [team]);

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handlePictureUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > maxPictureSize) {
      setError("Picture must be smaller than 2.5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateField("avatarUrl", String(reader.result || ""));
      setError("");
    };
    reader.onerror = () => setError("Could not read that picture.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      setError("Group name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onUpdate(team.id, {
        name,
        description: form.description.trim() || `Workspace for ${name}.`,
        avatarUrl: form.avatarUrl.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not update group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="create-group-dialog edit-group-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-group-title">
        <button
          type="button"
          className="modal-close-button"
          onClick={onClose}
          title="Close dialog"
          disabled={isSubmitting}
        >
          <X size={18} />
        </button>

        <div className="edit-group-top">
          <GroupAvatar
            group={team}
            name={form.name}
            avatarUrl={form.avatarUrl}
            className="edit-group-picture"
          />
          <div>
            <p className="eyebrow">Group settings</p>
            <h2 id="edit-group-title">Edit Group</h2>
            <p className="muted">Update the group identity shown in chat and navigation.</p>
          </div>
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
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What will this group work on?"
              disabled={isSubmitting}
            />
          </label>

          <label>
            Picture URL
            <input
              value={form.avatarUrl}
              onChange={(event) => updateField("avatarUrl", event.target.value)}
              placeholder="https://example.com/group-photo.jpg"
              disabled={isSubmitting}
            />
          </label>

          <div className="edit-picture-actions">
            <label className="secondary-button small file-button">
              <ImagePlus size={16} />
              Upload Picture
              <input type="file" accept="image/*" onChange={handlePictureUpload} disabled={isSubmitting} />
            </label>
            {form.avatarUrl && (
              <button type="button" className="ghost-button small" onClick={() => updateField("avatarUrl", "")} disabled={isSubmitting}>
                Remove Picture
              </button>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button small" disabled={isSubmitting}>
            <Save size={17} />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>
    </div>
  );
}
