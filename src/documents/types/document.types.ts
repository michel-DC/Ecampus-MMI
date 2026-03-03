import { DocumentType } from '@prisma/client';

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
  studentId: string;
  url: string;
  name: string;
  mimeType: string;
  description: string;
  imageUrl?: string | null;
  submittedAt: Date;
  updatedAt: Date;
}
