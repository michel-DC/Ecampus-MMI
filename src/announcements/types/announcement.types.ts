export interface AnnouncementResponse {
  id: string;
  saeId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnouncementListResponse {
  data: AnnouncementResponse[];
  total: number;
}
