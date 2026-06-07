import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import { initDb } from "./src/db/index";
import { loadLocalEnvFiles } from "./src/Server/Services/serverEnv";
import { registerSpaFallback } from "./src/Server/Services/serverRouting";

// Route modules
import { authRouter, healthRouter } from "./src/Server/Routes/authRoutes";
import { billingRouter } from "./src/Server/Routes/billingRoutes";
import { auditRouter, intakeRouter, userAuditsRouter } from "./src/Server/Routes/auditRoutes";
import { adminRouter } from "./src/Server/Routes/adminRoutes";
import { scanRouter } from "./src/Server/Routes/scanRoutes";
import { presentationRouter } from "./src/Server/Routes/presentationRoutes";
import { errorHandler } from "./src/Server/Middleware/errorMiddleware";
import { globalLimiter, authLimiter, auditLimiter } from "./src/Server/Middleware/rateLimitMiddleware";

async function startServer() {
  loadLocalEnvFiles();

  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1); // Trust first proxy for rate limiting (e.g. Nginx, Heroku)

  // Webhooks require raw body, so mount them before express.json()
  app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Initialize DB if URL is present
  try {
    const initialized = await initDb();
    if (initialized) {
      console.log("Database initialized");
    } else {
      console.warn("Database initialization skipped because DATABASE_URL is not configured.");
    }
  } catch {
    console.error("Database initialization failed. Waiting for configuration.");
  }

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  // Apply global rate limit to all API routes
  app.use("/api", globalLimiter);

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/billing", billingRouter);

  // Presentation MUST be mounted before /api/audit to avoid the audit router
  // intercepting /api/audit/presentation requests.
  app.use("/api/audit/presentation", auditLimiter, presentationRouter);
  app.use("/api/audit", auditLimiter, auditRouter);
  app.use("/api/intake", auditLimiter, intakeRouter);
  app.use("/api/audits", userAuditsRouter);

  app.use("/api/admin", adminRouter);
  app.use("/api/scan", scanRouter);

  // ---------------------------------------------------------------------------
  // Sitemap
  // ---------------------------------------------------------------------------

  app.get("/sitemap.xml", (req, res) => {
    try {
      // Prevent XML Injection / Reflected XSS via Host header
      const host = req.get("host") || "localhost";
      const escapedHost = host.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
      
      const baseUrl = process.env.VITE_CLIENT_URL || `https://${escapedHost}`;
      const routes = ["home", "pricing", "report", "intake", "console", "live", "campaign", "presentation"];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${baseUrl}/#${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === "home" ? "1.0" : "0.8"}</priority>
  </url>`).join("\n")}
</urlset>`;
      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (e: unknown) {
      console.error("Sitemap generation error:", e);
      res.status(500).end();
    }
  });

  // ---------------------------------------------------------------------------
  // Global error handler (must be last)
  // ---------------------------------------------------------------------------

  app.use(errorHandler);

  // ---------------------------------------------------------------------------
  // Frontend: Vite (dev) or static (prod)
  // ---------------------------------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    registerSpaFallback(app, distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
