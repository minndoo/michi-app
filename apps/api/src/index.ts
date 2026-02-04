import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import { checkJwt } from "./middleware/checkJwt";
import { corsMiddleware } from "./middleware/cors";
import { syncUser } from "./middleware/syncUser";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(corsMiddleware);
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

// Sync authenticated users to database
app.use(syncUser);

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
