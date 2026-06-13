import { useEffect, useState } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import taskifyLogo from "../assets/taskify-logo.png";

const prototypeNames = ["Andy", "Maya", "Rafi", "Sinta", "Dina", "Bima", "Laras"];

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("Andy");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greetingNameIndex, setGreetingNameIndex] = useState(0);
  const greetingName = prototypeNames[greetingNameIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGreetingNameIndex((currentIndex) => (currentIndex + 1) % prototypeNames.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, []);

  const updateUsername = (value) => {
    setUsername(value);
    setError("");
  };

  const updatePassword = (value) => {
    setPassword(value);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const isValid = await onLogin({ username, password });

      if (!isValid) {
        setError("Try Andy / password123, or any other demo name with password demo.");
      }
    } finally {
      setIsSubmitting(false);
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
                onChange={(event) => updateUsername(event.target.value)}
                placeholder="Andy"
                disabled={isSubmitting}
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
                onChange={(event) => updatePassword(event.target.value)}
                placeholder="password123"
                disabled={isSubmitting}
              />
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Get Started"}
          </button>
        </form>
      </section>
    </main>
  );
}
