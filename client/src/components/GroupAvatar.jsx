const fallbackColor = "#7c3aed";

export default function GroupAvatar({ group, name, avatarUrl, color, className = "" }) {
  const displayName = (name ?? group?.name ?? "Group").trim() || "Group";
  const imageUrl = String(avatarUrl ?? group?.avatarUrl ?? "").trim();
  const classes = ["group-avatar", className].filter(Boolean).join(" ");

  return (
    <span className={classes} style={{ backgroundColor: color || group?.color || fallbackColor }} aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <span className="group-avatar-initial">{displayName.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
