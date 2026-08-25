import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AZM Customer Support CRM API',
      version: '1.0.0',
      description: 'API for the AZM Customer Support CRM system',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
