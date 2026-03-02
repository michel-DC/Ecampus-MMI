export type SaeStatus = 'draft' | 'upcoming' | 'ongoing' | 'finished';

export interface SaeAuthor {
  id: string;
  name: string;
  email: string;
}

export interface SaeThematic {
  id: string;
  code: string;
  label: string;
}

export interface SaeResponse {
  id: string;
  title: string;
  imageBanner: string | null;
  description: string;
  semesterId: string;
  thematicId: string;
  thematic: SaeThematic;
  startDate: Date;
  dueDate: Date;
  isPublished: boolean;
  status: SaeStatus;
  createdBy: SaeAuthor;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaeListResponse {
  data: SaeResponse[];
  total: number;
}

export interface SaeInvitationResponse {
  id: string;
  saeId: string;
  userId: string;
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
