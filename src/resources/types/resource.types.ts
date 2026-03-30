export interface BannerResponse {
  id: string;
  url: string;
  createdAt: Date;
}

export interface PromotionResponse {
  id: string;
  label: string;
  yearLevel: number | null;
  academicYear: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface GroupResponse {
  id: string;
  name: string;
  createdAt: Date;
}

export interface SemesterResponse {
  id: string;
  number: number;
  promotionId: string;
  promotion: {
    label: string;
  };
  createdAt: Date;
}

export interface ThematicResponse {
  id: string;
  code: string;
  label: string;
}
