import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamChat } from "../lib/api";

const STORAGE_KEY = "scout:conversations:v1";

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function titleFrom(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > 44 ? `${clean.slice(0, 44).trimEnd()}…` : clean;
}

function loadConversations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (conversation) =>
          conversation &&
          typeof conversation.id === "string" &&
          Array.isArray(conversation.messages) &&
          conversation.messages.length > 0,
      )
      .map((conversation) => ({
        id: conversation.id,
        title:
          typeof conversation.title === "string" && conversation.title
            ? conversation.title
            : "Conversation",
        createdAt: Number(conversation.createdAt) || Date.now(),
        updatedAt:
          Number(conversation.updatedAt) ||
          Number(conversation.createdAt) ||
          Date.now(),
        messages: conversation.messages
          .filter(
            (message) =>
              message && (message.role === "user" || message.role === "assistant"),
          )
          .map((message) => ({
            id: typeof message.id === "string" ? message.id : uid(),
            role: message.role,
            content:
              typeof message.content === "string" ? message.content : "",
            createdAt: Number(message.createdAt) || Date.now(),
            toolCalls: Array.isArray(message.toolCalls)
              ? message.toolCalls.map((call) => ({
                  id: typeof call.id === "string" ? call.id : uid(),
                  name: typeof call.name === "string" ? call.name : "tool",
                  args: call.args ?? {},
                  status:
                    call.status === "running"
                      ? "error"
                      : call.status === "done" ||
                          call.status === "error" ||
                          call.status === "stopped"
                        ? call.status
                        : "done",
                  result: call.result ?? null,
                  durationMs: Number(call.durationMs) || null,
                }))
              : [],
            status:
              message.status === "error" || message.status === "stopped"
                ? message.status
                : "done",
            error:
              typeof message.error === "string" ? message.error : null,
          }))
          .slice(-80),
      }))
      .filter((conversation) => conversation.messages.length > 0)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function useChat() {
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(
    () => conversations[0]?.id ?? null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);
  const streamingConversationRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(conversations),
        );
      } catch {
        /* Quota or private-mode failures should not break the chat. */
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [conversations]);

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeId) ??
      null,
    [conversations, activeId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
  }, []);

  const selectConversation = useCallback(
    (id) => {
      if (id === activeId) return;
      abortRef.current?.abort();
      setActiveId(id);
    },
    [activeId],
  );

  const deleteConversation = useCallback((id) => {
    if (streamingConversationRef.current === id) {
      abortRef.current?.abort();
    }
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== id),
    );
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const updateAssistant = useCallback(
    (conversationId, assistantId, updater) => {
      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;

          let changed = false;
          const messages = conversation.messages.map((message) => {
            if (message.id !== assistantId) return message;
            changed = true;
            return updater(message);
          });

          return changed
            ? { ...conversation, messages, updatedAt: Date.now() }
            : conversation;
        }),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText ?? "").trim();
      if (!text || abortRef.current) return;

      const conversation = activeId
        ? conversations.find((entry) => entry.id === activeId)
        : null;

      const history = (conversation?.messages ?? [])
        .filter(
          (message) =>
            (message.role === "user" || message.role === "assistant") &&
            message.content.trim().length > 0,
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        }))
        .slice(-24);

      const conversationId = conversation?.id ?? uid();
      const userMessage = {
        id: uid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const assistantMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        toolCalls: [],
        status: "thinking",
        error: null,
      };

      setConversations((current) => {
        const existing = current.find(
          (entry) => entry.id === conversationId,
        );

        if (existing) {
          return current.map((entry) =>
            entry.id === conversationId
              ? {
                  ...entry,
                  title:
                    entry.messages.length === 0
                      ? titleFrom(text)
                      : entry.title,
                  updatedAt: Date.now(),
                  messages: [
                    ...entry.messages,
                    userMessage,
                    assistantMessage,
                  ],
                }
              : entry,
          );
        }

        return [
          {
            id: conversationId,
            title: titleFrom(text),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [userMessage, assistantMessage],
          },
          ...current,
        ];
      });

      setActiveId(conversationId);
      setIsStreaming(true);
      streamingConversationRef.current = conversationId;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          messages: [...history, { role: "user", content: text }],
          signal: controller.signal,
          onEvent: (event) => {
            switch (event.type) {
              case "status":
                updateAssistant(
                  conversationId,
                  assistantMessage.id,
                  (message) => ({
                    ...message,
                    status:
                      event.status === "writing" ? "writing" : "thinking",
                  }),
                );
                break;

              case "tool_call":
                updateAssistant(
                  conversationId,
                  assistantMessage.id,
                  (message) => ({
                    ...message,
                    status: "tool",
                    toolCalls: [
                      ...message.toolCalls,
                      {
                        ...event.call,
                        status: "running",
                        result: null,
                      },
                    ],
                  }),
                );
                break;

              case "tool_result":
                updateAssistant(
                  conversationId,
                  assistantMessage.id,
                  (message) => ({
                    ...message,
                    status: "thinking",
                    toolCalls: message.toolCalls.map((call) =>
                      call.id === event.id
                        ? {
                            ...call,
                            status: event.ok === false ? "error" : "done",
                            result: event.result,
                            durationMs: event.durationMs,
                          }
                        : call,
                    ),
                  }),
                );
                break;

              case "delta":
                updateAssistant(
                  conversationId,
                  assistantMessage.id,
                  (message) => ({
                    ...message,
                    content: message.content + event.text,
                    status: "writing",
                  }),
                );
                break;

              case "error":
                updateAssistant(
                  conversationId,
                  assistantMessage.id,
                  (message) => ({
                    ...message,
                    error:
                      event.message || "The agent ran into a problem.",
                    status: "error",
                  }),
                );
                break;

              default:
                break;
            }
          },
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          updateAssistant(
            conversationId,
            assistantMessage.id,
            (message) => ({
              ...message,
              error: error.message || "Could not reach the agent.",
              status: "error",
            }),
          );
        }
      } finally {
        const stopped = controller.signal.aborted;
        updateAssistant(
          conversationId,
          assistantMessage.id,
          (message) => ({
            ...message,
            status:
              message.status === "error"
                ? "error"
                : stopped
                  ? "stopped"
                  : "done",
            toolCalls: message.toolCalls.map((call) =>
              call.status === "running"
                ? {
                    ...call,
                    status: stopped ? "stopped" : "error",
                  }
                : call,
            ),
          }),
        );

        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        streamingConversationRef.current = null;
        setIsStreaming(false);
      }
    },
    [activeId, conversations, updateAssistant],
  );

  return {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    sendMessage,
    stop,
    startNewChat,
    selectConversation,
    deleteConversation,
  };
}
