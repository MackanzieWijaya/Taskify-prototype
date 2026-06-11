import { useState } from "react";
import { CheckCircle2, LockKeyhole, MessageSquareText, UserRound } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("Andy");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const isValid = onLogin({ username, password });

    if (!isValid) {
      setError("Use the demo account: Andy / password123");
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Taskify preview">
        <div className="brand-lockup">
          <div className="logo-mark">T</div>
          <div>
            <p>Taskify</p>
            <span>Chat, tasks, and group work in one place.</span>
          </div>
        </div>
        <div className="preview-window">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-body">
            <div className="preview-chat">
              <MessageSquareText size={18} />
              <div>
                <strong>Group Chat</strong>
                <p>Andy, please finish the UI design by Friday.</p>
              </div>
            </div>
            <div className="preview-task">
              <CheckCircle2 size={18} />
              <div>
                <strong>Presentation Slides</strong>
                <p>Completed by Sinta</p>
              </div>
            </div>
            <div className="preview-stats">
              <span>Total Tasks</span>
              <strong>12</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 id="login-title">Sign in to Taskify</h1>
          <p className="muted">Use the demo account to open the productivity dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <span className="input-shell">
              <UserRound size={18} />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Andy"
              />
            </span>
          </label>

          <label>
            Password
            <span className="input-shell">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="password123"
              />
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
