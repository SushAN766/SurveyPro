import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSurveySchema, insertQuestionSchema, insertResponseSchema, insertAnswerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Survey routes
  app.get('/api/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveys = await storage.getSurveysByUser(userId);
      
      // Get response counts for each survey
      const surveysWithStats = await Promise.all(
        surveys.map(async (survey) => {
          const responseCount = await storage.getResponseCount(survey.id);
          return {
            ...survey,
            responseCount,
          };
        })
      );
      
      res.json(surveysWithStats);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  app.get('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const survey = await storage.getSurvey(req.params.id);
      
      if (!survey || survey.createdBy !== userId) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const questions = await storage.getQuestionsBySurvey(survey.id);
      res.json({ ...survey, questions });
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.post('/api/surveys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const surveyData = insertSurveySchema.parse(req.body);
      
      const survey = await storage.createSurvey({
        ...surveyData,
        createdBy: userId,
      });
      
      // Create questions if provided
      if (req.body.questions && Array.isArray(req.body.questions)) {
        const questionPromises = req.body.questions.map((q: any, index: number) => {
          const questionData = insertQuestionSchema.parse({ ...q, order: index });
          return storage.createQuestion({
            ...questionData,
            surveyId: survey.id,
          });
        });
        
        await Promise.all(questionPromises);
      }
      
      res.json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid survey data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  app.put('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const survey = await storage.getSurvey(req.params.id);
      
      if (!survey || survey.createdBy !== userId) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const surveyData = insertSurveySchema.partial().parse(req.body);
      const updated = await storage.updateSurvey(req.params.id, surveyData);
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating survey:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid survey data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  app.delete('/api/surveys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const survey = await storage.getSurvey(req.params.id);
      
      if (!survey || survey.createdBy !== userId) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      await storage.deleteSurvey(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // Public survey routes
  app.get('/api/public/surveys/:shareToken', async (req, res) => {
    try {
      const survey = await storage.getSurveyByShareToken(req.params.shareToken);
      
      if (!survey || survey.status !== 'active') {
        return res.status(404).json({ message: "Survey not found or inactive" });
      }
      
      const questions = await storage.getQuestionsBySurvey(survey.id);
      res.json({ ...survey, questions });
    } catch (error) {
      console.error("Error fetching public survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.post('/api/public/surveys/:shareToken/responses', async (req, res) => {
    try {
      const survey = await storage.getSurveyByShareToken(req.params.shareToken);
      
      if (!survey || survey.status !== 'active') {
        return res.status(404).json({ message: "Survey not found or inactive" });
      }
      
      const responseData = insertResponseSchema.parse({
        surveyId: survey.id,
        respondentId: req.body.respondentId || null,
      });
      
      const response = await storage.createResponse(responseData);
      
      // Create answers
      if (req.body.answers && Array.isArray(req.body.answers)) {
        const answerPromises = req.body.answers.map((a: any) => {
          const answerData = insertAnswerSchema.parse({
            ...a,
            responseId: response.id,
          });
          return storage.createAnswer(answerData);
        });
        
        await Promise.all(answerPromises);
      }
      
      res.json({ message: "Response submitted successfully" });
    } catch (error) {
      console.error("Error submitting response:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  // Analytics routes
  app.get('/api/surveys/:id/responses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const survey = await storage.getSurvey(req.params.id);
      
      if (!survey || survey.createdBy !== userId) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const responses = await storage.getResponsesBySurvey(survey.id);
      const answers = await storage.getAnswersBySurvey(survey.id);
      
      res.json({ responses, answers });
    } catch (error) {
      console.error("Error fetching survey responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getSurveyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
