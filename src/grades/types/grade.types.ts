export interface GradeCategoryResponse {
  id: string;
  saeId: string;
  name: string;
}

export interface GradeResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  value: number;
}

export interface SubmissionGradesResponse {
  submissionId: string;
  saeTitle?: string;
  studentName: { firstname: string; lastname: string | null };
  grades: GradeResponse[];
  average: number;
}

export interface MyGradesResponse {
  data: SubmissionGradesResponse[];
  globalAverage: number;
}
