import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';
import { 
  InsertUser, 
  users, 
  connectedMailboxes,
  ConnectedMailbox,
  InsertConnectedMailbox,
  emailSwipes,
  EmailSwipe,
  InsertEmailSwipe,
  tags,
  Tag,
  InsertTag,
  swipeTags,
  InsertSwipeTag,
  collections,
  Collection,
  InsertCollection,
  collectionSwipes,
  InsertCollectionSwipe,
  jobLogs,
  InsertJobLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log('[Database] Creating connection pool...');
      console.log('[Database] URL prefix:', process.env.DATABASE_URL.substring(0, 20) + '...');
      _pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(_pool);
      console.log('[Database] Pool created, testing connection...');
      // Test the connection
      await _pool.query('SELECT 1');
      console.log('[Database] Connection test successful');
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      console.error("[Database] Error details:", error.message);
      console.error("[Database] Error code:", error.code);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

// ============= USER OPERATIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= MAILBOX OPERATIONS =============

export async function createMailbox(mailbox: InsertConnectedMailbox): Promise<ConnectedMailbox> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(connectedMailboxes).values(mailbox);
  const result = await db.select().from(connectedMailboxes).where(eq(connectedMailboxes.id, mailbox.id!)).limit(1);
  return result[0];
}

export async function getMailboxesByUser(userId: string): Promise<ConnectedMailbox[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(connectedMailboxes).where(eq(connectedMailboxes.userId, userId));
}

export async function getMailboxById(id: string): Promise<ConnectedMailbox | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(connectedMailboxes).where(eq(connectedMailboxes.id, id)).limit(1);
  return result[0];
}

export async function getMailboxByEmail(emailAddress: string): Promise<ConnectedMailbox | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(connectedMailboxes).where(eq(connectedMailboxes.emailAddress, emailAddress)).limit(1);
  return result[0];
}

export async function updateMailbox(id: string, data: Partial<ConnectedMailbox>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(connectedMailboxes).set(data).where(eq(connectedMailboxes.id, id));
}

export async function deleteMailbox(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(connectedMailboxes).where(eq(connectedMailboxes.id, id));
}

// ============= EMAIL SWIPE OPERATIONS =============

export async function createSwipe(swipe: InsertEmailSwipe): Promise<EmailSwipe> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(emailSwipes).values(swipe);
  const result = await db.select().from(emailSwipes).where(eq(emailSwipes.id, swipe.id!)).limit(1);
  return result[0];
}

export async function getSwipesByUser(userId: string, limit: number = 50, offset: number = 0): Promise<EmailSwipe[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(emailSwipes)
    .where(eq(emailSwipes.userId, userId))
    .orderBy(desc(emailSwipes.receivedDate))
    .limit(limit)
    .offset(offset);
}

export async function getSwipeById(id: string): Promise<EmailSwipe | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(emailSwipes).where(eq(emailSwipes.id, id)).limit(1);
  return result[0];
}

export async function updateSwipe(id: string, data: Partial<EmailSwipe>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(emailSwipes).set(data).where(eq(emailSwipes.id, id));
}

export async function deleteSwipe(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(emailSwipes).where(eq(emailSwipes.id, id));
}

// ============= TAG OPERATIONS =============

export async function getTags(): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tags);
}

export async function getTagsByCategory(category: string): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tags).where(eq(tags.category, category));
}

export async function getTagByName(category: string, name: string): Promise<Tag | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(tags)
    .where(and(eq(tags.category, category), eq(tags.name, name)))
    .limit(1);
  return result[0];
}

// ============= SWIPE TAG OPERATIONS =============

export async function addSwipeTag(swipeTag: InsertSwipeTag): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(swipeTags).values(swipeTag).onDuplicateKeyUpdate({
    set: { confidenceScore: swipeTag.confidenceScore },
  });
}

export async function getSwipeTags(swipeId: string): Promise<Array<Tag & { confidenceScore: number | null }>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    id: tags.id,
    category: tags.category,
    name: tags.name,
    description: tags.description,
    createdAt: tags.createdAt,
    confidenceScore: swipeTags.confidenceScore,
  })
    .from(swipeTags)
    .innerJoin(tags, eq(swipeTags.tagId, tags.id))
    .where(eq(swipeTags.swipeId, swipeId));

  return result;
}

// ============= COLLECTION OPERATIONS =============

export async function createCollection(collection: InsertCollection): Promise<Collection> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(collections).values(collection);
  const result = await db.select().from(collections).where(eq(collections.id, collection.id!)).limit(1);
  return result[0];
}

export async function getCollectionsByUser(userId: string): Promise<Collection[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(collections).where(eq(collections.userId, userId));
}

export async function addSwipeToCollection(collectionSwipe: InsertCollectionSwipe): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(collectionSwipes).values(collectionSwipe);
}

export async function removeSwipeFromCollection(collectionId: string, swipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(collectionSwipes)
    .where(and(
      eq(collectionSwipes.collectionId, collectionId),
      eq(collectionSwipes.swipeId, swipeId)
    ));
}

// ============= JOB LOG OPERATIONS =============

export async function createJobLog(jobLog: InsertJobLog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(jobLogs).values(jobLog);
}

export async function updateJobLog(id: string, data: Partial<InsertJobLog>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(jobLogs).set(data).where(eq(jobLogs.id, id));
}

