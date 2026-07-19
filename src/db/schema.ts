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
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const planSettings = pgTable('audit_plan_settings', {
  planId: text('plan_id').primaryKey(),
  aiProvider: text('ai_provider').default('openrouter'), // 'openrouter', 'agentrouter', 'nvidia'
  openRouterApiKey: text('openrouter_api_key').default(''),
  agentRouterApiKey: text('agentrouter_api_key').default(''),
  nvidiaApiKey: text('nvidia_api_key').default(''),
  allowedModels: text('allowed_models').default(''),
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
