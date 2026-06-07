import path from "node:path";
import type { Express } from "express";

export function registerSpaFallback(app: Express, distPath: string) {
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    return res.sendFile(path.join(distPath, "index.html"));
  });
}
