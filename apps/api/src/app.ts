import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { authenticate, AuthRequest } from "./middleware";
import { Booking, ChatMessage, ChatSession, Consultant, Resume, StripeEvent, User } from "./models";
import { createCalendarEvent, getOpenAI, getStripe, sendConfirmationEmail } from "./integrations";
import { transitionBooking } from "./booking-state";

const app = express();
// Vercel and other reverse proxies forward the client address. This keeps
// rate-limit keys correct and avoids express-rate-limit proxy warnings.
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.clientUrl.split(",").map(v => v.trim()), credentials: true }));
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/ai", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const swagger = {
  openapi: "3.0.0", info: { title: "Career Platform API", version: "1.0.0" },
  servers: [{ url: `http://localhost:${config.port}` }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  paths: {
    "/api/auth/register": { post: { summary: "Register", responses: { "201": { description: "Registered" } } } },
    "/api/auth/login": { post: { summary: "Login", responses: { "200": { description: "JWT returned" } } } },
    "/api/chat/sessions": { get: { security: [{ bearerAuth: [] }], summary: "List chat sessions", responses: { "200": { description: "Sessions" } } }, post: { security: [{ bearerAuth: [] }], summary: "Create chat session", responses: { "201": { description: "Created" } } } },
    "/api/resumes": { get: { security: [{ bearerAuth: [] }], summary: "List resumes", responses: { "200": { description: "Resumes" } } }, post: { security: [{ bearerAuth: [] }], summary: "Create resume", responses: { "201": { description: "Created" } } } },
    "/api/bookings": { get: { security: [{ bearerAuth: [] }], summary: "List bookings with pagination/filtering", responses: { "200": { description: "Bookings" } } }, post: { security: [{ bearerAuth: [] }], summary: "Create booking", responses: { "201": { description: "Created" } } } },
    "/api/payments/checkout": { post: { security: [{ bearerAuth: [] }], summary: "Create Stripe Checkout session", responses: { "200": { description: "Checkout URL" } } } }
  }
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swagger));

app.get("/health", (_req, res) => res.json({ ok: true, service: "career-platform-api" }));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "career-platform-api" }));

const registerSchema = z.object({ name: z.string().min(2).max(100), email: z.string().email(), password: z.string().min(8).max(128) });
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({ name: body.name, email, passwordHash });
    if (!config.jwtSecret) return res.status(500).json({ error: "JWT_SECRET is not configured" });
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password" });
    if (!config.jwtSecret) return res.status(500).json({ error: "JWT_SECRET is not configured" });
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});
app.post("/api/auth/logout", authenticate, (_req, res) => res.json({ message: "Logged out. Remove the bearer token on the client." }));
app.get("/api/auth/me", authenticate, async (req: AuthRequest, res, next) => {
  try { const user = await User.findById(req.userId).select("-passwordHash"); if (!user) return res.status(404).json({ error: "User not found" }); res.json({ user }); } catch (e) { next(e); }
});
app.get("/api/users/me", authenticate, async (req: AuthRequest, res, next) => {
  try { const user = await User.findById(req.userId).select("-passwordHash"); res.json({ user }); } catch (e) { next(e); }
});
app.patch("/api/users/me", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ name: z.string().min(2).max(100).optional(), phone: z.string().max(30).optional(), profile: z.object({ headline: z.string().max(150).optional(), location: z.string().max(150).optional(), skills: z.array(z.string().max(60)).max(100).optional(), bio: z.string().max(2000).optional() }).optional() }).parse(req.body);
    const user = await User.findByIdAndUpdate(req.userId, { $set: body }, { new: true, runValidators: true }).select("-passwordHash");
    res.json({ user });
  } catch (e) { next(e); }
});

