"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSwaggerDocs = registerSwaggerDocs;
// swagger.ts
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Reflectibot API',
            version: '1.0.0',
            description: 'API docs for the Reflectibot companion system'
        },
        servers: [{ url: 'http://localhost:3000' }]
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/routes.ts', './src/index.ts'],
};
const specs = (0, swagger_jsdoc_1.default)(options);
function registerSwaggerDocs(app) {
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
}
