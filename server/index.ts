// server/index.ts

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './api.js';

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse JSON for APIs
app.use(express.json());

// Register backend routes
await registerRoutes(app);

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'dist', 'client')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'client', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🔥 Server running at http://localhost:${PORT}`);
});
