// server/index.ts
import 'dotenv/config';
import express, { Express } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.js';

const app: Express = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(bodyParser.json());

// Register API + WebSocket routes
await registerRoutes(app);

// Serve client build files (Vite's output)
const clientDistPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
