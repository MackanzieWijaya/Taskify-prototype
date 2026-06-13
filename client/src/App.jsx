import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import ChatDirectory from "./components/ChatDirectory";
import Dashboard from "./components/Dashboard";
import GroupAnalysis from "./components/GroupAnalysis";
import LoginPage from "./components/LoginPage";
import MyTasks from "./components/MyTasks";
import NotificationList from "./components/NotificationList";
import Sidebar from "./components/Sidebar";
import TeamWorkspace from "./components/TeamWorkspace";
import CreateGroupDialog from "./components/CreateGroupDialog";
import SettingsDialog from "./components/SettingsDialog";

const taskPaneStorageKey = "taskify_tasks_collapsed";
const sidebarStorageKey = "taskify_sidebar_compact";
const appearanceStorageKey = "taskify_appearance";
const taskWorkspaceStorageKey = "taskify:lastTaskWorkspace";
const taskStickyStorageKey = "taskify:stickyTaskStatusById";
const defaultAppearance = {
  mode: "light",
  theme: "taskify"
};
const mergeById = (item, update) => (item.id === update.id ? { ...item, ...update } : item);

function readStoredAppearance() {
  try {
    const savedAppearance = JSON.parse(localStorage.getItem(appearanceStorageKey) || "null");

    return {
      mode: savedAppearance?.mode === "dark" ? "dark" : "light",
      theme: ["taskify", "catppuccin", "gruvbox", "dracula"].includes(savedAppearance?.theme)
        ? savedAppearance.theme
        : defaultAppearance.theme
    };
  } catch {
    return defaultAppearance;
  }
}

function removeLocalStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore blocked storage in prototype/demo environments.
  }
}

