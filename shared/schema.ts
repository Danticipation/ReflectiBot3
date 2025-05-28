import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull().default("Mirror"),
  level: integer("level").notNull().default(1),
  wordsLearned: integer("words_learned").notNull().default(0),
  personalityTraits: jsonb("personality_traits").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const learnedWords = pgTable("learned_words", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull(),
  word: text("word").notNull(),
  frequency: integer("frequency").notNull().default(1),
  context: text("context"),
  firstLearnedAt: timestamp("first_learned_at").notNull().defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  achievedAt: timestamp("achieved_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertLearnedWordSchema = createInsertSchema(learnedWords).omit({
  id: true,
  firstLearnedAt: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  achievedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type LearnedWord = typeof learnedWords.$inferSelect;
export type InsertLearnedWord = z.infer<typeof insertLearnedWordSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

// WebSocket message types
export interface ChatMessage {
  type: 'user_message' | 'bot_response' | 'learning_update' | 'milestone_achieved';
  content?: string;
  botId: number;
  data?: any;
}

export interface LearningUpdate {
  newWords: string[];
  levelUp?: boolean;
  personalityUpdate?: Record<string, number>;
}
