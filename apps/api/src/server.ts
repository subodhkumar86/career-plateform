import mongoose from "mongoose";
import app from "./app";
import { config } from "./config";

async function main() {
  if (!config.jwtSecret) console.warn("WARNING: JWT_SECRET is not set. Authentication endpoints will not work until configured.");
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");
  app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
}
main().catch(err => { console.error("Failed to start API", err); process.exit(1); });
