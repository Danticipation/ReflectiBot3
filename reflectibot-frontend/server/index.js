"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/index.ts
require("dotenv/config");
const swagger_js_1 = require("./swagger.js");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
// Make sure the routes file exists at ./routes.ts or ./routes/index.ts
// If it does not exist, create it with at least the following content:
const index_js_1 = require("./routes/index.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Register Swagger docs after initializing the app
(0, swagger_js_1.registerSwaggerDocs)(app);
// Middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// CORS middleware for development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        }
        else {
            next();
        }
    });
}
// Register API routes
(0, index_js_1.registerRoutes)(app);
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    // Fix: Correct path - remove one level up since we're already in dist/server
    const clientDistPath = path_1.default.join(__dirname, '..', 'client');
    console.log('Serving static files from:', clientDistPath);
    app.use(express_1.default.static(clientDistPath));
    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            const indexPath = path_1.default.join(clientDistPath, 'index.html');
            console.log('Serving React app from:', indexPath);
            res.sendFile(indexPath);
        }
    });
}
else {
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
app.use((err, req, res, next) => {
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
