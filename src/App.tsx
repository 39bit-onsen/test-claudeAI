import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
};

const BETA_HEADER = "managed-agents-2026-04-01";
const AGENT_ID = "agent_011CZuG6jF8DudY44YEH3zMy";
const ENVIRONMENT_ID = "env_016FQQScY82YTTDsFyPvAvzX";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);

  const client = useMemo(
    () =>
      new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      }),
    []
  );

  const createSessionIfNeeded = async () => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const session = await client.beta.sessions.create({
      agent: { type: "agent", id: AGENT_ID },
      environment_id: ENVIRONMENT_ID,
      betas: [BETA_HEADER],
    });

    sessionIdRef.current = session.id;
    return session.id;
  };

  const submitMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: userText }]);
    setIsStreaming(true);

    try {
      const sessionId = await createSessionIfNeeded();

      const stream = client.beta.sessions.events.stream(sessionId, {
        betas: [BETA_HEADER],
      });

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: "" }]);

      await client.beta.sessions.events.send(sessionId, {
        events: [
          {
            type: "user.message",
            content: [{ type: "text", text: userText }],
          },
        ],
        betas: [BETA_HEADER],
      });

      for await (const event of stream) {
        if (event.type === "agent.message") {
          const blocks = event.message?.content ?? [];
          const incoming = blocks
            .filter((block): block is { type: "text"; text: string } => block.type === "text")
            .map((block) => block.text)
            .join("");

          if (incoming) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantId ? { ...msg, text: msg.text + incoming } : msg))
            );
          }
        } else if (event.type === "session.status_idle") {
          setIsStreaming(false);
          break;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラーが発生しました。");
      setIsStreaming(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitMessage();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  return (
    <main className="min-h-screen bg-washi-bg text-washi-ink px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-3xl border border-washi-soft/70 bg-[#f8f3ea]/80 p-5 shadow-mist backdrop-blur">
        <header className="text-center">
          <h1 className="text-2xl tracking-[0.2em]">仙人との対話</h1>
          <p className="mt-1 text-sm text-washi-accent">静かな問いに、静かな答えを。</p>
        </header>

        <section className="h-[60vh] overflow-y-auto rounded-2xl border border-washi-soft/80 bg-[#f6efe3]/70 p-4">
          {messages.length === 0 ? (
            <p className="pt-20 text-center text-washi-accent/80">まずは一言、問いを投げかけてみましょう。</p>
          ) : (
            <ul className="space-y-4">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-washi-soft/80"
                      : "bg-[#efe6d8] text-washi-ink shadow-[inset_0_0_0_1px_rgba(143,125,100,0.2)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text || "…"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            className="min-h-24 w-full resize-none rounded-2xl border border-washi-soft bg-[#fffdf8]/90 p-3 text-base outline-none ring-washi-accent/30 transition focus:ring disabled:cursor-not-allowed disabled:opacity-60"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="仙人へ問いかける…"
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-washi-accent/80">
              {isStreaming ? "仙人が思索中です…" : "Enter で送信（Shift+Enterで改行）"}
            </p>
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="rounded-xl bg-washi-ink px-5 py-2 text-sm text-[#f8f3ea] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-washi-accent"
            >
              送信
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </div>
    </main>
  );
}
