import { useEffect, useRef } from "react";
import { Message } from "./Message";

export function ChatView({ conversation, isStreaming }) {
  const scrollRef = useRef(null);
  const previousRef = useRef({
    id: conversation.id,
    count: conversation.messages.length,
  });
  const lastMessage =
    conversation.messages[conversation.messages.length - 1];

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const previous = previousRef.current;
    const switched = previous.id !== conversation.id;
    const added = conversation.messages.length > previous.count;
    const distanceToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    if (switched || added || distanceToBottom < 240) {
      element.scrollTop = element.scrollHeight;
    }

    previousRef.current = {
      id: conversation.id,
      count: conversation.messages.length,
    };
  }, [conversation, lastMessage?.content, lastMessage?.status]);

  return (
    <div className="chat-scroll" ref={scrollRef}>
      <div className="chat-inner">
        {conversation.messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isLive={
              isStreaming && index === conversation.messages.length - 1
            }
          />
        ))}
      </div>
    </div>
  );
}
