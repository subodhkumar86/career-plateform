"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api, hasToken } from "../../../lib/api";

export default function ChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await api<any>(`/chat/sessions/${params.sessionId}`);
      setSession(result.session);
      setMessages(result.messages);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }

    load();
  }, [params.sessionId, router]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const text = content;
    setContent("");
    setBusy(true);
    setError("");

    try {
      const result = await api<any>(`/ai/sessions/${params.sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text })
      });
      setMessages((m) => [...m, { role: "user", content: text, createdAt: new Date().toISOString() }, result.message]);
    } catch (e: any) {
      setError(e.message);
      setContent(text);
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    const title = prompt("Conversation title", session?.title || "");
    if (!title) return;

    try {
      const result = await api<any>(`/chat/sessions/${params.sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title })
      });
      setSession(result.session);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove() {
    if (!confirm("Delete this conversation?")) return;

    try {
      await api(`/chat/sessions/${params.sessionId}`, { method: "DELETE" });
      location.href = "/chat";
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Conversation</p>
          <h1>{session?.title || "Career chat"}</h1>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={rename}>Rename</button>
          <button className="btn danger" onClick={remove}>Delete</button>
        </div>
      </div>

      <section className="card stack" style={{ minHeight: 420, marginTop: 18 }}>
        {messages.map((m, i) => (
          <div key={m._id || i} className={`message ${m.role === "user" ? "user" : ""}`}>
            <strong>{m.role === "user" ? "You" : "Career AI"}</strong>
            <div>{m.content}</div>
          </div>
        ))}

        {busy && <p className="muted">AI is thinking…</p>}
        {error && <p className="error">{error}</p>}

        <form className="row" onSubmit={send}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Ask about your career…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
        </form>
      </section>
    </main>
  );
}
