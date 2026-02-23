import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel, relations, sql } from "drizzle-orm";

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  is_enabled: boolean("is_enabled").notNull().default(false),
  ingestion_status: text("ingestion_status").notNull().default("idle"),
  primary_city_label: text("primary_city_label"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const constituencies = pgTable("constituencies", {
  id: serial("id").primaryKey(),
  state_id: integer("state_id")
    .notNull()
    .references(() => states.id),
  type: text("type").notNull(),
  name: text("name").notNull(),
  external_code: text("external_code"),
  district: text("district"),
  parent_id: integer("parent_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const politicians = pgTable("politicians", {
  id: serial("id").primaryKey(),
  state_id: integer("state_id")
    .notNull()
    .references(() => states.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  position: text("position").notNull(),
  party: text("party"),
  constituency_id: integer("constituency_id").references(() => constituencies.id),
  myneta_url: text("myneta_url"),
  wikipedia_url: text("wikipedia_url"),
  photo_url: text("photo_url"),
  criminal_cases: integer("criminal_cases").notNull().default(0),
  assets_worth: bigint("assets_worth", { mode: "bigint" }).notNull().default(sql`0`),
  liabilities: bigint("liabilities", { mode: "bigint" }).notNull().default(sql`0`),
  education: text("education"),
  age: integer("age"),
  rating: numeric("rating").notNull().default("0"),
  votes_up: integer("votes_up").notNull().default(0),
  votes_down: integer("votes_down").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const civic_bodies = pgTable("civic_bodies", {
  id: serial("id").primaryKey(),
  state_id: integer("state_id")
    .notNull()
    .references(() => states.id),
  name: text("name").notNull(),
  website: text("website"),
  helpline: text("helpline"),
  email: text("email"),
  address: text("address"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const civic_officials = pgTable("civic_officials", {
  id: serial("id").primaryKey(),
  state_id: integer("state_id")
    .notNull()
    .references(() => states.id),
  civic_body_id: integer("civic_body_id")
    .notNull()
    .references(() => civic_bodies.id),
  name: text("name").notNull(),
  designation: text("designation"),
  department: text("department"),
  phone: text("phone"),
  email: text("email"),
  office_address: text("office_address"),
  last_verified: timestamp("last_verified", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone_number: text("phone_number").notNull().unique(),
  firebase_uid: text("firebase_uid").notNull().unique(),
  name: text("name"),
  email: text("email"),
  state_code: text("state_code")
    .notNull()
    .default("DL")
    .references(() => states.code),
  voter_id_verified: boolean("voter_id_verified").notNull().default(false),
  voter_id_data: jsonb("voter_id_data").notNull().default({}),
  voter_id_image_url: text("voter_id_image_url"),
  tier: text("tier").notNull().default("free"),
  pro_expires_at: timestamp("pro_expires_at", { withTimezone: true }),
  api_key: text("api_key").unique(),
  api_calls_this_month: integer("api_calls_this_month").notNull().default(0),
  api_limit: integer("api_limit").notNull().default(0),
  task_credits: integer("task_credits").notNull().default(0),
  is_system_admin: boolean("is_system_admin").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().unique().references(() => users.id),
  state_id: integer("state_id").notNull().references(() => states.id),
  constituency_id: integer("constituency_id").references(() => constituencies.id),
  contribution_points: integer("contribution_points").notNull().default(0),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  politician_id: integer("politician_id").notNull().references(() => politicians.id),
  vote_type: text("vote_type").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [unique("user_politician_vote_unq").on(t.user_id, t.politician_id)]);

export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  state_id: integer("state_id")
    .notNull()
    .references(() => states.id),
  politician_id: integer("politician_id").references(() => politicians.id),
  constituency_id: integer("constituency_id").references(() => constituencies.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  photo_url: text("photo_url").notNull(),
  location_text: text("location_text").notNull(),
  lat: numeric("lat"),
  lng: numeric("lng"),
  department_name: text("department_name").notNull(),
  department_email: text("department_email").notNull(),
  civic_body_id: integer("civic_body_id").references(() => civic_bodies.id),
  status: text("status").notNull().default("pending"),
  severity: text("severity").notNull().default("medium"),
  email_thread_id: text("email_thread_id").unique(),
  last_reply_at: timestamp("last_reply_at", { withTimezone: true }),
  last_reply_from: text("last_reply_from"),
  last_reply_text: text("last_reply_text"),
  upvotes: integer("upvotes").notNull().default(0),
  is_public: boolean("is_public").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const rti_requests = pgTable("rti_requests", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  state_id: integer("state_id")
    .notNull()
    .references(() => states.id),
  politician_id: integer("politician_id").references(() => politicians.id),
  question: text("question").notNull(),
  rti_text: text("rti_text"),
  portal_url: text("portal_url"),
  pio_name: text("pio_name"),
  pio_address: text("pio_address"),
  pdf_url: text("pdf_url"),
  status: text("status").notNull().default("draft"),
  registration_number: text("registration_number"),
  filed_date: date("filed_date"),
  response_due_date: date("response_due_date"),
  response_received: boolean("response_received").notNull().default(false),
  response_url: text("response_url"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const politician_mentions = pgTable("politician_mentions", {
  id: serial("id").primaryKey(),
  politician_id: integer("politician_id").notNull().references(() => politicians.id),
  source_type: text("source_type").notNull(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull(),
  url: text("url").notNull(),
  sentiment: text("sentiment"),
  published_at: timestamp("published_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  payment_type: text("payment_type").notNull(),
  task_type: text("task_type"),
  amount: integer("amount").notNull(),
  razorpay_order_id: text("razorpay_order_id"),
  razorpay_payment_id: text("razorpay_payment_id"),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const task_usage = pgTable("task_usage", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  payment_id: integer("payment_id")
    .notNull()
    .references(() => payments.id),
  task_type: text("task_type").notNull(),
  metadata: jsonb("metadata").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const usage_events = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  task_type: text("task_type").notNull(),
  state_code: text("state_code"),
  endpoint: text("endpoint").notNull(),
  success: boolean("success").notNull(),
  status_code: integer("status_code").notNull(),
  error_code: text("error_code"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const civic_tasks = pgTable("civic_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  points_reward: integer("points_reward").notNull().default(10),
  state_id: integer("state_id").references(() => states.id),
  assigned_to: integer("assigned_to").references(() => volunteers.id),
  status: text("status").notNull().default("open"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const system_settings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const state_settings = pgTable("state_settings", {
  id: serial("id").primaryKey(),
  state_code: text("state_code")
    .notNull()
    .references(() => states.code),
  key: text("key").notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const state_ingestion_tasks = pgTable("state_ingestion_tasks", {
  id: serial("id").primaryKey(),
  state_code: text("state_code")
    .notNull()
    .references(() => states.code),
  task_type: text("task_type").notNull(),
  status: text("status").notNull().default("pending"),
  last_error: text("last_error"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const statesRelations = relations(states, ({ many }) => ({
  constituencies: many(constituencies),
  politicians: many(politicians),
  civic_bodies: many(civic_bodies),
  civic_officials: many(civic_officials),
  users: many(users),
  volunteers: many(volunteers),
  complaints: many(complaints),
  rti_requests: many(rti_requests),
  civic_tasks: many(civic_tasks)
}));

export const constituenciesRelations = relations(constituencies, ({ one, many }) => ({
  state: one(states, {
    fields: [constituencies.state_id],
    references: [states.id]
  }),
  parent: one(constituencies, {
    fields: [constituencies.parent_id],
    references: [constituencies.id]
  }),
  children: many(constituencies),
  politicians: many(politicians),
  complaints: many(complaints)
}));

export const politiciansRelations = relations(politicians, ({ one, many }) => ({
  state: one(states, {
    fields: [politicians.state_id],
    references: [states.id]
  }),
  constituency: one(constituencies, {
    fields: [politicians.constituency_id],
    references: [constituencies.id]
  }),
  complaints: many(complaints),
  votes: many(votes),
  mentions: many(politician_mentions)
}));

export const politicianMentionsRelations = relations(politician_mentions, ({ one }) => ({
  politician: one(politicians, {
    fields: [politician_mentions.politician_id],
    references: [politicians.id]
  })
}));

export const civicBodiesRelations = relations(civic_bodies, ({ one, many }) => ({
  state: one(states, {
    fields: [civic_bodies.state_id],
    references: [states.id]
  }),
  officials: many(civic_officials),
  complaints: many(complaints)
}));

export const civicOfficialsRelations = relations(civic_officials, ({ one }) => ({
  state: one(states, {
    fields: [civic_officials.state_id],
    references: [states.id]
  }),
  civic_body: one(civic_bodies, {
    fields: [civic_officials.civic_body_id],
    references: [civic_bodies.id]
  })
}));

export const volunteersRelations = relations(volunteers, ({ one, many }) => ({
  user: one(users, {
    fields: [volunteers.user_id],
    references: [users.id]
  }),
  state: one(states, {
    fields: [volunteers.state_id],
    references: [states.id]
  }),
  constituency: one(constituencies, {
    fields: [volunteers.constituency_id],
    references: [constituencies.id]
  }),
  tasks: many(civic_tasks)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  state: one(states, {
    fields: [users.state_code],
    references: [states.code]
  }),
  complaints: many(complaints),
  rti_requests: many(rti_requests),
  payments: many(payments),
  task_usage: many(task_usage),
  votes: many(votes),
  volunteer: one(volunteers, {
    fields: [users.id],
    references: [volunteers.user_id]
  })
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.user_id],
    references: [users.id]
  }),
  politician: one(politicians, {
    fields: [votes.politician_id],
    references: [politicians.id]
  })
}));

export const complaintsRelations = relations(complaints, ({ one }) => ({
  user: one(users, {
    fields: [complaints.user_id],
    references: [users.id]
  }),
  state: one(states, {
    fields: [complaints.state_id],
    references: [states.id]
  }),
  politician: one(politicians, {
    fields: [complaints.politician_id],
    references: [politicians.id]
  }),
  constituency: one(constituencies, {
    fields: [complaints.constituency_id],
    references: [constituencies.id]
  }),
  civic_body: one(civic_bodies, {
    fields: [complaints.civic_body_id],
    references: [civic_bodies.id]
  })
}));

export const rtiRequestsRelations = relations(rti_requests, ({ one }) => ({
  user: one(users, {
    fields: [rti_requests.user_id],
    references: [users.id]
  }),
  state: one(states, {
    fields: [rti_requests.state_id],
    references: [states.id]
  }),
  politician: one(politicians, {
    fields: [rti_requests.politician_id],
    references: [politicians.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.user_id],
    references: [users.id]
  }),
  task_usage: many(task_usage)
}));

export const taskUsageRelations = relations(task_usage, ({ one }) => ({
  user: one(users, {
    fields: [task_usage.user_id],
    references: [users.id]
  }),
  payment: one(payments, {
    fields: [task_usage.payment_id],
    references: [payments.id]
  })
}));

export const civicTasksRelations = relations(civic_tasks, ({ one }) => ({
  state: one(states, {
    fields: [civic_tasks.state_id],
    references: [states.id]
  }),
  volunteer: one(volunteers, {
    fields: [civic_tasks.assigned_to],
    references: [volunteers.id]
  })
}));

export type State = InferSelectModel<typeof states>;
export type NewState = InferInsertModel<typeof states>;

export type Constituency = InferSelectModel<typeof constituencies>;
export type NewConstituency = InferInsertModel<typeof constituencies>;

export type Politician = InferSelectModel<typeof politicians>;
export type NewPolitician = InferInsertModel<typeof politicians>;

export type CivicBody = InferSelectModel<typeof civic_bodies>;
export type NewCivicBody = InferInsertModel<typeof civic_bodies>;

export type CivicOfficial = InferSelectModel<typeof civic_officials>;
export type NewCivicOfficial = InferInsertModel<typeof civic_officials>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Volunteer = InferSelectModel<typeof volunteers>;
export type NewVolunteer = InferInsertModel<typeof volunteers>;

export type Vote = InferSelectModel<typeof votes>;
export type NewVote = InferInsertModel<typeof votes>;

export type Complaint = InferSelectModel<typeof complaints>;
export type NewComplaint = InferInsertModel<typeof complaints>;

export type RtiRequest = InferSelectModel<typeof rti_requests>;
export type NewRtiRequest = InferInsertModel<typeof rti_requests>;

export type PoliticianMention = InferSelectModel<typeof politician_mentions>;
export type NewPoliticianMention = InferInsertModel<typeof politician_mentions>;

export type Payment = InferSelectModel<typeof payments>;
export type NewPayment = InferInsertModel<typeof payments>;

export type TaskUsage = InferSelectModel<typeof task_usage>;
export type NewTaskUsage = InferInsertModel<typeof task_usage>;

export type CivicTask = InferSelectModel<typeof civic_tasks>;
export type NewCivicTask = InferInsertModel<typeof civic_tasks>;

export type UsageEvent = InferSelectModel<typeof usage_events>;
export type NewUsageEvent = InferInsertModel<typeof usage_events>;

export type SystemSetting = InferSelectModel<typeof system_settings>;
export type NewSystemSetting = InferInsertModel<typeof system_settings>;

export type StateSetting = InferSelectModel<typeof state_settings>;
export type NewStateSetting = InferInsertModel<typeof state_settings>;
