import { 
  users, bots, messages, learnedWords, milestones,
  type User, type InsertUser, type Bot, type InsertBot,
  type Message, type InsertMessage, type LearnedWord, type InsertLearnedWord,
  type Milestone, type InsertMilestone 
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bots: Map<number, Bot>;
  private messages: Map<number, Message[]>;
  private learnedWords: Map<number, LearnedWord[]>;
  private milestones: Map<number, Milestone[]>;
  private currentUserId: number;
  private currentBotId: number;
  private currentMessageId: number;
  private currentWordId: number;
  private currentMilestoneId: number;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    this.messages = new Map();
    this.learnedWords = new Map();
    this.milestones = new Map();
    this.currentUserId = 1;
    this.currentBotId = 1;
    this.currentMessageId = 1;
    this.currentWordId = 1;
    this.currentMilestoneId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBot(id: number): Promise<Bot | undefined> {
    return this.bots.get(id);
  }

  async getBotByUserId(userId: number): Promise<Bot | undefined> {
    return Array.from(this.bots.values()).find(bot => bot.userId === userId);
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const id = this.currentBotId++;
    const bot: Bot = { 
      ...insertBot, 
      id, 
      createdAt: new Date(),
      personalityTraits: insertBot.personalityTraits || {
        enthusiasm: 1,
        humor: 1,
        curiosity: 2
      }
    };
    this.bots.set(id, bot);
    this.messages.set(id, []);
    this.learnedWords.set(id, []);
    this.milestones.set(id, []);
    return bot;
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) return undefined;

    const updatedBot = { ...bot, ...updates };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async getMessages(botId: number): Promise<Message[]> {
    return this.messages.get(botId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp: new Date() 
    };
    
    const botMessages = this.messages.get(insertMessage.botId) || [];
    botMessages.push(message);
    this.messages.set(insertMessage.botId, botMessages);
    
    return message;
  }

  async getLearnedWords(botId: number): Promise<LearnedWord[]> {
    return this.learnedWords.get(botId) || [];
  }

  async createOrUpdateWord(insertWord: InsertLearnedWord): Promise<LearnedWord> {
    const words = this.learnedWords.get(insertWord.botId) || [];
    const existingWord = words.find(w => w.word.toLowerCase() === insertWord.word.toLowerCase());
    
    if (existingWord) {
      existingWord.frequency += 1;
      if (insertWord.context) {
        existingWord.context = insertWord.context;
      }
      return existingWord;
    } else {
      const id = this.currentWordId++;
      const word: LearnedWord = { 
        ...insertWord, 
        id, 
        firstLearnedAt: new Date() 
      };
      words.push(word);
      this.learnedWords.set(insertWord.botId, words);
      return word;
    }
  }

  async getMilestones(botId: number): Promise<Milestone[]> {
    return this.milestones.get(botId) || [];
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const id = this.currentMilestoneId++;
    const milestone: Milestone = { 
      ...insertMilestone, 
      id, 
      achievedAt: new Date() 
    };
    
    const botMilestones = this.milestones.get(insertMilestone.botId) || [];
    botMilestones.push(milestone);
    this.milestones.set(insertMilestone.botId, botMilestones);
    
    return milestone;
  }
}

export const storage = new MemStorage();
