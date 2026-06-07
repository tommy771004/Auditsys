import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { eq } from "drizzle-orm";
import { generateAuditIntelligence } from "../auditIntelligence";
import { getDb } from "../../../db/index";
import { audits } from "../../../db/schema";
import type { AuditRequestPayload } from "../../../shared/types/auditPipelineTypes";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
}) as any;

export const auditQueue = new Queue("audit-queue", { connection });

interface AuditJobData {
  body: AuditRequestPayload;
  auditConfig: {
    planId: string;
    openRouterApiKey: string | undefined;
    allowedModels: string[] | undefined;
  };
  auditId: string;
}

export const auditWorker = new Worker<AuditJobData>(
  "audit-queue",
  async (job) => {
    const { body, auditConfig, auditId } = job.data;
    const db = getDb();

    try {
      const result = await generateAuditIntelligence(body, auditConfig);
      const auditStatus = result.harness?.status === "failed" ? "failed" : "completed";
      
      await db
        .update(audits)
        .set({ status: auditStatus, result: JSON.stringify(result) })
        .where(eq(audits.id, auditId));
        
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "pipeline_failed";
      await db
        .update(audits)
        .set({ status: "failed", result: JSON.stringify({ error: { code: "pipeline_failed", message } }) })
        .where(eq(audits.id, auditId));
      throw error;
    }
  },
  { connection }
);

auditWorker.on("failed", (job, err) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(`Audit job ${job?.id} failed:`, err);
  }
});
