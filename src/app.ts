import express from "express";
import routes from "./web/routes";
import { logger } from "./web/middleware/logger";

const app = express();

app.use(express.json());
app.use(logger); // Logging middleware

// Automatically register all routes
app.use("/", routes);

export default app;
