import { 
  users, bots, messages, learnedWords, milestones, userMemories, userFacts,
  type User, type InsertUser, type Bot, type InsertBot,
  type Message, type InsertMessage, type LearnedWord, type InsertLearnedWord,
  type Milestone, type InsertMilestone, type UserMemory, type InsertUserMemory,
  type UserFact, type InsertUserFact
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Bot methods
  getBot(id: number): Promise<Bot | undefined>;
  getBotByUserId(userId: number): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined>;

  // Message methods
  getMessages(botId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Learning methods
  getLearnedWords(botId: number): Promise<LearnedWord[]>;
  createOrUpdateWord(word: InsertLearnedWord): Promise<LearnedWord>;

  // Milestone methods
  getMilestones(botId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;

  // Memory methods
  getUserMemories(userId: number): Promise<UserMemory[]>;
  createUserMemory(memory: InsertUserMemory): Promise<UserMemory>;
  clearUserMemories(userId: number): Promise<void>;
  getUserFacts(userId: number): Promise<UserFact[]>;
  createUserFact(fact: InsertUserFact): Promise<UserFact>;
  clearUserFacts(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getBot(id: number): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot || undefined;
  }

  async getBotByUserId(userId: number): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.userId, userId));
    return bot || undefined;
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const [bot] = await db
      .insert(bots)
      .values({
        ...insertBot,
        name: insertBot.name || "Mirror",
        level: insertBot.level || 1,
        wordsLearned: insertBot.wordsLearned || 0,
        personalityTraits: insertBot.personalityTraits || {
          enthusiasm: 1,
          humor: 1,
          curiosity: 2
        }
      })
      .returning();
    return bot;
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    const [bot] = await db
      .update(bots)
      .set(updates)
      .where(eq(bots.id, id))
      .returning();
    return bot || undefined;
  }

  async getMessages(botId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.botId, botId));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getLearnedWords(botId: number): Promise<LearnedWord[]> {
    return await db.select().from(learnedWords).where(eq(learnedWords.botId, botId));
  }

  async createOrUpdateWord(insertWord: InsertLearnedWord): Promise<LearnedWord> {
    const existingWords = await db
      .select()
      .from(learnedWords)
      .where(eq(learnedWords.word, insertWord.word.toLowerCase()));
    
    const existingWord = existingWords.find(w => w.botId === insertWord.botId);
    
    if (existingWord) {
      const [updatedWord] = await db
        .update(learnedWords)
        .set({ 
          frequency: existingWord.frequency + 1,
          context: insertWord.context || existingWord.context
        })
        .where(eq(learnedWords.id, existingWord.id))
        .returning();
      return updatedWord;
    } else {
      const [word] = await db
        .insert(learnedWords)
        .values({
          ...insertWord,
          frequency: insertWord.frequency || 1
        })
        .returning();
      return word;
    }
  }

  async getMilestones(botId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.botId, botId));
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const [milestone] = await db
      .insert(milestones)
      .values({
        ...insertMilestone,
        description: insertMilestone.description || null
      })
      .returning();
    return milestone;
  }

  async getUserMemories(userId: number): Promise<UserMemory[]> {
    return await db.select().from(userMemories).where(eq(userMemories.userId, userId));
  }

  async createUserMemory(insertMemory: InsertUserMemory): Promise<UserMemory> {
    const [memory] = await db
      .insert(userMemories)
      .values({
        userId: insertMemory.userId,
        memory: insertMemory.memory,
        category: insertMemory.category || 'conversation',
        importance: insertMemory.importance || 'medium'
      })
      .returning();
    return memory;
  }

  async getUserFacts(userId: number): Promise<UserFact[]> {
    return await db.select().from(userFacts).where(eq(userFacts.userId, userId));
  }

  async createUserFact(insertFact: InsertUserFact): Promise<UserFact> {
    const [fact] = await db
      .insert(userFacts)
      .values(insertFact)
      .returning();
    return fact;
  }

  async clearUserMemories(userId: number): Promise<void> {
    await db.delete(userMemories).where(eq(userMemories.userId, userId));
  }

  async clearUserFacts(userId: number): Promise<void> {
    await db.delete(userFacts).where(eq(userFacts.userId, userId));
  }
}

export const storage = new DatabaseStorage();
