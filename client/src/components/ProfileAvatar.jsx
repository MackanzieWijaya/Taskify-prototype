import andyAvatar from "../assets/avatars/andy.svg";
import bimaAvatar from "../assets/avatars/bima.svg";
import dinaAvatar from "../assets/avatars/dina.svg";
import larasAvatar from "../assets/avatars/laras.svg";
import mayaAvatar from "../assets/avatars/maya.svg";
import rafiAvatar from "../assets/avatars/rafi.svg";
import sintaAvatar from "../assets/avatars/sinta.svg";

const avatarByName = {
  Andy: andyAvatar,
  Bima: bimaAvatar,
  Dina: dinaAvatar,
  Laras: larasAvatar,
  Maya: mayaAvatar,
  Rafi: rafiAvatar,
  Sinta: sintaAvatar
};

const fallbackColorByName = {
  Andy: "#7c3aed",
  Bima: "#f97316",
  Dina: "#a855f7",
  Laras: "#10b981",
  Maya: "#ec4899",
  Rafi: "#2563eb",
  Sinta: "#0f9f8f"
};

export default function ProfileAvatar({ name, size = "md", className = "" }) {
  const displayName = name?.trim() || "Member";
  const avatarSrc = avatarByName[displayName];
  const initial = displayName.slice(0, 1).toUpperCase();
  const classes = ["profile-avatar", `profile-avatar-${size}`, className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      style={{ "--avatar-color": fallbackColorByName[displayName] || "#7c3aed" }}
      title={`${displayName} profile picture`}
      aria-label={`${displayName} profile picture`}
    >
      {avatarSrc ? <img src={avatarSrc} alt="" aria-hidden="true" /> : initial}
    </span>
  );
}
