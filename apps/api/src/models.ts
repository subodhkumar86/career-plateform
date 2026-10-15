import mongoose, { Schema, Types } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: "" },
  profile: { headline: String, location: String, skills: [String], bio: String },
  role: { type: String, enum: ["USER", "ADMIN", "CONSULTANT"], default: "USER" }
}, { timestamps: true });

const chatSessionSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, default: "New conversation", maxlength: 120 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const chatMessageSchema = new Schema({
  sessionId: { type: Types.ObjectId, ref: "ChatSession", required: true, index: true },
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, maxlength: 20000 },
  usage: { promptTokens: Number, completionTokens: Number }
}, { timestamps: true });
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

const resumeSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, default: "My Resume", maxlength: 120 },
  template: { type: String, enum: ["modern", "ats"], default: "ats" },
  content: {
    personalInfo: { name: String, email: String, phone: String, location: String, linkedin: String, website: String },
    summary: String,
    education: [{ school: String, degree: String, startDate: String, endDate: String, details: String }],
    experience: [{ company: String, title: String, startDate: String, endDate: String, bullets: [String] }],
    skills: [String],
    projects: [{ name: String, description: String, technologies: [String], url: String }],
    certifications: [{ name: String, issuer: String, date: String }],
    achievements: [String]
  },
  editorJson: Schema.Types.Mixed,
  version: { type: Number, default: 1 }
}, { timestamps: true });
resumeSchema.index({ userId: 1, updatedAt: -1 });

const consultantSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  bio: String,
  specialties: [String],
  priceMinor: { type: Number, required: true, min: 100 },
  currency: { type: String, default: "inr" },
  durationMinutes: { type: Number, default: 30 },
  active: { type: Boolean, default: true },
  availableDays: { type: [Number], default: [1,2,3,4,5] },
  startHour: { type: Number, default: 9 },
  endHour: { type: Number, default: 17 }
}, { timestamps: true });

const bookingSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  consultantId: { type: Types.ObjectId, ref: "Consultant", required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  agenda: { type: String, maxlength: 2000 },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true },
  status: { type: String, enum: ["PENDING_PAYMENT","PAYMENT_FAILED","PAID","CONFIRMED","CANCELLED","COMPLETED"], default: "PENDING_PAYMENT", index: true },
  paymentStatus: { type: String, enum: ["PENDING","PAID","FAILED","REFUNDED"], default: "PENDING" },
  amountMinor: { type: Number, required: true },
  currency: { type: String, required: true },
  stripeCheckoutSessionId: { type: String, sparse: true, unique: true },
  stripePaymentIntentId: String,
  calendarEventId: String,
  meetingUrl: String,
  calendarError: String,
  emailSentAt: Date
}, { timestamps: true });
bookingSchema.index({ consultantId: 1, startAt: 1, endAt: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

const stripeEventSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  type: String,
  processedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export const Resume = mongoose.model("Resume", resumeSchema);
export const Consultant = mongoose.model("Consultant", consultantSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
export const StripeEvent = mongoose.model("StripeEvent", stripeEventSchema);
