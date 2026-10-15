# Database design

- **User**: authentication identity, profile and role. Email is unique. Password hash is excluded from default query projections.
- **ChatSession**: belongs to a user; soft-delete timestamp supports user-facing deletion while retaining message auditability.
- **ChatMessage**: references session and user. Messages are ordered by `sessionId + createdAt`; recent history is bounded before sending to the LLM.
- **Resume**: belongs to a user. Structured resume content is stored independently from `editorJson` and `template`, so templates do not own business data.
- **Consultant**: pricing and simple recurring availability window. In a production scheduling system, model timezone and explicit slot inventory.
- **Booking**: references user and consultant, snapshots price/currency at booking time, tracks booking/payment state and external provider IDs.
- **StripeEvent**: unique Stripe event ID helps ignore duplicate webhook deliveries.

Important indexes are defined beside Mongoose schemas. For heavy traffic, use a dedicated slot reservation collection with a unique `(consultantId, startAt)` index and a transaction or reservation TTL workflow to guarantee concurrency safety.
