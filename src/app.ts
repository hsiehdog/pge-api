import express from "express";
import cors from "cors";
import routes from "./web/routes";
import { logger } from "./web/middleware/logger";

const app = express();

// CORS middleware - enable cross-origin requests
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());
app.use(logger); // Logging middleware

// Automatically register all routes
app.use("/", routes);

export default app;
