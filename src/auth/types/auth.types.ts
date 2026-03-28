import { UserRole } from '@prisma/client';

export interface UserName {
  firstname: string;
  lastname: string | null;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface UserResponse {
  email: string;
  name: UserName;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  imageUrl?: string | null;
  isProfileValidated?: boolean;
  promotion?: string | null;
  group?: string | null;
}
