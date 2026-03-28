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

export interface StudentDirectoryResponse {
  id: string;
  firstname: string;
  lastname: string | null;
  email: string;
  promotion: string | null;
  group: string | null;
  imageUrl: string | null;
}
