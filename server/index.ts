// server/index.ts
import 'dotenv/config';
import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.js';

const app: Express = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Register API routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Fix: Use the correct path to the client files
  const clientDistPath = path.join(__dirname, 'client');
  app.use(express.static(clientDistPath));
  
  // Fallback for SPA routing - serve a basic HTML if index.html not found
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reflectibot</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
            <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
          </head>
          <body class="bg-slate-900 text-white">
            <div id="root">
              <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                  <h1 class="text-4xl font-bold text-emerald-400 mb-4">🤖 Reflectibot</h1>
                  <p class="text-slate-400 mb-8">Your AI companion is loading...</p>
                  <div class="space-y-4">
                    <input id="messageInput" type="text" placeholder="Type your message..." 
                           class="w-80 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white">
                    <button onclick="sendMessage()" 
                            class="block mx-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                      Send Message
                    </button>
                  </div>
                  <div id="response" class="mt-4 p-4 bg-slate-800 rounded-lg hidden"></div>
                </div>
              </div>
            </div>
            <script>
              async function sendMessage() {
                const input = document.getElementById('messageInput');
                const response = document.getElementById('response');
                const message = input.value.trim();
                
                if (!message) return;
                
                try {
                  const res = await axios.post('/api/chat', { message, userId: 1 });
                  response.textContent = res.data.response;
                  response.classList.remove('hidden');
                  input.value = '';
                } catch (err) {
                  response.textContent = 'Error: ' + (err.response?.data?.error || 'Failed to send message');
                  response.classList.remove('hidden');
                }
              }
              
              document.getElementById('messageInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendMessage();
              });
            </script>
          </body>
        </html>
      `);
    }
  });
} else {
  // Development route
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reflectibot API</title>
          <style>
            body { font-family: system-ui; margin: 40px; background: #1a1a1a; color: #fff; }
            h1 { color: #10b981; }
            ul { background: #2a2a2a; padding: 20px; border-radius: 8px; }
            li { margin: 8px 0; }
            code { background: #374151; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>🤖 Reflectibot API Server</h1>
          <p>Your AI bot API is running on port ${PORT}!</p>
          <h3>Available endpoints:</h3>
          <ul>
            <li><code>POST /api/chat</code> - Chat with the bot</li>
            <li><code>GET /api/stats?userId=1</code> - Get learning stats</li>
            <li><code>GET /api/test</code> - Test API</li>
            <li><code>GET /api/setup</code> - Setup database tables</li>
            <li><code>POST /api/user/switch</code> - Switch user</li>
            <li><code>GET /api/memories/:userId</code> - Get user memories</li>
            <li><code>GET /api/facts/:userId</code> - Get user facts</li>
            <li><code>POST /api/text-to-speech</code> - Text to speech (placeholder)</li>
          </ul>
          <p>Make sure your DATABASE_URL and OPENAI_API_KEY environment variables are set!</p>
        </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 Reflectibot server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
});