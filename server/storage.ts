import {
  users,
  surveys,
  questions,
  responses,
  answers,
  type User,
  type UpsertUser,
  type Survey,
  type InsertSurvey,
  type Question,
  type InsertQuestion,
  type Response,
  type InsertResponse,
  type Answer,
  type InsertAnswer,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Survey operations
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  getSurvey(id: string): Promise<Survey | undefined>;
  getSurveyByShareToken(shareToken: string): Promise<Survey | undefined>;
  getSurveysByUser(userId: string): Promise<Survey[]>;
  updateSurvey(id: string, updates: Partial<InsertSurvey>): Promise<Survey>;
  deleteSurvey(id: string): Promise<void>;

  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsBySurvey(surveyId: string): Promise<Question[]>;
  updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;

  // Response operations
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesBySurvey(surveyId: string): Promise<Response[]>;
  getResponseCount(surveyId: string): Promise<number>;

  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByResponse(responseId: string): Promise<Answer[]>;
  getAnswersBySurvey(surveyId: string): Promise<Answer[]>;

  // Analytics
  getSurveyStats(userId: string): Promise<{
    totalSurveys: number;
    totalResponses: number;
    activeSurveys: number;
    avgCompletionRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Survey operations
  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [newSurvey] = await db.insert(surveys).values(survey).returning();
    return newSurvey;
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async getSurveyByShareToken(shareToken: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.shareToken, shareToken));
    return survey;
  }

  async getSurveysByUser(userId: string): Promise<Survey[]> {
    return await db
      .select()
      .from(surveys)
      .where(eq(surveys.createdBy, userId))
      .orderBy(desc(surveys.createdAt));
  }

  async updateSurvey(id: string, updates: Partial<InsertSurvey>): Promise<Survey> {
    const [updated] = await db
      .update(surveys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return updated;
  }

  async deleteSurvey(id: string): Promise<void> {
    await db.delete(surveys).where(eq(surveys.id, id));
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question).returning();
    return newQuestion;
  }

  async getQuestionsBySurvey(surveyId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, surveyId))
      .orderBy(questions.order);
  }

  async updateQuestion(id: string, updates: Partial<InsertQuestion>): Promise<Question> {
    const [updated] = await db
      .update(questions)
      .set(updates)
      .where(eq(questions.id, id))
      .returning();
    return updated;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  // Response operations
  async createResponse(response: InsertResponse): Promise<Response> {
    const [newResponse] = await db.insert(responses).values(response).returning();
    return newResponse;
  }

  async getResponsesBySurvey(surveyId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.surveyId, surveyId))
      .orderBy(desc(responses.createdAt));
  }

  async getResponseCount(surveyId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(responses)
      .where(eq(responses.surveyId, surveyId));
    return result.count;
  }

  // Answer operations
  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    const [newAnswer] = await db.insert(answers).values(answer).returning();
    return newAnswer;
  }

  async getAnswersByResponse(responseId: string): Promise<Answer[]> {
    return await db
      .select()
      .from(answers)
      .where(eq(answers.responseId, responseId));
  }

  async getAnswersBySurvey(surveyId: string): Promise<Answer[]> {
    return await db
      .select({
        id: answers.id,
        responseId: answers.responseId,
        questionId: answers.questionId,
        value: answers.value,
        createdAt: answers.createdAt,
      })
      .from(answers)
      .innerJoin(responses, eq(answers.responseId, responses.id))
      .where(eq(responses.surveyId, surveyId));
  }

  // Analytics
  async getSurveyStats(userId: string): Promise<{
    totalSurveys: number;
    totalResponses: number;
    activeSurveys: number;
    avgCompletionRate: number;
  }> {
    const [totalSurveys] = await db
      .select({ count: count() })
      .from(surveys)
      .where(eq(surveys.createdBy, userId));

    const [activeSurveys] = await db
      .select({ count: count() })
      .from(surveys)
      .where(eq(surveys.createdBy, userId))
      .where(eq(surveys.status, "active"));

    const [totalResponses] = await db
      .select({ count: count() })
      .from(responses)
      .innerJoin(surveys, eq(responses.surveyId, surveys.id))
      .where(eq(surveys.createdBy, userId));

    return {
      totalSurveys: totalSurveys.count,
      totalResponses: totalResponses.count,
      activeSurveys: activeSurveys.count,
      avgCompletionRate: 78.5, // Simple static calculation for now
    };
  }
}

export const storage = new DatabaseStorage();
