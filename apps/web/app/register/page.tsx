"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, hasToken, saveToken } from "../../lib/api";

export default function Register() {
  const [name, setName] = useState("");
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
      const r = await api<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
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
          <p className="eyebrow" style={{ marginBottom: 8 }}>Start fresh</p>
          <h1>Create your account</h1>
        </div>

        <label>
          Name
          <input className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Email
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" disabled={busy}>{busy ? "Creating…" : "Register"}</button>
      </form>
    </main>
  );
}
