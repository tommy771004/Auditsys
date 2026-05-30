import { pgTable, serial, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('audit_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  subscriptionPlan: text('subscription_plan').default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const audits = pgTable('audit_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull(),
  status: text('status').notNull(),
  result: text('result'), // JSON stringified result
  agentResults: text('agent_results'), // JSON stringified SubagentsResults
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditAgentLogs = pgTable('audit_agent_logs', {
  id: serial('id').primaryKey(),
  auditId: uuid('audit_id').references(() => audits.id).notNull(),
  agent: text('agent').notNull(),
  timestamp: text('timestamp').notNull(),
  status: text('status').notNull(),
  level: text('level').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const planSettings = pgTable('audit_plan_settings', {
  planId: text('plan_id').primaryKey(),
  openRouterApiKey: text('openrouter_api_key').default(''),
  allowedModels: text('allowed_models').default('google/gemini-2.5-flash'),
  price: text('price').default('$0'),
});

export const intakeLeads = pgTable('audit_intake_leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').references(() => users.id),
  url: text('url').notNull(),
  companyName: text('company_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  goals: text('goals'), // JSON stringified array
  stack: text('stack'), // JSON stringified array
  teamSize: text('team_size'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
