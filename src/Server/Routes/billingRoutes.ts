import { Router } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { getDb } from "../../db/index";
import { users, planSettings } from "../../db/schema";
import { parseSubscriptionPlan, canSelfServePlanChange } from "../Services/securityPolicies";
import { authenticateToken } from "../Middleware/authMiddleware";

// Initialize Stripe. If STRIPE_SECRET_KEY is missing, it will throw in production
// but we allow it to be undefined in dev if they haven't set it up yet.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2024-10-28.acacia" as any, // specify latest api version, use as any to avoid type errors across SDK versions
});

export const billingRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/billing/plans (public — returns only planId, allowedModels, price)
// ---------------------------------------------------------------------------
billingRouter.get("/plans", async (_req, res) => {
  try {
    const db = getDb();
    const settings = await db.select({
      planId: planSettings.planId,
      allowedModels: planSettings.allowedModels,
      price: planSettings.price,
    }).from(planSettings);
    res.json(settings);
  } catch (error: unknown) {
    res.status(500).json({ status: "error", message: error instanceof Error ? error.message : "plans_fetch_failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/create-checkout-session
// ---------------------------------------------------------------------------
billingRouter.post("/create-checkout-session", authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const requestedPlan = parseSubscriptionPlan(req.body?.plan);
    const currentPlan = parseSubscriptionPlan(user.subscriptionPlan);
    
    if (!requestedPlan) {
      return res.status(400).json({ status: "fail", message: "invalid_plan" });
    }
    if (!currentPlan) {
      return res.status(500).json({ status: "error", message: "invalid_user_plan" });
    }
    
    const decision = canSelfServePlanChange(currentPlan, requestedPlan);
    if (!decision.allowed) {
      return res.status(403).json({ status: "fail", message: decision.reason });
    }

    const db = getDb();
    // Fetch plan price
    const planRecords = await db.select().from(planSettings).where(eq(planSettings.planId, requestedPlan));
    const targetPlan = planRecords[0];
    if (!targetPlan) {
      return res.status(404).json({ status: "fail", message: "plan_not_found" });
    }

    // Mock price for Stripe if none configured in DB
    const priceAmount = Number(targetPlan.price) || 999; 

    // Create a Stripe Checkout Session
    const origin = req.headers.origin || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: req.body?.email || undefined, // Ask for email if not in user model
      client_reference_id: String(user.id),
      metadata: {
        userId: String(user.id),
        planId: requestedPlan,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `AuditSys ${requestedPlan.charAt(0).toUpperCase() + requestedPlan.slice(1)} Plan`,
              description: `Upgrade to ${requestedPlan}`,
            },
            unit_amount: priceAmount * 100, // Stripe uses cents
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/#/console?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/pricing?upgrade=cancelled`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Stripe] Checkout Error:", error);
    }
    res.status(500).json({ status: "error", message: "checkout_session_failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/webhook
// ---------------------------------------------------------------------------
// Important: Stripe webhooks need the raw body. Make sure `express.raw` is used in server.ts
// for this specific route.
billingRouter.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!endpointSecret) {
      // In dev mode without webhook secret, we bypass signature verification
      // ONLY IF we aren't strict. For safety, we should still enforce it if possible.
      if (process.env.NODE_ENV === "production") {
        throw new Error("Webhook secret not configured in production");
      }
      // If req.body is a Buffer, we must parse it to access event.type
      const bodyString = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
      event = typeof bodyString === "string" ? JSON.parse(bodyString) : bodyString; 
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
    }
  } catch (err: any) {
    console.error("[Stripe] Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (userId && planId) {
      try {
        const db = getDb();
        const requestedPlan = parseSubscriptionPlan(planId);
        if (requestedPlan) {
          await db.update(users).set({ subscriptionPlan: requestedPlan }).where(eq(users.id, Number(userId)));
          console.log(`[Stripe] Successfully upgraded user ${userId} to ${requestedPlan}`);
        }
      } catch (dbError) {
        console.error("[Stripe] DB Update Error after webhook:", dbError);
      }
    }
  }

  res.json({ received: true });
});
