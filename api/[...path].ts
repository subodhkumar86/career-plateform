import mongoose from "mongoose";
import app from "../apps/api/src/app";
import { config } from "../apps/api/src/config";

let connection: Promise<typeof mongoose> | undefined;

function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  connection ??= mongoose.connect(config.mongoUri);
  return connection;
}

export default async function handler(req: any, res: any) {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error("API initialization failed", error);
    return res.status(503).json({ error: "API is not configured" });
  }
}