// Chat sessions and persisted messages
app.get("/api/chat/sessions", authenticate, async (req: AuthRequest, res, next) => {
  try { const sessions = await ChatSession.find({ userId: req.userId, deletedAt: null }).sort({ updatedAt: -1 }).lean(); res.json({ sessions }); } catch (e) { next(e); }
});
app.post("/api/chat/sessions", authenticate, async (req: AuthRequest, res, next) => {
  try { const title = z.string().max(120).optional().parse(req.body?.title); const session = await ChatSession.create({ userId: req.userId, title: title || "New conversation" }); res.status(201).json({ session }); } catch (e) { next(e); }
});
app.get("/api/chat/sessions/:id", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId, deletedAt: null });
    if (!session) return res.status(404).json({ error: "Session not found" });
    const messages = await ChatMessage.find({ sessionId: session.id, userId: req.userId }).sort({ createdAt: 1 }).lean();
    res.json({ session, messages });
  } catch (e) { next(e); }
});
app.patch("/api/chat/sessions/:id", authenticate, async (req: AuthRequest, res, next) => {
  try { const title = z.string().min(1).max(120).parse(req.body.title); const session = await ChatSession.findOneAndUpdate({ _id: req.params.id, userId: req.userId, deletedAt: null }, { title }, { new: true }); if (!session) return res.status(404).json({ error: "Session not found" }); res.json({ session }); } catch (e) { next(e); }
});
app.delete("/api/chat/sessions/:id", authenticate, async (req: AuthRequest, res, next) => {
  try { const session = await ChatSession.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { deletedAt: new Date() }, { new: true }); if (!session) return res.status(404).json({ error: "Session not found" }); res.json({ message: "Session deleted" }); } catch (e) { next(e); }
});
app.post("/api/ai/sessions/:id/messages", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(12000) }).parse(req.body);
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId, deletedAt: null });
    if (!session) return res.status(404).json({ error: "Session not found" });
    await ChatMessage.create({ sessionId: session.id, userId: req.userId, role: "user", content });
    const history = await ChatMessage.find({ sessionId: session.id, userId: req.userId }).sort({ createdAt: -1 }).limit(20).lean();
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: config.openAiModel,
      messages: [
        { role: "system", content: "You are a helpful career coach. Give practical, truthful advice. Do not invent user credentials or work history." },
        ...history.reverse().map(m => ({ role: m.role, content: m.content } as const))
      ],
      temperature: 0.5
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) throw Object.assign(new Error("AI provider returned an empty response"), { status: 502 });
    const message = await ChatMessage.create({ sessionId: session.id, userId: req.userId, role: "assistant", content: answer, usage: completion.usage ? { promptTokens: completion.usage.prompt_tokens, completionTokens: completion.usage.completion_tokens } : undefined });
    if (session.title === "New conversation") session.title = content.slice(0, 50);
    await session.save();
    res.status(201).json({ message, usage: completion.usage });
  } catch (e) { next(e); }
});

// Resume CRUD and AI structured generation
app.get("/api/resumes", authenticate, async (req: AuthRequest, res, next) => {
  try { const resumes = await Resume.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean(); res.json({ resumes }); } catch (e) { next(e); }
});
app.post("/api/resumes", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ title: z.string().min(1).max(120).optional(), template: z.enum(["modern","ats"]).optional(), content: z.record(z.any()).optional() }).parse(req.body);
    const resume = await Resume.create({ userId: req.userId, title: body.title || "My Resume", template: body.template || "ats", content: body.content || {} });
    res.status(201).json({ resume });
  } catch (e) { next(e); }
});
app.get("/api/resumes/:id", authenticate, async (req: AuthRequest, res, next) => {
  try { const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId }); if (!resume) return res.status(404).json({ error: "Resume not found" }); res.json({ resume }); } catch (e) { next(e); }
});
app.patch("/api/resumes/:id", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ title: z.string().min(1).max(120).optional(), template: z.enum(["modern","ats"]).optional(), content: z.record(z.any()).optional(), editorJson: z.any().optional() }).parse(req.body);
    const resume = await Resume.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $set: body, $inc: { version: 1 } }, { new: true, runValidators: true });
    if (!resume) return res.status(404).json({ error: "Resume not found" }); res.json({ resume });
  } catch (e) { next(e); }
});
app.delete("/api/resumes/:id", authenticate, async (req: AuthRequest, res, next) => {
  try { const result = await Resume.deleteOne({ _id: req.params.id, userId: req.userId }); if (!result.deletedCount) return res.status(404).json({ error: "Resume not found" }); res.json({ message: "Resume deleted" }); } catch (e) { next(e); }
});
app.post("/api/resumes/:id/generate", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId });
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: config.openAiModel, response_format: { type: "json_object" }, temperature: 0.3,
      messages: [
        { role: "system", content: "Create ATS-friendly resume content. Return JSON with keys personalInfo, summary, education[], experience[], skills[], projects[], certifications[], achievements[]. Never invent facts; use only supplied facts and leave missing information empty." },
        { role: "user", content: JSON.stringify(resume.content) }
      ]
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const generated = JSON.parse(raw);
    resume.content = generated;
    resume.version += 1;
    await resume.save();
    res.json({ resume });
  } catch (e) { next(e); }
});

