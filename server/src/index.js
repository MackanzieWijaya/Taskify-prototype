import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "3mb" }));

const validStatuses = ["To Do", "In Progress", "Completed"];

const users = [
  { id: 1, username: "Andy", password: "password123", role: "Project Lead" },
  { id: 2, username: "Maya", password: "demo", role: "UI Designer" },
  { id: 3, username: "Rafi", password: "demo", role: "Backend Developer" },
  { id: 4, username: "Sinta", password: "demo", role: "Presenter" }
];

let teams = [
  {
    id: 1,
    name: "Software Engineering Group",
    description: "Sprint planning, implementation, testing, and final demo preparation.",
    members: ["Andy", "Maya", "Rafi", "Sinta"],
    color: "#7c3aed"
  },
  {
    id: 2,
    name: "HCI Project Group",
    description: "Research, prototype evaluation, and user experience documentation.",
    members: ["Andy", "Maya", "Dina"],
    color: "#0f9f8f"
  },
  {
    id: 3,
    name: "Organization Group",
    description: "Event planning, announcements, and internal coordination.",
    members: ["Andy", "Bima", "Laras"],
    color: "#f97316"
  }
];

let tasks = [
  {
    id: 1,
    teamId: 1,
    title: "Finish UI design",
    assignedTo: "Maya",
    deadline: "2026-06-04",
    status: "To Do"
  },
  {
    id: 2,
    teamId: 1,
    title: "Create database schema",
    assignedTo: "Rafi",
    deadline: "2026-06-07",
    status: "In Progress"
  },
  {
    id: 3,
    teamId: 1,
    title: "Prepare presentation slides",
    assignedTo: "Sinta",
    deadline: "2026-06-10",
    status: "Completed"
  },
  {
    id: 4,
    teamId: 2,
    title: "Analyze usability testing notes",
    assignedTo: "Andy",
    deadline: "2026-06-08",
    status: "In Progress"
  },
  {
    id: 5,
    teamId: 3,
    title: "Publish weekly announcement",
    assignedTo: "Laras",
    deadline: "2026-06-06",
    status: "To Do"
  }
];

let messages = [
  {
    id: 1,
    teamId: 1,
    sender: "Maya",
    content: "@Andy, please finish the UI design by Friday.",
    createdAt: "2026-06-03T08:35:00.000Z"
  },
  {
    id: 2,
    teamId: 1,
    sender: "Rafi",
    content: "I will handle the database schema.",
    createdAt: "2026-06-03T08:41:00.000Z"
  },
  {
    id: 3,
    teamId: 1,
    sender: "Sinta",
    content: "Don't forget the presentation slides.",
    createdAt: "2026-06-03T08:48:00.000Z"
  },
  {
    id: 4,
    teamId: 2,
    sender: "Maya",
    content: "The HCI prototype feedback is ready to summarize.",
    createdAt: "2026-06-03T09:02:00.000Z"
  },
  {
    id: 5,
    teamId: 3,
    sender: "Bima",
    content: "Please review the event checklist before tonight.",
    createdAt: "2026-06-03T09:15:00.000Z"
  }
];

let notifications = [
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

const createId = (collection) => {
  if (collection.length === 0) return 1;
  return Math.max(...collection.map((item) => item.id)) + 1;
};

const createNotification = (text, type = "activity", recipient = null) => {
  const notification = {
    id: createId(notifications),
    text,
    type,
    createdAt: new Date().toISOString(),
    recipient
  };

  notifications = [notification, ...notifications];
  return notification;
};

const completedTaskRetentionMs = 7 * 24 * 60 * 60 * 1000;

const coerceElapsedMs = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue) : 0;
};

const normalizeTaskRecord = (task) => ({
  completedAt: null,
  timerStartedAt: null,
  elapsedMs: 0,
  previousStatus: null,
  ...task,
  elapsedMs: coerceElapsedMs(task.elapsedMs)
});

tasks = tasks.map(normalizeTaskRecord);

const getTaskElapsedMs = (task, now = new Date()) => {
  const startedAt = task.timerStartedAt ? new Date(task.timerStartedAt) : null;
  const runningMs =
    startedAt && !Number.isNaN(startedAt.getTime()) ? Math.max(0, now.getTime() - startedAt.getTime()) : 0;

  return coerceElapsedMs(task.elapsedMs) + runningMs;
};

const pruneExpiredCompletedTasks = () => {
  const cutoffTime = Date.now() - completedTaskRetentionMs;
  tasks = tasks.filter((task) => {
    if (task.status !== "Completed" || !task.completedAt) return true;

    const completedTime = new Date(task.completedAt).getTime();
    return Number.isNaN(completedTime) || completedTime > cutoffTime;
  });
};

