const configuredApiBase = import.meta.env.VITE_API_URL;
const configuredDemoMode = import.meta.env.VITE_TASKIFY_DEMO_MODE;
const disabledDemoModeValues = new Set(["false", "0", "off", "no"]);
const useBrowserDemoData =
  configuredDemoMode === undefined
    ? import.meta.env.PROD
    : !disabledDemoModeValues.has(String(configuredDemoMode).toLowerCase());
const API_BASE =
  useBrowserDemoData
    ? null
    : configuredApiBase === undefined
      ? import.meta.env.DEV
        ? "http://localhost:5000/api"
        : null
      : configuredApiBase;
const localDemoStorageKey = "taskify_demo_data_v1";

const validStatuses = ["To Do", "In Progress", "Completed"];

const mockUsers = [
  { id: 1, username: "Andy", password: "password123", role: "Project Lead" },
  { id: 2, username: "Maya", password: "demo", role: "UI Designer" },
  { id: 3, username: "Rafi", password: "demo", role: "Backend Developer" },
  { id: 4, username: "Sinta", password: "demo", role: "Presenter" },
  { id: 5, username: "Dina", password: "demo", role: "Researcher" },
  { id: 6, username: "Bima", password: "demo", role: "Coordinator" },
  { id: 7, username: "Laras", password: "demo", role: "Communications Lead" }
];

const mockTeams = [
  {
    id: 1,
    name: "Software Engineering Group",
    description: "Sprint planning, implementation, testing, and final demo preparation.",
    members: ["Andy", "Maya", "Rafi", "Sinta"],
    color: "#7c3aed",
    avatarUrl: ""
  },
  {
    id: 2,
    name: "HCI Project Group",
    description: "Research, prototype evaluation, and user experience documentation.",
    members: ["Andy", "Maya", "Dina"],
    color: "#0f9f8f",
    avatarUrl: ""
  },
  {
    id: 3,
    name: "Organization Group",
    description: "Event planning, announcements, and internal coordination.",
    members: ["Andy", "Bima", "Laras"],
    color: "#f97316",
    avatarUrl: ""
  }
];

const mockTasks = [
  {
    id: 1,
    teamId: 1,
    title: "Finish UI design",
    assignedTo: "Maya",
    deadline: "2026-06-04",
    status: "To Do",
    sourceMessageId: null
  },
  {
    id: 2,
    teamId: 1,
    title: "Create database schema",
    assignedTo: "Rafi",
    deadline: "2026-06-07",
    status: "In Progress",
    sourceMessageId: null
  },
  {
    id: 3,
    teamId: 1,
    title: "Prepare presentation slides",
    assignedTo: "Sinta",
    deadline: "2026-06-10",
    status: "Completed",
    sourceMessageId: null
  },
  {
    id: 4,
    teamId: 2,
    title: "Analyze usability testing notes",
    assignedTo: "Andy",
    deadline: "2026-06-08",
    status: "In Progress",
    sourceMessageId: null
  },
  {
    id: 5,
    teamId: 3,
    title: "Publish weekly announcement",
    assignedTo: "Laras",
    deadline: "2026-06-06",
    status: "To Do",
    sourceMessageId: null
  }
];

const mockMessages = [
  {
    id: 1,
    teamId: 1,
    sender: "Maya",
    content: "@Andy, please finish the UI design by Friday.",
    createdAt: "2026-06-03T08:35:00.000Z",
    replyToId: null,
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null
  },
  {
    id: 2,
    teamId: 1,
    sender: "Rafi",
    content: "I will handle the database schema.",
    createdAt: "2026-06-03T08:41:00.000Z",
    replyToId: null,
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null
  },
  {
    id: 3,
    teamId: 1,
    sender: "Sinta",
    content: "Don't forget the presentation slides.",
    createdAt: "2026-06-03T08:48:00.000Z",
    replyToId: null,
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null
  },
  {
    id: 4,
    teamId: 2,
    sender: "Maya",
    content: "The HCI prototype feedback is ready to summarize.",
    createdAt: "2026-06-03T09:02:00.000Z",
    replyToId: null,
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null
  },
  {
    id: 5,
    teamId: 3,
    sender: "Bima",
    content: "Please review the event checklist before tonight.",
    createdAt: "2026-06-03T09:15:00.000Z",
    replyToId: null,
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null
  }
];

