"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
// src/routes/index.ts
require("dotenv/config");
const reflect_1 = require("./reflect");
function registerRoutes(app) {
    app.get('/api/test', (_req, res) => {
        res.json({ message: 'Test endpoint is working!' });
    });
    // Register your other route modules here
    (0, reflect_1.registerReflectRoutes)(app);
}
