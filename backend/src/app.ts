import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { HttpError } from './lib/http-error.js';
import { apiRouter } from './routes/index.js';

// Creates the central Express application used by every backend entrypoint.
export function createApp() {
  const app = express();

  // Shared middleware for JSON APIs and cross-origin mobile/web requests.
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
    }),
  );
  app.use(express.json());

  // Top-level API mount point for all PharmaConnect modules.
  app.use('/api', apiRouter);

  // Converts thrown route errors into consistent JSON responses for the frontend.
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({
        error: error.message,
      });
      return;
    }

    console.error(error);

    response.status(500).json({
      error: 'Internal server error',
    });
  });

  return app;
}
