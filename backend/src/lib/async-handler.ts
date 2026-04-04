import type { NextFunction, Request, Response } from 'express';

// Wraps async route handlers so thrown errors always reach Express error middleware.
export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}
