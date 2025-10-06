import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Automatically discover and register all route files
const routesDir = __dirname;
const routeFiles = fs
  .readdirSync(routesDir)
  .filter(
    (file) =>
      (file.endsWith(".ts") || file.endsWith(".js")) &&
      file !== "index.ts" &&
      file !== "index.js"
  );

routeFiles.forEach((file) => {
  const routeName = path.basename(file, path.extname(file));
  const routeModule = require(path.join(routesDir, file)).default;

  if (routeModule && typeof routeModule === "function") {
    router.use(`/${routeName}`, routeModule);
  }
});

export default router;
