import { formatRelative } from "../lib/format";
import { Icon, Logo } from "./Icons";

export function Sidebar({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  health,
}) {
  const offline = health.status === "offline";

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Logo size={20} />
          </span>
          <span className="brand__text">
            <span className="brand-name">Scout</span>
            <span className="brand-sub">Agent workspace</span>
          </span>
          <button
            className="icon-button sidebar__close"
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <button className="new-chat" type="button" onClick={onNew}>
          <Icon name="plus" size={16} />
          <span>New chat</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div className="sidebar__scroll">
          <div className="sidebar__label">
            <span>Conversations</span>
            <span>{conversations.length}</span>
          </div>

          {conversations.length === 0 ? (
            <p className="sidebar__empty">
              No conversations yet. Start with a calculation, a clock check, or
              a knowledge lookup.
            </p>
          ) : (
            <ul className="conv-list">
              {conversations.map((conversation) => {
                const active = conversation.id === activeId;
                return (
                  <li
                    key={conversation.id}
                    className={`conv ${active ? "is-active" : ""}`}
                  >
                    <button
                      className="conv__select"
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={active ? "true" : undefined}
                    >
                      <span className="conv__title">
                        {conversation.title}
                      </span>
                      <span className="conv__date">
                        {formatRelative(conversation.updatedAt)}
                      </span>
                    </button>
                    <button
                      className="conv__delete"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(conversation.id);
                      }}
                      aria-label={`Delete "${conversation.title}"`}
                      title="Delete conversation"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="sidebar__footer">
          <div className="runtime">
            <span
              className={`status-dot ${offline ? "status-dot--offline" : ""}`}
            />
            <span>{offline ? "API offline" : "Mock runtime"}</span>
            <span className="runtime__meta">v0.1</span>
          </div>
        </div>
      </aside>
    </>
  );
}
