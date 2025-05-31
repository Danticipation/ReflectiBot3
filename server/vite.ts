import type { Express } from "express";
import type { Server } from "http";

export async function setupVite(app: Express, server: Server): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // In production, serve static files
    const path = await import('path');
    app.use('/', (await import('express')).static(path.join(process.cwd(), 'dist')));
    
    // Serve React app for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
      }
    });
  } else {
    // In development, you can add Vite dev server setup here
    console.log('Development mode - add Vite dev server configuration if needed');
    
    // For now, just serve a simple response for the root
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Reflectibot API</title>
          </head>
          <body>
            <h1>Reflectibot API Server</h1>
            <p>Your AI bot API is running!</p>
            <p>Available endpoints:</p>
            <ul>
              <li>POST /api/chat - Chat with the bot</li>
              <li>GET /api/bot/:id - Get bot info</li>
              <li>POST /api/bot - Create/get bot</li>
              <li>GET /api/stats - Get learning stats</li>
              <li>POST /api/tts - Text to speech</li>
              <li>POST /api/transcribe - Speech to text</li>
            </ul>
          </body>
        </html>
      `);
    });
  }
}