function removeSessionStorageItem(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore blocked storage in prototype/demo environments.
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("taskify_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    return Number(localStorage.getItem("taskify_team")) || 1;
  });
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTasksCollapsed, setIsTasksCollapsed] = useState(() => {
    return localStorage.getItem(taskPaneStorageKey) === "true";
  });
  const [isSidebarCompact, setIsSidebarCompact] = useState(() => {
    return localStorage.getItem(sidebarStorageKey) === "true";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appearance, setAppearance] = useState(readStoredAppearance);

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) || teams[0];
  }, [selectedTeamId, teams]);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError("");
      const [teamData, taskData, messageData, notificationData] = await Promise.all([
        api.getTeams(),
        api.getTasks(),
        api.getMessages(),
        api.getNotifications()
      ]);

      setTeams(teamData);
      setTasks(taskData);
      setMessages(messageData);
      setNotifications(notificationData);
    } catch (err) {
      console.warn("Initial data loading failed. Using fallback/mock data if available.", err);
      setError("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user || teams.length === 0) return;

    const selectedTeamExists = teams.some((team) => team.id === selectedTeamId);
    if (!selectedTeamExists) {
      setSelectedTeamId(teams[0].id);
    }
  }, [selectedTeamId, teams, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("taskify_team", String(selectedTeamId));
    }
  }, [selectedTeamId, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(taskPaneStorageKey, String(isTasksCollapsed));
    }
  }, [isTasksCollapsed, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(sidebarStorageKey, String(isSidebarCompact));
    }
  }, [isSidebarCompact, user]);

  useEffect(() => {
    document.documentElement.dataset.mode = appearance.mode;
    document.documentElement.dataset.theme = appearance.theme;
    localStorage.setItem(appearanceStorageKey, JSON.stringify(appearance));
  }, [appearance]);

  useEffect(() => {
    if (!user) return undefined;

    const intervalId = window.setInterval(() => {
      Promise.all([api.getMessages(), api.getTasks(), api.getNotifications()])
        .then(([messageData, taskData, notificationData]) => {
          setMessages(messageData);
          setTasks(taskData);
          setNotifications(notificationData);
        })
        .catch(() => {
          // The visible error banner is reserved for direct user actions.
        });
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  const handleLogin = async ({ username, password }) => {
    try {
      const demoUser = await api.login({ username, password });

      setUser(demoUser);
      localStorage.setItem("taskify_user", JSON.stringify(demoUser));
      setSelectedTeamId(1);
      setActivePage("dashboard");
      return true;
    } catch (err) {
      console.warn("Demo login failed.", err);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await api.resetDemoData();
    } catch (err) {
      console.warn("Demo reset failed during logout.", err);
    }

    removeLocalStorageItem("taskify_user");
    removeLocalStorageItem("taskify_team");
    removeLocalStorageItem(taskPaneStorageKey);
    removeLocalStorageItem(sidebarStorageKey);
    removeLocalStorageItem(taskWorkspaceStorageKey);
    removeLocalStorageItem(appearanceStorageKey);
    removeSessionStorageItem(taskStickyStorageKey);

    setUser(null);
    setTeams([]);
    setTasks([]);
    setMessages([]);
    setNotifications([]);
    setSelectedTeamId(1);
    setActivePage("dashboard");
    setIsTasksCollapsed(false);
    setIsSidebarCompact(false);
    setIsCreateGroupOpen(false);
    setIsSettingsOpen(false);
    setAppearance(defaultAppearance);
    setError("");
  };

  const openTeamWorkspace = (teamId) => {
    setSelectedTeamId(teamId);
    setActivePage("workspace");
  };

  const toggleTasksPanel = () => {
    setIsTasksCollapsed((isCollapsed) => !isCollapsed);
  };

  const toggleSidebarCompact = () => {
    setIsSidebarCompact((isCompact) => !isCompact);
  };

  const handleCreateGroup = async (group) => {
    const createdGroup = await api.createTeam(group);
    setTeams((currentTeams) => [createdGroup, ...currentTeams]);
    setSelectedTeamId(createdGroup.id);
    setActivePage("workspace");
    api.getNotifications()
      .then((notificationData) => setNotifications(notificationData))
      .catch(() => {
        // Creating the group should not fail if the notification refresh is late.
      });
    return createdGroup;
  };

  const handleCreateTask = async (task) => {
    const createdTask = await api.createTask(task);

    setTasks((currentTasks) => {
      const taskMap = new Map();

      [createdTask, ...currentTasks].forEach((taskItem) => {
        taskMap.set(taskItem.id, taskItem);
      });

      return Array.from(taskMap.values());
    });

    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
    return createdTask;
  };

  const handleUpdateGroup = async (teamId, group) => {
    const updatedGroup = await api.updateTeam(teamId, group);

    setTeams((currentTeams) =>
      currentTeams.map((team) => mergeById(team, updatedGroup))
    );

    api.getNotifications()
      .then((notificationData) => setNotifications(notificationData))
      .catch(() => {
        // Editing the group should not fail if the notification refresh is late.
      });

    return updatedGroup;
  };

  const handleUpdateTask = async (taskId, task) => {
    const updatedTask = await api.updateTask(taskId, task);
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) => mergeById(currentTask, updatedTask))
    );
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
    return updatedTask;
  };

  const handleUpdateTaskStatus = async (taskId, statusUpdate) => {
    const updatedTask = await api.updateTaskStatus(taskId, statusUpdate);
    setTasks((currentTasks) =>
      currentTasks.map((task) => mergeById(task, updatedTask))
    );
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
    return updatedTask;
  };

  const handleDeleteTask = async (taskId) => {
    await api.deleteTask(taskId);
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
  };

  const handleIgnoreTaskMention = async ({ message, taskIntent }) => {
    if (!message?.sender || message.sender === user.username) return null;

    const createdNotification = await api.createNotification({
      text: `${user.username} ignored ${message.sender}'s task request: ${taskIntent.title}`,
      type: "activity",
      recipient: message.sender
    });

    setNotifications((currentNotifications) => [createdNotification, ...currentNotifications]);
    return createdNotification;
  };

  const handleSendMessage = async (message) => {
    const createdMessage = await api.createMessage(message);
    setMessages((currentMessages) => [...currentMessages, createdMessage]);
    return createdMessage;
  };

  const handleEditMessage = async (messageId, content) => {
    const updatedMessage = await api.updateMessage(messageId, content, user.username);
    setMessages((currentMessages) =>
      currentMessages.map((message) => mergeById(message, updatedMessage))
    );
    return updatedMessage;
  };

  const handleDeleteMessage = async (messageId) => {
    await api.deleteMessage(messageId, user.username);
    setMessages((currentMessages) => currentMessages.filter((message) => message.id !== messageId));
  };

  const handlePinMessage = async (messageId) => {
    const updatedMessage = await api.pinMessage(messageId, user.username);
    setMessages((currentMessages) =>
      currentMessages.map((message) => mergeById(message, updatedMessage))
    );
    return updatedMessage;
  };

  const handleUnpinMessage = async (messageId) => {
    const updatedMessage = await api.unpinMessage(messageId);
    setMessages((currentMessages) =>
      currentMessages.map((message) => mergeById(message, updatedMessage))
    );
    return updatedMessage;
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const pageProps = {
    teams,
    tasks,
    messages,
    notifications,
    selectedTeam,
    selectedTeamId,
    user,
    onOpenTeam: openTeamWorkspace,
    onSelectTeam: setSelectedTeamId,
    onUpdateGroup: handleUpdateGroup,
    onCreateTask: handleCreateTask,
    onUpdateTask: handleUpdateTask,
    onSendMessage: handleSendMessage,
    onEditMessage: handleEditMessage,
    onDeleteMessage: handleDeleteMessage,
    onPinMessage: handlePinMessage,
    onUnpinMessage: handleUnpinMessage,
    onUpdateTaskStatus: handleUpdateTaskStatus,
    onDeleteTask: handleDeleteTask,
    onIgnoreTaskMention: handleIgnoreTaskMention,
    isTasksCollapsed,
    onToggleTasksPanel: toggleTasksPanel
  };

  const mainClassName =
    activePage === "workspace" || activePage === "notifications" || activePage === "my-tasks"
      ? "main-content workspace-main"
      : "main-content";

  return (
    <div className={isSidebarCompact ? "app-shell sidebar-compact-shell" : "app-shell"}>
      <Sidebar
        activePage={activePage}
        groups={teams}
        isCompact={isSidebarCompact}
        selectedGroupId={selectedTeamId}
        user={user}
        onLogout={handleLogout}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenGroup={openTeamWorkspace}
        onNavigate={setActivePage}
        onToggleCompact={toggleSidebarCompact}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className={mainClassName}>
        {error && <div className="error-banner">{error}</div>}
        {isLoading && <div className="loading-banner">Loading Taskify workspace...</div>}

        {activePage === "dashboard" && <Dashboard {...pageProps} />}
        {activePage === "chat" && <ChatDirectory {...pageProps} />}
        {activePage === "analysis" && <GroupAnalysis {...pageProps} />}
        {activePage === "workspace" && <TeamWorkspace {...pageProps} />}
        {activePage === "my-tasks" && <MyTasks {...pageProps} />}
        {activePage === "notifications" && <NotificationList {...pageProps} view="page" />}
      </main>

      {isCreateGroupOpen && (
        <CreateGroupDialog
          user={user}
          onClose={() => setIsCreateGroupOpen(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {isSettingsOpen && (
        <SettingsDialog
          appearance={appearance}
          onChangeAppearance={setAppearance}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