const mockNotifications = [
  {
    id: 1,
    text: "UI Design deadline is tomorrow",
    type: "deadline",
    createdAt: "2026-06-03T09:00:00.000Z"
  },
  {
    id: 2,
    text: "Database task was marked as In Progress",
    type: "status",
    createdAt: "2026-06-03T09:10:00.000Z"
  },
  {
    id: 3,
    text: "Presentation Slides task was completed",
    type: "completed",
    createdAt: "2026-06-03T09:20:00.000Z"
  }
];

const clone = (value) => {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
};

function canUseSessionStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function createLocalSeedData() {
  return {
    teams: clone(mockTeams),
    tasks: clone(mockTasks).map(normalizeLocalTaskRecord),
    messages: clone(mockMessages),
    notifications: clone(mockNotifications)
  };
}

function resetLocalDemoData() {
  const seedData = createLocalSeedData();

  localTeams = seedData.teams;
  localTasks = seedData.tasks;
  localMessages = seedData.messages;
  localNotifications = seedData.notifications;
  saveLocalDemoData();

  return seedData;
}

function readLocalDemoData() {
  if (!useBrowserDemoData || !canUseSessionStorage()) return null;

  try {
    const savedData = window.sessionStorage.getItem(localDemoStorageKey);
    if (!savedData) return null;

    const parsedData = JSON.parse(savedData);
    const hasValidShape =
      Array.isArray(parsedData?.teams) &&
      Array.isArray(parsedData?.tasks) &&
      Array.isArray(parsedData?.messages) &&
      Array.isArray(parsedData?.notifications);

    if (!hasValidShape) return null;

    return {
      teams: clone(parsedData.teams),
      tasks: clone(parsedData.tasks).map(normalizeLocalTaskRecord),
      messages: clone(parsedData.messages),
      notifications: clone(parsedData.notifications)
    };
  } catch {
    return null;
  }
}

const initialLocalData = readLocalDemoData() || createLocalSeedData();

let localTeams = initialLocalData.teams;
let localTasks = initialLocalData.tasks;
let localMessages = initialLocalData.messages;
let localNotifications = initialLocalData.notifications;

function saveLocalDemoData() {
  if (!useBrowserDemoData || !canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      localDemoStorageKey,
      JSON.stringify({
        teams: localTeams,
        tasks: localTasks,
        messages: localMessages,
        notifications: localNotifications
      })
    );
  } catch {
    // The in-memory fallback still works if a browser blocks session storage.
  }
}

function createLocalId(collection) {
  if (collection.length === 0) return 1;
  return Math.max(...collection.map((item) => item.id)) + 1;
}

function serializeLocalUser(user) {
  const { password, ...safeUser } = user;
  return clone(safeUser);
}

function findLocalUser(username, password) {
  const usernameKey = String(username || "").trim().toLowerCase();

  return mockUsers.find(
    (user) => user.username.toLowerCase() === usernameKey && user.password === password
  );
}

function parseRequestBody(options) {
  if (!options.body) return {};
  if (typeof options.body !== "string") return options.body;

  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

function normalizeAvatarUrl(avatarUrl) {
  const value = String(avatarUrl || "").trim();

  if (!value) return "";

  if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) {
    return value;
  }

  return "";
}

function findLocalTeam(teamId) {
  return localTeams.find((team) => team.id === Number(teamId));
}

function createLocalNotification(text, type = "activity", extra = {}) {
  const notification = {
    id: createLocalId(localNotifications),
    text,
    type,
    createdAt: new Date().toISOString(),
    ...extra
  };

  localNotifications = [notification, ...localNotifications];
  return notification;
}

const localCompletedTaskRetentionMs = 7 * 24 * 60 * 60 * 1000;

function coerceLocalElapsedMs(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue) : 0;
}

function normalizeLocalTaskRecord(task) {
  return {
    completedAt: null,
    timerStartedAt: null,
    elapsedMs: 0,
    previousStatus: null,
    ...task,
    elapsedMs: coerceLocalElapsedMs(task.elapsedMs)
  };
}

localTasks = localTasks.map(normalizeLocalTaskRecord);

function getLocalTaskElapsedMs(task, now = new Date()) {
  const startedAt = task.timerStartedAt ? new Date(task.timerStartedAt) : null;
  const runningMs =
    startedAt && !Number.isNaN(startedAt.getTime()) ? Math.max(0, now.getTime() - startedAt.getTime()) : 0;

  return coerceLocalElapsedMs(task.elapsedMs) + runningMs;
}

