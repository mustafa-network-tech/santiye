import type {
  CustomProjectTypeKey,
  ProjectStatus,
  StageDateKey,
} from "@/lib/constants/project";

export type { ProjectStatus, CustomProjectTypeKey, StageDateKey };

export type Project = {
  id: string;
  project_code: string;
  name: string;
  project_type: string;
  location: string;
  team_name: string | null;
  description: string | null;
  status: ProjectStatus;
  received_at: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  waiting_at: string | null;
  in_progress_at: string | null;
  excavation_permit_waiting_at: string | null;
  delayed_at: string | null;
  completed_at: string | null;
  cable_pulled: boolean | null;
  tracks_obk: boolean;
  obk_pulled: boolean | null;
  joint_done: boolean | null;
  progress_notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectInsert = {
  project_code: string;
  name: string;
  project_type: string;
  location: string;
  description?: string | null;
  received_at?: string | null;
  tracks_obk?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ProjectUpdate = {
  project_code?: string;
  name?: string;
  project_type?: string;
  location?: string;
  description?: string | null;
  received_at?: string | null;
  status?: ProjectStatus;
  waiting_at?: string | null;
  in_progress_at?: string | null;
  excavation_permit_waiting_at?: string | null;
  delayed_at?: string | null;
  completed_at?: string | null;
  cable_pulled?: boolean | null;
  tracks_obk?: boolean;
  obk_pulled?: boolean | null;
  joint_done?: boolean | null;
  progress_notes?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  updated_by?: string | null;
};

export type CustomProjectTypes = Record<CustomProjectTypeKey, string>;

export type DashboardStats = {
  total: number;
  waiting: number;
  in_progress: number;
  excavation_permit_waiting: number;
  delayed: number;
  completed: number;
  archived: number;
};

export type ProjectAnalysisStage =
  | "not_started"
  | "in_progress"
  | "obk_waiting"
  | "excavation_waiting"
  | "cable_waiting"
  | "completed"
  | "delayed";

export type DashboardCategoryAnalysis = {
  category: string;
  total: number;
  not_started: number;
  in_progress: number;
  obk_waiting: number;
  excavation_waiting: number;
  cable_waiting: number;
  completed: number;
  delayed: number;
};

export type DashboardCriticalStats = {
  delayed: number;
  excavation_waiting: number;
  obk_waiting: number;
  cable_waiting: number;
};

export type DashboardOverview = {
  stats: DashboardStats;
  categories: DashboardCategoryAnalysis[];
  critical: DashboardCriticalStats;
  recently_updated: Project[];
  recently_created: Project[];
};

export type ProjectFilters = {
  search?: string;
  status?: ProjectStatus | "all";
  projectType?: string | "all";
  location?: string | "all";
  obkStatus?: "all" | "true" | "false";
  jointStatus?: "all" | "true" | "false";
  analysisStage?: ProjectAnalysisStage;
  archiveScope?: "active" | "archived" | "all";
  page?: number;
  pageSize?: number;
  sortBy?: "updated_at" | "created_at" | "name" | "project_code" | "status";
  sortOrder?: "asc" | "desc";
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
