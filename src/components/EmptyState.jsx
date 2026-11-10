import { Icon, Logo } from "./Icons";

const SUGGESTIONS = [
  {
    icon: "calculator",
    title: "What is 18% of 240?",
    tag: "Calculator",
    prompt: "What is 18% of 240?",
  },
  {
    icon: "clock",
    title: "What time is it in Tokyo?",
    tag: "Clock",
    prompt: "What time is it in Tokyo?",
  },
  {
    icon: "book",
    title: "How does this agent work?",
    tag: "Knowledge base",
    prompt: "How does this agent work?",
  },
  {
    icon: "book",
    title: "Look up the launch checklist",
    tag: "Knowledge base",
    prompt: "Look up the launch checklist",
  },
];

export function EmptyState({ onPrompt, disabled, isStreaming }) {
  return (
    <section className="empty">
      <div className="empty__inner">
        <div className="empty__mark">
          <Logo size={30} />
        </div>

        <p className="eyebrow">Mock agent · tools enabled</p>
        <h2 className="empty__title">
          What should we <span>figure out?</span>
        </h2>
        <p className="empty__copy">
          Scout plans a step, runs real tools on the server, and streams the
          answer. The model is mocked; the agent loop is not.
        </p>

        <div className="prompt-grid">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.title}
              className="prompt-card"
              type="button"
              onClick={() => onPrompt(suggestion.prompt)}
              disabled={disabled || isStreaming}
            >
              <span className="prompt-card__icon">
                <Icon name={suggestion.icon} size={15} />
              </span>
              <span className="prompt-card__body">
                <span className="prompt-card__label">
                  {suggestion.title}
                </span>
                <span className="prompt-card__tag">{suggestion.tag}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="empty__hint">
          No API key needed. Press <kbd>Ctrl K</kbd> for a fresh conversation.
        </p>
      </div>
    </section>
  );
}
