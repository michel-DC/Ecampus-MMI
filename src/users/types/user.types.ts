import { UserRole } from '@prisma/client';

export interface UserSearchResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
