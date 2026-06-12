import { useState } from "react";
import {
  Activity,
  Bell,
  CheckSquare,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Plus,
  UsersRound
} from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analysis", label: "Group Analysis", icon: Activity },
  { id: "my-tasks", label: "Tasks", icon: CheckSquare },
  { id: "notifications", label: "Notifications", icon: Bell }
];

export default function Sidebar({
  activePage,
  user,
  groups = [],
  selectedGroupId,
  onNavigate,
  onOpenGroup,
  onCreateGroup,
  onLogout
}) {
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="logo-button" type="button" onClick={() => onNavigate("dashboard")}>
          <span className="logo-mark">T</span>
          <span>
            <strong>Taskify</strong>
            <small>Productivity Hub</small>
          </span>
        </button>

        <button type="button" className="sidebar-primary-action" onClick={onCreateGroup}>
          <Plus size={20} />
          New Group
        </button>

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
              aria-expanded={isGroupsOpen}
              aria-controls="sidebar-group-list"
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

          {isGroupsOpen && (
            <div className="sidebar-group-list" id="sidebar-group-list">
              {groups.map((group) => {
                const isOpenChat = activePage === "workspace" && group.id === selectedGroupId;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={isOpenChat ? "sidebar-group active" : "sidebar-group"}
                    onClick={() => onOpenGroup(group.id)}
                  >
                    <span className="sidebar-group-mark" style={{ backgroundColor: group.color }}>
                      {group.avatarUrl ? <img src={group.avatarUrl} alt="" /> : group.name.slice(0, 1)}
                    </span>
                    <strong>{group.name}</strong>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="sidebar-bottom">
        <div className="profile-mini">
          <ProfileAvatar name={user.username} size="md" />
          <div className="profile-mini-details">
            <strong>{user.username}</strong>
            <span>{user.role}</span>
          </div>
        </div>

        <button type="button" className="logout-button" onClick={onLogout}>
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
