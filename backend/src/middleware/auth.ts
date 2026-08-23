import type { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import { readBearerToken, verifySessionToken } from '../lib/tokens.js';

// Everything a route needs to decide whether the caller may touch a record.
export type AuthContext = {
  userId: string;
  role: string;
  retailerId: string | null;
  wholesellerId: string | null;
  companyId: string | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// Loads the signed-in user plus the profile ids that scope every B2B route.
async function loadAuthContext(userId: string): Promise<AuthContext> {
  const user: any = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      retailerProfile: { select: { id: true } },
      wholesellerProfile: { select: { id: true } },
      companyProfile: { select: { id: true } },
    },
  });

  if (!user) {
    throw new HttpError(401, 'Session user no longer exists. Please sign in again.');
  }

  if (!user.isActive) {
    throw new HttpError(403, 'This account has been deactivated.');
  }

  return {
    userId: user.id,
    role: user.role,
    retailerId: user.retailerProfile?.id ?? null,
    wholesellerId: user.wholesellerProfile?.id ?? null,
    companyId: user.companyProfile?.id ?? null,
  };
}

// Rejects requests without a valid session token and attaches the caller's auth context.
export const requireAuth = asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
  const token = readBearerToken(request.headers.authorization);

  if (!token) {
    throw new HttpError(401, 'Authentication required');
  }

  const payload = verifySessionToken(token);
  request.auth = await loadAuthContext(payload.userId);
  next();
});

// Attaches the caller's auth context when a token is present but never rejects the request.
export const optionalAuth = asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
  const token = readBearerToken(request.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifySessionToken(token);
    request.auth = await loadAuthContext(payload.userId);
  } catch {
    // An unusable token is treated the same as no token on optional routes.
  }

  next();
});

// Returns the caller's auth context, or fails when the route forgot to require authentication.
export function getAuth(request: Request): AuthContext {
  if (!request.auth) {
    throw new HttpError(401, 'Authentication required');
  }

  return request.auth;
}

// Restricts a route to one or more platform roles.
export function requireRole(...roles: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const auth = getAuth(request);

    if (!roles.includes(auth.role)) {
      next(new HttpError(403, 'Your account role cannot access this resource.'));
      return;
    }

    next();
  };
}

// Confirms the caller is acting on their own user record.
export function assertSelf(request: Request, userId: string) {
  const auth = getAuth(request);

  if (auth.userId !== userId) {
    throw new HttpError(403, 'You can only access your own account data.');
  }

  return auth;
}

// Confirms the caller owns the retailer profile named in the route.
export function assertRetailerScope(request: Request, retailerId: string) {
  const auth = getAuth(request);

  if (auth.role !== 'RETAILER' || auth.retailerId !== retailerId) {
    throw new HttpError(403, 'You can only manage your own pharmacy.');
  }

  return auth;
}

// Confirms the caller owns the wholeseller profile named in the route.
export function assertWholesellerScope(request: Request, wholesellerId: string) {
  const auth = getAuth(request);

  if (auth.role !== 'WHOLESELLER' || auth.wholesellerId !== wholesellerId) {
    throw new HttpError(403, 'You can only manage your own distribution business.');
  }

  return auth;
}

// Confirms the caller takes part in a customer order, either as the buyer or as the pharmacy
// fulfilling it. Pass `customerOnly` for actions only the buyer may take, such as paying.
export async function assertCustomerOrderAccess(
  request: Request,
  orderId: string,
  options: { customerOnly?: boolean } = {},
) {
  const auth = getAuth(request);
  const order: any = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, retailerId: true },
  });

  if (!order) {
    throw new HttpError(404, 'Order not found');
  }

  const isBuyer = auth.userId === order.customerId;
  const isFulfillingRetailer =
    !options.customerOnly && auth.role === 'RETAILER' && auth.retailerId === order.retailerId;

  if (!isBuyer && !isFulfillingRetailer) {
    throw new HttpError(403, 'You cannot access this order.');
  }

  return { auth, order };
}

// Confirms the caller owns the company profile named in the route.
export function assertCompanyScope(request: Request, companyId: string) {
  const auth = getAuth(request);

  if (auth.role !== 'COMPANY' || auth.companyId !== companyId) {
    throw new HttpError(403, 'You can only manage your own company.');
  }

  return auth;
}
