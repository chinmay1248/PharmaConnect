import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
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

  return app;
}
