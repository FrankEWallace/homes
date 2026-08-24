import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ToJoin API',
      version: '1.0.0',
      description: 'Mobile-first marketplace API for Tanzania — events, tours, accommodation, car rental, and ticketing.',
    },
    servers: [
      { url: `${env.API_BASE_URL}/api/v1`, description: 'Current environment' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            phone: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['seeker', 'agent', 'admin'] },
            status: { type: 'string', enum: ['active', 'suspended', 'banned'] },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['event', 'safari', 'tour', 'accommodation', 'transport', 'car_rental'] },
            priceAmount: { type: 'number' },
            priceCurrency: { type: 'string', example: 'TZS' },
            city: { type: 'string' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            reference: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
            totalAmount: { type: 'number' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/modules/**/*.router.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
