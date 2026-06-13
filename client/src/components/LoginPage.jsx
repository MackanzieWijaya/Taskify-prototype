import { useEffect, useState } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import taskifyLogo from "../assets/taskify-logo.png";

const prototypeNames = ["Andy", "Maya", "Rafi", "Sinta", "Dina", "Bima", "Laras"];

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("Andy");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [greetingNameIndex, setGreetingNameIndex] = useState(0);
  const greetingName = prototypeNames[greetingNameIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGreetingNameIndex((currentIndex) => (currentIndex + 1) % prototypeNames.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const isValid = onLogin({ username, password });

    if (!isValid) {
      setError("Use the demo account: Andy / password123");
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-lockup login-card-brand">
          <img className="logo-image login-logo-image" src={taskifyLogo} alt="Taskify" />
        </div>
        <div className="login-title-block">
          <h1 id="login-title">Sign in to Taskify</h1>
          <p className="muted login-greeting">
            <span>Welcome to the prototype,&nbsp;</span>
            <span className="login-greeting-name-slot">
              <span key={greetingName} className="login-greeting-name">
                {greetingName}
              </span>
            </span>
            <span>.</span>
          </p>
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
            Get Started
          </button>
        </form>
      </section>
    </main>
  );
}
