import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config";

export interface AuthRequest extends Request { userId?: string; userRole?: string; }

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
  try {
    if (!config.jwtSecret) return res.status(500).json({ error: "JWT_SECRET is not configured" });
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string; role?: string };
    req.userId = payload.sub;
    req.userRole = payload.role || "USER";
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}
