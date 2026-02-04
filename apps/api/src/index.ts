import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { checkJwt } from "./middleware/auth";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin:
      allowedOrigins && allowedOrigins.length > 0
        ? allowedOrigins
        : "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (public - no auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Apply JWT authentication to all routes except /health
app.use((req: Request, res: Response, next) => {
  if (req.path === "/health") {
    return next();
  }
  return checkJwt(req, res, next);
});

// Protected routes (all routes below require authentication)
app.get("/profile", (req: Request, res: Response) => {
  res.json({
    message: "User profile",
    user: req.auth?.payload,
  });
});

app.get("/me", (req: Request, res: Response) => {
  const { sub, email, name } = req.auth?.payload || {};

  res.json({
    userId: sub,
    email,
    name,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
  });
});

// Error handling middleware (must be last)
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error("Error:", err);

  const status = (err as any).status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: err.name || "Error",
    message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});
