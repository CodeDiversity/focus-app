import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
