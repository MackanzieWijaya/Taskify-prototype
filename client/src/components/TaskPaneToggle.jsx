import { PanelRightClose, PanelRightOpen } from "lucide-react";

export default function TaskPaneToggle({ isCollapsed, onToggle, className = "" }) {
  const Icon = isCollapsed ? PanelRightOpen : PanelRightClose;
  const label = isCollapsed ? "Show tasks panel" : "Collapse tasks panel";

  return (
    <button
      type="button"
      className={["task-pane-toggle", className].filter(Boolean).join(" ")}
      onClick={onToggle}
      title={isCollapsed ? "Show tasks" : "Collapse tasks"}
      aria-label={label}
    >
      <Icon size={19} />
    </button>
  );
}
