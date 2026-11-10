import { Icon } from "./Icons";

export function Topbar({
  title,
  onOpenSidebar,
  onOpenTools,
  health,
  toolCount,
}) {
  const offline = health.status === "offline";
  const statusLabel =
    health.status === "loading"
      ? "Connecting"
      : offline
        ? "Offline"
        : "Mock online";

  return (
    <header className="topbar">
      <button
        className="icon-button topbar__menu"
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Icon name="menu" size={17} />
      </button>

      <div className="topbar__title-wrap">
        <p className="topbar__eyebrow">Agent session</p>
        <h1 className="topbar__title" title={title}>
          {title}
        </h1>
      </div>

      <div className="topbar__actions">
        <span
          className={`status-pill ${offline ? "is-offline" : ""}`}
          title={
            offline
              ? "The API server is not reachable."
              : "Connected to the local mock agent."
          }
        >
          <span
            className={`status-dot ${offline ? "status-dot--offline" : ""}`}
          />
          <span className="status-pill__text">{statusLabel}</span>
        </span>

        <button
          className="tools-button"
          type="button"
          onClick={onOpenTools}
          aria-haspopup="dialog"
        >
          <Icon name="wrench" size={14} />
          <span className="tools-button__label">Tools</span>
          <span className="tools-button__count">{toolCount}</span>
        </button>
      </div>
    </header>
  );
}
