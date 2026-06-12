import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  TrendingUp,
  UsersRound
} from "lucide-react";
import { formatDeadline } from "../deadlineUtils";
import ProfileAvatar from "./ProfileAvatar";

const chartPalette = ["#7c3aed", "#0f9f8f", "#f97316", "#2563eb", "#dc2626", "#7c2d12"];
const timelinePoints = 12;
const timelineStepMs = 10 * 60 * 1000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTaskElapsedMs(task, nowMs = Date.now()) {
  const baseElapsedMs = Number(task.elapsedMs) > 0 ? Number(task.elapsedMs) : 0;
  const startedAt = task.timerStartedAt ? new Date(task.timerStartedAt).getTime() : null;
  const runningMs =
    task.status === "In Progress" && startedAt && !Number.isNaN(startedAt)
      ? Math.max(0, nowMs - startedAt)
      : 0;

  return baseElapsedMs + runningMs;
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getTaskActivityState(task) {
  if (task.status === "Completed") return "completed";
  if (task.status === "In Progress" && task.timerStartedAt) return "running";
  if (task.status === "In Progress") return "paused";
  if (task.status === "To Do" && getTaskElapsedMs(task) > 0) return "stopped";
  return "to-do";
}

function getTaskPointScore(task, pointTime, pointIndex, nowMs) {
  const progress = pointIndex / (timelinePoints - 1);
  const elapsedMinutes = getTaskElapsedMs(task, pointTime.getTime()) / 60000;

  if (task.status === "In Progress" && task.timerStartedAt) {
    const startedAt = new Date(task.timerStartedAt).getTime();

    if (pointTime.getTime() < startedAt) {
      return 18;
    }

    const activeMinutes = Math.max(0, (pointTime.getTime() - startedAt) / 60000);
    return clamp(30 + activeMinutes * 1.6, 30, 88);
  }

  if (task.status === "In Progress") {
    return clamp(42 + elapsedMinutes / 8, 42, 58);
  }

  if (task.status === "Completed") {
    const completedAt = task.completedAt ? new Date(task.completedAt).getTime() : null;

    if (completedAt && !Number.isNaN(completedAt)) {
      if (pointTime.getTime() < completedAt) {
        return 62;
      }

      const minutesSinceCompleted = Math.max(0, (pointTime.getTime() - completedAt) / 60000);
      return clamp(58 - minutesSinceCompleted * 0.8, 24, 58);
    }

    return clamp(58 - progress * 30, 24, 58);
  }

  if (getTaskElapsedMs(task, nowMs) > 0) {
    return clamp(48 - progress * 28, 18, 48);
  }

  return 14;
}

function buildMemberMomentum(memberTasks, nowMs) {
  if (memberTasks.length === 0) {
    return Array.from({ length: timelinePoints }, () => 0);
  }

  return Array.from({ length: timelinePoints }, (_, pointIndex) => {
    const pointTime = new Date(nowMs - (timelinePoints - 1 - pointIndex) * timelineStepMs);
    const scoreSum = memberTasks.reduce(
      (sum, task) => sum + getTaskPointScore(task, pointTime, pointIndex, nowMs),
      0
    );

    return Math.round(scoreSum / memberTasks.length);
  });
}

function getMemberStats(member, groupTasks, nowMs) {
  const memberTasks = groupTasks.filter((task) => task.assignedTo === member);
  const runningTasks = memberTasks.filter((task) => task.status === "In Progress" && task.timerStartedAt);
  const pausedTasks = memberTasks.filter((task) => task.status === "In Progress" && !task.timerStartedAt);
  const completedTasks = memberTasks.filter((task) => task.status === "Completed");
  const todoTasks = memberTasks.filter((task) => task.status === "To Do");
  const focusMs = memberTasks.reduce((sum, task) => sum + getTaskElapsedMs(task, nowMs), 0);
  const momentum = buildMemberMomentum(memberTasks, nowMs);
  const currentScore = momentum[momentum.length - 1] || 0;

  return {
    member,
    tasks: memberTasks,
    runningTasks,
    pausedTasks,
    completedTasks,
    todoTasks,
    focusMs,
    momentum,
    currentScore,
    completionRate:
      memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0
  };
}

function getPolylinePoints(values) {
  const chartWidth = 560;
  const chartHeight = 136;
  const left = 48;
  const top = 28;

  return values
    .map((value, index) => {
      const x = left + (index / (timelinePoints - 1)) * chartWidth;
      const y = top + chartHeight - (clamp(value, 0, 100) / 100) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ProductivityChart({ memberStats }) {
  return (
    <div className="analysis-chart-wrap">
      <svg className="analysis-chart" viewBox="0 0 650 210" role="img" aria-label="Group productivity momentum">
        {[0, 50, 100].map((tick) => {
          const y = 164 - (tick / 100) * 136;

          return (
            <g key={tick}>
              <line x1="48" x2="608" y1={y} y2={y} />
              <text x="16" y={y + 4}>{tick}</text>
            </g>
          );
        })}

        {memberStats.map((stat, index) => (
          <polyline
            key={stat.member}
            points={getPolylinePoints(stat.momentum)}
            stroke={chartPalette[index % chartPalette.length]}
          />
        ))}

        {memberStats.map((stat, index) => {
          const lastScore = stat.momentum[stat.momentum.length - 1] || 0;
          const x = 608;
          const y = 28 + 136 - (clamp(lastScore, 0, 100) / 100) * 136;

          return (
            <circle
              key={`${stat.member}-dot`}
              cx={x}
              cy={y}
              r="4.5"
              fill={chartPalette[index % chartPalette.length]}
            />
          );
        })}
      </svg>

      <div className="analysis-legend">
        {memberStats.map((stat, index) => (
          <span key={stat.member}>
            <i style={{ backgroundColor: chartPalette[index % chartPalette.length] }} />
            {stat.member}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusStack({ stat }) {
  const total = Math.max(stat.tasks.length, 1);
  const todoWidth = (stat.todoTasks.length / total) * 100;
  const progressWidth = ((stat.runningTasks.length + stat.pausedTasks.length) / total) * 100;
  const completedWidth = (stat.completedTasks.length / total) * 100;

  return (
    <div className="analysis-status-stack" aria-label={`${stat.member} task status mix`}>
      <span className="todo" style={{ width: `${todoWidth}%` }} />
      <span className="progress" style={{ width: `${progressWidth}%` }} />
      <span className="completed" style={{ width: `${completedWidth}%` }} />
    </div>
  );
}

function ActivityIcon({ state }) {
  if (state === "running") return <Play size={14} />;
  if (state === "paused") return <Pause size={14} />;
  if (state === "completed") return <CheckCircle2 size={14} />;
  return <Clock3 size={14} />;
}

export default function GroupAnalysis({ teams = [], tasks = [], selectedTeamId }) {
  const [selectedGroupId, setSelectedGroupId] = useState(() => selectedTeamId || teams[0]?.id || null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (teams.length === 0) return;

    const hasSelectedGroup = teams.some((team) => team.id === selectedGroupId);

    if (!hasSelectedGroup) {
      setSelectedGroupId(selectedTeamId || teams[0].id);
    }
  }, [selectedGroupId, selectedTeamId, teams]);

  const selectedGroup = teams.find((team) => team.id === selectedGroupId) || teams[0];
  const groupTasks = useMemo(
    () => tasks.filter((task) => selectedGroup && task.teamId === selectedGroup.id),
    [selectedGroup, tasks]
  );
  const memberStats = useMemo(
    () => (selectedGroup?.members || []).map((member) => getMemberStats(member, groupTasks, nowMs)),
    [groupTasks, nowMs, selectedGroup]
  );
  const runningCount = memberStats.reduce((sum, stat) => sum + stat.runningTasks.length, 0);
  const completedCount = memberStats.reduce((sum, stat) => sum + stat.completedTasks.length, 0);
  const focusMs = memberStats.reduce((sum, stat) => sum + stat.focusMs, 0);
  const teamMomentum =
    memberStats.length > 0
      ? Math.round(memberStats.reduce((sum, stat) => sum + stat.currentScore, 0) / memberStats.length)
      : 0;
  const topMember = [...memberStats].sort((a, b) => b.currentScore - a.currentScore)[0];

  if (!selectedGroup) {
    return (
      <div className="page-stack">
        <header className="page-header">
          <div>
            <p className="eyebrow">Group Analysis</p>
            <h1>Group Analysis</h1>
            <p className="muted">Create a group to begin tracking shared progress.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page-stack group-analysis-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Group Analysis</p>
          <h1>{selectedGroup.name}</h1>
          <p className="muted">Read-only progress signals for every member in the selected group.</p>
        </div>
        <div className="header-chip">
          <Activity size={18} />
          <span>{teamMomentum}% momentum</span>
        </div>
      </header>

      <div className="analysis-group-tabs" role="tablist" aria-label="Groups">
        {teams.map((team) => (
          <button
            type="button"
            className={team.id === selectedGroup.id ? "active" : ""}
            key={team.id}
            onClick={() => setSelectedGroupId(team.id)}
            role="tab"
            aria-selected={team.id === selectedGroup.id}
          >
            <span className="analysis-group-mark" style={{ backgroundColor: team.color }}>
              {team.avatarUrl ? <img src={team.avatarUrl} alt="" /> : team.name.slice(0, 1)}
            </span>
            {team.name}
          </button>
        ))}
      </div>

      <section className="summary-grid analysis-summary-grid" aria-label="Group productivity summary">
        <article className="summary-card summary-total">
          <div className="summary-icon">
            <UsersRound size={20} />
          </div>
          <div>
            <span>Members</span>
            <strong>{selectedGroup.members.length}</strong>
          </div>
        </article>
        <article className="summary-card summary-progress">
          <div className="summary-icon">
            <Activity size={20} />
          </div>
          <div>
            <span>Running</span>
            <strong>{runningCount}</strong>
          </div>
        </article>
        <article className="summary-card summary-completed">
          <div className="summary-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Completed</span>
            <strong>{completedCount}</strong>
          </div>
        </article>
        <article className="summary-card summary-todo">
          <div className="summary-icon">
            <Clock3 size={20} />
          </div>
          <div>
            <span>Tracked Focus</span>
            <strong>{formatDuration(focusMs)}</strong>
          </div>
        </article>
      </section>

      <section className="analysis-grid">
        <article className="panel analysis-chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Momentum</p>
              <h2>Productivity Flow</h2>
            </div>
            <div className="analysis-score-chip">
              <TrendingUp size={16} />
              {topMember ? `${topMember.member} leads` : "No tasks"}
            </div>
          </div>
          <ProductivityChart memberStats={memberStats} />
        </article>

        <article className="panel analysis-member-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Members</p>
              <h2>Status Mix</h2>
            </div>
          </div>
          <div className="analysis-member-list">
            {memberStats.map((stat) => (
              <div className="analysis-member-row" key={stat.member}>
                <ProfileAvatar name={stat.member} size="sm" />
                <div>
                  <div className="analysis-member-topline">
                    <strong>{stat.member}</strong>
                    <span>{stat.currentScore}%</span>
                  </div>
                  <StatusStack stat={stat} />
                  <p>
                    {stat.todoTasks.length} to do - {stat.runningTasks.length + stat.pausedTasks.length} progress -{" "}
                    {stat.completedTasks.length} done
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel analysis-task-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Task Load</p>
            <h2>Member Task Snapshot</h2>
          </div>
        </div>
        <div className="analysis-task-grid">
          {memberStats.map((stat) => (
            <article className="analysis-member-card" key={stat.member}>
              <div className="analysis-member-card-header">
                <ProfileAvatar name={stat.member} size="md" />
                <div>
                  <strong>{stat.member}</strong>
                  <span>{stat.tasks.length} tasks - {stat.completionRate}% done</span>
                </div>
              </div>

              <div className="analysis-task-list">
                {stat.tasks.length === 0 && <div className="empty-state compact">No tasks assigned.</div>}
                {stat.tasks.map((task) => {
                  const state = getTaskActivityState(task);

                  return (
                    <div className={`analysis-task-row ${state}`} key={task.id}>
                      <span>
                        <ActivityIcon state={state} />
                      </span>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{formatDeadline(task.deadline)} - {state.replace("-", " ")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