function pruneExpiredLocalCompletedTasks() {
  const cutoffTime = Date.now() - localCompletedTaskRetentionMs;
  const previousTaskCount = localTasks.length;

  localTasks = localTasks.filter((task) => {
    if (task.status !== "Completed" || !task.completedAt) return true;

    const completedTime = new Date(task.completedAt).getTime();
    return Number.isNaN(completedTime) || completedTime > cutoffTime;
  });

  if (localTasks.length !== previousTaskCount) {
    saveLocalDemoData();
  }
}

function applyLocalTaskStatus(task, status, options = {}) {
  if (!validStatuses.includes(status)) {
    return false;
  }

  const now = new Date();
  const previousStatus = task.status;
  const timerAction = options.timerAction;

  if (previousStatus === "In Progress" && status !== "In Progress") {
    task.elapsedMs = getLocalTaskElapsedMs(task, now);
    task.timerStartedAt = null;
  }

  if (status === "In Progress") {
    if (previousStatus !== "In Progress" || timerAction === "resume") {
      task.timerStartedAt = now.toISOString();
    }

    if (previousStatus === "In Progress" && timerAction === "pause") {
      task.elapsedMs = getLocalTaskElapsedMs(task, now);
      task.timerStartedAt = null;
    }

    task.completedAt = null;
    task.previousStatus = null;
  }

  if (status === "Completed") {
    task.completedAt = now.toISOString();
    task.timerStartedAt = null;
    task.previousStatus = previousStatus === "Completed" ? task.previousStatus || "To Do" : previousStatus;
  }

  if (status === "To Do") {
    task.completedAt = null;
    task.timerStartedAt = null;
    task.previousStatus = null;
  }

  task.status = status;
  task.elapsedMs = coerceLocalElapsedMs(task.elapsedMs);
  return true;
}

function normalizeMention(value) {
  return String(value || "").toLowerCase();
}

function extractLocalMessageMentions(content, teamId) {
  const team = findLocalTeam(teamId);
  const members = team?.members || [];
  const memberByKey = new Map(members.map((member) => [normalizeMention(member), member]));
  const mentionedMembers = new Set();
  let mentionsAll = false;

  for (const match of String(content || "").matchAll(/@([a-z0-9_-]+)/gi)) {
    const mentionKey = normalizeMention(match[1]);

    if (mentionKey === "all" || mentionKey === "everyone") {
      mentionsAll = true;
      continue;
    }

    const mentionedMember = memberByKey.get(mentionKey);

    if (mentionedMember) {
      mentionedMembers.add(mentionedMember);
    }
  }

  return {
    mentions: [...mentionedMembers],
    mentionsAll
  };
}

function serializeLocalMessage(message) {
  return clone({
    replyToId: null,
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null,
    ...message,
    ...extractLocalMessageMentions(message.content, message.teamId)
  });
}

function canManageLocalMessage(message, sender) {
  const actor = String(sender || "").trim();
  return actor && message.sender === actor;
}