// Consultants; seed a demo consultant on demand only when collection is empty.
app.get("/api/consultants", async (_req, res, next) => {
  try {
    let consultants = await Consultant.find({ active: true }).select("-__v").lean();
    if (!consultants.length) consultants = await Consultant.insertMany([{ name: "Career Consultant", email: "consultant@example.invalid", bio: "General career strategy and resume review", specialties: ["Resume review", "Interview preparation"], priceMinor: 150000, currency: config.stripeCurrency, durationMinutes: 30, active: true }]).then(v => v.map(x => x.toObject()));
    res.json({ consultants });
  } catch (e) { next(e); }
});

function validSlot(startAt: Date, endAt: Date, consultant: any) {
  if (Number.isNaN(startAt.getTime()) || startAt <= new Date() || endAt <= startAt) return false;
  if (startAt.getDay() === 0 || !consultant.availableDays.includes(startAt.getDay())) return false;
  if (startAt.getHours() < consultant.startHour || endAt.getHours() > consultant.endHour) return false;
  if (startAt.getMinutes() % 15 !== 0) return false;
  return true;
}
app.post("/api/bookings", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ consultantId: z.string(), startAt: z.string().datetime(), name: z.string().min(2).max(100), email: z.string().email(), phone: z.string().max(30).optional(), agenda: z.string().max(2000).optional() }).parse(req.body);
    const consultant = await Consultant.findOne({ _id: body.consultantId, active: true });
    if (!consultant) return res.status(404).json({ error: "Consultant not found" });
    const startAt = new Date(body.startAt), endAt = new Date(startAt.getTime() + consultant.durationMinutes * 60000);
    if (!validSlot(startAt, endAt, consultant)) return res.status(400).json({ error: "Requested slot is in the past or outside consultant availability" });
    const overlap = await Booking.exists({ consultantId: consultant.id, status: { $in: ["PENDING_PAYMENT","PAID","CONFIRMED"] }, startAt: { $lt: endAt }, endAt: { $gt: startAt } });
    if (overlap) return res.status(409).json({ error: "This consultant slot is already reserved" });
    const booking = await Booking.create({ userId: req.userId, consultantId: consultant.id, name: body.name, email: body.email, phone: body.phone, agenda: body.agenda, startAt, endAt, amountMinor: consultant.priceMinor, currency: consultant.currency, status: "PENDING_PAYMENT", paymentStatus: "PENDING" });
    res.status(201).json({ booking });
  } catch (e) { next(e); }
});
app.get("/api/bookings", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const filter: any = { userId: req.userId };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.search) filter.name = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const sortField = String(req.query.sort || "-createdAt");
    const sort: any = { [sortField.startsWith("-") ? sortField.slice(1) : sortField]: sortField.startsWith("-") ? -1 : 1 };
    const [bookings, total] = await Promise.all([Booking.find(filter).populate("consultantId", "name specialties").sort(sort).skip((page-1)*limit).limit(limit).lean(), Booking.countDocuments(filter)]);
    res.json({ bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});
app.get("/api/bookings/:id", authenticate, async (req: AuthRequest, res, next) => {
  try { const booking = await Booking.findOne({ _id: req.params.id, userId: req.userId }).populate("consultantId", "name email specialties"); if (!booking) return res.status(404).json({ error: "Booking not found" }); res.json({ booking }); } catch (e) { next(e); }
});

