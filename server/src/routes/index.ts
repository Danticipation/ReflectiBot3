// src/routes/index.ts
import 'dotenv/config';
import type { Express } from 'express';
import { registerReflectRoutes } from './reflect';

export function registerRoutes(app: Express): void {
  app.get('/api/test', (_req, res) => {
    res.json({ message: 'Test endpoint is working!' });
  });

  // Register your other route modules here
  registerReflectRoutes(app);
}
