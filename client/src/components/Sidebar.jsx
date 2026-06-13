import { useState } from "react";
import {
  Activity,
  Bell,
  CheckSquare,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleMore,
  Plus,
  Settings,
  UsersRound
} from "lucide-react";
import taskifyLogo from "../assets/taskify-logo.png";
import taskifyLogoDark from "../assets/taskify-logo-dark.png";
import ProfileAvatar from "./ProfileAvatar";
import GroupAvatar from "./GroupAvatar";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analysis", label: "Group Analysis", icon: Activity },
  { id: "chat", label: "Chat", icon: MessageCircleMore },
  { id: "my-tasks", label: "My Tasks", icon: CheckSquare },
  { id: "notifications", label: "Notifications", icon: Bell }
];

export default function Sidebar({
  activePage,
  user,
  groups = [],
  isCompact = false,
  selectedGroupId,
  onNavigate,
  onOpenGroup,
  onCreateGroup,
  onToggleCompact,
  onOpenSettings,
  onLogout
}) {
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);
  const showGroups = isCompact || isGroupsOpen;

  return (
    <aside className={isCompact ? "sidebar compact" : "sidebar"}>
      <div className="sidebar-top">
        <div className="sidebar-brand-row">
          <button
            className="sidebar-menu-button"
            type="button"
            onClick={onToggleCompact}
            aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={isCompact}
            title={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={20} />
          </button>
          <button className="logo-button" type="button" onClick={() => onNavigate("dashboard")} aria-label="Open dashboard">
            <img className="logo-image sidebar-logo-image logo-light" src={taskifyLogo} alt="" aria-hidden="true" />
            <img className="logo-image sidebar-logo-image logo-dark" src={taskifyLogoDark} alt="" aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? "nav-item active" : "nav-item"}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="sidebar-groups" aria-labelledby="sidebar-groups-title">
          <div className="sidebar-section-header">
            <button
              type="button"
              className="sidebar-collapse-button"
              onClick={() => setIsGroupsOpen((isOpen) => !isOpen)}
              aria-expanded={showGroups}
              aria-controls="sidebar-group-list"
              aria-label="Groups"
              title="Groups"
            >
              <UsersRound size={17} />
              <span id="sidebar-groups-title">Groups</span>
              <ChevronDown className={isGroupsOpen ? "collapse-chevron open" : "collapse-chevron"} size={15} />
            </button>
            <button
              type="button"
              className="sidebar-add-button"
              onClick={onCreateGroup}
              aria-label="Create group"
              title="Create group"
            >
              <Plus size={16} />
            </button>
          </div>

          {showGroups && (
            <div className="sidebar-group-list" id="sidebar-group-list">
              {groups.map((group) => {
                const isOpenChat = activePage === "workspace" && group.id === selectedGroupId;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={isOpenChat ? "sidebar-group active" : "sidebar-group"}
                    onClick={() => onOpenGroup(group.id)}
                    aria-label={group.name}
                    title={group.name}
                  >
                    <GroupAvatar group={group} className="sidebar-group-mark" />
                    <strong>{group.name}</strong>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="sidebar-bottom">
        <button type="button" className="settings-button" onClick={onOpenSettings} aria-label="Settings" title="Settings">
          <Settings size={17} />
          <span>Settings</span>
        </button>

        <div className="profile-mini" title={`${user.username} - ${user.role}`}>
          <ProfileAvatar name={user.username} size="md" />
          <div className="profile-mini-details">
            <strong>{user.username}</strong>
            <span>{user.role}</span>
          </div>
        </div>

        <button type="button" className="logout-button" onClick={onLogout} aria-label="Logout" title="Logout">
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
