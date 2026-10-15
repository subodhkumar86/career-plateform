"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, hasToken } from "../../lib/api";

export default function Resumes() {
  const router = useRouter();
  const [resumes, setResumes] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await api<{ resumes: any[] }>("/resumes");
      setResumes(result.resumes);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function create() {
    try {
      const result = await api<any>("/resumes", {
        method: "POST",
        body: JSON.stringify({
          title: "My Resume",
          template: "ats",
          content: {
            personalInfo: { name: "", email: "" },
            summary: "",
            education: [],
            experience: [],
            skills: [],
            projects: [],
            certifications: [],
            achievements: []
          }
        })
      });
      location.href = `/resumes/${result.resume._id}/edit`;
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
          <p className="eyebrow">Portfolio</p>
          <h1>My resumes</h1>
        </div>
        <button className="btn" onClick={create}>Create resume</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid" style={{ marginTop: 18 }}>
        {resumes.map((resume) => (
          <article className="feature-card" key={resume._id}>
            <div className="feature-icon">▣</div>
            <h2>{resume.title}</h2>
            <p className="muted">
              {resume.template === "ats" ? "ATS Classic" : "Modern Professional"} · Version {resume.version}
            </p>
            <div className="row" style={{ marginTop: 18 }}>
              <Link className="btn" href={`/resumes/${resume._id}/edit`}>Edit</Link>
              <Link className="btn secondary" href={`/resumes/${resume._id}/preview`}>Preview</Link>
            </div>
          </article>
        ))}
      </div>

      {!resumes.length && !error && <p className="muted" style={{ marginTop: 18 }}>No resumes yet.</p>}
    </main>
  );
}
