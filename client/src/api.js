const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Taskify API request failed.");
  }

  return response.json();
}

export const api = {
  getTeams: () => request("/teams"),
  getTasks: () => request("/tasks"),
  getMessages: () => request("/messages"),
  getNotifications: () => request("/notifications"),
  createTeam: (team) =>
    request("/teams", {
      method: "POST",
      body: JSON.stringify(team)
    }),
  updateTeam: (teamId, team) =>
    request(`/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(team)
    }),
  createMessage: (message) =>
    request("/messages", {
      method: "POST",
      body: JSON.stringify(message)
    }),
  updateMessage: (messageId, content, sender) =>
    request(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content, sender })
    }),
  deleteMessage: (messageId, sender) =>
    request(`/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ sender })
    }),
  pinMessage: (messageId, pinnedBy) =>
    request(`/messages/${messageId}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinnedBy })
    }),
  unpinMessage: (messageId) =>
    request(`/messages/${messageId}/pin`, {
      method: "DELETE"
    }),
  createTask: (task) =>
    request("/tasks", {
      method: "POST",
      body: JSON.stringify(task)
    }),
  updateTask: (taskId, task) =>
    request(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(task)
    }),
  updateTaskStatus: (taskId, status) =>
    request(`/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  deleteTask: (taskId) =>
    request(`/tasks/${taskId}`, {
      method: "DELETE"
    })
};
