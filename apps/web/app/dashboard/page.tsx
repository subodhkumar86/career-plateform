"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, clearToken, hasToken } from "../../lib/api";

type Stats = {
  totalResumes: number;
  totalChats: number;
  upcomingConsultations: number;
  completedConsultations: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }

    api<Stats>("/dashboard").then(setStats).catch((e) => setError(e.message));
  }, [router]);

  return (
    <main className="shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Your dashboard</h1>
          <p className="muted">Your career workspace at a glance.</p>
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
        >
          Log out
        </button>
      </div>

      {error && <p className="error">{error} — please log in.</p>}

      <div className="grid" style={{ marginTop: 18 }}>
        {[
          ["Resumes", stats?.totalResumes],
          ["Conversations", stats?.totalChats],
          ["Upcoming consultations", stats?.upcomingConsultations],
          ["Completed consultations", stats?.completedConsultations]
        ].map(([label, value]) => (
          <div className="stat-card" key={String(label)}>
            <p className="muted">{label}</p>
            <div className="value">{value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="features" style={{ marginTop: 22 }}>
        <div className="feature-card">
          <div className="feature-icon">✦</div>
          <h2>AI career assistant</h2>
          <p className="muted">Ask about interviews, skills, career plans, and job searches.</p>
          <div style={{ marginTop: 18 }}>
            <Link className="btn" href="/chat">Open chat</Link>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">▣</div>
          <h2>Resume builder</h2>
          <p className="muted">Create a structured resume and select an ATS-friendly template.</p>
          <div style={{ marginTop: 18 }}>
            <Link className="btn" href="/resumes">Manage resumes</Link>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">◎</div>
          <h2>Consultations</h2>
          <p className="muted">Find a consultant and request a time slot.</p>
          <div style={{ marginTop: 18 }}>
            <Link className="btn" href="/consultations">Book consultation</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
