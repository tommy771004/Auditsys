import rateLimit from "express-rate-limit";

// Global limiter for most endpoints: 100 requests / 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100, 
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Stricter limiter for Auth endpoints (login, register): 5 requests / 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 5, 
  message: {
    status: "fail",
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for heavy LLM endpoints (audit, presentation): 10 requests / 15 minutes
export const auditLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 10, 
  message: {
    status: "fail",
    message: "Too many audit requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
