// shared/schema.ts - Create this file in your shared directory
import { pgTable, serial, text, integer, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Bots table
export const bots = pgTable('bots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  level: integer('level').default(1).notNull(),
  wordsLearned: integer('words_learned').default(0).notNull(),
  personalityTraits: jsonb('personality_traits'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Messages table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').references(() => bots.id),
  sender: varchar('sender', { length: 20 }).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Learned words table
export const learnedWords = pgTable('learned_words', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').references(() => bots.id),
  word: varchar('word', { length: 100 }).notNull(),
  frequency: integer('frequency').default(1).notNull(),
  context: text('context'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Milestones table
export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').references(() => bots.id),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  achievedAt: timestamp('achieved_at').defaultNow().notNull()
});

// User memories table
export const userMemories = pgTable('user_memories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  memory: text('memory').notNull(),
  category: varchar('category', { length: 50 }).default('conversation').notNull(),
  importance: varchar('importance', { length: 20 }).default('medium').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// User facts table
export const userFacts = pgTable('user_facts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  fact: text('fact').notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(),
  confidence: varchar('confidence', { length: 20 }).default('medium').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = typeof bots.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type LearnedWord = typeof learnedWords.$inferSelect;
export type InsertLearnedWord = typeof learnedWords.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;
export type UserMemory = typeof userMemories.$inferSelect;
export type InsertUserMemory = typeof userMemories.$inferInsert;
export type UserFact = typeof userFacts.$inferSelect;
export type InsertUserFact = typeof userFacts.$inferInsert;