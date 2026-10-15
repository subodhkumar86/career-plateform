"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, hasToken } from "../../lib/api";

export default function ChatHome() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await api<{ sessions: any[] }>("/chat/sessions");
      setSessions(result.sessions);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function create() {
    try {
      const result = await api<{ session: any }>("/chat/sessions", {
        method: "POST",
        body: JSON.stringify({})
      });
      window.location.href = `/chat/${result.session._id}`;
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
  }, [router]);

  return (
    <main className="shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">AI companion</p>
          <h1>Career assistant</h1>
        </div>
        <button className="btn" onClick={create}>New conversation</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="list">
          {sessions.map((session) => (
            <div className="list-item" key={session._id}>
              <Link href={`/chat/${session._id}`}>
                <strong>{session.title}</strong>
              </Link>
              <p className="muted">{new Date(session.updatedAt).toLocaleString()}</p>
            </div>
          ))}

          {!sessions.length && !error && <p className="muted">No conversations yet. Create one to begin.</p>}
        </div>
      </div>
    </main>
  );
}
