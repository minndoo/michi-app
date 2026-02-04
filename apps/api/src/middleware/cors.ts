import cors from "cors";
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const corsMiddleware = cors({
  origin:
    allowedOrigins && allowedOrigins.length > 0
      ? allowedOrigins
      : "http://localhost:3000",
  credentials: true,
});
