import { useEffect, useMemo, useState } from "react";
import { ChevronDown, LayoutGrid, ListTodo } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskPanel from "./TaskPanel";
import TaskPaneToggle from "./TaskPaneToggle";

const taskStatusSections = [
  { label: "To Do", value: "To Do" },
  { label: "In Progress", value: "In Progress" },
  { label: "Completed", value: "Completed" }
];

export default function MyTasks({
  teams = [],
  tasks,
  selectedTeam,
  user,
  onCreateTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  isTasksCollapsed = false,
  onToggleTasksPanel = () => {}
}) {
  const [assigneeFilter, setAssigneeFilter] = useState("me");
  const [groupFilter, setGroupFilter] = useState("all");
  const [taskViewMode, setTaskViewMode] = useState("cards");
  const [activeTaskStatus, setActiveTaskStatus] = useState("To Do");
  const [openSections, setOpenSections] = useState({
    "To Do": true,
    "In Progress": true,
    Completed: true
  });
  const [stickyTaskStatusById, setStickyTaskStatusById] = useState({});
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const currentUser = user?.username || "";
  const userTeams = useMemo(() => {
    return teams.filter((team) => team.members.includes(currentUser));
  }, [currentUser, teams]);
  const teamById = useMemo(() => new Map(userTeams.map((team) => [team.id, team])), [userTeams]);
  const members = useMemo(() => {
    return [...new Set(userTeams.flatMap((team) => team.members))];
  }, [userTeams]);
  const getGroupOptionsForAssignee = (assignee) => {
    if (assignee === "me" || assignee === "all") {
      return userTeams;
    }

    return userTeams.filter((team) => team.members.includes(assignee));
  };
  const assigneeOptions = useMemo(
    () => [
      { label: "My Tasks", value: "me" },
      { label: "Everyone", value: "all" },
      ...members
        .filter((member) => member !== currentUser)
        .map((member) => ({ label: member, value: member }))
    ],
    [currentUser, members]
  );
  const groupOptions = useMemo(() => {
    return getGroupOptionsForAssignee(assigneeFilter);
  }, [assigneeFilter, userTeams]);
  const selectedAssigneeLabel =
    assigneeOptions.find((option) => option.value === assigneeFilter)?.label || "My Tasks";
  const selectedGroup = groupOptions.find((team) => String(team.id) === groupFilter);
  const selectedGroupLabel = selectedGroup?.name || "All Groups";
  const visibleGroupIds = useMemo(() => new Set(groupOptions.map((team) => team.id)), [groupOptions]);
  const panelMembers = members.length > 0 ? members : selectedTeam?.members || [currentUser].filter(Boolean);
  const panelBaseTeam = selectedGroup || selectedTeam || groupOptions[0] || userTeams[0] || teams[0];
  const panelTeam = panelBaseTeam
    ? {
        ...panelBaseTeam,
        name: selectedGroup?.name || "All Groups",
        members: panelMembers.length > 0 ? panelMembers : panelBaseTeam.members
      }
    : null;
  const visibleTasks = tasks.filter((task) => {
    if (!visibleGroupIds.has(task.teamId)) return false;
    if (groupFilter !== "all" && task.teamId !== Number(groupFilter)) return false;
    if (assigneeFilter === "all") return true;

    return task.assignedTo === (assigneeFilter === "me" ? currentUser : assigneeFilter);
  });
  const panelTasks = visibleTasks;
  const getTasksForStatus = (status) =>
    visibleTasks.filter((task) => task.status === status || stickyTaskStatusById[task.id] === status);
  const cardVisibleTasks = getTasksForStatus(activeTaskStatus);

  useEffect(() => {
    setStickyTaskStatusById({});
  }, [taskViewMode, activeTaskStatus, assigneeFilter, groupFilter]);

  useEffect(() => {
    const isSelectedGroupAvailable = groupFilter === "all" || groupOptions.some((team) => String(team.id) === groupFilter);

    if (!isSelectedGroupAvailable) {
      setGroupFilter("all");
    }
  }, [groupFilter, groupOptions]);

  useEffect(() => {
    const isSelectedAssigneeAvailable = assigneeOptions.some((option) => option.value === assigneeFilter);

    if (!isSelectedAssigneeAvailable) {
      setAssigneeFilter("me");
      setGroupFilter("all");
    }
  }, [assigneeFilter, assigneeOptions]);

  const toggleAssigneeMenu = () => {
    setIsAssigneeMenuOpen((isOpen) => !isOpen);
    setIsGroupMenuOpen(false);
  };

  const toggleGroupMenu = () => {
    setIsGroupMenuOpen((isOpen) => !isOpen);
    setIsAssigneeMenuOpen(false);
  };

  const selectAssignee = (value) => {
    const nextGroupOptions = getGroupOptionsForAssignee(value);
    const shouldKeepSelectedGroup =
      groupFilter === "all" || nextGroupOptions.some((team) => String(team.id) === groupFilter);

    setAssigneeFilter(value);
    setGroupFilter(shouldKeepSelectedGroup ? groupFilter : "all");
    setIsAssigneeMenuOpen(false);
  };

  const selectGroup = (value) => {
    setGroupFilter(value);
    setIsGroupMenuOpen(false);
  };

  const getNextStatusValue = (statusUpdate) =>
    typeof statusUpdate === "string" ? statusUpdate : statusUpdate?.status;

  const handleTaskStatusUpdate = async (taskId, statusUpdate) => {
    const task = tasks.find((item) => item.id === taskId);
    const nextStatus = getNextStatusValue(statusUpdate);
    const shouldKeepInCurrentStatus =
      taskViewMode === "cards" &&
      task &&
      nextStatus &&
      task.status !== nextStatus &&
      (task.status === "Completed" || nextStatus === "Completed");

    if (shouldKeepInCurrentStatus) {
      setStickyTaskStatusById((currentItems) => ({
        ...currentItems,
        [taskId]: taskViewMode === "cards" ? activeTaskStatus : task.status
      }));
    }

    try {
      return await onUpdateTaskStatus(taskId, statusUpdate);
    } catch (error) {
      if (shouldKeepInCurrentStatus) {
        setStickyTaskStatusById((currentItems) => {
          const nextItems = { ...currentItems };
          delete nextItems[taskId];
          return nextItems;
        });
      }

      throw error;
    }
  };

  const setCardViewMode = (viewMode) => {
    setStickyTaskStatusById({});
    setTaskViewMode(viewMode);
  };

  const toggleSection = (status) => {
    setStickyTaskStatusById({});
    setOpenSections((currentSections) => ({
      ...currentSections,
      [status]: !currentSections[status]
    }));
  };

  const renderTaskCard = (task, variant) => (
    <TaskCard
      key={task.id}
      task={task}
      members={teamById.get(task.teamId)?.members || members}
      onUpdateTask={onUpdateTask}
      onUpdateTaskStatus={handleTaskStatusUpdate}
      onDeleteTask={onDeleteTask}
      variant={variant}
    />
  );

  const renderCardView = () => (
    <>
      <div className="task-tabs my-task-status-tabs" role="tablist" aria-label="Task status">
        {taskStatusSections.map((section) => (
          <button
            type="button"
            className={activeTaskStatus === section.value ? "task-tab active" : "task-tab"}
            key={section.value}
            onClick={() => setActiveTaskStatus(section.value)}
            role="tab"
            aria-selected={activeTaskStatus === section.value}
          >
            {section.label}
          </button>
        ))}
      </div>

      <section className="my-task-grid">
        {cardVisibleTasks.map((task) => renderTaskCard(task, "card"))}
        {cardVisibleTasks.length === 0 && (
          <div className="empty-state">No tasks in {activeTaskStatus}.</div>
        )}
      </section>
    </>
  );

  const renderListView = () => (
    <section className="my-task-list-sections">
      {taskStatusSections.map((section) => {
        const sectionTasks = getTasksForStatus(section.value);
        const isOpen = openSections[section.value];

        return (
          <section className={`my-task-status-section ${section.value.toLowerCase().replaceAll(" ", "-")}`} key={section.value}>
            <button
              type="button"
              className="my-task-section-heading"
              onClick={() => toggleSection(section.value)}
              aria-expanded={isOpen}
            >
              <ChevronDown size={18} className={isOpen ? "open" : ""} />
              <span>{section.label}</span>
              <strong>{sectionTasks.length}</strong>
            </button>

            {isOpen && (
              <div className="my-task-section-list">
                {sectionTasks.map((task) => renderTaskCard(task, "list"))}
                {sectionTasks.length === 0 && (
                  <div className="empty-state compact">No tasks in {section.label}.</div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );

  return (
    <div className="workspace-page my-tasks-workspace-page">
      <section className={isTasksCollapsed ? "workspace-grid my-tasks-workspace-grid tasks-collapsed" : "workspace-grid my-tasks-workspace-grid"}>
        <section className="my-tasks-main page-stack">
          <header className="page-header task-page-header">
            <div className="task-page-title-block">
              <p className="eyebrow">Task Queue</p>
              <div className="task-page-menu-wrap">
                <button
                  type="button"
                  className="task-page-title-button"
                  onClick={toggleAssigneeMenu}
                  aria-expanded={isAssigneeMenuOpen}
                  title="Choose whose tasks to show"
                >
                  <h1>{selectedAssigneeLabel}</h1>
                  <ChevronDown size={20} />
                </button>
                {isAssigneeMenuOpen && (
                  <div className="task-view-menu task-page-menu">
                    {assigneeOptions.map((option) => (
                      <button
                        type="button"
                        className={assigneeFilter === option.value ? "active" : ""}
                        key={option.value}
                        onClick={() => selectAssignee(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="muted">Filter tasks by person and shared group.</p>
            </div>

            <div className="task-page-controls">
              <div className="task-view-toggle" role="group" aria-label="Task view">
                <button
                  type="button"
                  className={taskViewMode === "cards" ? "active" : ""}
                  onClick={() => setCardViewMode("cards")}
                  title="Card view"
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  type="button"
                  className={taskViewMode === "list" ? "active" : ""}
                  onClick={() => setCardViewMode("list")}
                  title="List view"
                >
                  <ListTodo size={17} />
                </button>
              </div>

              <div className="task-page-group-filter">
                <p className="eyebrow">Group</p>
                <div className="task-page-menu-wrap">
                  <button
                    type="button"
                    className="task-page-filter-button"
                    onClick={toggleGroupMenu}
                    aria-expanded={isGroupMenuOpen}
                    title="Choose group filter"
                  >
                    <span>{selectedGroupLabel}</span>
                    <ChevronDown size={17} />
                  </button>
                  {isGroupMenuOpen && (
                    <div className="task-view-menu task-page-menu align-right">
                      <button
                        type="button"
                        className={groupFilter === "all" ? "active" : ""}
                        onClick={() => selectGroup("all")}
                      >
                        All Groups
                      </button>
                      {groupOptions.map((team) => (
                        <button
                          type="button"
                          className={String(team.id) === groupFilter ? "active" : ""}
                          key={team.id}
                          onClick={() => selectGroup(String(team.id))}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <TaskPaneToggle
                className="my-task-pane-toggle"
                isCollapsed={isTasksCollapsed}
                onToggle={onToggleTasksPanel}
              />
            </div>
          </header>

          <div className={taskViewMode === "cards" ? "my-task-content" : "my-task-content list-content"}>
            {taskViewMode === "cards" ? renderCardView() : renderListView()}
          </div>
        </section>

        <div className={isTasksCollapsed ? "task-pane-shell collapsed" : "task-pane-shell"}>
          {panelTeam && (
            <TaskPanel
              team={panelTeam}
              tasks={panelTasks}
              user={user}
              onCreateTask={onCreateTask}
              onUpdateTask={onUpdateTask}
              onUpdateTaskStatus={onUpdateTaskStatus}
              onDeleteTask={onDeleteTask}
              isCollapsed={isTasksCollapsed}
              defaultWorkspace="calendar"
              disabledWorkspaces={["tasks"]}
            />
          )}
        </div>
      </section>
    </div>
  );
}
