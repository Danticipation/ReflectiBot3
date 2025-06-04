import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { 
  users, bots, messages, learnedWords, milestones, userMemories, userFacts,
  type User, type InsertUser, type Bot, type InsertBot, type Message, type InsertMessage,
  type LearnedWord, type InsertLearnedWord, type Milestone, type InsertMilestone,
  type UserMemory, type InsertUserMemory, type UserFact, type InsertUserFact
} from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Initialize database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set, cannot initialize storage.");
  throw new Error("DATABASE_URL is required to initialize the database connection.");
}

// Create the neon client
const sql = neon(connectionString);

// Initialize drizzle
const db = drizzle(sql);

// Simple table creation (for initial setup)
async function ensureTables() {
  try {
    // Try to query users table, if it fails, tables don't exist
    await db.select().from(users).limit(1).execute();
  } catch (error) {
    console.log('Tables do not exist. You need to run database migrations.');
    // You could add table creation SQL here, but for now just log the error
  }
}
ensureTables(); // Ensure tables are checked on module load

// Call it once when the module loads
// ensureTables(); // Comment this out temporarily

// Storage interface for database operations
export const storage = {
  // Setup tables method
  async setupTables(): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const createBotsTable = `
      CREATE TABLE IF NOT EXISTS bots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(100) NOT NULL,
        level INTEGER DEFAULT 1 NOT NULL,
        words_learned INTEGER DEFAULT 0 NOT NULL,
        personality_traits JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER REFERENCES bots(id),
        sender VARCHAR(20) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const createLearnedWordsTable = `
      CREATE TABLE IF NOT EXISTS learned_words (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER REFERENCES bots(id),
        word VARCHAR(100) NOT NULL,
        frequency INTEGER DEFAULT 1 NOT NULL,
        context TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const createMilestonesTable = `
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER REFERENCES bots(id),
        type VARCHAR(50) NOT NULL,
        description TEXT,
        achieved_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const createUserMemoriesTable = `
      CREATE TABLE IF NOT EXISTS user_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        memory TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'conversation' NOT NULL,
        importance VARCHAR(20) DEFAULT 'medium' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const createUserFactsTable = `
      CREATE TABLE IF NOT EXISTS user_facts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fact TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general' NOT NULL,
        confidence VARCHAR(20) DEFAULT 'medium' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    const insertDefaultUser = `
      INSERT INTO users (username, email) VALUES ('default_user', 'user@example.com') 
      ON CONFLICT (username) DO NOTHING
    `;

    // Execute all table creation queries
    await sql(createUsersTable);
    await sql(createBotsTable);
    await sql(createMessagesTable);
    await sql(createLearnedWordsTable);
    await sql(createMilestonesTable);
    await sql(createUserMemoriesTable);
    await sql(createUserFactsTable);
    await sql(insertDefaultUser);
  },
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0] as User | undefined;
  },

  async createUser(data: InsertUser): Promise<User> {
    const results = await db.insert(users).values(data).returning();
    return results[0] as User;
  },

  // Bot operations
  async getBot(id: number): Promise<Bot | undefined> {
    const results = await db.select().from(bots).where(eq(bots.id, id));
    return results[0] as Bot;
  },

  async getBotByUserId(userId: number): Promise<Bot | undefined> {
    const results = await db.select().from(bots).where(eq(bots.userId, userId));
    return results[0] as Bot | undefined;
  },

  async createBot(data: InsertBot): Promise<Bot> {
    const results = await db.insert(bots).values(data).returning();
    return results[0] as Bot;
  },

  async updateBot(id: number, data: Partial<InsertBot>): Promise<Bot> {
    const results = await db.update(bots).set(data).where(eq(bots.id, id)).returning();
    return results[0] as Bot;
  },

  // Message operations
  async getMessages(botId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.botId, botId)).orderBy(messages.createdAt) as unknown as Message[];
  },

  async createMessage(data: InsertMessage): Promise<Message> {
    const results = await db.insert(messages).values(data).returning();
    return results[0];
  },

  // Learned words operations
  async getLearnedWords(botId: number): Promise<LearnedWord[]> {
    return await db.select().from(learnedWords).where(eq(learnedWords.botId, botId));
  },

  async createOrUpdateWord(data: InsertLearnedWord): Promise<LearnedWord> {
    // Check if word exists
    const existing = await db.select()
      .from(learnedWords)
      .where(and(
        eq(learnedWords.botId, data.botId || 0),
        eq(learnedWords.word, data.word)
      ));
    
    if (existing.length > 0) {
      // Update frequency
      const word = existing[0];
      const results = await db.update(learnedWords)
        .set({ frequency: word.frequency + 1 })
        .where(eq(learnedWords.id, word.id))
        .returning();
      return results[0];
    } else {
      // Create new word
      const results = await db.insert(learnedWords).values(data).returning();
      return results[0];
    }
  },

  // Milestone operations
  async getMilestones(botId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.botId, botId));
  },

  async createMilestone(data: InsertMilestone): Promise<Milestone> {
    const results = await db.insert(milestones).values(data).returning();
    return results[0];
  },

  // User memory operations
  async getUserMemories(userId: number): Promise<UserMemory[]> {
    return await db.select().from(userMemories).where(eq(userMemories.userId, userId));
  },

  async createUserMemory(data: InsertUserMemory): Promise<UserMemory> {
    const results = await db.insert(userMemories).values(data).returning();
    return results[0];
  },

  // User fact operations
  async getUserFacts(userId: number): Promise<UserFact[]> {
    return await db.select().from(userFacts).where(eq(userFacts.userId, userId));
  },

    async createUserFact(data: InsertUserFact): Promise<UserFact> {
      const results = await db.insert(userFacts).values(data).returning();
      return results[0];
    }
  };