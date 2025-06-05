// src/swagger.ts
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ReflectiBot API',
      version: '1.0.0',
      description: 'Voice-enabled AI companion API',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Files with Swagger comments
};

const specs = swaggerJsDoc(options);

export function registerSwaggerDocs(app: Express): void {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
}
