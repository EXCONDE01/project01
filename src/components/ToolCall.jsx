import { describeArgs, toolMeta } from "../lib/tools";
import { Icon } from "./Icons";

const STATE_LABELS = {
  running: "Running",
  done: "Done",
  error: "Failed",
  stopped: "Stopped",
};

export function ToolCall({ call }) {
  const meta = toolMeta(call.name);
  const status = call.status ?? "running";
  const description = describeArgs(call.name, call.args);

  return (
    <div className={`tool tool--${status}`}>
      <div className="tool__head">
        <span className="tool__icon">
          <Icon name={meta.icon} size={14} />
        </span>
        <span className="tool__name">{meta.label}</span>
        <span className="tool__arg" title={description}>
          {description}
        </span>
        <span className="tool__state">
          {status === "running" ? (
            <span className="spinner" aria-hidden="true" />
          ) : status === "done" ? (
            <Icon name="check" size={12} />
          ) : status === "stopped" ? (
            <Icon name="stop" size={11} />
          ) : (
            <Icon name="alert" size={12} />
          )}
          <span>
            {status === "done" && call.durationMs
              ? `${call.durationMs} ms`
              : (STATE_LABELS[status] ?? status)}
          </span>
        </span>
      </div>

      {call.result ? (
        <details className="tool__details">
          <summary>View result</summary>
          <pre>{JSON.stringify(call.result, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
