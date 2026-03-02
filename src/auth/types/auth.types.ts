import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
