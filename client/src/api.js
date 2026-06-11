const API_BASE = import.meta.env.VITE_API_URL || null;

const mockTeams = [
  {
    id: 1,
    name: "Software Engineering Team",
    description: "Sprint planning, implementation, testing, and final demo preparation.",
    members: ["Andy", "Maya", "Rafi", "Sinta"],
  },
  {
    id: 2,
    name: "HCI Project Team",
    description: "UI/UX design and user testing.",
    members: ["Andy", "Bima", "Laras"],
  },
  {
    id: 3,
    name: "Organization Team",
    description: "Event planning and media coordination.",
    members: ["Andy", "Dina", "Rafi"],
  },
];

const mockTasks = [
  {
    id: 1,
    title: "Finish UI design",
    assignee: "Maya",
    deadline: "2026-06-04",
    status: "To Do",
    teamId: 1,
  },
  {
    id: 2,
    title: "Create database schema",
    assignee: "Rafi",
    deadline: "2026-06-07",
    status: "In Progress",
    teamId: 1,
  },
  {
    id: 3,
    title: "Prepare presentation slides",
    assignee: "Sinta",
    deadline: "2026-06-10",
    status: "Completed",
    teamId: 1,
  },
];

const mockMessages = [
  {
    id: 1,
    sender: "Maya",
    content: "Andy, please finish the UI design by Friday.",
    time: "04:35 PM",
    teamId: 1,
  },
  {
    id: 2,
    sender: "Rafi",
    content: "I will handle the database schema.",
    time: "04:41 PM",
    teamId: 1,
  },
  {
    id: 3,
    sender: "Sinta",
    content: "Don't forget the presentation slides.",
    time: "04:48 PM",
    teamId: 1,
  },
];

const mockNotifications = [
  {
    id: 1,
    title: "Upcoming Deadline",
    message: "UI Design deadline is tomorrow.",
  },
  {
    id: 2,
    title: "Task Updated",
    message: "Database task was marked as In Progress.",
  },
  {
    id: 3,
    title: "Task Completed",
    message: "Presentation Slides task was completed.",
  },
];

const fallbackData = {
  "/teams": mockTeams,
  "/tasks": mockTasks,
  "/messages": mockMessages,
  "/notifications": mockNotifications,
};

async function request(path, options = {}, fallback = null) {
  // If no backend URL is configured, immediately use mock/local data.
  if (!API_BASE) {
    if (fallback !== null) return fallback;
    return fallbackData[path] || null;
  }

  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Taskify API request failed.");
    }

    return response.json();
  } catch (error) {
    console.warn(`API failed for ${path}. Using mock/local data.`, error);

    if (fallback !== null) {
      return fallback;
    }

    return fallbackData[path] || null;
  }
}

export const api = {
  getTeams: () => request("/teams"),
  getTasks: () => request("/tasks"),
  getMessages: () => request("/messages"),
  getNotifications: () => request("/notifications"),

  createTeam: (team) => {
    const newTeam = {
      id: Date.now(),
      ...team,
    };

    return request(
      "/teams",
      {
        method: "POST",
        body: JSON.stringify(newTeam),
      },
      newTeam
    );
  },

  updateTeam: (teamId, team) => {
    const updatedTeam = {
      id: teamId,
      ...team,
    };

    return request(
      `/teams/${teamId}`,
      {
        method: "PATCH",
        body: JSON.stringify(team),
      },
      updatedTeam
    );
  },

  createMessage: (message) => {
    const newMessage = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ...message,
    };

    return request(
      "/messages",
      {
        method: "POST",
        body: JSON.stringify(newMessage),
      },
      newMessage
    );
  },

  updateMessage: (messageId, content, sender) => {
    const updatedMessage = {
      id: messageId,
      content,
      sender,
    };

    return request(
      `/messages/${messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ content, sender }),
      },
      updatedMessage
    );
  },

  deleteMessage: (messageId, sender) =>
    request(
      `/messages/${messageId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ sender }),
      },
      { success: true, id: messageId }
    ),

  pinMessage: (messageId, pinnedBy) =>
    request(
      `/messages/${messageId}/pin`,
      {
        method: "PATCH",
        body: JSON.stringify({ pinnedBy }),
      },
      { id: messageId, pinned: true, pinnedBy }
    ),

  unpinMessage: (messageId) =>
    request(
      `/messages/${messageId}/pin`,
      {
        method: "DELETE",
      },
      { id: messageId, pinned: false }
    ),

  createTask: (task) => {
    const newTask = {
      id: Date.now(),
      ...task,
    };

    return request(
      "/tasks",
      {
        method: "POST",
        body: JSON.stringify(newTask),
      },
      newTask
    );
  },

  updateTask: (taskId, task) => {
    const updatedTask = {
      id: taskId,
      ...task,
    };

    return request(
      `/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify(task),
      },
      updatedTask
    );
  },

  updateTaskStatus: (taskId, status) =>
    request(
      `/tasks/${taskId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
      { id: taskId, status }
    ),

  deleteTask: (taskId) =>
    request(
      `/tasks/${taskId}`,
      {
        method: "DELETE",
      },
      { success: true, id: taskId }
    ),
};