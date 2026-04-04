import { Router } from 'express';

export const authRouter = Router();

// Placeholder auth route group for signup, login, OTP, and role-aware sessions.
authRouter.get('/', (_request, response) => {
  response.json({
    module: 'auth',
    status: 'pending',
    next: ['customer signup', 'customer login', 'retailer login', 'role-based sessions'],
  });
});
