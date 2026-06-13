import { ArrowRight } from "lucide-react";
import GroupAvatar from "./GroupAvatar";

export default function TeamsPage({ teams, tasks, onOpenTeam }) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Collaboration</p>
          <h1>Groups</h1>
          <p className="muted">Open a group workspace to chat with members and manage shared tasks.</p>
        </div>
      </header>

      <section className="team-grid wide">
        {teams.map((team) => {
          const teamTasks = tasks.filter((task) => task.teamId === team.id);
          const completed = teamTasks.filter((task) => task.status === "Completed").length;

          return (
            <button className="team-card" key={team.id} type="button" onClick={() => onOpenTeam(team.id)}>
              <div className="team-card-top">
                <GroupAvatar group={team} className="team-icon" />
                <ArrowRight size={18} />
              </div>
              <strong>{team.name}</strong>
              <p>{team.description}</p>
              <div className="team-stats">
                <span>{team.members.length} members</span>
                <span>{completed}/{teamTasks.length} tasks done</span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