function localRequest(path, options = {}, fallback = null) {
  const method = (options.method || "GET").toUpperCase();
  const body = parseRequestBody(options);
  const [pathname, queryString] = path.split("?");
  const query = new URLSearchParams(queryString || "");
  const teamMatch = pathname.match(/^\/teams\/(\d+)$/);
  const taskMatch = pathname.match(/^\/tasks\/(\d+)$/);
  const taskStatusMatch = pathname.match(/^\/tasks\/(\d+)\/status$/);
  const messageMatch = pathname.match(/^\/messages\/(\d+)$/);
  const messagePinMatch = pathname.match(/^\/messages\/(\d+)\/pin$/);

  if (method === "POST" && pathname === "/login") {
    const user = findLocalUser(body.username, body.password);

    if (!user) {
      throw new Error("Invalid username or password.");
    }

    return serializeLocalUser(user);
  }

  if (method === "POST" && pathname === "/reset") {
    resetLocalDemoData();
    return { status: "reset" };
  }

  if (method === "GET" && pathname === "/users") {
    return mockUsers.map(serializeLocalUser);
  }

  if (method === "GET" && pathname === "/teams") {
    return clone(localTeams);
  }

  if (method === "POST" && pathname === "/teams") {
    const groupName = String(body.name || "").trim();
    const members = Array.isArray(body.members)
      ? body.members.map((member) => String(member).trim()).filter(Boolean)
      : [];

    if (!groupName) {
      throw new Error("Group name is required.");
    }

    const team = {
      id: createLocalId(localTeams),
      name: groupName,
      description: String(body.description || "").trim() || `Workspace for ${groupName}.`,
      members: members.length > 0 ? members : ["Andy"],
      color: /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "#7c3aed",
      avatarUrl: normalizeAvatarUrl(body.avatarUrl)
    };

    localTeams = [team, ...localTeams];
    createLocalNotification(`${team.name} group was created`, "activity");
    saveLocalDemoData();
    return clone(team);
  }

  if (method === "PATCH" && teamMatch) {
    const team = findLocalTeam(teamMatch[1]);
    const groupName = String(body.name || "").trim();

    if (!team) {
      throw new Error("Group not found.");
    }

    if (!groupName) {
      throw new Error("Group name is required.");
    }

    team.name = groupName;
    team.description = String(body.description || "").trim() || `Workspace for ${groupName}.`;
    team.avatarUrl = normalizeAvatarUrl(body.avatarUrl);
    createLocalNotification(`${team.name} group details were updated`, "activity");
    saveLocalDemoData();
    return clone(team);
  }

  if (method === "GET" && pathname === "/tasks") {
    pruneExpiredLocalCompletedTasks();
    const teamId = query.get("teamId");
    const tasks = teamId
      ? localTasks.filter((task) => task.teamId === Number(teamId))
      : localTasks;

    return clone(tasks);
  }

  if (method === "POST" && pathname === "/tasks") {
    const title = String(body.title || "").trim();
    const assignedTo = String(body.assignedTo || "").trim();
    const deadline = String(body.deadline || "").trim();
    const status = body.status || "To Do";

    if (!title || !assignedTo || !deadline) {
      throw new Error("Task title, assigned member, and deadline are required.");
    }

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid task status.");
    }

    const task = normalizeLocalTaskRecord({
      id: createLocalId(localTasks),
      teamId: Number(body.teamId || 1),
      title,
      assignedTo,
      deadline,
      status: "To Do",
      sourceMessageId:
        body.sourceMessageId === null || body.sourceMessageId === undefined
          ? null
          : Number(body.sourceMessageId)
    });

    applyLocalTaskStatus(task, status, body);

    localTasks = [task, ...localTasks];
    createLocalNotification(`${title} was added for ${assignedTo}`, "task");
    saveLocalDemoData();
    return clone(task);
  }

  if (method === "PATCH" && taskStatusMatch) {
    const task = localTasks.find((item) => item.id === Number(taskStatusMatch[1]));
    const { status } = body;

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid task status.");
    }

    if (!task) {
      throw new Error("Task not found.");
    }

    applyLocalTaskStatus(task, status, body);
    createLocalNotification(`${task.title} was marked as ${status}`, "status");
    saveLocalDemoData();
    return clone(task);
  }

  if (method === "PATCH" && taskMatch) {
    const task = localTasks.find((item) => item.id === Number(taskMatch[1]));
    const title = String(body.title || "").trim();
    const assignedTo = String(body.assignedTo || "").trim();
    const deadline = String(body.deadline || "").trim();
    const { status } = body;

    if (!task) {
      throw new Error("Task not found.");
    }

    if (!title || !assignedTo || !deadline) {
      throw new Error("Task title, assigned member, and deadline are required.");
    }

    if (status !== undefined && !validStatuses.includes(status)) {
      throw new Error("Invalid task status.");
    }

    Object.assign(task, {
      title,
      assignedTo,
      deadline
    });

    if (status !== undefined && status !== task.status) {
      applyLocalTaskStatus(task, status, body);
    }

    createLocalNotification(`${task.title} was updated`, "activity");
    saveLocalDemoData();
    return clone(task);
  }

  if (method === "DELETE" && taskMatch) {
    const taskIndex = localTasks.findIndex((task) => task.id === Number(taskMatch[1]));

    if (taskIndex === -1) {
      throw new Error("Task not found.");
    }

    const [deletedTask] = localTasks.splice(taskIndex, 1);
    createLocalNotification(`${deletedTask.title} was deleted`, "activity");
    saveLocalDemoData();
    return clone(deletedTask);
  }

  if (method === "GET" && pathname === "/messages") {
    const teamId = query.get("teamId");
    const messages = teamId
      ? localMessages.filter((message) => message.teamId === Number(teamId))
      : localMessages;

    return messages.map(serializeLocalMessage);
  }

  if (method === "POST" && pathname === "/messages") {
    const content = String(body.content || "").trim();
    const teamId = Number(body.teamId || 1);
    const replyToId = body.replyToId === null || body.replyToId === undefined ? null : Number(body.replyToId);

    if (!content) {
      throw new Error("Message content is required.");
    }

    const message = {
      id: createLocalId(localMessages),
      teamId,
      sender: String(body.sender || "Andy").trim() || "Andy",
      content,
      replyToId,
      createdAt: new Date().toISOString(),
      editedAt: null,
      isPinned: false,
      pinnedAt: null,
      pinnedBy: null
    };

    Object.assign(message, extractLocalMessageMentions(content, teamId));
    localMessages = [...localMessages, message];
    saveLocalDemoData();
    return serializeLocalMessage(message);
  }

  if (method === "PATCH" && messageMatch) {
    const message = localMessages.find((item) => item.id === Number(messageMatch[1]));
    const content = String(body.content || "").trim();

    if (!message) {
      throw new Error("Message not found.");
    }

    if (!canManageLocalMessage(message, body.sender)) {
      throw new Error("Only the sender can edit this message.");
    }

    if (!content) {
      throw new Error("Message content is required.");
    }

    message.content = content;
    message.editedAt = new Date().toISOString();
    Object.assign(message, extractLocalMessageMentions(content, message.teamId));
    saveLocalDemoData();
    return serializeLocalMessage(message);
  }

  if (method === "DELETE" && messageMatch) {
    const messageIndex = localMessages.findIndex((message) => message.id === Number(messageMatch[1]));

    if (messageIndex === -1) {
      throw new Error("Message not found.");
    }

    if (!canManageLocalMessage(localMessages[messageIndex], body.sender)) {
      throw new Error("Only the sender can delete this message.");
    }

    const [deletedMessage] = localMessages.splice(messageIndex, 1);
    saveLocalDemoData();
    return serializeLocalMessage(deletedMessage);
  }

  if (method === "PATCH" && messagePinMatch) {
    const message = localMessages.find((item) => item.id === Number(messagePinMatch[1]));

    if (!message) {
      throw new Error("Message not found.");
    }

    message.isPinned = true;
    message.pinnedAt = message.pinnedAt || new Date().toISOString();
    message.pinnedBy = String(body.pinnedBy || "").trim() || "Andy";
    saveLocalDemoData();
    return serializeLocalMessage(message);
  }

  if (method === "DELETE" && messagePinMatch) {
    const message = localMessages.find((item) => item.id === Number(messagePinMatch[1]));

    if (!message) {
      throw new Error("Message not found.");
    }

    message.isPinned = false;
    message.pinnedAt = null;
    message.pinnedBy = null;
    saveLocalDemoData();
    return serializeLocalMessage(message);
  }

  if (method === "GET" && pathname === "/notifications") {
    return clone(localNotifications);
  }

  if (method === "POST" && pathname === "/notifications") {
    const text = String(body.text || "").trim();

    if (!text) {
      throw new Error("Notification text is required.");
    }

    const notification = createLocalNotification(text, body.type || "activity", {
      recipient: body.recipient ? String(body.recipient).trim() : null
    });

    saveLocalDemoData();
    return clone(notification);
  }

  if (fallback !== null) {
    return clone(fallback);
  }

  return null;
}

async function request(path, options = {}, fallback = null) {
  if (!API_BASE) {
    return localRequest(path, options, fallback);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const apiError = new Error(error.message || "Taskify API request failed.");
      apiError.name = "TaskifyApiError";
      throw apiError;
    }

    return response.json();
  } catch (error) {
    if (error.name === "TaskifyApiError") {
      throw error;
    }

    console.warn(`API failed for ${path}. Using mock/local data.`, error);
    return localRequest(path, options, fallback);
  }
}

export const api = {
  login: (credentials) =>
    request("/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),

  resetDemoData: () =>
    request("/reset", {
      method: "POST"
    }),

  getUsers: () => request("/users"),
  getTeams: () => request("/teams"),
  getTasks: () => request("/tasks"),
  getMessages: () => request("/messages"),
  getNotifications: () => request("/notifications"),

  createNotification: (notification) =>
    request("/notifications", {
      method: "POST",
      body: JSON.stringify(notification)
    }),

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

  updateTaskStatus: (taskId, statusUpdate) =>
    request(`/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify(
        typeof statusUpdate === "string" ? { status: statusUpdate } : statusUpdate
      )
    }),

  deleteTask: (taskId) =>
    request(`/tasks/${taskId}`, {
      method: "DELETE"
    })
};
