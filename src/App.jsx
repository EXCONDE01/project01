import { useCallback, useEffect, useState } from "react";
import { ChatView } from "./components/ChatView";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { Icon } from "./components/Icons";
import { Sidebar } from "./components/Sidebar";
import { ToolsDialog } from "./components/ToolsDialog";
import { Topbar } from "./components/Topbar";
import { useChat } from "./hooks/useChat";

export default function App() {
  const {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    sendMessage,
    stop,
    startNewChat,
    selectConversation,
    deleteConversation,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [health, setHealth] = useState({
    status: "loading",
    provider: "mock",
    model: "",
    tools: [],
  });

  useEffect(() => {
    let cancelled = false;
    let retryTimer = 0;

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) throw new Error("Health check failed");
        const data = await response.json();
        if (!cancelled) {
          setHealth({ status: "online", ...data });
        }
      } catch {
        if (cancelled) return;
        setHealth((current) => ({ ...current, status: "offline" }));
        retryTimer = window.setTimeout(checkHealth, 5000);
      }
    }

    checkHealth();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        startNewChat();
        setSidebarOpen(false);
        setToolsOpen(false);
      }

      if (event.key === "Escape") {
        setSidebarOpen(false);
        setToolsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewChat]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openTools = useCallback(() => setToolsOpen(true), []);
  const closeTools = useCallback(() => setToolsOpen(false), []);

  const handleNewChat = useCallback(() => {
    startNewChat();
    setSidebarOpen(false);
  }, [startNewChat]);

  const handleSelectConversation = useCallback(
    (id) => {
      selectConversation(id);
      setSidebarOpen(false);
    },
    [selectConversation],
  );

  const offline = health.status === "offline";
  const toolCount = health.tools.length || 3;
  const title = activeConversation?.title ?? "New conversation";

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={deleteConversation}
        health={health}
      />

      <main className="main">
        <Topbar
          title={title}
          onOpenSidebar={openSidebar}
          onOpenTools={openTools}
          health={health}
          toolCount={toolCount}
        />

        {offline ? (
          <div className="offline-banner" role="status">
            <Icon name="alert" size={14} />
            <span>
              API offline — run <code>npm run dev</code> to start the agent
              server.
            </span>
          </div>
        ) : null}

        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            isStreaming={isStreaming}
          />
        ) : (
          <EmptyState
            onPrompt={sendMessage}
            disabled={offline}
            isStreaming={isStreaming}
          />
        )}

        <Composer
          onSend={sendMessage}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={offline}
        />
      </main>

      <ToolsDialog
        open={toolsOpen}
        onClose={closeTools}
        tools={health.tools}
      />
    </div>
  );
}
