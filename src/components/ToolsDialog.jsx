import { useEffect, useRef } from "react";
import { FALLBACK_TOOLS, toolMeta } from "../lib/tools";
import { Icon } from "./Icons";

export function ToolsDialog({ open, onClose, tools }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();

    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const list = tools?.length > 0 ? tools : FALLBACK_TOOLS;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tools-title"
      >
        <div className="modal__head">
          <div>
            <h2 className="modal__title" id="tools-title">
              Agent tools
            </h2>
            <p className="modal__desc">
              Scout can call these server-side tools while answering. Every
              call is streamed into the chat and stored with the conversation.
            </p>
          </div>
          <button
            ref={closeRef}
            className="icon-button modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close tools dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="tool-list">
          {list.map((tool) => (
            <div className="tool-item" key={tool.name}>
              <span className="tool-item__icon">
                <Icon name={toolMeta(tool.name).icon} size={16} />
              </span>
              <div>
                <p className="tool-item__name">
                  {tool.label ?? toolMeta(tool.name).label}
                </p>
                <p className="tool-item__desc">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="modal__foot">
          The planner is mocked, so tool selection is deterministic. Tool
          execution, validation, streaming, and cancellation are real.
        </div>
      </div>
    </div>
  );
}
