"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, hasToken, saveToken } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (hasToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const r = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveToken(r.token);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <form className="form-shell stack" onSubmit={submit}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Welcome back</p>
          <h1>Sign into your workspace</h1>
        </div>

        <label>
          Email
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </button>

        <p className="muted" style={{ textAlign: "center" }}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