const applyTaskStatus = (task, status, options = {}) => {
  if (!validStatuses.includes(status)) {
    return false;
  }

  const now = new Date();
  const previousStatus = task.status;
  const timerAction = options.timerAction;

  if (previousStatus === "In Progress" && status !== "In Progress") {
    task.elapsedMs = getTaskElapsedMs(task, now);
    task.timerStartedAt = null;
  }

  if (status === "In Progress") {
    if (previousStatus !== "In Progress" || timerAction === "resume") {
      task.timerStartedAt = now.toISOString();
    }

    if (previousStatus === "In Progress" && timerAction === "pause") {
      task.elapsedMs = getTaskElapsedMs(task, now);
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
  task.elapsedMs = coerceElapsedMs(task.elapsedMs);
  return true;
};

const findMessage = (messageId) => messages.find((message) => message.id === messageId);

const findTeam = (teamId) => teams.find((team) => team.id === Number(teamId));

const normalizeAvatarUrl = (avatarUrl) => {
  const value = String(avatarUrl || "").trim();

  if (!value) return "";

  if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) {
    return value;
  }

  return "";
};

const extractMessageMentions = (content, teamId) => {
  const team = findTeam(teamId);
  const members = team?.members || [];
  const memberByKey = new Map(members.map((member) => [member.toLowerCase(), member]));
  const mentionedMembers = new Set();
  let mentionsAll = false;

  for (const match of String(content || "").matchAll(/@([a-z0-9_-]+)/gi)) {
    const mentionKey = match[1].toLowerCase();

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
};

const serializeMessage = (message) => ({
  replyToId: null,
  editedAt: null,
  isPinned: false,
  pinnedAt: null,
  pinnedBy: null,
  ...message,
  ...extractMessageMentions(message.content, message.teamId)
});

const canManageMessage = (message, sender) => {
  const actor = String(sender || "").trim();
  return actor && message.sender === actor;
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Taskify API" });
});

app.get("/api/users", (req, res) => {
  res.json(users.map(({ password, ...user }) => user));
});

app.get("/api/teams", (req, res) => {
  res.json(teams);
});

app.post("/api/teams", (req, res) => {
  const { name, description = "", members = ["Andy"], color = "#7c3aed", avatarUrl = "" } = req.body;
  const groupName = String(name || "").trim();
  const groupDescription = String(description || "").trim();
  const groupColor = /^#[0-9a-f]{6}$/i.test(color) ? color : "#7c3aed";
  const groupAvatarUrl = normalizeAvatarUrl(avatarUrl);
  const groupMembers = Array.isArray(members)
    ? members.map((member) => String(member).trim()).filter(Boolean)
    : [];

  if (!groupName) {
    return res.status(400).json({ message: "Group name is required." });
  }

  const team = {
    id: createId(teams),
    name: groupName,
    description: groupDescription || `Workspace for ${groupName}.`,
    members: groupMembers.length > 0 ? groupMembers : ["Andy"],
    color: groupColor,
    avatarUrl: groupAvatarUrl
  };

  teams = [team, ...teams];
  createNotification(`${team.name} group was created`, "activity");
  res.status(201).json(team);
});

app.patch("/api/teams/:id", (req, res) => {
  const team = findTeam(req.params.id);
  const { name, description = "", avatarUrl = "" } = req.body || {};
  const groupName = String(name || "").trim();
  const groupDescription = String(description || "").trim();

  if (!team) {
    return res.status(404).json({ message: "Group not found." });
  }

  if (!groupName) {
    return res.status(400).json({ message: "Group name is required." });
  }

  team.name = groupName;
  team.description = groupDescription || `Workspace for ${groupName}.`;
  team.avatarUrl = normalizeAvatarUrl(avatarUrl);

  createNotification(`${team.name} group details were updated`, "activity");
  res.json(team);
});

app.get("/api/tasks", (req, res) => {
  pruneExpiredCompletedTasks();
  const { teamId } = req.query;
  const filteredTasks = teamId
    ? tasks.filter((task) => task.teamId === Number(teamId))
    : tasks;

  res.json(filteredTasks);
});

app.post("/api/tasks", (req, res) => {
  const { title, assignedTo, deadline, status = "To Do", teamId = 1, sourceMessageId = null } = req.body;

  if (!title || !assignedTo || !deadline) {
    return res.status(400).json({
      message: "Task title, assigned member, and deadline are required."
    });
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid task status." });
  }

  const task = normalizeTaskRecord({
    id: createId(tasks),
    teamId: Number(teamId),
    title,
    assignedTo,
    deadline,
    status: "To Do",
    sourceMessageId: sourceMessageId === null || sourceMessageId === undefined ? null : Number(sourceMessageId)
  });

  applyTaskStatus(task, status, req.body || {});

  tasks = [task, ...tasks];
  createNotification(`${title} was added for ${assignedTo}`, "task");
  res.status(201).json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);
  const { title, assignedTo, deadline, status } = req.body || {};
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const nextTitle = String(title || "").trim();
  const nextAssignedTo = String(assignedTo || "").trim();
  const nextDeadline = String(deadline || "").trim();

  if (!nextTitle || !nextAssignedTo || !nextDeadline) {
    return res.status(400).json({
      message: "Task title, assigned member, and deadline are required."
    });
  }

  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid task status." });
  }

  task.title = nextTitle;
  task.assignedTo = nextAssignedTo;
  task.deadline = nextDeadline;

  if (status !== undefined && status !== task.status) {
    applyTaskStatus(task, status, req.body || {});
  }

  createNotification(`${task.title} was updated`, "activity");
  res.json(task);
});

