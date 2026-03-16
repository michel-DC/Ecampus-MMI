import { UserRole } from '@prisma/client';
import { UserName } from '../../auth/types/auth.types';

export interface CreatedTeacherResponse {
  id: string;
  email: string;
  name: UserName;
  role: UserRole;
  temporaryPassword: string;
  createdAt: Date;
}

export interface UserSearchResponse {
  id: string;
  email: string;
  name: UserName;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
