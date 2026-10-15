import OpenAI from "openai";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { config } from "./config";

export function getOpenAI() {
  if (!config.openAiKey) throw Object.assign(new Error("OPENAI_API_KEY is not configured"), { status: 503 });
  return new OpenAI({ apiKey: config.openAiKey, timeout: 30000, maxRetries: 2 });
}
export function getStripe() {
  if (!config.stripeKey) throw Object.assign(new Error("STRIPE_SECRET_KEY is not configured"), { status: 503 });
  return new Stripe(config.stripeKey);
}
export async function sendConfirmationEmail(input: { to: string; name: string; consultant: string; startAt: Date; meetingUrl?: string; bookingId: string }) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) return { sent: false, reason: "SMTP is not configured" };
  const transporter = nodemailer.createTransport({
    host: config.smtpHost, port: config.smtpPort, secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPassword }
  });
  await transporter.sendMail({
    from: config.emailFrom, to: input.to, subject: "Your consultation is confirmed",
    text: `Hi ${input.name}, your consultation with ${input.consultant} is confirmed for ${input.startAt.toISOString()}. Meeting: ${input.meetingUrl || "Link pending"}. Booking ID: ${input.bookingId}`
  });
  return { sent: true };
}
export async function createCalendarEvent(input: { consultantEmail: string; name: string; email: string; startAt: Date; endAt: Date; agenda?: string }) {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleRefreshToken) {
    return { eventId: undefined, meetingUrl: undefined, skipped: true };
  }
  const auth = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret);
  auth.setCredentials({ refresh_token: config.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth });
  const result = await calendar.events.insert({
    calendarId: config.googleCalendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: `Career consultation — ${input.name}`,
      description: input.agenda || "Career consultation",
      start: { dateTime: input.startAt.toISOString() },
      end: { dateTime: input.endAt.toISOString() },
      attendees: [{ email: input.email }, { email: input.consultantEmail }],
      conferenceData: { createRequest: { requestId: `career-${Date.now()}-${Math.random().toString(36).slice(2)}`, conferenceSolutionKey: { type: "hangoutsMeet" } } }
    }
  });
  return { eventId: result.data.id || undefined, meetingUrl: result.data.hangoutLink || undefined, skipped: false };
}