app.patch("/api/tasks/:id/status", (req, res) => {
  const taskId = Number(req.params.id);
  const { status } = req.body;

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid task status." });
  }

  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  applyTaskStatus(task, status, req.body || {});
  createNotification(`${task.title} was marked as ${status}`, "status");
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const taskId = Number(req.params.id);
  const taskIndex = tasks.findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ message: "Task not found." });
  }

  const [deletedTask] = tasks.splice(taskIndex, 1);
  createNotification(`${deletedTask.title} was deleted`, "activity");
  res.json(deletedTask);
});

app.get("/api/messages", (req, res) => {
  const { teamId } = req.query;
  const filteredMessages = teamId
    ? messages.filter((message) => message.teamId === Number(teamId))
    : messages;

  res.json(filteredMessages.map(serializeMessage));
});

app.post("/api/messages", (req, res) => {
  const { teamId = 1, sender = "Andy", content, replyToId = null } = req.body || {};
  const messageContent = String(content || "").trim();
  const numericTeamId = Number(teamId);
  const numericReplyToId = replyToId === null || replyToId === undefined ? null : Number(replyToId);

  if (!messageContent) {
    return res.status(400).json({ message: "Message content is required." });
  }

  if (Number.isNaN(numericTeamId)) {
    return res.status(400).json({ message: "A valid group is required." });
  }

  if (numericReplyToId !== null && Number.isNaN(numericReplyToId)) {
    return res.status(400).json({ message: "Reply target is not valid." });
  }

  if (numericReplyToId !== null) {
    const replyTarget = findMessage(numericReplyToId);

    if (!replyTarget || replyTarget.teamId !== numericTeamId) {
      return res.status(400).json({ message: "Reply target is not available in this group." });
    }
  }

  const message = {
    id: createId(messages),
    teamId: numericTeamId,
    sender,
    content: messageContent,
    replyToId: numericReplyToId,
    createdAt: new Date().toISOString(),
    editedAt: null,
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null,
    ...extractMessageMentions(messageContent, numericTeamId)
  };

  messages = [...messages, message];
  res.status(201).json(serializeMessage(message));
});

app.patch("/api/messages/:id", (req, res) => {
  const messageId = Number(req.params.id);
  const { sender, content } = req.body || {};
  const message = findMessage(messageId);
  const messageContent = String(content || "").trim();

  if (!message) {
    return res.status(404).json({ message: "Message not found." });
  }

  if (!canManageMessage(message, sender)) {
    return res.status(403).json({ message: "Only the sender can edit this message." });
  }

  if (!messageContent) {
    return res.status(400).json({ message: "Message content is required." });
  }

  message.content = messageContent;
  message.editedAt = new Date().toISOString();
  Object.assign(message, extractMessageMentions(messageContent, message.teamId));

  res.json(serializeMessage(message));
});

app.delete("/api/messages/:id", (req, res) => {
  const messageId = Number(req.params.id);
  const { sender } = req.body || {};
  const messageIndex = messages.findIndex((message) => message.id === messageId);

  if (messageIndex === -1) {
    return res.status(404).json({ message: "Message not found." });
  }

  if (!canManageMessage(messages[messageIndex], sender)) {
    return res.status(403).json({ message: "Only the sender can delete this message." });
  }

  const [deletedMessage] = messages.splice(messageIndex, 1);
  res.json(serializeMessage(deletedMessage));
});

app.patch("/api/messages/:id/pin", (req, res) => {
  const messageId = Number(req.params.id);
  const { pinnedBy = "Andy" } = req.body || {};
  const message = findMessage(messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.isPinned = true;
  message.pinnedAt = message.pinnedAt || new Date().toISOString();
  message.pinnedBy = String(pinnedBy || "").trim() || "Andy";

  res.json(serializeMessage(message));
});

app.delete("/api/messages/:id/pin", (req, res) => {
  const messageId = Number(req.params.id);
  const message = findMessage(messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.isPinned = false;
  message.pinnedAt = null;
  message.pinnedBy = null;

  res.json(serializeMessage(message));
});

app.get("/api/notifications", (req, res) => {
  res.json(notifications);
});

app.post("/api/notifications", (req, res) => {
  const { text, type = "activity", recipient = null } = req.body || {};
  const notificationText = String(text || "").trim();
  const notificationRecipient = recipient ? String(recipient).trim() : null;

  if (!notificationText) {
    return res.status(400).json({ message: "Notification text is required." });
  }

  res.status(201).json(createNotification(notificationText, type, notificationRecipient));
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`Taskify API is running on http://localhost:${PORT}`);
});
