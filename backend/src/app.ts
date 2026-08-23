import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { HttpError } from './lib/http-error.js';
import { apiRouter } from './routes/index.js';

// Creates the central Express application used by every backend entrypoint.
export function createApp() {
  const app = express();

  // Shared middleware for JSON APIs and cross-origin mobile/web requests.
  // CLIENT_ORIGIN accepts a comma-separated list so one deployment can serve the Expo web build
  // and a packaged app. Expo's dev server picks a new port on each run, so any localhost origin is
  // allowed outside production.
  const allowedOrigins = new Set(
    env.CLIENT_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const allowLocalhostOrigins = env.NODE_ENV !== 'production';

  app.use(
    cors({
      origin: (origin, callback) => {
        const isAllowed =
          // Native apps and server-to-server calls send no Origin header at all.
          !origin ||
          allowedOrigins.has(origin) ||
          (allowLocalhostOrigins && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin));

        callback(isAllowed ? null : new Error(`Origin ${origin} is not allowed by CORS`), isAllowed);
      },
      credentials: true,
    }),
  );
  // Prescription uploads arrive as base64 JSON up to 5 MB, which base64 inflates by roughly a
  // third, so the body limit has to sit well above Express's 100 kb default.
  app.use(express.json({ limit: '8mb' }));

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

    // Routes validate their input with Zod and let the error bubble, so a bad request must be
    // reported as a 400 with the failing fields rather than as a server fault.
    if (error instanceof ZodError) {
      response.status(400).json({
        error: error.issues
          .map((issue) => {
            const path = issue.path.join('.');
            return path ? `${path}: ${issue.message}` : issue.message;
          })
          .join('; '),
      });
      return;
    }

    // An oversized upload is the client's problem, not a server fault.
    if (typeof error === 'object' && error !== null && (error as { type?: string }).type === 'entity.too.large') {
      response.status(413).json({
        error: 'The uploaded file is too large.',
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