app.post("/api/payments/checkout", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { bookingId } = z.object({ bookingId: z.string() }).parse(req.body);
    const booking = await Booking.findOne({ _id: bookingId, userId: req.userId }).populate("consultantId");
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "PENDING_PAYMENT") return res.status(409).json({ error: "Booking is not awaiting payment" });
    const consultant: any = booking.consultantId;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: booking.currency, unit_amount: booking.amountMinor, product_data: { name: `Consultation with ${consultant.name}`, description: `Booking ${booking.id}` } }, quantity: 1 }],
      metadata: { bookingId: booking.id, userId: req.userId || "" },
      success_url: `${config.clientUrl}/consultations?payment=processing`,
      cancel_url: `${config.clientUrl}/consultations?payment=cancelled`
    }, { idempotencyKey: `checkout-${booking.id}` });
    booking.stripeCheckoutSessionId = session.id;
    await booking.save();
    res.json({ checkoutUrl: session.url });
  } catch (e) { next(e); }
});

// Stripe requires the raw body for signature verification. Event ID storage provides deduplication.
app.post("/api/payments/webhook", async (req: Request, res: Response) => {
  let event: any;
  try {
    const stripe = getStripe();
    if (!config.stripeWebhookSecret) return res.status(503).send("Stripe webhook is not configured");
    event = stripe.webhooks.constructEvent(req.body, req.header("stripe-signature") || "", config.stripeWebhookSecret);
  } catch (e: any) { return res.status(400).send(`Webhook signature verification failed: ${e.message}`); }
  try {
    const already = await StripeEvent.findOne({ eventId: event.id });
    if (already) return res.json({ received: true, duplicate: true });
    try {
      await StripeEvent.create({ eventId: event.id, type: event.type });
    } catch (error: any) {
      if (error?.code === 11000) return res.json({ received: true, duplicate: true });
      throw error;
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const booking = await Booking.findOne({ _id: session.metadata?.bookingId, stripeCheckoutSessionId: session.id }).populate("consultantId");
      if (booking && booking.status === "PENDING_PAYMENT" && session.payment_status === "paid") {
        transitionBooking(booking, "PAID");
        booking.paymentStatus = "PAID";
        booking.stripePaymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
        await booking.save();
        const consultant: any = booking.consultantId;
        try {
          const calendar = await createCalendarEvent({ consultantEmail: consultant.email, name: booking.name, email: booking.email, startAt: booking.startAt, endAt: booking.endAt, agenda: booking.agenda || undefined });
          booking.calendarEventId = calendar.eventId;
          booking.meetingUrl = calendar.meetingUrl;
          booking.calendarError = undefined;
          transitionBooking(booking, "CONFIRMED");
          await booking.save();
          const mail = await sendConfirmationEmail({ to: booking.email, name: booking.name, consultant: consultant.name, startAt: booking.startAt, meetingUrl: booking.meetingUrl, bookingId: booking.id });
          if (mail.sent) { booking.emailSentAt = new Date(); await booking.save(); }
        } catch (err: any) {
          booking.calendarError = String(err?.message || "Calendar/email integration failed").slice(0, 500);
          await booking.save();
        }
      }
    } else if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      if (bookingId) await Booking.updateOne({ _id: bookingId, status: "PENDING_PAYMENT" }, { $set: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" } });
    }
    res.json({ received: true });
  } catch (e) {
    // Return 500 so Stripe retries; event is recorded, so production should use an outbox/processed status.
    console.error("Stripe webhook processing failed", e);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

app.get("/api/dashboard", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const [totalResumes, totalChats, upcomingConsultations, completedConsultations] = await Promise.all([
      Resume.countDocuments({ userId: req.userId }),
      ChatSession.countDocuments({ userId: req.userId, deletedAt: null }),
      Booking.countDocuments({ userId: req.userId, status: "CONFIRMED", startAt: { $gte: now } }),
      Booking.countDocuments({ userId: req.userId, status: "COMPLETED" })
    ]);
    res.json({ totalResumes, totalChats, upcomingConsultations, completedConsultations });
  } catch (e) { next(e); }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON request body" });
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Validation failed", details: err.issues.map(i => ({ path: i.path.join("."), message: i.message })) });
  if (err?.code === 11000) return res.status(409).json({ error: "A record with this value already exists" });
  const status = Number(err?.status) || 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({ error: status >= 500 ? "Internal server error or external integration unavailable" : err.message });
});

export default app;
