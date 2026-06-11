import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Dashboard from "./components/Dashboard";
import LoginPage from "./components/LoginPage";
import MyTasks from "./components/MyTasks";
import NotificationList from "./components/NotificationList";
import Sidebar from "./components/Sidebar";
import TeamWorkspace from "./components/TeamWorkspace";
import TeamsPage from "./components/TeamsPage";
import CreateGroupDialog from "./components/CreateGroupDialog";

const demoUser = {
  username: "Andy",
  role: "Project Lead"
};

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
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("taskify_team", String(selectedTeamId));
    }
  }, [selectedTeamId, user]);

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

  const handleLogin = ({ username, password }) => {
    if (username.trim() === "Andy" && password === "password123") {
      setUser(demoUser);
      localStorage.setItem("taskify_user", JSON.stringify(demoUser));
      setActivePage("dashboard");
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem("taskify_user");
    setUser(null);
    setActivePage("dashboard");
  };

  const openTeamWorkspace = (teamId) => {
    setSelectedTeamId(teamId);
    setActivePage("workspace");
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
    setTasks((currentTasks) => [createdTask, ...currentTasks]);
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
    return createdTask;
  };

  const handleUpdateGroup = async (teamId, group) => {
    const updatedGroup = await api.updateTeam(teamId, group);

    setTeams((currentTeams) =>
      currentTeams.map((team) => (team.id === updatedGroup.id ? updatedGroup : team))
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
      currentTasks.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask))
    );
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
    return updatedTask;
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    const updatedTask = await api.updateTaskStatus(taskId, status);
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
  };

  const handleDeleteTask = async (taskId) => {
    await api.deleteTask(taskId);
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    const notificationData = await api.getNotifications();
    setNotifications(notificationData);
  };

  const handleSendMessage = async (message) => {
    const createdMessage = await api.createMessage(message);
    setMessages((currentMessages) => [...currentMessages, createdMessage]);
  };

  const handleEditMessage = async (messageId, content) => {
    const updatedMessage = await api.updateMessage(messageId, content, user.username);
    setMessages((currentMessages) =>
      currentMessages.map((message) => (message.id === updatedMessage.id ? updatedMessage : message))
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
      currentMessages.map((message) => (message.id === updatedMessage.id ? updatedMessage : message))
    );
    return updatedMessage;
  };

  const handleUnpinMessage = async (messageId) => {
    const updatedMessage = await api.unpinMessage(messageId);
    setMessages((currentMessages) =>
      currentMessages.map((message) => (message.id === updatedMessage.id ? updatedMessage : message))
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
    onDeleteTask: handleDeleteTask
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        groups={teams}
        selectedGroupId={selectedTeamId}
        user={user}
        onLogout={handleLogout}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenGroup={openTeamWorkspace}
        onNavigate={setActivePage}
      />
      <main className={activePage === "workspace" ? "main-content workspace-main" : "main-content"}>
        {error && <div className="error-banner">{error}</div>}
        {isLoading && <div className="loading-banner">Loading Taskify workspace...</div>}

        {activePage === "dashboard" && <Dashboard {...pageProps} />}
        {activePage === "teams" && <TeamsPage {...pageProps} />}
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
    </div>
  );
}
