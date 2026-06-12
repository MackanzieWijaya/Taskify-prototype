import { useEffect, useState } from "react";
import ChatPanel from "./ChatPanel";
import TaskPanel from "./TaskPanel";
import { parseTaskIntent } from "../taskParser";

export default function TeamWorkspace({
  selectedTeam,
  selectedTeamId,
  user,
  tasks,
  messages,
  onCreateTask,
  onUpdateTask,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onUpdateTaskStatus,
  onDeleteTask,
  onUpdateGroup,
  isTasksCollapsed = false,
  onToggleTasksPanel = () => {}
}) {
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const teamTasks = tasks.filter((task) => task.teamId === selectedTeamId);
  const teamMessages = messages.filter((message) => message.teamId === selectedTeamId);
  const taskSourceMessageIds = new Set(
    teamTasks.map((task) => task.sourceMessageId).filter((sourceMessageId) => sourceMessageId !== null && sourceMessageId !== undefined)
  );

  useEffect(() => {
    setHighlightedTaskId(null);
  }, [selectedTeamId]);

  const createTaskWithHighlight = async (task) => {
    const createdTask = await onCreateTask(task);

    if (createdTask?.id) {
      setHighlightedTaskId(createdTask.id);
    }

    return createdTask;
  };

  const handleConvertToTask = async (message, parsedTask) => {
    const taskIntent =
      parsedTask ||
      parseTaskIntent(message.content, {
        members: selectedTeam.members,
        fallbackAssignee: user.username,
        baseDate: message.createdAt
      });

    if (!taskIntent) return null;

    return createTaskWithHighlight({
      teamId: selectedTeamId,
      title: taskIntent.title,
      assignedTo: taskIntent.assignedTo,
      deadline: taskIntent.deadline,
      sourceMessageId: message.id,
      status: "To Do"
    });
  };

  if (!selectedTeam) {
    return null;
  }

  return (
    <div className="workspace-page">
      <section className={isTasksCollapsed ? "workspace-grid tasks-collapsed" : "workspace-grid"}>
        <ChatPanel
          team={selectedTeam}
          messages={teamMessages}
          teamId={selectedTeamId}
          user={user}
          members={selectedTeam.members}
          onSendMessage={onSendMessage}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onPinMessage={onPinMessage}
          onUnpinMessage={onUnpinMessage}
          onConvertToTask={handleConvertToTask}
          taskSourceMessageIds={taskSourceMessageIds}
          isTasksCollapsed={isTasksCollapsed}
          onToggleTasksPanel={onToggleTasksPanel}
          onUpdateGroup={onUpdateGroup}
        />

        <div className={isTasksCollapsed ? "task-pane-shell collapsed" : "task-pane-shell"}>
          <TaskPanel
            team={selectedTeam}
            tasks={teamTasks}
            user={user}
            onCreateTask={createTaskWithHighlight}
            onUpdateTask={onUpdateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
            isCollapsed={isTasksCollapsed}
            highlightedTaskId={highlightedTaskId}
          />
        </div>
      </section>
    </div>
  );
}
