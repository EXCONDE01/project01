import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

export function Composer({ onSend, onStop, isStreaming, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);
  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 190)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue("");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      if (canSend) {
        event.preventDefault();
        submit();
      }
    }
  }

  return (
    <div className="composer-shell">
      <div className={`composer ${disabled ? "is-disabled" : ""}`}>
        <label className="visually-hidden" htmlFor="composer-input">
          Message Scout
        </label>
        <textarea
          id="composer-input"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "API offline — start the server with npm run dev"
              : "Ask Scout for a calculation, a time check, or a knowledge lookup…"
          }
          disabled={disabled}
          maxLength={4000}
        />

        <div className="composer__bar">
          <span className="composer__hint">
            <kbd>Enter</kbd> to send · <kbd>Shift</kbd> +{" "}
            <kbd>Enter</kbd> for a new line
          </span>

          {isStreaming ? (
            <button
              className="send-button send-button--stop"
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Icon name="stop" size={15} />
            </button>
          ) : (
            <button
              className="send-button"
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              title="Send message"
            >
              <Icon name="send" size={17} />
            </button>
          )}
        </div>
      </div>

      <p className="composer__foot">
        Scout runs on a mock model · Tool calls execute on your local server
      </p>
    </div>
  );
}
