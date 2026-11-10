import { formatTime } from "../lib/format";
import { RichText } from "../lib/richText";
import { toolMeta } from "../lib/tools";
import { Icon, Logo } from "./Icons";
import { ToolCall } from "./ToolCall";

export function Message({ message, isLive }) {
  if (message.role === "user") {
    return (
      <div className="message message--user">
        <div className="bubble">{message.content}</div>
        <span className="message__meta">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  const runningTool = message.toolCalls.find(
    (call) => call.status === "running",
  );
  const liveLabel = runningTool
    ? `Running ${toolMeta(runningTool.name).label.toLowerCase()}`
    : message.status === "writing"
      ? "Writing"
      : "Thinking";
  const showLive =
    isLive && ["thinking", "tool", "writing"].includes(message.status);
  const showCaret = isLive && message.status === "writing";

  return (
    <article className="message message--assistant">
      <div className="agent-line">
        <span className="agent-avatar">
          <Logo size={15} />
        </span>
        <span className="agent-name">Scout</span>
        {showLive ? (
          <span className="agent-state">
            <span className="agent-state__dot" />
            {liveLabel}
          </span>
        ) : null}
        <span className="agent-time">{formatTime(message.createdAt)}</span>
      </div>

      {message.toolCalls.length > 0 ? (
        <div className="tool-stack">
          {message.toolCalls.map((call) => (
            <ToolCall key={call.id} call={call} />
          ))}
        </div>
      ) : null}

      {message.content ? (
        <div className="message__content">
          <RichText text={message.content} />
          {showCaret ? (
            <span className="caret" aria-hidden="true" />
          ) : null}
        </div>
      ) : showLive ? (
        <div className="thinking">
          <span className="thinking__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            {runningTool
              ? `Waiting on the ${toolMeta(runningTool.name).label.toLowerCase()}`
              : "Thinking through the request"}
          </span>
        </div>
      ) : null}

      {message.error ? (
        <div className="message__error" role="alert">
          <Icon name="alert" size={15} />
          <span>{message.error}</span>
        </div>
      ) : null}

      {message.status === "stopped" ? (
        <p className="message__note">Stopped by you.</p>
      ) : null}
    </article>
  );
}
