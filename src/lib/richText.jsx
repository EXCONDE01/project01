import { Fragment } from "react";

function renderInline(text) {
  const parts = text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function RichText({ text }) {
  const lines = String(text ?? "").split("\n");

  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line)}
    </Fragment>
  ));
}
