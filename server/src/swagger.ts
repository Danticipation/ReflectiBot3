// swagger.ts
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

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

const specs = swaggerJsDoc(options);

export function registerSwaggerDocs(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
}
