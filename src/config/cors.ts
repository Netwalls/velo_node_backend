/**
 * CORS Configuration for Velo Backend
 *
 * This file provides enhanced CORS configuration for development and production.
 * Currently, the backend uses a global cors() middleware which allows all origins.
 *
 * For production, update src/server.ts to use the restrictive configuration below.
 */

import cors from "cors";
import { Request, Response, NextFunction } from "express";

/**
 * Development CORS Configuration
 * Allows all origins for local testing
 */
export const corsConfigDev = cors();

/**
 * Production CORS Configuration
 * Restricts to specific frontend domains
 */
export const corsConfigProduction = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173", // Local dev
      "http://localhost:3000", // Alternative dev port
      process.env.FRONTEND_URL, // Production frontend
      process.env.STAGING_FRONTEND_URL, // Staging frontend
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Api-Key",
    "X-Api-Signature",
    "X-Admin-Key",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400, // 24 hours
});

/**
 * Custom CORS options for specific routes
 * Use when different routes need different CORS policies
 */
export const corsOptionsDelegate = (req: Request, callback: Function) => {
  let corsOptions;

  // Allow CORS for specific routes
  if (
    req.header("origin") === "http://localhost:5173" ||
    process.env.NODE_ENV === "development"
  ) {
    corsOptions = { origin: true };
  } else {
    corsOptions = { origin: false };
  }

  callback(null, corsOptions);
};

/**
 * Preflight handler for complex requests
 */
export const preflightHandler = (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
};

/**
 * CORS error handler middleware
 */
export const corsErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.message && err.message.includes("CORS")) {
    res.status(403).json({
      error: "CORS policy violation",
      message: err.message,
      origin: req.get("origin"),
    });
  } else {
    next(err);
  }
};

/**
 * Recommended CORS setup for production
 * Add this to src/server.ts instead of just using cors():
 *
 * import { corsConfigProduction, corsErrorHandler } from './config/cors';
 *
 * const isDev = process.env.NODE_ENV === 'development';
 * app.use(isDev ? cors() : corsConfigProduction);
 * app.use(corsErrorHandler);
 */

export default corsConfigProduction;
