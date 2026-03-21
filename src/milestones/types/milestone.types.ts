import { UserRole } from '@prisma/client';

export interface MilestoneResponse {
  id: string;
  saeId: string;
  title: string;
  description?: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneProgressResponse {
  id: string;
  milestoneId: string;
  studentId: string;
  message?: string;
  isReached: boolean;
  reachedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentMilestoneProgressResponse {
  milestone: MilestoneResponse;
  progress: MilestoneProgressResponse | null;
}

export interface SaeMilestoneWithProgress extends MilestoneResponse {
  progresses: MilestoneProgressResponse[];
}

export interface SaeMilestoneListResponse {
  milestones: SaeMilestoneWithProgress[];
}

export interface MySaeMilestoneProgress {
  milestone: MilestoneResponse;
  progress: MilestoneProgressResponse | null;
}

export interface MySaeMilestonesProgressListResponse {
  milestones: MySaeMilestoneProgress[];
}

export interface StudentMilestoneStat {
  studentId: string;
  firstname: string;
  lastname: string;
  validatedCount: number;
}

export interface MilestoneStat {
  milestoneId: string;
  title: string;
  validatedCount: number;
  percentage: number;
}

export interface SaeMilestoneStatsResponse {
  totalStudents: number;
  milestonesCount: number;
  studentsStats: StudentMilestoneStat[];
  milestonesStats: MilestoneStat[];
  globalProgress: {
    averageValidated: number;
    completionRate: number;
  };
}
