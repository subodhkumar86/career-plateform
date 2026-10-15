import Link from "next/link";

const features = [
  { title: "AI career assistant", body: "Keep separate conversations and return to them later.", icon: "✦" },
  { title: "Resume builder", body: "Save structured resume content and switch templates.", icon: "▣" },
  { title: "Expert consultations", body: "Book a slot and pay securely through Stripe.", icon: "◎" }
];

export default function Home() {
  return (
    <main className="shell">
      <section className="page-hero">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Your next career move</p>
            <h1>Build your career with clarity.</h1>
            <p className="muted" style={{ maxWidth: 680, fontSize: "clamp(1.05rem, 2vw, 1.4rem)" }}>
              Create ATS-friendly resumes, get AI career guidance, and book expert consultations from one refined workspace.
            </p>
            <div className="row" style={{ marginTop: 24 }}>
              <Link className="btn" href="/register">Create account</Link>
              <Link className="btn secondary" href="/dashboard">Open dashboard</Link>
            </div>
          </div>

          <aside className="hero-metric">
            <p className="muted">Career momentum</p>
            <div className="metric-value">+94%</div>
            <p className="muted" style={{ marginTop: 8 }}>
              Professionals using AI guidance and tailored resumes report stronger interview readiness in less time.
            </p>
          </aside>
        </div>
      </section>

      <div className="features">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <div className="feature-icon">{feature.icon}</div>
            <h2>{feature.title}</h2>
            <p className="muted">{feature.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
