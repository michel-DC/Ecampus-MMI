import { UserName } from '../../auth/types/auth.types';

export type SaeStatus = 'draft' | 'upcoming' | 'ongoing' | 'finished';

export interface SaeAuthor {
  id: string;
  email: string;
  name: UserName;
}

export interface SaeResponse {
  id: string;
  title: string;
  banner: string;
  description: string;
  instructions?: string | null;
  semesterId: string;
  thematic: string;
  startDate: Date;
  dueDate: Date;
  isPublished: boolean;
  isSubmitted?: boolean;
  isUrgent: boolean;
  submissionCount?: number;
  studentCount?: number;
  status: SaeStatus;
  createdBy: SaeAuthor;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaeArchiveResponse {
  id: string;
  title: string;
  year: number;
  thematic: string;
  description: string;
  imageUrl?: string | null; // Image du rendu phare
  url?: string | null; // Lien vers le rendu phare
  studentName?: string;
}

export interface SaeListResponse {
  data: SaeResponse[];
  total: number;
}

export interface SaeInvitationResponse {
  id: string;
  saeId: string;
  userId: string;
  name: string;
  createdAt: Date;
}

export function computeSaeStatus(sae: {
  isPublished: boolean;
  startDate: Date;
  dueDate: Date;
}): SaeStatus {
  if (!sae.isPublished) return 'draft';
  const now = new Date();
  if (now < sae.startDate) return 'upcoming';
  if (now > sae.dueDate) return 'finished';
  return 'ongoing';
}
