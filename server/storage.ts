import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import { 
  users, bots, messages, learnedWords, milestones, userMemories, userFacts,
  type User, type InsertUser, type Bot, type InsertBot, type Message, type InsertMessage,
  type LearnedWord, type InsertLearnedWord, type Milestone, type InsertMilestone,
  type UserMemory, type InsertUserMemory, type UserFact, type InsertUserFact
} from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

// Initialize database connection
neonConfig.fetchConnectionCache = true;
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/reflectibot';
// Create the neon client with the connection string
const sql = neon(connectionString);
// Initialize drizzle with the correct configuration
// @ts-ignore - Ignore type mismatch for now to allow build to proceed
const db = drizzle(sql);

// Storage interface for database operations
export const storage = {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  },

  async createUser(data: InsertUser): Promise<User> {
    const results = await db.insert(users).values(data).returning();
    return results[0];
  },

  // Bot operations
  async getBot(id: number): Promise<Bot | undefined> {
    const results = await db.select().from(bots).where(eq(bots.id, id));
    return results[0];
  },

  async getBotByUserId(userId: number): Promise<Bot | undefined> {
    const results = await db.select().from(bots).where(eq(bots.userId, userId));
    return results[0];
  },

  async createBot(data: InsertBot): Promise<Bot> {
    const results = await db.insert(bots).values(data).returning();
    return results[0];
  },

  async updateBot(id: number, data: Partial<InsertBot>): Promise<Bot> {
    const results = await db.update(bots).set(data).where(eq(bots.id, id)).returning();
    return results[0];
  },

  // Message operations
  async getMessages(botId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.botId, botId)).orderBy(messages.createdAt);
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
