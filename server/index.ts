// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { registerRoutes } from './routes.js';

// Create Express application
const app = express();
app.use(express.json());

// CORS middleware
const corsMiddleware: express.RequestHandler = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Apply middleware to routes
app.use('/api', corsMiddleware);

// Static files middleware
app.use(express.static('public'));

// Register API routes
async function startServer() {
  try {
    const httpServer = await registerRoutes(app);
    
    // Start server
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
