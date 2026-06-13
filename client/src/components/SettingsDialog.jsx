import { Check, Moon, Sun, X } from "lucide-react";

const modeOptions = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon }
];

const themeOptions = [
  {
    id: "taskify",
    label: "Taskify",
    colors: ["#5c35f2", "#0f9f8f", "#f8f9fd"]
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    colors: ["#cba6f7", "#89b4fa", "#f5c2e7"]
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    colors: ["#d79921", "#98971a", "#cc241d"]
  },
  {
    id: "dracula",
    label: "Dracula",
    colors: ["#bd93f9", "#ff79c6", "#50fa7b"]
  }
];

export default function SettingsDialog({ appearance, onChangeAppearance, onClose }) {
  const updateAppearance = (update) => {
    onChangeAppearance((currentAppearance) => ({ ...currentAppearance, ...update }));
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button type="button" className="modal-close-button" onClick={onClose} title="Close settings">
          <X size={18} />
        </button>

        <div>
          <p className="eyebrow">Preferences</p>
          <h2 id="settings-title">Settings</h2>
        </div>

        <div className="settings-section">
          <h3>Mode</h3>
          <div className="settings-segment" role="group" aria-label="Mode">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = appearance.mode === option.id;

              return (
                <button
                  type="button"
                  className={isActive ? "active" : ""}
                  key={option.id}
                  onClick={() => updateAppearance({ mode: option.id })}
                  aria-pressed={isActive}
                >
                  <Icon size={17} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="settings-section">
          <h3>Theme</h3>
          <div className="theme-grid" role="radiogroup" aria-label="Theme">
            {themeOptions.map((theme) => {
              const isActive = appearance.theme === theme.id;

              return (
                <button
                  type="button"
                  className={isActive ? "theme-option active" : "theme-option"}
                  key={theme.id}
                  onClick={() => updateAppearance({ theme: theme.id })}
                  role="radio"
                  aria-checked={isActive}
                >
                  <span className="theme-swatch" aria-hidden="true">
                    {theme.colors.map((color) => (
                      <i key={color} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <strong>{theme.label}</strong>
                  {isActive && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
