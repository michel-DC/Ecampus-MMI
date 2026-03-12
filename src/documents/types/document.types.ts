import { DocumentType } from '@prisma/client';
import { UserName } from '../../auth/types/auth.types';

export interface SaeDocumentResponse {
  id: string;
  saeId: string;
  url: string;
  name: string;
  mimeType: string;
  type: DocumentType;
  createdAt: Date;
}

export interface StudentSubmissionResponse {
  id: string;
  saeId: string;
  name: UserName;
  url: string;
  fileName: string;
  mimeType: string;
  description: string;
  imageUrl?: string | null;
  isPublic: boolean;
  submittedAt: Date;
  updatedAt: Date;
}
