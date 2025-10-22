import { 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar, 
  boolean, 
  int,
  index,
  uniqueIndex,
  primaryKey
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Connected Gmail mailboxes for each user
 */
export const connectedMailboxes = mysqlTable("connected_mailboxes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  emailAddress: varchar("emailAddress", { length: 255 }).notNull(),
  oauthRefreshToken: text("oauthRefreshToken"), // encrypted
  oauthAccessToken: text("oauthAccessToken"), // encrypted
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  gmailHistoryId: varchar("gmailHistoryId", { length: 50 }),
  watchExpiresAt: timestamp("watchExpiresAt"),
  isActive: boolean("isActive").default(true),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  uniqueUserEmail: uniqueIndex("unique_user_email").on(table.userId, table.emailAddress),
}));

export type ConnectedMailbox = typeof connectedMailboxes.$inferSelect;
export type InsertConnectedMailbox = typeof connectedMailboxes.$inferInsert;

/**
 * Email swipes captured from Gmail
 */
export const emailSwipes = mysqlTable("email_swipes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  mailboxId: varchar("mailboxId", { length: 64 }).notNull(),
  gmailMessageId: varchar("gmailMessageId", { length: 255 }),
  threadId: varchar("threadId", { length: 255 }),
  subject: text("subject"),
  senderEmail: varchar("senderEmail", { length: 255 }),
  senderName: varchar("senderName", { length: 255 }),
  recipientEmail: varchar("recipientEmail", { length: 255 }),
  receivedDate: timestamp("receivedDate"),
  htmlBody: text("htmlBody"),
  plainBody: text("plainBody"),
  snippet: text("snippet"),
  isHtml: boolean("isHtml").default(true),
  hasImages: boolean("hasImages").default(false),
  
  // AI Analysis metadata (stored as JSON strings)
  aiClassification: text("aiClassification"), // JSON string
  aiInsights: text("aiInsights"), // JSON string
  embeddingVectorId: varchar("embeddingVectorId", { length: 100 }), // Reference to Qdrant
  
  // User metadata
  isFavorite: boolean("isFavorite").default(false),
  notes: text("notes"),
  manualTags: text("manualTags"), // JSON array as string
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_swipes_idx").on(table.userId, table.receivedDate),
  senderIdx: index("sender_idx").on(table.senderEmail),
  mailboxIdx: index("mailbox_idx").on(table.mailboxId),
}));

export type EmailSwipe = typeof emailSwipes.$inferSelect;
export type InsertEmailSwipe = typeof emailSwipes.$inferInsert;

/**
 * Predefined taxonomy of tags
 */
export const tags = mysqlTable("tags", {
  id: varchar("id", { length: 64 }).primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // 'use_case', 'niche', 'technique', 'purpose'
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  uniqueCategoryName: uniqueIndex("unique_category_name").on(table.category, table.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Many-to-many relationship between swipes and tags
 */
export const swipeTags = mysqlTable("swipe_tags", {
  swipeId: varchar("swipeId", { length: 64 }).notNull(),
  tagId: varchar("tagId", { length: 64 }).notNull(),
  confidenceScore: int("confidenceScore"), // 0-100 instead of decimal
  isAiGenerated: boolean("isAiGenerated").default(true),
}, (table) => ({
  pk: primaryKey({ columns: [table.swipeId, table.tagId] }),
}));

export type SwipeTag = typeof swipeTags.$inferSelect;
export type InsertSwipeTag = typeof swipeTags.$inferInsert;

/**
 * Collections (user-organized folders)
 */
export const collections = mysqlTable("collections", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_collections_idx").on(table.userId),
}));

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = typeof collections.$inferInsert;

/**
 * Many-to-many relationship between collections and swipes
 */
export const collectionSwipes = mysqlTable("collection_swipes", {
  collectionId: varchar("collectionId", { length: 64 }).notNull(),
  swipeId: varchar("swipeId", { length: 64 }).notNull(),
  addedAt: timestamp("addedAt").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.collectionId, table.swipeId] }),
}));

export type CollectionSwipe = typeof collectionSwipes.$inferSelect;
export type InsertCollectionSwipe = typeof collectionSwipes.$inferInsert;

/**
 * Background jobs tracking (optional, for monitoring)
 */
export const jobLogs = mysqlTable("job_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  jobType: varchar("jobType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  payload: text("payload"), // JSON string
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type JobLog = typeof jobLogs.$inferSelect;
export type InsertJobLog = typeof jobLogs.$inferInsert;

