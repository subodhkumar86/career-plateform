"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, hasToken } from "../../lib/api";

export default function Consultations() {
  const router = useRouter();
  const [consultants, setConsultants] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agenda, setAgenda] = useState("");

  function defaultSlot() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async function load() {
    try {
      const c = await api<any>("/consultants");
      setConsultants(c.consultants);
      if (c.consultants[0]) setConsultantId(c.consultants[0]._id);
      setStartAt((current) => current || defaultSlot());

      const b = await api<any>("/bookings?page=1&limit=20&sort=-createdAt");
      setBookings(b.bookings);
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

  async function book() {
    setError("");
    try {
      if (!startAt || Number.isNaN(new Date(startAt).getTime())) {
        setError("Please select a valid consultation time.");
        return;
      }
      const booking = await api<any>("/bookings", {
        method: "POST",
        body: JSON.stringify({ consultantId, startAt: new Date(startAt).toISOString(), name, email, phone, agenda })
      });
      const payment = await api<any>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.booking._id })
      });
      window.location.href = payment.checkoutUrl;
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="shell">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Expert guidance</p>
          <h1>Consultations</h1>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <section className="card stack">
          <h2>Book a consultation</h2>

          <label>
            Consultant
            <select className="input" value={consultantId} onChange={(e) => setConsultantId(e.target.value)}>
              {consultants.map((c) => (
                <option value={c._id} key={c._id}>
                  {c.name} — {(c.priceMinor / 100).toLocaleString()} {c.currency?.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date and time
            <input className="input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </label>

          <label>
            Your name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label>
            Email
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            Phone
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label>
            Agenda
            <textarea className="input" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </label>

          <button className="btn" onClick={book}>Continue to secure payment</button>
          <p className="muted">Availability is validated by the server. Payment must be confirmed by Stripe webhook.</p>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="card">
          <h2>Your bookings</h2>
          <div className="list">
            {bookings.map((booking) => (
              <div className="list-item" key={booking._id}>
                <strong>{booking.consultantId?.name || "Consultation"}</strong>
                <p>{new Date(booking.startAt).toLocaleString()}</p>
                <p className="muted">
                  {booking.status} · {booking.paymentStatus}
                </p>
                {booking.meetingUrl && (
                  <a href={booking.meetingUrl} target="_blank" rel="noreferrer">
                    Meeting link
                  </a>
                )}
              </div>
            ))}

            {!bookings.length && <p className="muted">No bookings yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
