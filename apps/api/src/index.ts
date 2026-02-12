import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";
import { ValidateError } from "@tsoa/runtime";
import { checkJwt } from "./middleware/checkJwt.js";
import { corsMiddleware } from "./middleware/cors.js";
import { syncUser } from "./middleware/syncUser.js";
import { RegisterRoutes } from "./generated/routes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadSwaggerSpec = (): Record<string, unknown> | null => {
  const swaggerPath = join(__dirname, "generated", "swagger.json");

  if (!existsSync(swaggerPath)) {
    return null;
  }

  return JSON.parse(readFileSync(swaggerPath, "utf-8")) as Record<
    string,
    unknown
  >;
};

const swaggerSpec = loadSwaggerSpec();

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (swaggerSpec) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/docs/swagger.json", (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });
} else {
  console.warn("Swagger spec not found at startup. /docs is disabled.");
}

// Health check endpoint (public - no auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Apply JWT authentication to all routes except /health
app.use((req: Request, res: Response, next) => {
  if (req.path === "/health" || req.path.startsWith("/docs")) {
    return next();
  }
  return checkJwt(req, res, next);
});

// Sync authenticated users to database
app.use(syncUser);

RegisterRoutes(app);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
  });
});

// Error handling middleware (must be last)
type ErrorWithStatus = Error & { status?: number };

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidateError) {
    console.warn(`Caught Validation Error for ${req.path}:`, err.fields);
    return res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
  }

  const error = err as ErrorWithStatus;
  const status = error.status ?? 500;
  const message = error.message ?? "Internal Server Error";

  res.status(status).json({
    error: error.name ?? "Error",
    message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});
